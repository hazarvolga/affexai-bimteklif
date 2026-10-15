export type BillingCycleId = "monthly" | "semi_annual" | "yearly" | "biennial";

export interface BillingPeriodOption {
  id: BillingCycleId;
  label: string;
  shortLabel: string;
  months: number;
  discountPercent: number;
  durationDays: number;
  badge: string | null;
}

export const BILLING_PERIOD_OPTIONS: readonly BillingPeriodOption[] = [
  {
    id: "monthly",
    label: "Aylık",
    shortLabel: "1 Ay",
    months: 1,
    discountPercent: 0,
    durationDays: 30,
    badge: null,
  },
  {
    id: "semi_annual",
    label: "6 Aylık",
    shortLabel: "6 Ay",
    months: 6,
    discountPercent: 10,
    durationDays: 180,
    badge: "%10 İndirim",
  },
  {
    id: "yearly",
    label: "1 Yıllık",
    shortLabel: "12 Ay",
    months: 12,
    discountPercent: 20,
    durationDays: 365,
    badge: "%20 İndirim",
  },
  {
    id: "biennial",
    label: "2 Yıllık",
    shortLabel: "24 Ay",
    months: 24,
    discountPercent: 30,
    durationDays: 730,
    badge: "%30 İndirim",
  },
] as const;

export const BILLING_CYCLE_IDS = ["monthly", "semi_annual", "yearly", "biennial"] as const;

export function isBillingCycleId(value: unknown): value is BillingCycleId {
  return (
    value === "monthly" ||
    value === "semi_annual" ||
    value === "yearly" ||
    value === "biennial"
  );
}

export function normalizeBillingCycle(value: unknown): BillingCycleId {
  return isBillingCycleId(value) ? value : "monthly";
}

export function getBillingPeriodOption(cycle: unknown): BillingPeriodOption {
  const normalized = normalizeBillingCycle(cycle);
  return (
    BILLING_PERIOD_OPTIONS.find((opt) => opt.id === normalized) ??
    BILLING_PERIOD_OPTIONS[0]
  );
}

export interface BillingPeriodPricing {
  cycle: BillingCycleId;
  label: string;
  shortLabel: string;
  months: number;
  durationDays: number;
  discountPercent: number;
  baseMonthlyPriceTry: number;
  effectiveMonthlyPriceTry: number;
  totalBeforeDiscountTry: number;
  totalPayableTry: number;
  discountAmountTry: number;
}

export function calculateBillingPeriodPricing(
  monthlyPriceTry: number,
  cycle: unknown = "monthly",
): BillingPeriodPricing {
  const option = getBillingPeriodOption(cycle);
  const safeBase = Math.max(0, Math.round(Number(monthlyPriceTry) || 0));

  if (safeBase <= 0) {
    return {
      cycle: option.id,
      label: option.label,
      shortLabel: option.shortLabel,
      months: 1,
      durationDays: 14,
      discountPercent: 0,
      baseMonthlyPriceTry: 0,
      effectiveMonthlyPriceTry: 0,
      totalBeforeDiscountTry: 0,
      totalPayableTry: 0,
      discountAmountTry: 0,
    };
  }

  const effectiveMonthlyPriceTry = Math.round(
    (safeBase * (100 - option.discountPercent)) / 100,
  );
  const totalBeforeDiscountTry = safeBase * option.months;
  const totalPayableTry = effectiveMonthlyPriceTry * option.months;
  const discountAmountTry = Math.max(0, totalBeforeDiscountTry - totalPayableTry);

  return {
    cycle: option.id,
    label: option.label,
    shortLabel: option.shortLabel,
    months: option.months,
    durationDays: option.durationDays,
    discountPercent: option.discountPercent,
    baseMonthlyPriceTry: safeBase,
    effectiveMonthlyPriceTry,
    totalBeforeDiscountTry,
    totalPayableTry,
    discountAmountTry,
  };
}

export function formatBillingCycleLabel(cycle: unknown): string {
  const option = getBillingPeriodOption(cycle);
  if (option.discountPercent > 0) {
    return `${option.label} (%${option.discountPercent} İndirim)`;
  }
  return option.label;
}
