import { sql, type SQL } from "drizzle-orm";

type SqlExecutor = { execute(query: SQL): Promise<unknown> };

/**
 * One transaction-scoped lock per company for every quota consumption and entitlement change.
 *
 * Under the production role model bimmetraj_app may read companies, plans and subscriptions
 * but holds no UPDATE privilege on them, so `SELECT ... FOR UPDATE/SHARE` is denied. An
 * advisory lock needs no table privilege; quota consumers (app), entitlement changes
 * (control plane) and the worker all take this same key, which serialises them per company.
 * The key matches the original feature-quota lock so existing reservations keep their order.
 */
export async function lockCompanyQuota(tx: SqlExecutor, companyId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${companyId}, 0))`);
}

/** Locks several companies in a fixed (sorted) order so concurrent callers cannot deadlock. */
export async function lockCompanyQuotas(tx: SqlExecutor, companyIds: readonly string[]): Promise<void> {
  for (const companyId of [...new Set(companyIds)].sort()) await lockCompanyQuota(tx, companyId);
}
