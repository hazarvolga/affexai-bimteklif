import { and, eq, gte, lt, sql } from "drizzle-orm";
import { withAppTenantTransaction } from "../../db/app-tenant";
import type { TenantContext } from "../../db/tenant-context";
import { plans, subscriptions, usageLogs, usageRecords } from "../../db/schema";
import { PLAN_LIMITS } from "./limits";
import { describeQuotationAllowance, quotaUnavailable, quotaWindow } from "./quota-policy";
import { AI_USAGE_FEATURE } from './ai-quota';
import { featureMonthlyLimit, isMeteredFeature, quotaCodes } from './feature-limits';

// A malformed limit makes that feature unavailable in the report; it never hides the whole report.
const limitOrNull = (read: () => number) => { try { return read(); } catch { return null; } };

export async function readBillingUsage(actor: TenantContext, at?: Date) {
  const { companyId } = actor;
  return withAppTenantTransaction(actor, async tx => {
    const now = at ?? new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
    const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
    const [plan] = subscription?.planId ? await tx.select().from(plans).where(eq(plans.id, subscription.planId)) : [];
    const { start, end } = quotaWindow(subscription, plan, now);
    const allowance = describeQuotationAllowance(subscription, plan, now);
    const counters = await tx.select({ count: usageRecords.quoteCount, ifcCount: usageRecords.ifcCount }).from(usageRecords)
      .where(and(eq(usageRecords.companyId, companyId), eq(usageRecords.period, allowance.period)));
    if (counters.some(row => !Number.isSafeInteger(row.count) || row.count < 0)) throw quotaUnavailable();
    const current = counters.reduce((sum, row) => sum + row.count, 0);
    if (!Number.isSafeInteger(current)) throw quotaUnavailable();
    const ifcCurrent = counters.reduce((sum, row) => sum + Math.max(0, Number(row.ifcCount ?? 0)), 0);
    const stats = await tx.select({ feature: usageLogs.feature, count: sql<string>`sum(${usageLogs.count})`, cost: sql<string>`sum(${usageLogs.costEstimate})` })
      .from(usageLogs).where(and(eq(usageLogs.companyId, companyId), gte(usageLogs.date, start), lt(usageLogs.date, end)))
      .groupBy(usageLogs.feature);
    const reason = allowance.reason ?? (allowance.limit !== null && current >= allowance.limit ? "QUOTA_EXCEEDED" : null);
    // Every feature reads the same plan row that enforcement uses (P0-6).
    const usage = Object.keys(PLAN_LIMITS.starter).map(feature => {
      const stat = stats.find(row => row.feature === feature);
      const isQuote = feature === "QUOTATION_CREATED";
      const metered = isMeteredFeature(feature) ? feature : null;
      const enforced = isQuote || metered !== null;
      const featureCurrent = isQuote ? current : Number(stat?.count ?? 0);
      const featureLimit = isQuote ? allowance.limit : metered && subscription ? limitOrNull(() => featureMonthlyLimit(subscription, plan, metered)) : null;
      const featureReason = isQuote ? reason : allowance.reason
        ?? (metered && subscription && featureLimit === null ? quotaCodes(metered).unavailable : null)
        ?? (metered && featureLimit !== null && featureCurrent >= featureLimit ? quotaCodes(metered).exceeded : null);
      return {
        feature, current: featureCurrent,
        limit: featureLimit,
        cost: Number(stat?.cost ?? 0), enforced,
        source: isQuote ? "usage_records" : "usage_logs",
        ...(feature === AI_USAGE_FEATURE ? { countingPolicy: 'provider_attempts_reserved_before_execution' } : metered ? { countingPolicy: 'reserved_before_execution_released_on_failure' } : {}),
        ...(enforced ? { available: featureReason === null, reason: featureReason, remaining: featureReason === null ? Math.max(0, featureLimit! - featureCurrent) : 0 } : {}),
      };
    });
    const ifcLimit = plan ? plan.monthlyIfcLimit : null;
    const ifcReason = allowance.reason ?? (ifcLimit !== null && ifcCurrent >= ifcLimit ? "IFC_QUOTA_EXCEEDED" : null);
    usage.push({
      feature: "IFC_IMPORTED",
      current: ifcCurrent,
      limit: ifcLimit,
      cost: 0,
      enforced: ifcLimit !== null,
      source: "usage_records",
      ...(ifcLimit !== null ? {
        available: ifcReason === null,
        reason: ifcReason,
        remaining: ifcReason === null ? Math.max(0, ifcLimit - ifcCurrent) : 0,
      } : {}),
    });
    return {
      plan: plan?.name ?? (subscription?.planId ? "unavailable" : subscription?.plan ?? "unavailable"),
      planId: subscription?.planId ?? null, subscriptionStatus: subscription?.status ?? "missing", usage,
      totalMonthlyCost: usage.reduce((sum, row) => sum + row.cost, 0),
      period: { key: allowance.period, start, end, timezone: "UTC", asOf: now },
      payments: { available: false, upgradeAvailable: false },
    };
  }, { isolationLevel: "repeatable read", readOnly: true });
}
