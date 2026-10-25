import { pool } from "./index";
import { withTenantDrizzleTransaction, type TenantContext, type TenantDatabase, type TenantTransactionOptions } from "./tenant-context";

/**
 * Tenant-scoped access for request paths that read FORCE RLS tables (companies, subscriptions,
 * usage_logs, ...) as bimmetraj_app. Outside this context the policies hide every row, so a
 * plain `db` read silently returns nothing under the production role model.
 */
export function withAppTenant<T>(
  actor: TenantContext,
  work: (database: TenantDatabase) => Promise<T>,
  options?: TenantTransactionOptions,
): Promise<T> {
  return withTenantDrizzleTransaction(pool, actor, work, options);
}

type TenantTransaction = Parameters<Parameters<TenantDatabase["transaction"]>[0]>[0];

/**
 * Same as `db.transaction(work)` but inside tenant context: the work runs in a savepoint of the
 * tenant transaction, so existing transaction-typed helpers keep their signatures.
 */
export function withAppTenantTransaction<T>(
  actor: TenantContext,
  work: (tx: TenantTransaction) => Promise<T>,
  options?: TenantTransactionOptions,
): Promise<T> {
  return withAppTenant(actor, (database) => database.transaction(work), options);
}

/** Tenant context of an authenticated workspace request. */
export function tenantOf(user: { companyId?: string | null; userId: string }): TenantContext {
  if (!user.companyId) throw new Error("Tenant context requires a company membership");
  return { companyId: user.companyId, userId: user.userId };
}
