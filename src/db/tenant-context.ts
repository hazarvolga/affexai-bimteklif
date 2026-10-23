import type pg from "pg";

export type TenantContext = Readonly<{ companyId: string; userId: string }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertTenantContext(context: TenantContext): void {
  if (!UUID_PATTERN.test(context.companyId)) throw new Error("Tenant context companyId must be a UUID");
  if (!UUID_PATTERN.test(context.userId)) throw new Error("Tenant context userId must be a UUID");
}

export async function withTenantTransaction<T>(
  pool: pg.Pool,
  context: TenantContext,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  assertTenantContext(context);
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query("BEGIN");
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
