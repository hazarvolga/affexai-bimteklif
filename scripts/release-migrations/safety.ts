import pg from 'pg';

export const disposableNames = ['teklifpro_bootstrap_test', 'teklifpro_upgrade_test', 'teklifpro_migration_restore_test'] as const;
export type Target = { host: string; port: number; database: string; user: string; password: string };
export const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;

export function parseTarget(raw: string, kind: 'control' | 'target' | 'deployment'): Target {
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (kind === 'deployment') {
    if (process.env.RELEASE_ALLOW_PRODUCTION !== 'true'
      || !process.env.RELEASE_EXPECTED_HOST || !process.env.RELEASE_EXPECTED_DATABASE || !process.env.RELEASE_EXPECTED_USER
      || !['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash
      || url.hostname !== process.env.RELEASE_EXPECTED_HOST || database !== process.env.RELEASE_EXPECTED_DATABASE
      || decodeURIComponent(url.username) !== process.env.RELEASE_EXPECTED_USER || Number(url.port || 5432) !== 5432
      || ['postgres', 'template0', 'template1', 'teklifpro_local', ...disposableNames].includes(database)) {
      throw new Error('Production release target requires explicit opt-in and exact approved host/database/user on port 5432');
    }
    return { host: url.hostname, port: 5432, database, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
  }
  const allowed: readonly string[] = kind === 'control' ? ['teklifpro_local'] : disposableNames;
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.search || url.hash || !url.username || !allowed.includes(database)) {
    throw new Error(`Invalid ${kind} database target: explicit local named database required; URL parameters forbidden`);
  }
  return { host: url.hostname === '[::1]' ? '::1' : '127.0.0.1', port: Number(url.port || 5432), database,
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
}

export async function connect(target: Target): Promise<pg.Client> {
  const client = new pg.Client({ ...target, ssl: false, connectionTimeoutMillis: 3_000 });
  try {
    const effective = (client as pg.Client & { connectionParameters: Target }).connectionParameters;
    if (effective.host !== target.host || effective.port !== target.port || effective.database !== target.database
      || effective.user !== target.user) throw new Error('Effective PostgreSQL target differs from validated settings');
    await client.connect();
    const { rows: [actual] } = await client.query('select current_database() as database, current_user as username, inet_server_addr()::text as host, inet_server_port() as port');
    // A local Docker port forward exposes a private server address, not loopback.
    if (actual.database !== target.database || actual.username !== target.user) throw new Error('Effective database connection does not match the approved target');
    return client;
  } catch (error) {
    await client.end();
    throw error;
  }
}

export async function requireDisposable(client: pg.Client) {
  const { rows: [row] } = await client.query('select current_database() as name');
  if (!(disposableNames as readonly string[]).includes(row.name)) throw new Error('Release migrations refuse shared or unknown databases');
}

export async function requireEmpty(client: pg.Client) {
  const { rows } = await client.query(`select nspname from pg_namespace
    where nspname !~ '^pg_' and nspname not in ('information_schema', 'public')
    union all select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    union all select t.typname from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'
    union all select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    union all select extname from pg_extension where extname <> 'plpgsql'`);
  if (rows.length) throw new Error('Bootstrap requires an empty database; adoption must be explicitly verified');
}

// Only clients created and verified by this module can receive deployment permission.
const approvedDeployments = new WeakSet<pg.Client>();
export async function connectDeployment(raw: string) {
  const client = await connect(parseTarget(raw, 'deployment'));
  approvedDeployments.add(client);
  return client;
}
export async function requireMigrationTarget(client: pg.Client) {
  if (!approvedDeployments.has(client)) return requireDisposable(client);
}
