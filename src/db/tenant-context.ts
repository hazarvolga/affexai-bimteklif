import type pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type TenantContext = Readonly<{ companyId: string; userId: string }>;
export type TenantDatabase = NodePgDatabase<typeof schema>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertTenantContext(context: TenantContext): void {
  if (!UUID_PATTERN.test(context.companyId)) throw new Error("Tenant context companyId must be a UUID");
  if (!UUID_PATTERN.test(context.userId)) throw new Error("Tenant context userId must be a UUID");
}

export type TenantTransactionOptions = Readonly<{
  isolationLevel?: "read committed" | "repeatable read" | "serializable";
  readOnly?: boolean;
}>;

const ISOLATION_SQL: Record<NonNullable<TenantTransactionOptions["isolationLevel"]>, string> = {
  "read committed": " ISOLATION LEVEL READ COMMITTED",
  "repeatable read": " ISOLATION LEVEL REPEATABLE READ",
  serializable: " ISOLATION LEVEL SERIALIZABLE",
};

/** BEGIN statement built only from the fixed option table above; no caller text reaches SQL. */
export function tenantBeginStatement(options: TenantTransactionOptions = {}): string {
  const isolation = options.isolationLevel ? ISOLATION_SQL[options.isolationLevel] : "";
  if (options.isolationLevel && !isolation) throw new Error("Unsupported tenant transaction isolation level");
  return `BEGIN${isolation}${options.readOnly ? " READ ONLY" : ""}`;
}

export async function withTenantTransaction<T>(
  pool: pg.Pool,
  context: TenantContext,
  work: (client: pg.PoolClient) => Promise<T>,
  options: TenantTransactionOptions = {},
): Promise<T> {
  assertTenantContext(context);
  const begin = tenantBeginStatement(options);
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query(begin);
    const bound = await client.query(
      `select set_config('bimmetraj.company_id',$1,true), set_config('bimmetraj.user_id',$2,true)
       from pg_roles role
       where role.rolname=current_user and session_user='bimmetraj_app' and current_user='bimmetraj_app'
         and role.rolcanlogin and not role.rolinherit and not role.rolsuper and not role.rolbypassrls
         and not role.rolcreaterole and not role.rolcreatedb and not role.rolreplication
         and not exists (select 1 from pg_auth_members membership where membership.member=role.oid)`,
      [context.companyId, context.userId],
    );
    if (bound.rowCount !== 1) {
      throw new Error("Tenant transaction requires the restricted bimmetraj_app database role");
    }
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      releaseError = rollbackError instanceof Error ? rollbackError : new Error("Tenant transaction rollback failed");
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

/**
 * Runs a short tenant-scoped transaction and exposes the same checked-out
 * connection through Drizzle. The transaction-local GUCs are established
 * before any ORM query and are cleared by PostgreSQL on COMMIT/ROLLBACK.
 */
export function withTenantDrizzleTransaction<T>(
  pool: pg.Pool,
  context: TenantContext,
  work: (database: TenantDatabase) => Promise<T>,
  options: TenantTransactionOptions = {},
): Promise<T> {
  return withTenantTransaction(pool, context, (client) => work(drizzle(client, { schema })), options);
}
