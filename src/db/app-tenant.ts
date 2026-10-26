import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./index";
import * as schema from "./schema";
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

/**
 * Read-only transaction scoped to a verified super-admin user ID for cross-tenant
 * SmartCheck queue diagnostics (`documents` and `document_processing_runs`).
 */
export async function withSuperAdminQueueRead<T>(
  adminUserId: string,
  work: (database: TenantDatabase) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(adminUserId)) {
    throw new Error("Super admin queue read requires a valid adminUserId UUID");
  }
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query("BEGIN READ ONLY");
    const bound = await client.query(
      `select set_config('bimmetraj.super_admin_user_id',$1,true)
       from pg_roles role
       where role.rolname=current_user and session_user='bimmetraj_app' and current_user='bimmetraj_app'
         and role.rolcanlogin and not role.rolinherit and not role.rolsuper and not role.rolbypassrls
         and not role.rolcreaterole and not role.rolcreatedb and not role.rolreplication
         and not exists (select 1 from pg_auth_members membership where membership.member=role.oid)`,
      [adminUserId],
    );
    if (bound.rowCount !== 1) {
      throw new Error("Super admin queue read requires the restricted bimmetraj_app database role");
    }
    const result = await work(drizzle(client, { schema }));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      releaseError = rollbackError instanceof Error ? rollbackError : new Error("Super admin queue read rollback failed");
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
