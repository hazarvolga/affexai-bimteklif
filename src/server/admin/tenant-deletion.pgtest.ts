import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('admin deletion clears unprotected tenants, keeps audit history and refuses protected data', { timeout: 120_000 }, async () => {
  const raw = process.env.TENANT_DELETION_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && url.password && !url.search && !url.hash);
  const db = new pg.Client({ connectionString: raw }); await db.connect();
  const identity = await db.query<{ system_identifier: string }>('SELECT system_identifier::text FROM pg_control_system()');
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) }); await worker.release();
  const roles = ['bimmetraj_migrator', 'bimmetraj_app', 'bimmetraj_control', 'bimmetraj_worker', 'bimmetraj_backup'] as const;
  const creds = Object.fromEntries(roles.map(role => [role, randomBytes(32).toString('hex')])) as Record<(typeof roles)[number], string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  await provisionDatabaseRoles(db, creds, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: identity.rows[0].system_identifier, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  const appUrl = new URL(url); appUrl.username = 'bimmetraj_app'; appUrl.password = creds.bimmetraj_app;
  const controlUrl = new URL(url); controlUrl.username = 'bimmetraj_control'; controlUrl.password = creds.bimmetraj_control;
  process.env.DATABASE_URL = appUrl.toString(); process.env.CONTROL_DATABASE_URL = controlUrl.toString();
  const { AuthService } = await import('../../services/auth/authService');
  const { createApiApp } = await import('../app');
  const { pool } = await import('../../db'); const { closeControlDatabase } = await import('../../db/control-plane');

  const [admin, owner, shared, plain, protectedOwner] = Array.from({ length: 5 }, () => randomUUID());
  const [firm, otherFirm, protectedFirm, client, quote] = Array.from({ length: 5 }, () => randomUUID());
  const userRows = [[admin, true], [owner, false], [shared, false], [plain, false], [protectedOwner, false]] as const;
  for (const [id, superAdmin] of userRows) await db.query('INSERT INTO users(id,email,full_name,email_verified,is_super_admin) VALUES ($1,$2,$3,now(),$4)', [id, `${id}@example.test`, 'User', superAdmin]);
  await db.query("INSERT INTO companies(id,name) VALUES ($1,'Silinecek'),($2,'Diger'),($3,'Korunan')", [firm, otherFirm, protectedFirm]);
  await db.query("INSERT INTO subscriptions(company_id,plan,status) VALUES ($1,'starter','active'),($2,'starter','active'),($3,'starter','active')", [firm, otherFirm, protectedFirm]);
  await db.query("INSERT INTO memberships(user_id,company_id,role) VALUES ($1,$4,'owner'),($2,$4,'viewer'),($2,$5,'owner'),($3,$4,'viewer'),($6,$7,'owner')", [owner, shared, plain, firm, otherFirm, protectedOwner, protectedFirm]);
  await db.query("INSERT INTO clients(id,company_id,name,type) VALUES ($1,$2,'Musteri','company')", [client, firm]);
  await db.query("INSERT INTO quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total) VALUES ($1,$2,$3,'DEL-1','p',now()+interval '1 day',1,0,0,1)", [quote, firm, client]);
  await db.query("INSERT INTO usage_logs(company_id,user_id,feature) VALUES ($1,$2,'QUOTATION_CREATED')", [firm, owner]);
  await db.query("INSERT INTO admin_audit_logs(admin_id,target_company_id,action,details) VALUES ($1,$2,'tenant.updated','{}')", [admin, firm]);
  await db.query("INSERT INTO usage_records(company_id,period) VALUES ($1,'2026-10')", [firm]);
  await db.query("INSERT INTO documents(company_id,uploaded_by_user_id,original_file_name,display_name,storage_key,mime_type,file_size_bytes,checksum_sha256) VALUES ($1,$2,'a.ifc','a.ifc','k','application/octet-stream',1,$3)", [protectedFirm, protectedOwner, 'a'.repeat(64)]);

  const app = createApiApp(); const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const adminToken = AuthService.generateToken({ userId: admin, companyId: null, role: null });
  const ownerToken = AuthService.generateToken({ userId: shared, companyId: otherFirm, role: 'owner' });
  const call = (path: string, token: string, method = 'GET', body?: unknown) => fetch(`${base}/api/admin${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const rows = async (table: string, column: string, value: string) => (await db.query(`SELECT 1 FROM ${table} WHERE ${column}=$1`, [value])).rowCount;

  try {
    assert.equal((await call(`/tenants/${firm}`, ownerToken, 'DELETE', { confirmName: 'Silinecek' })).status, 403);
    assert.equal((await rows('companies', 'id', firm)), 1);

    const previewResponse = await call(`/tenants/${firm}/deletion-preview`, adminToken);
    assert.equal(previewResponse.status, 200, await previewResponse.clone().text());
    const preview = await previewResponse.json() as { deletable: boolean; blockers: Record<string, number> };
    assert.deepEqual(preview.blockers, {});
    assert.equal(preview.deletable, true);
    assert.equal(await rows('companies', 'id', firm), 1, 'preview must not change data');

    const blocked = await (await call(`/tenants/${protectedFirm}/deletion-preview`, adminToken)).json() as { deletable: boolean; blockers: Record<string, number> };
    assert.equal(blocked.deletable, false); assert.equal(blocked.blockers.documents, 1);
    assert.equal((await call(`/tenants/${protectedFirm}`, adminToken, 'DELETE', { confirmName: 'Korunan' })).status, 409);
    assert.equal(await rows('companies', 'id', protectedFirm), 1);

    assert.equal((await call(`/tenants/${firm}`, adminToken, 'DELETE', { confirmName: 'Yanlis' })).status, 400);
    assert.equal(await rows('companies', 'id', firm), 1);

    assert.equal((await call(`/tenants/${firm}/members/${owner}`, adminToken, 'DELETE')).status, 400, 'sole owner stays');

    const removed = await call(`/tenants/${firm}/members/${plain}`, adminToken, 'DELETE');
    assert.equal(removed.status, 200, await removed.clone().text());
    assert.equal((await removed.json() as { userDeleted: boolean }).userDeleted, true);
    assert.equal(await rows('users', 'id', plain), 0);

    const deleted = await call(`/tenants/${firm}`, adminToken, 'DELETE', { confirmName: 'Silinecek' });
    assert.equal(deleted.status, 200, await deleted.clone().text());
    assert.deepEqual(await deleted.json(), { success: true, deletedUsers: 1, retainedUsers: 1 });
    for (const [table, column] of [['companies', 'id'], ['clients', 'company_id'], ['quotations', 'company_id'], ['memberships', 'company_id'], ['subscriptions', 'company_id'], ['usage_logs', 'company_id'], ['usage_records', 'company_id']]) {
      assert.equal(await rows(table, column, firm), 0, table);
    }
    assert.equal(await rows('users', 'id', owner), 0, 'owner without other data is removed');
    assert.equal(await rows('users', 'id', shared), 1, 'member of another firm stays');
    assert.equal(await rows('companies', 'id', otherFirm), 1);
    const audit = await db.query<{ action: string }>("SELECT action FROM admin_audit_logs WHERE details->>'deletedCompanyId'=$1", [firm]);
    assert.deepEqual(audit.rows.map(row => row.action), ['tenant.deleted']);
    const history = await db.query<{ target_company_id: string | null }>("SELECT target_company_id FROM admin_audit_logs WHERE action='tenant.updated' AND admin_id=$1", [admin]);
    assert.deepEqual(history.rows, [{ target_company_id: null }], 'older audit history survives the company');
    const appClient = new pg.Client({ connectionString: appUrl.toString() }); await appClient.connect();
    await assert.rejects(appClient.query('SELECT public.bimmetraj_clear_deleted_company_usage($1)', [otherFirm]), /permission denied/);
    await appClient.end();
    const control = new pg.Client({ connectionString: controlUrl.toString() }); await control.connect();
    await assert.rejects(control.query('SELECT public.bimmetraj_clear_deleted_company_usage($1)', [otherFirm]), /without members/);
    await assert.rejects(control.query('DELETE FROM usage_records'), /permission denied/);
    await control.end();
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); await closeControlDatabase(); await db.end(); }
});
