type PriceItem = { id: string; unitPrice: string | number; priceSource: string; priceSnapshotId: string | null; sourceQuantityRowId: string | null };
type PriceRow = { id: string; rawPrice: string | null; normalizedPrice: string | null };
type PriceEvidence = { itemId: string | null; source: unknown; zeroPriceReason?: unknown; price?: unknown; createdByUserId?: string | null };

/** Historical document transfers could coerce a missing price to zero. */
export class PdfPriceSourceUncertainError extends Error {
  readonly code = 'PDF_PRICE_SOURCE_UNCERTAIN';
  constructor() {
    super('Fiyat kaynağı belirsiz; satırı yeniden doğrulayın.');
    this.name = 'PdfPriceSourceUncertainError';
  }
}

export function assertPdfPriceSourcesCertain(items: readonly PriceItem[], rows: readonly PriceRow[], evidence: readonly PriceEvidence[]): void {
  const rowsById = new Map(rows.map(row => [row.id, row]));
  for (const item of items) {
    if (Number(item.unitPrice) !== 0) continue;
    if (item.priceSource === 'manual' && item.sourceQuantityRowId) {
      const supported = evidence.some(entry => entry.itemId === item.id && entry.source === 'manual_zero_override' && typeof entry.zeroPriceReason === 'string' && Boolean(entry.zeroPriceReason.trim()) && Boolean(entry.createdByUserId) && (entry.price === 0 || (typeof entry.price === 'string' && /^0(?:\.0+)?$/.test(entry.price.trim()))));
      if (!supported) throw new PdfPriceSourceUncertainError();
      continue;
    }
    if (item.priceSource !== 'document') continue;
    if (!item.sourceQuantityRowId) throw new PdfPriceSourceUncertainError();
    const row = rowsById.get(item.sourceQuantityRowId);
    // A missing source cannot distinguish a legacy coercion from an explicit zero override.
    const hasMatchingSource = evidence.some(entry => entry.itemId === item.id && typeof entry.source === 'string' && entry.source.trim() !== '' && entry.source.trim() === row?.rawPrice?.trim());
    if (!row || !row.rawPrice?.trim() || row.normalizedPrice == null || Number(row.normalizedPrice) !== 0 || !hasMatchingSource) {
      throw new PdfPriceSourceUncertainError();
    }
  }
}
