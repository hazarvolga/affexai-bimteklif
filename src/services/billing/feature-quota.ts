import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '../../db';
import { getControlDatabase } from '../../db/control-plane';
import { withAppTenantTransaction } from '../../db/app-tenant';
import { lockCompanyQuota } from './company-quota-lock';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../db/schema';
import { companies, plans, subscriptions, usageLogs } from '../../db/schema';
import { featureMonthlyLimit, featureQuotaUnavailable, quotaCodes, type MeteredFeature } from './feature-limits';
import { QuotaError, quotaWindow, quotationAllowance } from './quota-policy';

export interface FeatureReservation {
  id: string;
  current: number;
  limit: number;
  period: string;
  /** True when an earlier reservation for the same subject this period was reused; nothing new was consumed. */
  reused: boolean;
}

/** The quotation version a PDF is rendered for; the same version is counted once per month (marka.md M-7.6). */
export interface UsageSubject {
  quotationId: string;
  versionKey: string;
}

// Reserve before doing paid or limited work. The reservation row is the canonical usage
// event; callers may release it when the work provably did not happen. No detached writes.
type FeatureQuotaTransaction = NodePgDatabase<typeof schema>;

export async function reserveFeatureUsageInTransaction(tx: FeatureQuotaTransaction, companyId: string, userId: string, feature: MeteredFeature, subject?: UsageSubject): Promise<FeatureReservation> {
  try {
    await lockCompanyQuota(tx, companyId);
    const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId));
    if (!company) throw new QuotaError(403, 'COMPANY_REQUIRED', 'Company is not available');
    const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
    const [plan] = subscription?.planId ? await tx.select().from(plans).where(eq(plans.id, subscription.planId)) : [];
    const now = new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
    const { period } = quotationAllowance(subscription, plan, now);
    const limit = featureMonthlyLimit(subscription!, plan, feature);
    const { start, end } = quotaWindow(subscription, plan, now);
    const [usage] = await tx.select({ count: sql<string>`coalesce(sum(${usageLogs.count}), 0)`, minimum: sql<number>`coalesce(min(${usageLogs.count}), 0)` })
      .from(usageLogs).where(and(eq(usageLogs.companyId, companyId), eq(usageLogs.feature, feature), gte(usageLogs.date, start), lt(usageLogs.date, end)));
    const current = Number(usage.count);
    if (!Number.isSafeInteger(current) || current < 0 || usage.minimum < 0) throw featureQuotaUnavailable(feature);
    // Checked under the company quota lock, so concurrent renders of one version share a single row.
    if (subject) {
      const [existing] = await tx.select({ id: usageLogs.id }).from(usageLogs).where(and(
        eq(usageLogs.companyId, companyId), eq(usageLogs.feature, feature),
        eq(usageLogs.quotationId, subject.quotationId), eq(usageLogs.quotationVersionKey, subject.versionKey),
        gte(usageLogs.date, start), lt(usageLogs.date, end),
      )).limit(1);
      if (existing) return { id: existing.id, current, limit, period, reused: true };
    }
    if (current >= limit) throw new QuotaError(403, quotaCodes(feature).exceeded, 'Monthly feature quota exceeded', { current, limit, period });
    const [row] = await tx.insert(usageLogs).values({
      companyId, userId, feature, count: 1, costEstimate: '0', date: now,
      quotationId: subject?.quotationId ?? null, quotationVersionKey: subject?.versionKey ?? null,
    }).returning({ id: usageLogs.id });
    return { id: row.id, current: current + 1, limit, period, reused: false };
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw featureQuotaUnavailable(feature);
  }
}

export async function reserveFeatureUsage(companyId: string, userId: string, feature: MeteredFeature, subject?: UsageSubject): Promise<FeatureReservation> {
  try {
    return await withAppTenantTransaction({ companyId, userId }, tx => reserveFeatureUsageInTransaction(tx, companyId, userId, feature, subject));
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw featureQuotaUnavailable(feature);
  }
}

/** Give back a reservation whose work was rejected before it happened (validation, not found, failure). */
export async function releaseFeatureUsage(companyId: string, reservationId: string): Promise<void> {
  await getControlDatabase().db.delete(usageLogs).where(and(eq(usageLogs.id, reservationId), eq(usageLogs.companyId, companyId)));
}
