import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import type { Readable } from 'node:stream';

export const MAX_CRAWLER_BYTES = 2 * 1024 * 1024;
const CRAWLER_TIMEOUT_MS = 15_000;
const MAX_CRAWLER_REDIRECTS = 3;

/** Conservative global-address policy; DNS results are pinned to this request. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  // Exclude mapped, local, transition, documentation and protocol-assignment ranges.
  if (isIP(address) !== 6) return false;
  const groups = address.toLowerCase().split(':');
  const first = parseInt(groups[0] || '0', 16);
  const second = parseInt(groups[1] || '0', 16);
  if (first < 0x2000 || first > 0x3fff || first === 0x2002 || first === 0x3fff) {
    return false;
  }
  if (first === 0x2001) {
    // Block Teredo (2001:0000::/32), Benchmarking (2001:0002::/48), ORCHID (2001:0010::/28, 2001:0020::/28), and Documentation (2001:0db8::/32)
    if (
      second === 0x0000 ||
      second === 0x0002 ||
      second === 0x0db8 ||
      (second >= 0x0010 && second <= 0x002f)
    ) {
      return false;
    }
  }
  return true;
}

export function validateCrawlerUrl(input: string): URL {
  const url = new URL(input);
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port)) ||
      host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      (isIP(host) !== 0 && !isPublicAddress(host))) throw new Error('CRAWLER_DESTINATION_BLOCKED');
  return url;
}

/** Official Turkish pages can still declare windows-1254; reading them as UTF-8 corrupts every Turkish letter. */
export function decodeCrawlerText(body: Buffer): string {
  const declared = body.subarray(0, 2048).toString('latin1').match(/charset=["']?\s*(windows-1254|iso-8859-9)/i)?.[1];
  return declared ? new TextDecoder(declared.toLowerCase()).decode(body) : body.toString('utf8');
}

export async function readCrawlerBody(stream: Readable, maxBytes = MAX_CRAWLER_BYTES): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) throw new Error('CRAWLER_RESPONSE_TOO_LARGE');
      chunks.push(buffer);
    }
    return decodeCrawlerText(Buffer.concat(chunks, size));
  } finally {
    stream.destroy();
  }
}

type ResolvedAddress = { address: string; family: number };
export function checkedDnsLookup(hostname: string, resolve: typeof lookup = lookup): Promise<ResolvedAddress[]> {
  return new Promise((accept, reject) => {
    resolve(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) return reject(error);
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        return reject(new Error('CRAWLER_DESTINATION_BLOCKED'));
      }
      accept(addresses);
    });
  });
}

function decodeContentStream(response: http.IncomingMessage, encodingHeader: string | undefined): Readable | null {
  const encoding = (encodingHeader ?? 'identity').trim().toLowerCase();
  if (!encoding || encoding === 'identity') return response;
  if (encoding === 'gzip' || encoding === 'x-gzip') return response.pipe(zlib.createGunzip());
  if (encoding === 'deflate') return response.pipe(zlib.createInflate());
  if (encoding === 'br') return response.pipe(zlib.createBrotliDecompress());
  return null;
}

export async function fetchCrawlerHtml(input: string, redirectDepth = 0): Promise<string> {
  if (redirectDepth > MAX_CRAWLER_REDIRECTS) {
    throw new Error('CRAWLER_TOO_MANY_REDIRECTS');
  }
  const url = validateCrawlerUrl(input);
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      agent: false,
      headers: {
        'User-Agent': 'TeklifPro-PriceReview/1.0 (+https://bimmetraj.com)',
        Accept: 'text/html,application/xhtml+xml,application/json,text/csv,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br, identity',
      },
      lookup(hostname, options, callback) {
        void checkedDnsLookup(hostname).then(addresses => {
          // Returning these addresses avoids a second DNS lookup / rebinding.
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        }, error => callback(error as NodeJS.ErrnoException, []));
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        const nextLocation = response.headers.location;
        response.destroy();
        clearTimeout(timer);
        try {
          const redirectedUrl = new URL(nextLocation, url).toString();
          void fetchCrawlerHtml(redirectedUrl, redirectDepth + 1).then(resolve, reject);
        } catch (err) {
          reject(err);
        }
        return;
      }
      const decodedStream = decodeContentStream(response, response.headers['content-encoding']);
      if (status < 200 || status >= 300 || !decodedStream) {
        response.destroy();
        request.destroy(new Error('CRAWLER_RESPONSE_REJECTED'));
        return;
      }
      if (Number(response.headers['content-length']) > MAX_CRAWLER_BYTES) {
        response.destroy();
        request.destroy(new Error('CRAWLER_RESPONSE_TOO_LARGE'));
        return;
      }
      void readCrawlerBody(decodedStream).then(resolve, reject).finally(() => clearTimeout(timer));
    });
    // Includes DNS, connect, headers and the complete body; redirects are re-validated at every hop.
    const timer = setTimeout(() => request.destroy(new Error('CRAWLER_TIMEOUT')), CRAWLER_TIMEOUT_MS);
    request.on('error', error => { clearTimeout(timer); reject(error); });
    request.on('close', () => clearTimeout(timer));
  });
}
