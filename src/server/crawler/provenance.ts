export const LIVE_PRICE_PROVENANCE = '[live-html-v1]';

/** Legacy rows have no source extraction proof; they must be re-crawled. */
export function canApproveCrawlerPrice(row: { notes?: string | null; sourceUrl?: string | null; crawledPrice: string | number }): boolean {
  const price = Number(row.crawledPrice);
  if (!row.notes || !/^(?:\[Gece Otomatik Tarama\] )?\[live-html-v1\] /.test(row.notes) || !row.sourceUrl || !Number.isFinite(price) || price <= 0) return false;
  try {
    const url = new URL(row.sourceUrl);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}
