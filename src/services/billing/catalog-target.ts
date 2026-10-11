type Environment = Record<string, string | undefined>;

/** Dedicated bootstrap target; never inherit an ambient application DATABASE_URL. */
export function catalogTarget(raw: string, env: Environment = process.env) {
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.slice(1));
  const user = decodeURIComponent(url.username);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    && ['teklifpro_local', 'teklifpro_bootstrap_test', 'teklifpro_upgrade_test', 'teklifpro_migration_restore_test'].includes(database);
  const production = env.CATALOG_ALLOW_PRODUCTION === 'true' && url.hostname === 'postgres'
    && database === 'bimmetraj_production' && Number(url.port || 5432) === 5432;
  if ((!local && !production) || !['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash || !user
    || url.hostname !== env.CATALOG_EXPECTED_HOST || database !== env.CATALOG_EXPECTED_DATABASE || user !== env.CATALOG_EXPECTED_USER) {
    throw new Error('CATALOG_TARGET_REJECTED: explicit approved host/database/user required');
  }
  return { host: url.hostname === '[::1]' ? '::1' : url.hostname, port: Number(url.port || 5432), database,
    user, password: decodeURIComponent(url.password) };
}
