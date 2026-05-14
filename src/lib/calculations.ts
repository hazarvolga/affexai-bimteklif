/**
 * Core Calculation Engine for Quotations
 * Handles VAT, Discounts, and Multi-currency totals.
 */

export interface LineItem {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
}

export interface CalculationResult {
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
}

/**
 * Calculates totals for a single line item
 */
export function calculateLineItemTotal(item: LineItem): number {
  const base = item.quantity * item.unitPrice;
  const discount = base * (item.discountPercent / 100);
  return base - discount;
}

/**
 * Aggregates all line items into a full quotation summary
 */
export function calculateQuotationTotals(items: LineItem[]): CalculationResult {
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  items.forEach((item) => {
    const rawBase = item.quantity * item.unitPrice;
    const discount = rawBase * (item.discountPercent / 100);
    const lineSubtotal = rawBase - discount;
    const vat = lineSubtotal * (item.vatPercent / 100);

    subtotal += rawBase;
    discountTotal += discount;
    vatTotal += vat;
  });

  return {
    subtotal,
    discountTotal,
    vatTotal,
    grandTotal: subtotal - discountTotal + vatTotal,
  };
}
