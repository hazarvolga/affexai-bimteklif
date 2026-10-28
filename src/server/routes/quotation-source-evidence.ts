type EvidenceRecord = { evidenceType: string; sourceCellRange: string | null; capturedValueJson: unknown };
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() && v.length <= 200 ? v : null;
const amount = (v: unknown): string | null => {
  if ((typeof v !== 'string' && typeof v !== 'number') || String(v).trim() === '') return null;
  const value = String(v);
  return /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? value : null;
};

/** Whitelist only the evidence fields that a quotation reader needs. */
export function publicQuotationSourceEvidence(records: EvidenceRecord[]) {
  return {
    quantity: records.filter(row => row.evidenceType === 'quantity').map(row => {
      const payload = record(row.capturedValueJson), review = record(payload.review);
      return { quantity: amount(payload.quantity), unit: text(payload.unit), sourceCellRange: text(row.sourceCellRange), reviewStatus: ['approved', 'accepted_exception', 'rejected', 'pending_review'].includes(String(review.status)) ? String(review.status) : null };
    }),
    price: records.filter(row => row.evidenceType === 'price').map(row => {
      const payload = record(row.capturedValueJson);
      const capturedAmount = amount(payload.amount ?? payload.price);
      const reason = typeof payload.zeroPriceReason === 'string' && payload.zeroPriceReason.trim().length > 0 && payload.zeroPriceReason.length <= 2000 ? payload.zeroPriceReason.trim() : null;
      return { amount: capturedAmount, currency: text(payload.currency), unit: text(payload.unit), zeroPriceReason: payload.source === 'manual_zero_override' && capturedAmount !== null && Number(capturedAmount) === 0 ? reason : null };
    }),
  };
}
