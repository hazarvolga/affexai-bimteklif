import crypto from "node:crypto";
import { fetchCrawlerHtml } from "./safe-fetch";
import { parseHtmlPrices } from "./price-parser-worker";
export { parseTurkishPrice } from "./price-parser";

export interface CrawledPriceItem {
  itemCode: string;
  itemName: string;
  unit: string;
  currentPrice: number | null;
  crawledPrice: number;
  diffPercent: number | null;
  confidenceScore: number;
  notes: string;
  sourceUrl: string;
}

export interface CrawlerSourceInput {
  id: string;
  code: string;
  name: string;
  category: string;
  sourceUrl: string | null;
  crawlerConfig?: Record<string, unknown> | null;
}

export interface CrawlResult {
  sourceId: string;
  sourceCode: string;
  sourceName: string;
  status: "success" | "partial" | "error";
  itemsCount: number;
  items: CrawledPriceItem[];
  dataHash: string;
  crawledAt: Date;
  durationMs: number;
  errorMessage?: string;
}


// Official adapters must provide actual period/unit/source evidence before activation.
function unsupportedOfficialSource(source: CrawlerSourceInput): boolean {
  const host = source.sourceUrl ? new URL(source.sourceUrl).hostname.toLowerCase() : '';
  return ['tuik_index', 'official_gazette'].includes(source.category) ||
    /^(csb|tuik)_/.test(source.code) || ['csb.gov.tr', 'tuik.gov.tr'].some(domain => host === domain || host.endsWith(`.${domain}`));
}

let activeCrawl = false;

export class PriceCrawlerService {
  constructor(private readonly fetchHtml: (url: string) => Promise<string> = fetchCrawlerHtml) {}

  async crawlSource(source: CrawlerSourceInput): Promise<CrawlResult> {
    const startTime = Date.now();
    let admitted = false;
    try {
      if (unsupportedOfficialSource(source)) throw new Error('PRICE_SOURCE_ADAPTER_UNSUPPORTED');
      if (!source.sourceUrl) throw new Error('PRICE_SOURCE_URL_REQUIRED');
      if (activeCrawl) throw new Error('CRAWLER_BUSY');
      activeCrawl = true;
      admitted = true;
      const html = await this.fetchHtml(source.sourceUrl);
      const items = await parseHtmlPrices(html, source.sourceUrl);
      return {
        sourceId: source.id, sourceCode: source.code, sourceName: source.name,
        status: items.length ? 'success' : 'partial', itemsCount: items.length, items,
        dataHash: crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex'),
        crawledAt: new Date(), durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        sourceId: source.id, sourceCode: source.code, sourceName: source.name,
        status: 'error', itemsCount: 0, items: [], dataHash: '',
        crawledAt: new Date(), durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'CRAWLER_FAILED',
      };
    } finally {
      if (admitted) activeCrawl = false;
    }
  }
}

export const priceCrawlerService = new PriceCrawlerService();
