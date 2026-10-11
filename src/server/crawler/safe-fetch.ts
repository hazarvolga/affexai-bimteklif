import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import type { Readable } from 'node:stream';

export const MAX_CRAWLER_BYTES = 2 * 1024 * 1024;
const CRAWLER_TIMEOUT_MS = 15_000;

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
  const first = parseInt(address.split(':')[0], 16);
  return first >= 0x2000 && first <= 0x3fff && first !== 0x2001 && first !== 0x2002 && first !== 0x3fff;
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
    return Buffer.concat(chunks, size).toString('utf8');
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

export async function fetchCrawlerHtml(input: string): Promise<string> {
  const url = validateCrawlerUrl(input);
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      agent: false,
      headers: { 'User-Agent': 'TeklifPro-PriceReview/1.0', Accept: 'text/html', 'Accept-Encoding': 'identity' },
      lookup(hostname, options, callback) {
        void checkedDnsLookup(hostname).then(addresses => {
          // Returning these addresses avoids a second DNS lookup / rebinding.
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        }, error => callback(error, []));
      },
    }, response => {
      const status = response.statusCode ?? 0;
      const encoding = response.headers['content-encoding'];
      if (status < 200 || status >= 300 || (encoding && encoding !== 'identity')) {
        response.destroy();
        request.destroy(new Error('CRAWLER_RESPONSE_REJECTED'));
        return;
      }
      if (Number(response.headers['content-length']) > MAX_CRAWLER_BYTES) {
        response.destroy();
        request.destroy(new Error('CRAWLER_RESPONSE_TOO_LARGE'));
        return;
      }
      void readCrawlerBody(response).then(resolve, reject).finally(() => clearTimeout(timer));
    });
    // Includes DNS, connect, headers and the complete body; redirects are never followed.
    const timer = setTimeout(() => request.destroy(new Error('CRAWLER_TIMEOUT')), CRAWLER_TIMEOUT_MS);
    request.on('error', error => { clearTimeout(timer); reject(error); });
    request.on('close', () => clearTimeout(timer));
  });
}
