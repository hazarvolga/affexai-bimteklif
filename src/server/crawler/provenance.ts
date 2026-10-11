export const LIVE_PRICE_PROVENANCE = '[live-html-v1]';

/** Legacy rows have no source extraction proof; they must be re-crawled. */
export function canApproveCrawlerPrice(row: { notes?: string | null; sourceUrl?: string | null; crawledPrice: string | number }): boolean {
  const price = Number(row.crawledPrice);
  if (row.notes?.startsWith('[licensed-csv-v1] ')) {
    try {
      const proof = JSON.parse(row.notes.slice('[licensed-csv-v1] '.length).split(' | İnceleme:')[0]);
      return proof.kind === 'licensed-csv-v1' && /^[a-f0-9]{64}$/.test(proof.documentHash)
        && typeof proof.licenseReference === 'string' && proof.licenseReference.length >= 5
        && typeof proof.licenseConfirmedBy === 'string' && Number.isInteger(proof.row) && proof.row >= 2
        && Number.isFinite(price) && price > 0;
    } catch { return false; }
  }
  if (!row.notes || !/^(?:\[Gece Otomatik Tarama\] )?\[live-html-v1\] /.test(row.notes) || !row.sourceUrl || !Number.isFinite(price) || price <= 0) return false;
  try {
    const url = new URL(row.sourceUrl);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}
