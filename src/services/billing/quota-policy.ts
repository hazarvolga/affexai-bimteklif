import type { plans, subscriptions } from "../../db/schema";
import { PLAN_LIMITS } from "./limits";

export class QuotaError extends Error {
  constructor(readonly status: 403 | 503, readonly code: string, message: string,
    readonly details?: { limit: number; current: number; period: string }) {
    super(message);
  }
}

export const quotaUnavailable = () => new QuotaError(503, "QUOTA_UNAVAILABLE", "Quotation quota is temporarily unavailable");

type Subscription = Pick<typeof subscriptions.$inferSelect, "planId" | "plan" | "status" | "bonusQuoteLimit" | "currentPeriodStart" | "currentPeriodEnd">;
type Plan = Pick<typeof plans.$inferSelect, "id" | "monthlyQuoteLimit" | "isActive"> & { isTrial?: boolean };
type WindowSubscription = Pick<typeof subscriptions.$inferSelect, "planId" | "currentPeriodStart" | "currentPeriodEnd">;

/**
 * Paid plans count per calendar month. A trial counts once over its own period, so a trial that
 * crosses a month boundary does not receive a second allowance.
 */
export function quotaWindow(subscription: WindowSubscription | undefined, plan: { id: string; isTrial?: boolean } | undefined, now: Date) {
  const start = subscription?.currentPeriodStart;
  const end = subscription?.currentPeriodEnd;
  if (subscription && plan?.isTrial && plan.id === subscription.planId && start && end) {
    return { period: start.toISOString().slice(0, 10), start, end };
  }
  return {
    period: now.toISOString().slice(0, 7),
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export function describeQuotationAllowance(subscription: Subscription | undefined, plan: Plan | undefined, now: Date) {
  if (!Number.isFinite(now.getTime())) throw quotaUnavailable();
  const { period } = quotaWindow(subscription, plan, now);
  if (!subscription) return { period, limit: null, reason: "SUBSCRIPTION_REQUIRED" };
  const start = subscription.currentPeriodStart?.getTime();
  const end = subscription.currentPeriodEnd?.getTime();
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(start) || (end !== undefined && !Number.isFinite(end))) throw quotaUnavailable();
  const matchingPlan = plan?.id === subscription.planId;
  const base = subscription.planId ? (matchingPlan ? plan!.monthlyQuoteLimit : null) : PLAN_LIMITS[subscription.plan]?.QUOTATION_CREATED;
  const bonus = subscription.bonusQuoteLimit;
  if (!Number.isSafeInteger(bonus) || bonus < 0 || (base !== null && (!Number.isSafeInteger(base) || base < 0 || !Number.isSafeInteger(base + bonus)))) throw quotaUnavailable();
  const inactive = subscription.status !== "active" || start > now.getTime() || (end !== undefined && now.getTime() >= end);
  const reason = inactive ? "SUBSCRIPTION_INACTIVE" : subscription.planId && (!matchingPlan || !plan!.isActive) ? "PLAN_UNAVAILABLE" : null;
  // Calendar quota for paid plans, not subscription anniversary billing. A bonus is a period allowance.
  return { limit: base === null ? null : base + bonus, period, reason };
}

export function quotationAllowance(subscription: Subscription | undefined, plan: Plan | undefined, now: Date) {
  const state = describeQuotationAllowance(subscription, plan, now);
  if (state.reason || state.limit === null) {
    throw new QuotaError(403, state.reason ?? "PLAN_UNAVAILABLE", "An active subscription and plan within their validity period are required");
  }
  return { limit: state.limit, period: state.period };
}
