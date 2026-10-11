import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '../../db';
import { companies, plans, subscriptions, usageLogs } from '../../db/schema';
import { PLAN_LIMITS } from './limits';
import { QuotaError, quotationAllowance } from './quota-policy';

export const AI_USAGE_FEATURE = 'AI_QUOTATION_GENERATED';
const unavailable = () => new QuotaError(503, 'AI_QUOTA_UNAVAILABLE', 'AI quota is temporarily unavailable');

export function aiMonthlyLimit(plan: keyof typeof PLAN_LIMITS) {
  const limit = PLAN_LIMITS[plan]?.AI_QUOTATION_GENERATED;
  if (!Number.isSafeInteger(limit) || limit < 0) throw unavailable();
  return limit;
}

// Reserve before contacting a provider. Failed/time-out/crashed attempts retain their
// reservation because provider spending may already have happened. No detached writes.
export async function reserveAiUsage(companyId: string, userId: string) {
  try {
    return await db.transaction(async tx => {
      const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).for('update');
      if (!company) throw new QuotaError(403, 'COMPANY_REQUIRED', 'Company is not available');
      const [pointer] = await tx.select({ planId: subscriptions.planId }).from(subscriptions).where(eq(subscriptions.companyId, companyId));
      const [plan] = pointer?.planId ? await tx.select().from(plans).where(eq(plans.id, pointer.planId)).for('share') : [];
      const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId)).for('update');
      if (subscription?.planId !== pointer?.planId) throw unavailable();
      const now = new Date((await tx.execute<{ now: string }>(sql`SELECT clock_timestamp() AS now`)).rows[0].now);
      const { period } = quotationAllowance(subscription, plan, now);
      const limit = aiMonthlyLimit(subscription!.plan);
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const [usage] = await tx.select({ count: sql<string>`coalesce(sum(${usageLogs.count}), 0)`, minimum: sql<number>`coalesce(min(${usageLogs.count}), 0)` })
        .from(usageLogs).where(and(eq(usageLogs.companyId, companyId), eq(usageLogs.feature, AI_USAGE_FEATURE), gte(usageLogs.date, start), lt(usageLogs.date, end)));
      const current = Number(usage.count);
      if (!Number.isSafeInteger(current) || current < 0 || usage.minimum < 0) throw unavailable();
      if (current >= limit) throw new QuotaError(403, 'AI_QUOTA_EXCEEDED', 'Monthly AI quota exceeded', { current, limit, period });
      await tx.insert(usageLogs).values({ companyId, userId, feature: AI_USAGE_FEATURE, count: 1, costEstimate: '0', date: now });
      return { current: current + 1, limit, period };
    });
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw unavailable();
  }
}
