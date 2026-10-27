import { Worker } from 'node:worker_threads';
import type { CrawledPriceItem } from './priceCrawlerService';
import { parseTurkishPrice } from './price-parser';
import { MAX_CRAWLER_BYTES } from './safe-fetch';

// Static trusted worker code. Untrusted HTML is workerData, never executable source.
const PARSER_SOURCE = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const { createHash } = require('node:crypto');
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const html = workerData.html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
const items = [];
const seen = new Set();
const rows = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let row;
let priceHeaderColumns = [];
while ((row = rows.exec(html)) !== null && items.length < 200) {
  if (row[1].length > 32768) continue;
  const headerMatches = [...row[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(cell => text(cell[1]));
  if (headerMatches.length >= 2) {
    const detectedCols = headerMatches
      .map((h, idx) => (/(?:\btl\b|₺|try|eur|usd|fiyat|birim\s*bedel|rayi[çc])/i.test(h) ? idx : -1))
      .filter(idx => idx >= 0);
    if (detectedCols.length > 0) {
      priceHeaderColumns = detectedCols;
      continue;
    }
  }
  const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => text(cell[1]));
  if (cells.length < 2 || cells.length > 64) continue;
  let priceIndex = cells.findIndex(cell => parseTurkishPrice(cell) !== null);
  let price = priceIndex >= 0 ? parseTurkishPrice(cells[priceIndex]) : null;
  if (price === null && priceHeaderColumns.length > 0) {
    for (const colIdx of priceHeaderColumns) {
      if (colIdx < cells.length && /^[\d.\s]+(?:,\d{1,4})?$/.test(cells[colIdx])) {
        const candidate = parseTurkishPrice(cells[colIdx] + ' TL');
        if (candidate !== null) {
          priceIndex = colIdx;
          price = candidate;
          break;
        }
      }
    }
  }
  if (priceIndex < 0 || price === null) continue;
  const name = cells.find((cell, index) => index !== priceIndex && cell.length > 2 && cell.length <= 300 && !/^[\d.,\s]+$/.test(cell));
  if (!name || price >= 10000000) continue;
  // No inferred CSB codes, benchmark prices, pump multipliers or official verification.
  const itemCode = 'WEB.' + createHash('sha256').update(workerData.sourceUrl + '\n' + name).digest('hex').slice(0, 24);
  if (seen.has(itemCode)) continue;
  seen.add(itemCode);
  items.push({ itemCode, itemName: name, unit: 'inceleme gerekli', currentPrice: null,
    crawledPrice: price, diffPercent: null, confidenceScore: 0.5,
    notes: '[live-html-v1] Kaynak HTML tablosundan çıkarıldı; para birimi, birim, tarih ve kapsam insan incelemesi gerektirir.',
    sourceUrl: workerData.sourceUrl });
}
parentPort.postMessage(items);
`;

export async function parseHtmlPrices(html: string, sourceUrl: string, timeoutMs = 2000): Promise<CrawledPriceItem[]> {
  if (Buffer.byteLength(html, 'utf8') > MAX_CRAWLER_BYTES) throw new Error('CRAWLER_RESPONSE_TOO_LARGE');
  const worker = new Worker(`const parseTurkishPrice = (${parseTurkishPrice.toString()});\n${PARSER_SOURCE}`, {
    eval: true, workerData: { html, sourceUrl }, resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 2 },
  });
  let timer: NodeJS.Timeout | undefined;
  try {
    return await new Promise<CrawledPriceItem[]>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('CRAWLER_PARSE_TIMEOUT')), timeoutMs);
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => reject(new Error(`CRAWLER_PARSE_EXIT_${code}`)));
    });
  } finally {
    clearTimeout(timer);
    await worker.terminate();
  }
}
