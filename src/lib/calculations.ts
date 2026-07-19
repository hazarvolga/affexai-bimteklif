/**
 * Core Calculation Engine for Quotations
 * Handles VAT, Discounts, and Multi-currency totals.
 */

export interface LineItem {
  quantity: number | string | null | undefined;
  unitPrice: number | string | null | undefined;
  discountPercent: number | string | null | undefined;
  vatPercent: number | string | null | undefined;
}

export interface CalculationResult {
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
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

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
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
  const normalized = normalizeLineItem(item);
  const base = normalized.quantity * normalized.unitPrice;
  const discount = base * (normalized.discountPercent / 100);
  return roundMoney(base - discount);
}

/**
 * Aggregates all line items into a full quotation summary
 */
export function calculateQuotationTotals(items: LineItem[]): CalculationResult {
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  items.forEach((item) => {
    const normalized = normalizeLineItem(item);
    const rawBase = normalized.quantity * normalized.unitPrice;
    const discount = rawBase * (normalized.discountPercent / 100);
    const lineSubtotal = rawBase - discount;
    const vat = lineSubtotal * (normalized.vatPercent / 100);

    subtotal += rawBase;
    discountTotal += discount;
    vatTotal += vat;
  });

  return {
    subtotal: roundMoney(subtotal),
    discountTotal: roundMoney(discountTotal),
    vatTotal: roundMoney(vatTotal),
    grandTotal: roundMoney(subtotal - discountTotal + vatTotal),
  };
}
