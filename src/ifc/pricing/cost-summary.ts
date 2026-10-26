/**
 * Cost roll-up for the IFC icmal. A missing unit price is unknown, never zero: totals cover priced items
 * only, the summary states how many items still wait for a price, and per-unit figures are withheld until
 * every item is priced (marka.md M-14.1, M-13.9).
 */

export interface CostSummaryItem {
  id: string;
  netQuantity: number;
}

export interface CostSummaryGroup {
  key: string;
  title: string;
  items: readonly CostSummaryItem[];
}

export interface CostSummaryInput {
  groups: readonly CostSummaryGroup[];
  /** Only items present here with a finite value count as priced; an explicit 0 is a price. */
  unitPrices: Readonly<Record<string, number>>;
  overheadPercent: number;
  residentialUnitCount: number;
  grossM2: number | null;
}

/** empty: nothing to price · none: no item priced · partial: some priced · complete: all priced */
export type CostSummaryStatus = "empty" | "none" | "partial" | "complete";

export interface CostGroupTotal {
  key: string;
  title: string;
  pricedSubtotal: number;
  itemCount: number;
  missingItemCount: number;
}

export interface CostSummary {
  status: CostSummaryStatus;
  itemCount: number;
  pricedItemCount: number;
  missingItemCount: number;
  groupTotals: CostGroupTotal[];
  pricedDirectTotal: number;
  overheadAmount: number;
  pricedGrandTotal: number;
  /** Null when any price is missing or the apartment count is unknown. */
  perApartment: number | null;
  /** Null when any price is missing or the gross area is unknown. */
  perGrossM2: number | null;
}

export function isPriced(unitPrices: Readonly<Record<string, number>>, itemId: string): boolean {
  return Object.hasOwn(unitPrices, itemId) && Number.isFinite(unitPrices[itemId]);
}

function statusOf(itemCount: number, pricedItemCount: number): CostSummaryStatus {
  if (itemCount === 0) return "empty";
  if (pricedItemCount === 0) return "none";
  return pricedItemCount === itemCount ? "complete" : "partial";
}

export function summarizeCost(input: CostSummaryInput): CostSummary {
  const groupTotals = input.groups.map((group): CostGroupTotal => {
    const priced = group.items.filter(item => isPriced(input.unitPrices, item.id));
    return {
      key: group.key,
      title: group.title,
      pricedSubtotal: priced.reduce((sum, item) => sum + item.netQuantity * input.unitPrices[item.id], 0),
      itemCount: group.items.length,
      missingItemCount: group.items.length - priced.length,
    };
  });
  const itemCount = groupTotals.reduce((sum, group) => sum + group.itemCount, 0);
  const missingItemCount = groupTotals.reduce((sum, group) => sum + group.missingItemCount, 0);
  const pricedItemCount = itemCount - missingItemCount;
  const status = statusOf(itemCount, pricedItemCount);
  const pricedDirectTotal = groupTotals.reduce((sum, group) => sum + group.pricedSubtotal, 0);
  const overheadAmount = pricedDirectTotal * (input.overheadPercent / 100);
  const pricedGrandTotal = pricedDirectTotal + overheadAmount;
  const complete = status === "complete";
  return {
    status,
    itemCount,
    pricedItemCount,
    missingItemCount,
    groupTotals,
    pricedDirectTotal,
    overheadAmount,
    pricedGrandTotal,
    perApartment: complete && input.residentialUnitCount > 0 ? pricedGrandTotal / input.residentialUnitCount : null,
    perGrossM2: complete && input.grossM2 !== null && input.grossM2 > 0 ? pricedGrandTotal / input.grossM2 : null,
  };
}
