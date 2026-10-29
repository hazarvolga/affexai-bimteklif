import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { Logger, makeWorkerUtils } from 'graphile-worker';
import { provisionDatabaseRoles } from '../database-roles/provision';
import { applyMigrations, loadMigrations } from '../release-migrations/runner';

const raw = process.env.SESSION_REVOCATION_TEST_URL;
assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
const url = new URL(raw);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/teklifpro_upgrade_test' && url.username && url.password && !url.search && !url.hash);
const admin = new pg.Client({ connectionString: raw });
await admin.connect();
try {
  const identity = await admin.query<{ db: string; version: number; superuser: boolean; system_identifier: string }>("SELECT current_database() db,current_setting('server_version_num')::int / 10000 version,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) superuser,system_identifier::text FROM pg_control_system()");
  assert.equal(identity.rows[0].db, 'teklifpro_upgrade_test');
  assert.equal(identity.rows[0].version, 16);
  assert.equal(identity.rows[0].superuser, true);
  const migrations = await loadMigrations();
  await applyMigrations(admin, migrations, 32, { requireWorkersDrained: true });
  const queue = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) });
  await queue.release();
  const credentials = Object.fromEntries(['bimmetraj_migrator', 'bimmetraj_app', 'bimmetraj_control', 'bimmetraj_worker', 'bimmetraj_backup'].map(role => [role, randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator' | 'bimmetraj_app' | 'bimmetraj_control' | 'bimmetraj_worker' | 'bimmetraj_backup', string>;
  const target = { expectedDatabase: 'teklifpro_upgrade_test', expectedSystemIdentifier: identity.rows[0].system_identifier, requiredMarkerRegclass: 'teklifpro_release.migrations' };
  // Provision the deployed 0032 schema with its actual release's contract;
  // current provisioning deliberately requires the not-yet-created 0033 functions.
  const baseline = 'fdb369b39b4732e4c0ccdb892414f1875ad25381';
  const baselineDir = mkdtempSync(join(tmpdir(), 'bimmetraj-0032-contract-'));
  try {
    const archive = execFileSync('git', ['archive', baseline, 'scripts/database-roles', 'scripts/release-migrations', 'drizzle-release'], { maxBuffer: 128 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', baselineDir], { input: archive });
    symlinkSync(join(process.cwd(), 'node_modules'), join(baselineDir, 'node_modules'));
    const oldReleaseDir = process.env.DRIZZLE_RELEASE_DIR;
    process.env.DRIZZLE_RELEASE_DIR = join(baselineDir, 'drizzle-release');
    try {
      const oldProvision = await import(pathToFileURL(join(baselineDir, 'scripts/database-roles/provision.ts')).href);
      await oldProvision.provisionDatabaseRoles(admin, credentials, target, decodeURIComponent(url.password));
    } finally {
      if (oldReleaseDir === undefined) delete process.env.DRIZZLE_RELEASE_DIR;
      else process.env.DRIZZLE_RELEASE_DIR = oldReleaseDir;
    }
  } finally { rmSync(baselineDir, { recursive: true, force: true }); }
  const migratorUrl = new URL(url); migratorUrl.username = 'bimmetraj_migrator'; migratorUrl.password = credentials.bimmetraj_migrator;
  const migrator = new pg.Client({ connectionString: migratorUrl.toString() });
  await migrator.connect();
  try {
    await migrator.query('SET ROLE bimmetraj_owner');
    assert.deepEqual(await applyMigrations(migrator, migrations, 33, { requireWorkersDrained: true }), ['0033_revoked_sessions']);
    assert.deepEqual(await applyMigrations(migrator, migrations, 34, { requireWorkersDrained: true }), ['0034_admin_mfa']);
    assert.deepEqual(await applyMigrations(migrator, migrations, 35, { requireWorkersDrained: true }), ['0035_price_source_review']);
    assert.deepEqual(await applyMigrations(migrator, migrations, 36, { requireWorkersDrained: true }), ['0036_crawler_lease_evidence']);
    assert.deepEqual(await applyMigrations(migrator, migrations, 37, { requireWorkersDrained: true }), ['0037_client_privacy_mask']);
  } finally { await migrator.end(); }
  await provisionDatabaseRoles(admin, credentials, target, decodeURIComponent(url.password));
  process.stdout.write('0032 → 0033 → 0034 → 0035 → 0036 → 0037 migrator/owner upgrade and role provisioning verified\n');
} finally { await admin.end(); }
