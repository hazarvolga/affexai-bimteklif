import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('price review uses provisioned runtime role for atomic updates and audit', { timeout: 60000 }, async () => {
  const raw = process.env.PRICE_REVIEW_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && url.password && !url.search && !url.hash);
  const client = new pg.Client({ connectionString: raw });
  await client.connect();
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) });
  await worker.release();
  const systemId = (await client.query<{ system_identifier: string }>('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier;
  const credentials = Object.fromEntries(['bimmetraj_migrator', 'bimmetraj_app', 'bimmetraj_control', 'bimmetraj_worker', 'bimmetraj_backup'].map(role => [role, randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator' | 'bimmetraj_app' | 'bimmetraj_control' | 'bimmetraj_worker' | 'bimmetraj_backup', string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  await provisionDatabaseRoles(client, credentials, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: systemId, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  const acl = await client.query<{ table_name: string; owner: string; can_select: boolean; can_update: boolean }>(
    `SELECT c.relname table_name, pg_get_userbyid(c.relowner) owner,
       has_table_privilege('bimmetraj_app', c.oid, 'SELECT') can_select,
       has_table_privilege('bimmetraj_app', c.oid, 'UPDATE') can_update
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname IN ('price_feed_staging','pricing_data_sources') ORDER BY c.relname`,
  );
  assert.equal(acl.rows.length, 2);
  assert.ok(acl.rows.every(row => row.owner === 'bimmetraj_owner' && row.can_select && row.can_update), 'production-like ownership and runtime grants required');
  const appUrl = new URL(url); appUrl.username = 'bimmetraj_app'; appUrl.password = credentials.bimmetraj_app;
  const controlUrl = new URL(url); controlUrl.username = 'bimmetraj_control'; controlUrl.password = credentials.bimmetraj_control;
  process.env.DATABASE_URL = appUrl.toString(); process.env.CONTROL_DATABASE_URL = controlUrl.toString();
  const adminId = randomUUID(), sourceId = randomUUID(), old = randomUUID(), first = randomUUID(), second = randomUUID();
  await client.query('INSERT INTO users(id,email,full_name,email_verified,is_super_admin) VALUES ($1,$2,$3,now(),true)', [adminId, `${adminId}@example.test`, 'Atomic review admin']);
  await client.query("INSERT INTO pricing_data_sources(id,code,name,category,authorization_status) VALUES ($1,$2,'Fixture','official_gazette','pending')", [sourceId, `atomic_${sourceId}`]);
  for (const [index, id] of [old, first, second].entries()) await client.query("INSERT INTO price_feed_staging(id,source_id,item_code,item_name,unit,crawled_price,source_url,notes,status) VALUES ($1,$2,'A','Fixture','m',100,'https://example.test/price','[live-html-v1] fixture',$3)", [id, sourceId, index === 0 ? 'approved' : 'pending']);
  const express = (await import('express')).default;
  const { registerAdminRoutes } = await import('./admin');
  const { AuthService } = await import('../../services/auth/authService');
  const { pool } = await import('../../db');
  const { closeControlDatabase } = await import('../../db/control-plane');
  const app = express(); app.use(express.json()); registerAdminRoutes(app);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const token = AuthService.generateToken({ userId: adminId, companyId: null, role: null });
  const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const root = '/api/admin/pricing-sources/staging';
  try {
    await client.query("CREATE FUNCTION public.reject_price_review_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'price_feed_%' THEN RAISE EXCEPTION 'audit fixture failure'; END IF; RETURN NEW; END $$");
    await client.query('CREATE TRIGGER reject_price_review_audit_test BEFORE INSERT ON public.admin_audit_logs FOR EACH ROW EXECUTE FUNCTION public.reject_price_review_audit_test()');
    assert.equal((await post(`${root}/${first}/review`, { action: 'approve' })).status, 500);
    assert.equal((await post(`${root}/bulk-review`, { action: 'approve', sourceId })).status, 500);
    const before = await client.query('SELECT id,status FROM price_feed_staging WHERE source_id=$1 ORDER BY id', [sourceId]);
    assert.deepEqual(before.rows.map(row => [row.id, row.status]).sort(), [[old, 'approved'], [first, 'pending'], [second, 'pending']].sort());
    assert.equal((await client.query('SELECT authorization_status FROM pricing_data_sources WHERE id=$1', [sourceId])).rows[0].authorization_status, 'pending');
    await client.query('DROP TRIGGER reject_price_review_audit_test ON public.admin_audit_logs');
    const responses = await Promise.all([first, second].map(id => post(`${root}/${id}/review`, { action: 'approve' })));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 200]);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM price_feed_staging WHERE source_id=$1 AND status='approved'", [sourceId])).rows[0].n, 1);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM admin_audit_logs WHERE admin_id=$1 AND action='price_feed_approve'", [adminId])).rows[0].n, 2);
  } finally {
    await client.query('DROP TRIGGER IF EXISTS reject_price_review_audit_test ON public.admin_audit_logs');
    await client.query('DROP FUNCTION IF EXISTS public.reject_price_review_audit_test()');
    await client.query('DELETE FROM admin_audit_logs WHERE admin_id=$1', [adminId]);
    await client.query('DELETE FROM pricing_data_sources WHERE id=$1', [sourceId]);
    await client.query('DELETE FROM users WHERE id=$1', [adminId]);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeControlDatabase(); await pool.end(); await client.end();
  }
});
