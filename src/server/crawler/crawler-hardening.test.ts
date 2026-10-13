import test from 'node:test';
import assert from 'node:assert/strict';
import { PriceCrawlerService, parseTurkishPrice } from './priceCrawlerService';
import { isPublicAddress, validateCrawlerUrl, readCrawlerBody } from './safe-fetch';
import { canApproveCrawlerPrice } from './provenance';
import { Readable } from 'node:stream';

test('official sources fail closed without a real evidence adapter', async () => {
  for (const source of [
    { code: 'csb_yfk_2026', category: 'official_gazette', sourceUrl: 'https://csb.gov.tr' },
    { code: 'tuik_ime', category: 'tuik_index', sourceUrl: 'https://data.tuik.gov.tr' },
  ]) {
    const result = await new PriceCrawlerService().crawlSource({ id: 'source', name: 'Official source', ...source });
    assert.equal(result.status, 'error');
    assert.equal(result.errorMessage, 'PRICE_SOURCE_ADAPTER_UNSUPPORTED');
    assert.deepEqual(result.items, []);
  }
});

test('oversized price fields are rejected before regex processing', () => {
  assert.equal(parseTurkishPrice('1'.repeat(100_000) + ' TL'), null);
  assert.equal(parseTurkishPrice('EUR 1.200,50'), 1200.5);
});

test('crawler rejects private, special, mapped and non-HTTP destinations', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '192.168.1.1', '198.18.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '2002:7f00:1::']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('93.184.216.34'), true);
  for (const url of ['file:///etc/passwd', 'http://localhost', 'https://user:pass@example.com', 'http://127.0.0.1', 'http://example.com:5432']) {
    assert.throws(() => validateCrawlerUrl(url));
  }
});

test('response byte limit stops streams even without content-length', async () => {
  const stream = Readable.from([Buffer.alloc(8), Buffer.alloc(8)]);
  await assert.rejects(readCrawlerBody(stream, 10), /CRAWLER_RESPONSE_TOO_LARGE/);
  assert.equal(stream.destroyed, true);
});

test('legacy mock staging cannot be approved; fresh live evidence can', () => {
  assert.equal(canApproveCrawlerPrice({ notes: 'ÇŞB resmi doğrulanmış rayiç', sourceUrl: 'https://csb.gov.tr', crawledPrice: '2350' }), false);
  assert.equal(canApproveCrawlerPrice({ notes: '[live-html-v1] Human review required', sourceUrl: 'https://example.com/prices', crawledPrice: '2350' }), true);
  assert.equal(canApproveCrawlerPrice({ notes: '[live-html-v1]', sourceUrl: null, crawledPrice: '2350' }), false);
});

test('live HTML extraction preserves price and never invents official code or multiplier', async () => {
  const crawler = new PriceCrawlerService(async () => '<table><tr><td>C25 beton</td><td>1000 TL</td></tr></table>');
  const result = await crawler.crawlSource({ id: 'x', code: 'market_concrete', name: 'Concrete', category: 'market', sourceUrl: 'https://example.com/prices' });
  assert.equal(result.status, 'success');
  assert.equal(result.items[0].crawledPrice, 1000);
  assert.equal(result.items[0].currentPrice, null);
  assert.match(result.items[0].itemCode, /^WEB\./);
  assert.match(result.items[0].notes, /\[live-html-v1\]/);
});

test('concurrent crawler requests fail bounded admission without accumulating workers', async () => {
  let release!: (html: string) => void;
  const crawler = new PriceCrawlerService(() => new Promise(resolve => { release = resolve; }));
  const source = { id: 'x', code: 'market', name: 'Market', category: 'market', sourceUrl: 'https://example.com' };
  const first = crawler.crawlSource(source);
  const second = await crawler.crawlSource(source);
  assert.equal(second.errorMessage, 'CRAWLER_BUSY');
  release('<table></table>');
  await first;
});

test('review notes cannot launder legacy demo provenance', () => {
  assert.equal(canApproveCrawlerPrice({ notes: 'old demo | İnceleme: [live-html-v1] Human review required', sourceUrl: 'https://example.com', crawledPrice: '12' }), false);
  assert.equal(canApproveCrawlerPrice({ notes: '[Gece Otomatik Tarama] [live-html-v1] Human review required', sourceUrl: 'https://example.com', crawledPrice: '12' }), true);
});

test('DNS lookup rejects mixed public/private answers and returns pinned public addresses', async () => {
  const { checkedDnsLookup } = await import('./safe-fetch');
  const publicAnswer = [{ address: '93.184.216.34', family: 4 }];
  const fakeResolver = (answers: typeof publicAnswer) => ((_host: unknown, _options: unknown, callback: Function) => callback(null, answers)) as Parameters<typeof checkedDnsLookup>[1];
  await assert.rejects(checkedDnsLookup('example.com', fakeResolver([...publicAnswer, { address: '127.0.0.1', family: 4 }])), /CRAWLER_DESTINATION_BLOCKED/);
  assert.deepEqual(await checkedDnsLookup('example.com', fakeResolver(publicAnswer)), publicAnswer);
});

test('isolated HTML parser deadline terminates its worker', async () => {
  const { parseHtmlPrices } = await import('./price-parser-worker');
  await assert.rejects(parseHtmlPrices('<table></table>', 'https://example.com', 1), /CRAWLER_PARSE_TIMEOUT/);
});

test('parsed prices round half-cents away from zero like quotation money', () => {
  assert.equal(parseTurkishPrice('12.345,675 TL'), 12345.68);
  assert.equal(parseTurkishPrice('0,335 TL'), 335);
});
