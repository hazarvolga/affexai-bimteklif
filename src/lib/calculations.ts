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
