import { and, asc, desc, eq, or } from 'drizzle-orm';
import type { db } from '../../db';
import { plans } from '../../db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The trial is the plan explicitly flagged `is_trial` (unique). Until the catalog bootstrap
 * sets the flag, the oldest active free plan stays the deterministic fallback (L-7).
 */
export async function selectTrialPlan(tx: Transaction) {
  const [plan] = await tx.select().from(plans)
    .where(and(eq(plans.isActive, true), or(eq(plans.isTrial, true), eq(plans.monthlyPrice, 0))))
    .orderBy(desc(plans.isTrial), asc(plans.createdAt), asc(plans.id))
    .limit(1);
  return plan;
}
