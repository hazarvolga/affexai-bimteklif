import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { DATABASE_ROLE_CONTRACT, DATABASE_ROLE_MEMBERSHIPS, DATABASE_ROLE_SPECS } from '../database-roles/contract';

type Queryable = { query: (sql: string, values?: unknown[]) => Promise<{ rows: any[] }> };
const names = DATABASE_ROLE_SPECS.map((spec) => spec.name);
const identifier = (name: string) => `"${name.replaceAll('"', '""')}"`;
const membershipSql = `select parent.rolname as role, child.rolname as member,
  m.admin_option as admin, m.inherit_option as inherit, m.set_option as set
  from pg_auth_members m join pg_roles parent on parent.oid=m.roleid
  join pg_roles child on child.oid=m.member
  where parent.rolname=any($1::text[]) or child.rolname=any($1::text[])`;
const expectedEdges = DATABASE_ROLE_MEMBERSHIPS.map((edge) => ({
  role: edge.role, member: edge.member, admin: edge.adminOption,
  inherit: edge.inheritOption, set: edge.setOption,
}));

/** Only explicitly acknowledged disposable local databases may provision cluster roles. */
export function validateDisposableRoleTarget(url: string | undefined, environment: string | undefined, acknowledged: string | undefined): string {
  if (!url || environment !== 'test' || acknowledged !== 'true') {
    throw new Error('Disposable role setup requires NODE_ENV=test and CI_DISPOSABLE_DATABASE=true');
  }
  const parsed = new URL(url);
  const databases = ['/teklifpro_bootstrap_test', '/teklifpro_upgrade_test', '/teklifpro_migration_restore_test'];
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    || !databases.includes(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error('Disposable role setup requires an exact local test database URL without connection overrides');
  }
  return url;
}

function matchesEdge(actual: Record<string, unknown>, expected: typeof expectedEdges[number]): boolean {
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

/** Fail before integration tests when role identity would violate tenant guards. */
export async function assertDisposableRoleContract(client: Queryable): Promise<void> {
  const roles = await client.query(`select rolname as name, rolcanlogin as can_login,
    rolsuper as superuser, rolbypassrls as "bypassRls", rolcreatedb as "createDb",
    rolcreaterole as "createRole", rolinherit as inherit, rolreplication as replication
    from pg_roles where rolname=any($1::text[])`, [names]);
  for (const spec of DATABASE_ROLE_SPECS) {
    const actual = roles.rows.find((role) => role.name === spec.name);
    if (!actual) throw new Error(`${spec.name}: missing canonical role`);
    for (const [key, expected] of Object.entries({ can_login: spec.canLogin, ...spec.attributes })) {
      if (actual[key] !== expected) throw new Error(`${spec.name}: invalid ${key} role attribute`);
    }
  }
  const edges = await client.query(membershipSql, [names]);
  if (edges.rows.length !== expectedEdges.length
    || expectedEdges.some((expected) => !edges.rows.some((actual) => matchesEdge(actual, expected)))) {
    throw new Error('Disposable database roles have an unexpected or missing membership');
  }
}

export async function bootstrapDisposableRoles(client: Queryable): Promise<string[]> {
  if (process.env.NODE_ENV !== 'test' || process.env.CI_DISPOSABLE_DATABASE !== 'true') {
    throw new Error('Canonical cluster roles require an acknowledged disposable PostgreSQL test cluster');
  }
  const { rows: [target] } = await client.query(`select current_database() as database,
    current_setting('server_version_num')::int / 10000 as version,
    (select rolsuper from pg_roles where rolname=current_user) as administrator,
    (select system_identifier::text from pg_control_system()) as system_identifier`);
  if (!['teklifpro_bootstrap_test', 'teklifpro_upgrade_test', 'teklifpro_migration_restore_test'].includes(target?.database)
    || target?.version !== 16 || !target?.administrator) {
    throw new Error('Role bootstrap requires a disposable PostgreSQL 16 test database administrator');
  }
  if (!/^\d{10,30}$/.test(target.system_identifier)) throw new Error('Missing disposable cluster fingerprint');
  const provenance = `${DATABASE_ROLE_CONTRACT}:${target.system_identifier}`;
  const existingRoles = await client.query(
    "select rolname as name, shobj_description(oid,'pg_authid') as provenance from pg_roles where rolname=any($1::text[])", [names]);
  if (existingRoles.rows.some((role) => role.provenance !== provenance)) {
    throw new Error('Refusing to adopt existing roles with mismatched canonical provenance');
  }
  const createdNames = names.filter((name) => !existingRoles.rows.some((role) => role.name === name));
  const edges = await client.query(membershipSql, [names]);
  if (edges.rows.some((edge) => !expectedEdges.some((expected) => edge.role === expected.role && edge.member === expected.member))) {
    throw new Error('Refusing to alter unexpected role memberships; use a fresh disposable cluster');
  }
  await client.query('BEGIN');
  try {
  for (const spec of DATABASE_ROLE_SPECS) {
    const existing = await client.query('select 1 from pg_roles where rolname=$1', [spec.name]);
    if (!existing.rows.length) {
      await client.query(`CREATE ROLE ${identifier(spec.name)}`);
      await client.query(`COMMENT ON ROLE ${identifier(spec.name)} IS '${provenance}'`);
    }
    const flags = Object.entries(spec.attributes).map(([key, enabled]) => {
      const attribute = { superuser: 'SUPERUSER', bypassRls: 'BYPASSRLS', createDb: 'CREATEDB', createRole: 'CREATEROLE', inherit: 'INHERIT', replication: 'REPLICATION' }[key];
      return `${enabled ? '' : 'NO'}${attribute}`;
    });
    await client.query(`ALTER ROLE ${identifier(spec.name)} ${spec.canLogin ? 'LOGIN' : 'NOLOGIN'} ${flags.join(' ')}`);
  }
  for (const edge of expectedEdges) {
    await client.query(`GRANT ${identifier(edge.role)} TO ${identifier(edge.member)} WITH ADMIN ${edge.admin}, INHERIT ${edge.inherit}, SET ${edge.set}`);
  }
  await assertDisposableRoleContract(client);
  await client.query('COMMIT');
  return createdNames;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (!['bootstrap', 'check'].includes(mode)) throw new Error('Expected bootstrap or check');
  const connectionString = validateDisposableRoleTarget(process.env.RELEASE_DATABASE_URL, process.env.NODE_ENV, process.env.CI_DISPOSABLE_DATABASE);
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const target = await client.query(`select current_database() as database,
      current_setting('server_version_num')::int / 10000 as version,
      (select rolsuper from pg_roles where rolname=current_user) as administrator,
    (select system_identifier::text from pg_control_system()) as system_identifier`);
    if (target.rows[0]?.database !== new URL(connectionString).pathname.slice(1)
      || target.rows[0]?.version !== 16 || !target.rows[0]?.administrator) {
      throw new Error('Disposable role setup requires the selected PostgreSQL 16 database administrator');
    }
    if (mode === 'bootstrap') await bootstrapDisposableRoles(client);
    await assertDisposableRoleContract(client);
    process.stdout.write(`Disposable database role ${mode}: canonical attributes and membership verified\n`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Disposable database role setup failed'}\n`);
    process.exitCode = 1;
  });
}
