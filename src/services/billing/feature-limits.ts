import type { plans, subscriptions } from "../../db/schema";
import { PLAN_LIMITS } from "./limits";
import { QuotaError } from "./quota-policy";

/** Monthly usage-log features limited per package, and the plan column that owns each limit. */
export const METERED_FEATURES = {
  AI_QUOTATION_GENERATED: "monthlyAiLimit",
  PDF_GENERATED: "monthlyPdfLimit",
  CRM_ACTION_EXECUTED: "monthlyCrmLimit",
  REGULATION_CHECK_RUN: "monthlyRegulationLimit",
  PROFIT_ANALYSIS_RUN: "monthlyProfitAnalysisLimit",
} as const;

export type MeteredFeature = keyof typeof METERED_FEATURES;
type LimitColumn = (typeof METERED_FEATURES)[MeteredFeature];
type Subscription = Pick<typeof subscriptions.$inferSelect, "planId" | "plan">;
type Plan = Pick<typeof plans.$inferSelect, "id" | LimitColumn>;

const CODE_PREFIX: Record<MeteredFeature, string> = {
  AI_QUOTATION_GENERATED: "AI",
  PDF_GENERATED: "PDF",
  CRM_ACTION_EXECUTED: "CRM",
  REGULATION_CHECK_RUN: "REGULATION",
  PROFIT_ANALYSIS_RUN: "PROFIT_ANALYSIS",
};

export function isMeteredFeature(feature: string): feature is MeteredFeature {
  return Object.hasOwn(METERED_FEATURES, feature);
}

export function quotaCodes(feature: MeteredFeature) {
  const prefix = CODE_PREFIX[feature];
  return { exceeded: `${prefix}_QUOTA_EXCEEDED`, unavailable: `${prefix}_QUOTA_UNAVAILABLE` };
}

export const featureQuotaUnavailable = (feature: MeteredFeature) =>
  new QuotaError(503, quotaCodes(feature).unavailable, "Feature quota is temporarily unavailable");

/**
 * The linked plan row owns the limit, and a NULL column is unavailable rather than a legacy limit.
 * Only legacy subscriptions without a linked plan still read the enum limits.
 */
export function featureMonthlyLimit(subscription: Subscription, plan: Plan | undefined, feature: MeteredFeature): number {
  if (subscription.planId && plan?.id !== subscription.planId) throw featureQuotaUnavailable(feature);
  const limit = subscription.planId ? plan![METERED_FEATURES[feature]] : PLAN_LIMITS[subscription.plan]?.[feature];
  if (!Number.isSafeInteger(limit) || limit! < 0) throw featureQuotaUnavailable(feature);
  return limit!;
}
