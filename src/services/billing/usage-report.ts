import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { plans, subscriptions, usageLogs, usageRecords } from "../../db/schema";
import { PLAN_LIMITS } from "./limits";
import { describeQuotationAllowance, quotaUnavailable } from "./quota-policy";
import { AI_USAGE_FEATURE, aiMonthlyLimit } from './ai-quota';

export async function readBillingUsage(companyId: string, at?: Date) {
  return db.transaction(async tx => {
    const now = at ?? new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
    const [plan] = subscription?.planId ? await tx.select().from(plans).where(eq(plans.id, subscription.planId)) : [];
    const allowance = describeQuotationAllowance(subscription, plan, now);
    const counters = await tx.select({ count: usageRecords.quoteCount }).from(usageRecords)
      .where(and(eq(usageRecords.companyId, companyId), eq(usageRecords.period, allowance.period)));
    if (counters.some(row => !Number.isSafeInteger(row.count) || row.count < 0)) throw quotaUnavailable();
    const current = counters.reduce((sum, row) => sum + row.count, 0);
    if (!Number.isSafeInteger(current)) throw quotaUnavailable();
    const stats = await tx.select({ feature: usageLogs.feature, count: sql<string>`sum(${usageLogs.count})`, cost: sql<string>`sum(${usageLogs.costEstimate})` })
      .from(usageLogs).where(and(eq(usageLogs.companyId, companyId), gte(usageLogs.date, start), lt(usageLogs.date, end)))
      .groupBy(usageLogs.feature);
    const legacyLimits = subscription ? PLAN_LIMITS[subscription.plan] : undefined;
    const reason = allowance.reason ?? (allowance.limit !== null && current >= allowance.limit ? "QUOTA_EXCEEDED" : null);
    const usage = Object.keys(PLAN_LIMITS.starter).map(feature => {
      const stat = stats.find(row => row.feature === feature);
      const isQuote = feature === "QUOTATION_CREATED";
      const isAi = feature === AI_USAGE_FEATURE;
      const enforced = isQuote || isAi;
      const featureCurrent = isQuote ? current : Number(stat?.count ?? 0);
      const featureLimit = isQuote ? allowance.limit : isAi && subscription ? aiMonthlyLimit(subscription.plan) : legacyLimits?.[feature as keyof typeof PLAN_LIMITS.starter] ?? null;
      const featureReason = isQuote ? reason : allowance.reason ?? (featureLimit !== null && featureCurrent >= featureLimit ? 'AI_QUOTA_EXCEEDED' : null);
      return {
        feature, current: featureCurrent,
        limit: featureLimit,
        cost: Number(stat?.cost ?? 0), enforced,
        source: isQuote ? "usage_records" : "usage_logs",
        ...(isAi ? { countingPolicy: 'provider_attempts_reserved_before_execution' } : {}),
        ...(enforced ? { available: featureReason === null, reason: featureReason, remaining: featureReason === null ? Math.max(0, featureLimit! - featureCurrent) : 0 } : {}),
      };
    });
    return {
      plan: plan?.name ?? (subscription?.planId ? "unavailable" : subscription?.plan ?? "unavailable"),
      planId: subscription?.planId ?? null, subscriptionStatus: subscription?.status ?? "missing", usage,
      totalMonthlyCost: usage.reduce((sum, row) => sum + row.cost, 0),
      period: { key: allowance.period, start, end, timezone: "UTC", asOf: now },
      payments: { available: false, upgradeAvailable: false },
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
