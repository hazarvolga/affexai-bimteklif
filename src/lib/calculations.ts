/**
 * Core Calculation Engine for Quotations
 * Handles VAT, Discounts, and Multi-currency totals.
 */

export interface LineItem {
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  discountPercent?: number | string | null;
  vatPercent?: number | string | null;
}

export interface CalculationResult {
  subtotal: number;
  discountTotal: number;
  /** Contractor profit and overhead on the net subtotal (release 0029). Zero when no percentage is set. */
  overheadProfitTotal: number;
  vatTotal: number;
  grandTotal: number;
}

export interface QuotationTotalsOptions {
  /** "Müteahhitlik kârı ve genel gider" percentage on the net of each line; VAT applies to net plus this share. */
  overheadProfitPercent?: number | string | null;
}

/** Reads a stored or submitted percentage; anything outside 0–100 is refused rather than clamped. */
export function normalizeOverheadProfitPercent(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) throw new RangeError("OVERHEAD_PROFIT_PERCENT_INVALID");
  return parsed;
}

export interface NormalizedLineItem {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
}

export function toFiniteNumber(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Kuruş hassasiyetinde, ikili kayan nokta hatasından arındırılmış yuvarlama.
 * Yarım değerler sıfırdan uzağa yuvarlanır (1.005 → 1.01, -1.005 → -1.01).
 * `Number(x.toFixed(2))` bu durumda 1.00 verir; bu fonksiyon onu düzeltir.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * toCents(Math.abs(value))) / 100 || 0;
}

// Ondalık gösterimi kaydırarak (1.005 → "1.005e2" → 100.5) ikili hatayı önler.
// Üstel gösterimli çok küçük/büyük sayılarda klasik çarpmaya düşer.
function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const text = String(abs);
  const shifted = text.includes("e") ? abs * 100 : Number(`${text}e2`);
  return sign * Math.round(shifted);
}
const fromCents = (cents: number) => cents / 100;

export interface LineBreakdown {
  gross: number;
  discount: number;
  net: number;
  vat: number;
  total: number;
}

/**
 * Tek satırın kuruşa yuvarlanmış bileşenleri. Her bileşen satırda yuvarlanır;
 * teklif toplamları bu yuvarlanmış satırların toplamıdır. Böylece PDF'te görünen
 * satır toplamlarının toplamı her zaman ara toplamla birebir eşittir.
 */
export function calculateLineBreakdown(item: LineItem): LineBreakdown {
  const normalized = normalizeLineItem(item);
  const gross = roundMoney(normalized.quantity * normalized.unitPrice);
  const discount = roundMoney(gross * (normalized.discountPercent / 100));
  const net = fromCents(toCents(gross) - toCents(discount));
  const vat = roundMoney(net * (normalized.vatPercent / 100));
  return { gross, discount, net, vat, total: fromCents(toCents(net) + toCents(vat)) };
}

export function normalizeLineItem(item: LineItem): NormalizedLineItem {
  return {
    quantity: toFiniteNumber(item.quantity),
    unitPrice: toFiniteNumber(item.unitPrice),
    discountPercent: toFiniteNumber(item.discountPercent),
    vatPercent: toFiniteNumber(item.vatPercent, 20),
  };
}

export function validateLineItem(item: LineItem & { description?: unknown; unit?: unknown }, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const quantity = toFiniteNumber(item.quantity, Number.NaN);
  const unitPrice = toFiniteNumber(item.unitPrice, Number.NaN);
  const discountPercent = toFiniteNumber(item.discountPercent, Number.NaN);
  const vatPercent = toFiniteNumber(item.vatPercent, Number.NaN);

  if (typeof item.description !== "string" || !item.description.trim()) issues.push({ code: "DESCRIPTION_REQUIRED", field: `items.${index}.description`, message: "Kalem açıklaması zorunludur." });
  if (typeof item.unit !== "string" || !item.unit.trim()) issues.push({ code: "UNIT_REQUIRED", field: `items.${index}.unit`, message: "Kalem birimi zorunludur." });
  if (!Number.isFinite(quantity) || quantity <= 0) issues.push({ code: "QUANTITY_INVALID", field: `items.${index}.quantity`, message: "Miktar sıfırdan büyük, geçerli bir sayı olmalıdır." });
  if (!Number.isFinite(unitPrice) || unitPrice < 0) issues.push({ code: "UNIT_PRICE_INVALID", field: `items.${index}.unitPrice`, message: "Birim fiyat geçerli ve negatif olmayan bir sayı olmalıdır." });
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) issues.push({ code: "DISCOUNT_INVALID", field: `items.${index}.discountPercent`, message: "İskonto yüzde 0 ile 100 arasında olmalıdır." });
  if (!Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) issues.push({ code: "VAT_INVALID", field: `items.${index}.vatPercent`, message: "KDV yüzde 0 ile 100 arasında olmalıdır." });
  return issues;
}

export function validateQuotationItems(items: Array<LineItem & { description?: unknown; unit?: unknown }>): ValidationIssue[] {
  if (!Array.isArray(items) || items.length === 0) return [{ code: "ITEMS_REQUIRED", field: "items", message: "Teklifte en az bir kalem bulunmalıdır." }];
  return items.flatMap((item, index) => validateLineItem(item, index));
}

/**
 * Calculates totals for a single line item
 */
export function calculateLineItemTotal(item: LineItem): number {
  return calculateLineBreakdown(item).net;
}

/**
 * Aggregates all line items into a full quotation summary
 */
export function calculateQuotationTotals(items: readonly LineItem[], options: QuotationTotalsOptions = {}): CalculationResult {
  const overheadProfitPercent = normalizeOverheadProfitPercent(options.overheadProfitPercent);
  let subtotal = 0;
  let discountTotal = 0;
  let overheadProfitTotal = 0;
  let vatTotal = 0;

  for (const item of items) {
    const line = calculateLineBreakdown(item);
    subtotal += toCents(line.gross);
    discountTotal += toCents(line.discount);
    if (overheadProfitPercent === 0) {
      vatTotal += toCents(line.vat);
      continue;
    }
    // Per line, so lines with different VAT rates carry VAT on their own share of profit and overhead.
    const share = roundMoney(line.net * (overheadProfitPercent / 100));
    overheadProfitTotal += toCents(share);
    vatTotal += toCents(roundMoney((line.net + share) * (normalizeLineItem(item).vatPercent / 100)));
  }

  return {
    subtotal: fromCents(subtotal),
    discountTotal: fromCents(discountTotal),
    overheadProfitTotal: fromCents(overheadProfitTotal),
    vatTotal: fromCents(vatTotal),
    grandTotal: fromCents(subtotal - discountTotal + overheadProfitTotal + vatTotal),
  };
}
