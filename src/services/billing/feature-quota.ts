import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '../../db';
import { companies, plans, subscriptions, usageLogs } from '../../db/schema';
import { featureMonthlyLimit, featureQuotaUnavailable, quotaCodes, type MeteredFeature } from './feature-limits';
import { QuotaError, quotationAllowance } from './quota-policy';

export interface FeatureReservation {
  id: string;
  current: number;
  limit: number;
  period: string;
}

// Reserve before doing paid or limited work. The reservation row is the canonical usage
// event; callers may release it when the work provably did not happen. No detached writes.
export async function reserveFeatureUsage(companyId: string, userId: string, feature: MeteredFeature): Promise<FeatureReservation> {
  try {
    return await db.transaction(async tx => {
      const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).for('update');
      if (!company) throw new QuotaError(403, 'COMPANY_REQUIRED', 'Company is not available');
      const [pointer] = await tx.select({ planId: subscriptions.planId }).from(subscriptions).where(eq(subscriptions.companyId, companyId));
      const [plan] = pointer?.planId ? await tx.select().from(plans).where(eq(plans.id, pointer.planId)).for('share') : [];
      const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId)).for('update');
      if (subscription?.planId !== pointer?.planId) throw featureQuotaUnavailable(feature);
      const now = new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
      const { period } = quotationAllowance(subscription, plan, now);
      const limit = featureMonthlyLimit(subscription!, plan, feature);
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const [usage] = await tx.select({ count: sql<string>`coalesce(sum(${usageLogs.count}), 0)`, minimum: sql<number>`coalesce(min(${usageLogs.count}), 0)` })
        .from(usageLogs).where(and(eq(usageLogs.companyId, companyId), eq(usageLogs.feature, feature), gte(usageLogs.date, start), lt(usageLogs.date, end)));
      const current = Number(usage.count);
      if (!Number.isSafeInteger(current) || current < 0 || usage.minimum < 0) throw featureQuotaUnavailable(feature);
      if (current >= limit) throw new QuotaError(403, quotaCodes(feature).exceeded, 'Monthly feature quota exceeded', { current, limit, period });
      const [row] = await tx.insert(usageLogs).values({ companyId, userId, feature, count: 1, costEstimate: '0', date: now }).returning({ id: usageLogs.id });
      return { id: row.id, current: current + 1, limit, period };
    });
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw featureQuotaUnavailable(feature);
  }
}

/** Give back a reservation whose work was rejected before it happened (validation, not found, failure). */
export async function releaseFeatureUsage(companyId: string, reservationId: string): Promise<void> {
  await db.delete(usageLogs).where(and(eq(usageLogs.id, reservationId), eq(usageLogs.companyId, companyId)));
}
