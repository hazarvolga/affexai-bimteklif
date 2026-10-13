import { and, asc, eq, sql } from "drizzle-orm";
import type { db } from "../../db";
import { companies, plans, subscriptions, usageRecords } from "../../db/schema";
import { QuotaError, quotationAllowance, quotaUnavailable } from "./quota-policy";

export { QuotaError } from "./quota-policy";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockedQuota(tx: Transaction, companyId: string, at?: Date) {
  // Same order as admin subscription changes: company -> plan -> subscription.
  const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).for("update");
  if (!company) throw new QuotaError(403, "COMPANY_REQUIRED", "Company is not available");
  const [pointer] = await tx.select({ planId: subscriptions.planId }).from(subscriptions).where(eq(subscriptions.companyId, companyId));
  const [plan] = pointer?.planId
    ? await tx.select().from(plans).where(eq(plans.id, pointer.planId)).for("share") : [];
  const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId)).for("update");
  if (subscription?.planId !== pointer?.planId) throw quotaUnavailable();
  const now = at ?? new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
  const allowance = quotationAllowance(subscription, plan, now);
  const counters = await tx.select().from(usageRecords)
    .where(and(eq(usageRecords.companyId, companyId), eq(usageRecords.period, allowance.period)))
    .orderBy(asc(usageRecords.id)).for("update");
  if (counters.some(row => !Number.isSafeInteger(row.quoteCount) || row.quoteCount < 0)) throw quotaUnavailable();
  const current = counters.reduce((sum, row) => sum + row.quoteCount, 0);
  if (!Number.isSafeInteger(current)) throw quotaUnavailable();
  const state = { ...allowance, current };
  if (current >= allowance.limit) throw new QuotaError(403, "QUOTA_EXCEEDED", "Monthly quotation quota exceeded", state);
  return { state, counters };
}

export async function checkQuotationQuota(tx: Transaction, companyId: string, at?: Date) {
  try {
    return (await lockedQuota(tx, companyId, at)).state;
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw quotaUnavailable();
  }
}

// Call only within the NEW quotation's transaction. Revisions do not consume quota.
export async function consumeQuotationQuota(tx: Transaction, companyId: string, at?: Date) {
  try {
    const { state, counters } = await lockedQuota(tx, companyId, at);
    if (counters.length) {
      const counter = counters.find(row => row.quoteCount < 2147483647);
      if (!counter) throw quotaUnavailable();
      // Sum legacy duplicates for enforcement, but increment exactly one; never delete history.
      await tx.update(usageRecords).set({ quoteCount: counter.quoteCount + 1 }).where(eq(usageRecords.id, counter.id));
    } else {
      await tx.insert(usageRecords).values({ companyId, period: state.period, quoteCount: 1 });
    }
    return { ...state, current: state.current + 1 };
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw quotaUnavailable();
  }
}

async function lockedIfcUsage(tx: Transaction, companyId: string, at?: Date) {
  // Same order as admin subscription changes: company -> plan -> subscription.
  const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).for("update");
  if (!company) throw new QuotaError(403, "COMPANY_REQUIRED", "Company is not available");

  const [pointer] = await tx.select({ planId: subscriptions.planId }).from(subscriptions).where(eq(subscriptions.companyId, companyId));
  if (pointer?.planId) {
    await tx.select().from(plans).where(eq(plans.id, pointer.planId)).for("share");
    const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId)).for("update");
    if (subscription?.planId !== pointer?.planId) throw quotaUnavailable();
  }

  const now = at ?? new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
  const period = now.toISOString().slice(0, 7);
  const counters = await tx.select().from(usageRecords)
    .where(and(eq(usageRecords.companyId, companyId), eq(usageRecords.period, period)))
    .orderBy(asc(usageRecords.id)).for("update");

  if (counters.some(row => !Number.isSafeInteger(row.ifcCount) || row.ifcCount < 0)) throw quotaUnavailable();
  const current = counters.reduce((sum, row) => sum + row.ifcCount, 0);
  if (!Number.isSafeInteger(current)) throw quotaUnavailable();

  return { period, counters, current };
}

async function incrementIfcCounter(tx: Transaction, companyId: string, period: string, counters: (typeof usageRecords.$inferSelect)[]) {
  if (counters.length) {
    const counter = counters.find(row => row.ifcCount < 2147483647);
    if (!counter) throw quotaUnavailable();
    await tx.update(usageRecords).set({ ifcCount: counter.ifcCount + 1 }).where(eq(usageRecords.id, counter.id));
  } else {
    await tx.insert(usageRecords).values({ companyId, period, quoteCount: 0, ifcCount: 1 });
  }
}

// Call only within the run's successful completion transaction.
export async function consumeIfcUsage(tx: Transaction, companyId: string, at?: Date) {
  try {
    const { period, counters, current } = await lockedIfcUsage(tx, companyId, at);
    await incrementIfcCounter(tx, companyId, period, counters);
    return { period, current: current + 1 };
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw quotaUnavailable();
  }
}

/** Browser pre-analysis has no server run, so it reserves its IFC slot up front (L-9). */
export async function consumeBrowserIfcAnalysis(tx: Transaction, companyId: string, monthlyLimit: number | null, at?: Date) {
  try {
    const { period, counters, current } = await lockedIfcUsage(tx, companyId, at);
    // Same entitlement gate as quotations: no active, unexpired subscription means no analysis.
    const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
    const [plan] = subscription?.planId ? await tx.select().from(plans).where(eq(plans.id, subscription.planId)) : [];
    quotationAllowance(subscription, plan, at ?? new Date());
    if (monthlyLimit !== null && current >= monthlyLimit) {
      throw new QuotaError(403, "IFC_QUOTA_EXCEEDED", "Monthly IFC quota exceeded", { current, limit: monthlyLimit, period });
    }
    await incrementIfcCounter(tx, companyId, period, counters);
    return { period, current: current + 1, limit: monthlyLimit };
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw quotaUnavailable();
  }
}
