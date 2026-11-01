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
    assert.deepEqual(await applyMigrations(migrator, migrations, 38, { requireWorkersDrained: true }), ['0038_admin_tenant_deletion']);
    assert.deepEqual(await applyMigrations(migrator, migrations, 39, { requireWorkersDrained: true }), ['0039_atomic_tenant_deletion']);
    assert.deepEqual(await applyMigrations(migrator, migrations, 40, { requireWorkersDrained: true }), ['0040_trial_quota_period']);
    // A live plan row with its own id: 0041 must match it by name and keep the limit an admin already set.
    const livePlanId = '7c1f4d2e-5b6a-4c3d-8e9f-0a1b2c3d4e5f';
    await admin.query(`INSERT INTO plans(id,name,monthly_price,monthly_quote_limit,ifc_max_concurrent,monthly_ai_limit,marketing_description)
      VALUES ($1,'Kurumsal Taahhüt & e-PYS',8900,200,2,45,'Ekip yönetimi, yüksek kapasite ve öncelikli işleme için.')`, [livePlanId]);
    assert.deepEqual(await applyMigrations(migrator, migrations, 41, { requireWorkersDrained: true }), ['0041_plan_catalog_alignment']);
    const { rows: [livePlan] } = await admin.query(`SELECT ifc_max_concurrent, monthly_ai_limit, monthly_pdf_limit, marketing_description FROM plans WHERE id=$1`, [livePlanId]);
    assert.deepEqual(livePlan, { ifc_max_concurrent: 1, monthly_ai_limit: 45, monthly_pdf_limit: 75, marketing_description: 'Yüksek teklif ve IFC kapasitesi için.' });
    await admin.query('DELETE FROM plans WHERE id=$1', [livePlanId]);
    assert.deepEqual(await applyMigrations(migrator, migrations, 42, { requireWorkersDrained: true }), ['0042_regulation_watch']);
  } finally { await migrator.end(); }
  await provisionDatabaseRoles(admin, credentials, target, decodeURIComponent(url.password));
  process.stdout.write('0032 → 0033 → 0034 → 0035 → 0036 → 0037 → 0038 → 0039 → 0040 → 0041 → 0042 migrator/owner upgrade and role provisioning verified\n');
} finally { await admin.end(); }
