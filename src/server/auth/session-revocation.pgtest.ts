import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { provisionDatabaseRoles } from '../../../scripts/database-roles/provision';

before(async () => {
  const raw = process.env.SESSION_REVOCATION_TEST_URL;
  assert.ok(raw && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.pathname, '/teklifpro_upgrade_test');
  assert.ok(url.password, 'isolated administrator credential required');
  const admin = new pg.Client({ connectionString: raw });
  await admin.connect();
  try {
    const { makeWorkerUtils, Logger } = await import('graphile-worker');
    const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) });
    await worker.release();
    const systemId = (await admin.query<{ system_identifier: string }>('select system_identifier::text from pg_control_system()')).rows[0].system_identifier;
    const credentials = Object.fromEntries(['bimmetraj_migrator', 'bimmetraj_app', 'bimmetraj_control', 'bimmetraj_worker', 'bimmetraj_backup'].map(role => [role, randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator' | 'bimmetraj_app' | 'bimmetraj_control' | 'bimmetraj_worker' | 'bimmetraj_backup', string>;
    await provisionDatabaseRoles(admin, credentials, { expectedDatabase: 'teklifpro_upgrade_test', expectedSystemIdentifier: systemId, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  } finally { await admin.end(); }
});

test('revocation table denies runtime delete and cleanup removes only expired hashes', async () => {
  const raw = process.env.SESSION_REVOCATION_TEST_URL;
  assert.ok(raw, 'Explicit disposable SESSION_REVOCATION_TEST_URL is required');
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.pathname, '/teklifpro_upgrade_test');
  const admin = new pg.Client({ connectionString: raw });
  const controlUrl = new URL(raw); controlUrl.username = 'bimmetraj_control';
  const control = new pg.Client({ connectionString: controlUrl.toString() });
  await admin.connect(); await control.connect();
  const userId = randomUUID();
  try {
    const state = await admin.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'");
    assert.equal(state.rows[0].count, 91, 'complete 0041 migration chain produces 91 public tables');
    assert.equal((await admin.query("SELECT 1 FROM teklifpro_release.migrations WHERE tag='0033_revoked_sessions'")).rowCount, 1);
    assert.equal((await admin.query("SELECT 1 FROM teklifpro_release.migrations WHERE tag='0035_price_source_review'")).rowCount, 1);
    assert.equal((await admin.query("SELECT 1 FROM teklifpro_release.migrations WHERE tag='0036_crawler_lease_evidence'")).rowCount, 1);
    assert.equal((await admin.query("SELECT 1 FROM teklifpro_release.migrations WHERE tag='0041_plan_catalog_alignment'")).rowCount, 1);
    for (const table of ['global_price_source_review_events', 'tenant_price_source_review_invalidations']) {
      assert.equal((await admin.query('SELECT to_regclass($1) IS NOT NULL AS present', [`public.${table}`])).rows[0].present, true);
    }
    await admin.query('INSERT INTO users(id,email,full_name,email_verified) VALUES ($1,$2,$3,now())', [userId, `${userId}@example.test`, 'Test']);
    await assert.rejects(control.query("INSERT INTO public.revoked_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now())", ['a'.repeat(64), userId]), /permission denied/);
    await control.query("SELECT public.bimmetraj_revoke_session($1,$3,now()-interval '8 days'), public.bimmetraj_revoke_session($2,$3,now()+interval '1 hour'), public.bimmetraj_revoke_session($4,$3,now()-interval '1 hour')", ['a'.repeat(64), 'b'.repeat(64), userId, 'c'.repeat(64)]);
    // A pre-seeded old expiry cannot shorten a later legitimate revocation.
    await control.query("SELECT public.bimmetraj_revoke_session($1,$2,now()-interval '8 days')", ['e'.repeat(64), userId]);
    await control.query("SELECT public.bimmetraj_revoke_session($1,$2,now()+interval '1 hour')", ['e'.repeat(64), userId]);
    await assert.rejects(control.query('DELETE FROM public.revoked_sessions WHERE user_id=$1', [userId]), /permission denied/);
    await control.query('SELECT public.bimmetraj_cleanup_revoked_sessions()');
    const rows = await control.query('SELECT token_hash FROM public.revoked_sessions WHERE user_id=$1', [userId]);
    assert.deepEqual(rows.rows.map(row => row.token_hash).sort(), ['b'.repeat(64), 'c'.repeat(64), 'e'.repeat(64)]);
    await admin.query('DELETE FROM users WHERE id=$1', [userId]);
    await control.query("SELECT public.bimmetraj_revoke_session($1,$2,now()+interval '1 hour')", ['d'.repeat(64), userId]);
    await control.query("SELECT public.bimmetraj_revoke_session(md5(i::text)||md5(i::text), $1, now()-interval '8 days') FROM generate_series(1,501) i", [userId]);
    await control.query('SELECT public.bimmetraj_cleanup_revoked_sessions()');
    const backlog = await control.query("SELECT count(*)::int AS count FROM public.revoked_sessions WHERE user_id=$1 AND expires_at < now()-interval '7 days'", [userId]);
    assert.equal(backlog.rows[0].count, 1, 'cleanup is bounded to 500 rows per call');
    await assert.rejects(admin.query('SELECT public.bimmetraj_cleanup_revoked_sessions()'), /control role required/);
  } finally {
    await admin.query('DELETE FROM public.revoked_sessions WHERE user_id=$1', [userId]);
    await admin.query('DELETE FROM users WHERE id=$1', [userId]);
    await control.end(); await admin.end();
  }
});

test('HTTP logout revokes both cookie sessions and bearer while leaving unrelated token valid', async () => {
  const raw = process.env.SESSION_REVOCATION_TEST_URL;
  assert.ok(raw);
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.pathname, '/teklifpro_upgrade_test');
  const admin = new pg.Client({ connectionString: raw });
  await admin.connect();
  const userId = randomUUID();
  await admin.query('INSERT INTO users(id,email,full_name,email_verified) VALUES ($1,$2,$3,now())', [userId, `${userId}@example.test`, 'Session test']);
  const appUrl = new URL(raw); appUrl.username = 'bimmetraj_app';
  const controlUrl = new URL(raw); controlUrl.username = 'bimmetraj_control';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = appUrl.toString();
  process.env.CONTROL_DATABASE_URL = controlUrl.toString();
  const express = (await import('express')).default;
  const { AuthService } = await import('../../services/auth/authService');
  const { authenticate } = await import('../middleware/auth');
  const { registerAuthRoutes } = await import('../routes/auth');
  const { closeControlDatabase } = await import('../../db/control-plane');
  const { pool } = await import('../../db');
  const app = express(); app.use(express.json()); registerAuthRoutes(app); app.get('/probe', authenticate, (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const issue = () => AuthService.generateToken({ userId, companyId: null, role: null });
  const bearer = issue(), browser = issue(), adminCookie = issue(), unrelated = issue();
  const probe = (token: string) => fetch(`${base}/probe`, { headers: { authorization: `Bearer ${token}` } });
  try {
    assert.equal((await probe(bearer)).status, 200);
    const response = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { origin: base, authorization: `Bearer ${bearer}`, cookie: `bm_session=${browser}; bm_admin=${adminCookie}` } });
    assert.equal(response.status, 200);
    for (const token of [bearer, browser, adminCookie]) assert.equal((await probe(token)).status, 401);
    assert.equal((await probe(unrelated)).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await closeControlDatabase(); await pool.end();
    await admin.query('DELETE FROM public.revoked_sessions WHERE user_id=$1', [userId]);
    await admin.query('DELETE FROM users WHERE id=$1', [userId]);
    await admin.end();
  }
});

test('0033 through 0041 independent snapshots materialize the pinned release catalogs', { timeout: 60_000 }, async () => {
  const raw = process.env.SESSION_REVOCATION_TEST_URL;
  assert.ok(raw && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const sourceUrl = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(sourceUrl.hostname));
  assert.equal(sourceUrl.pathname, '/teklifpro_upgrade_test');
  const admin = new pg.Client({ connectionString: raw });
  await admin.connect();
  let created = false;
  try {
    const name = 'teklifpro_migration_restore_test';
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
    assert.equal(existing.rowCount, 0, 'refusing to touch pre-existing snapshot database');
    await admin.query(`CREATE DATABASE ${name}`); created = true;
    const snapshotUrl = new URL(raw); snapshotUrl.pathname = `/${name}`;
    const snapshotClient = new pg.Client({ connectionString: snapshotUrl.toString() });
    await snapshotClient.connect();
    try {
      const { readFile } = await import('node:fs/promises');
      const { drizzleApi } = await import('../../../scripts/release-migrations/generation-api');
      const { injectDataTransitions } = await import('../../../scripts/release-migrations/data-transitions');
      const { catalog } = await import('../../../scripts/release-migrations/catalog');
      const { loadMigrations } = await import('../../../scripts/release-migrations/runner');
      const { pinnedSignature } = await import('../../../scripts/release-migrations/stage-signatures');
      for (const [tag, file, count] of [['0033_revoked_sessions','0033',87], ['0034_admin_mfa','0034',89], ['0035_price_source_review','0035',91], ['0036_crawler_lease_evidence','0036',91], ['0037_client_privacy_mask','0037',91], ['0038_admin_tenant_deletion','0038',91], ['0039_atomic_tenant_deletion','0039',91], ['0040_trial_quota_period','0040',91], ['0041_plan_catalog_alignment','0041',91]] as const) {
        const migration = (await loadMigrations()).find(entry => entry.tag === tag);
        assert.ok(migration);
        const snapshot = JSON.parse(await readFile(`drizzle-release/meta/${file}_snapshot.json`, 'utf8'));
        await snapshotClient.query('BEGIN');
        for (const statement of injectDataTransitions(migration.tag, await drizzleApi.generateMigration(drizzleApi.generateDrizzleJson({}), snapshot))) await snapshotClient.query(statement);
        const snapshotCatalog = await catalog(snapshotClient);
        assert.equal(snapshotCatalog.signature, pinnedSignature(migration));
        assert.equal(snapshotCatalog.objects.relations.filter((relation: any) => relation.relkind === 'r').length, count);
        await snapshotClient.query('ROLLBACK');
      }
    } finally { await snapshotClient.end(); }
  } finally {
    if (created) await admin.query('DROP DATABASE teklifpro_migration_restore_test');
    await admin.end();
  }
});
