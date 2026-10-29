import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

// Only a dedicated, local, disposable test database may be mutated.
test('real HTTP quotation and client routes isolate tenants and enforce viewer role', { timeout: 120_000 }, async () => {
  const raw = process.env.IDOR_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && url.password && !url.search && !url.hash);
  const client = new pg.Client({ connectionString: raw });
  await client.connect();
  const identity = await client.query<{ database: string; system_identifier: string; superuser: boolean }>("SELECT current_database() database, system_identifier::text, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) superuser FROM pg_control_system()");
  assert.equal(identity.rows[0].database, 'teklifpro_bootstrap_test');
  assert.equal(identity.rows[0].superuser, true);
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) });
  await worker.release();
  const credentials = Object.fromEntries(['bimmetraj_migrator','bimmetraj_app','bimmetraj_control','bimmetraj_worker','bimmetraj_backup'].map(role => [role, randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator'|'bimmetraj_app'|'bimmetraj_control'|'bimmetraj_worker'|'bimmetraj_backup',string>;
  const { provisionDatabaseRoles } = await import('../../scripts/database-roles/provision');
  await provisionDatabaseRoles(client, credentials, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: identity.rows[0].system_identifier, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  const appUrl = new URL(url); appUrl.username = 'bimmetraj_app'; appUrl.password = credentials.bimmetraj_app;
  const controlUrl = new URL(url); controlUrl.username = 'bimmetraj_control'; controlUrl.password = credentials.bimmetraj_control;
  process.env.DATABASE_URL = appUrl.toString(); process.env.CONTROL_DATABASE_URL = controlUrl.toString();
  const companyA = randomUUID(), companyB = randomUUID(), userA = randomUUID(), userB = randomUUID(), viewer = randomUUID(), manager = randomUUID(), admin = randomUUID(), clientA = randomUUID(), clientB = randomUUID(), quoteA = randomUUID(), quoteB = randomUUID(), revisionA = randomUUID(), dealA = randomUUID(), activityA = randomUUID(), foreignDeal = randomUUID(), foreignActivity = randomUUID();
  const { AuthService } = await import('../services/auth/authService');
  const { rateLimitStorageKey } = await import('../server/auth/security');
  const { createApiApp } = await import('../server/app');
  const { pool } = await import('../db');
  const { closeControlDatabase } = await import('../db/control-plane');
  await client.query("INSERT INTO companies(id,name) VALUES ($1,'IDOR A'),($2,'IDOR B')", [companyA, companyB]);
  await client.query("INSERT INTO users(id,email,full_name,email_verified) VALUES ($1,$2,'A owner',now()),($3,$4,'B owner',now()),($5,$6,'B viewer',now()),($7,$8,'B manager',now())", [userA,`${userA}@example.test`,userB,`${userB}@example.test`,viewer,`${viewer}@example.test`,manager,`${manager}@example.test`]);
  await client.query("INSERT INTO memberships(user_id,company_id,role) VALUES ($1,$2,'owner'),($3,$4,'owner'),($5,$4,'viewer'),($6,$4,'manager')", [userA,companyA,userB,companyB,viewer,manager]);
  await client.query("INSERT INTO users(id,email,full_name,email_verified) VALUES ($1,$2,'B admin',now())", [admin,`${admin}@example.test`]);
  await client.query("INSERT INTO memberships(user_id,company_id,role) VALUES ($1,$2,'admin')", [admin,companyB]);
  await client.query("INSERT INTO subscriptions(company_id,plan,status) VALUES ($1,'starter','active'),($2,'starter','active')", [companyA,companyB]);
  await client.query("INSERT INTO clients(id,company_id,name,type) VALUES ($1,$2,'IDOR client A','company'),($3,$4,'IDOR client B','company')", [clientA,companyA,clientB,companyB]);
  await client.query("INSERT INTO quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total) VALUES ($1,$2,$3,'IDOR-A','private A',now()+interval '30 days',100,0,20,120),($4,$5,$6,'IDOR-B','private B',now()+interval '30 days',100,0,20,120)", [quoteA,companyA,clientA,quoteB,companyB,clientB]);
  await client.query("INSERT INTO quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total,parent_id,revision_version) VALUES ($1,$2,$3,'IDOR-A-REV','private A',now()+interval '30 days',100,0,20,120,$4,2)", [revisionA,companyA,clientA,quoteA]);
  await client.query("INSERT INTO deals(id,company_id,client_id,name) VALUES ($1,$2,$3,'private deal')", [dealA,companyA,clientA]);
  await client.query("INSERT INTO activities(id,company_id,deal_id,user_id,type,description) VALUES ($1,$2,$3,$4,'note','private activity')", [activityA,companyA,dealA,userA]);
  // Deliberately malformed legacy cross-tenant links must not inflate another tenant's impact counts.
  await client.query("INSERT INTO deals(id,company_id,client_id,name) VALUES ($1,$2,$3,'foreign deal')", [foreignDeal,companyB,clientA]);
  await client.query("INSERT INTO activities(id,company_id,deal_id,user_id,type,description) VALUES ($1,$2,$3,$4,'note','foreign activity')", [foreignActivity,companyB,dealA,userB]);
  const tokenA = AuthService.generateToken({ userId:userA, companyId:companyA, role:'owner' });
  const tokenB = AuthService.generateToken({ userId:userB, companyId:companyB, role:'owner' });
  const tokenManager = AuthService.generateToken({ userId:manager, companyId:companyB, role:'manager' });
  const tokenViewer = AuthService.generateToken({ userId:viewer, companyId:companyB, role:'owner' }); // Claims must not elevate the DB viewer role.
  const tokenAdmin = AuthService.generateToken({ userId:admin, companyId:companyB, role:'admin' });
  const forgedTenant = AuthService.generateToken({ userId:userB, companyId:companyA, role:'owner' });
  const app = createApiApp();
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const request = (path:string, token:string, method='GET', body?:unknown) => fetch(base+path,{method,headers:{authorization:`Bearer ${token}`,...(body === undefined ? {} : {'content-type':'application/json'})},...(body === undefined ? {} : {body:JSON.stringify(body)})});
  const snapshots = async () => ({
    quote: (await client.query('SELECT id,status,project_name,updated_at FROM quotations WHERE id = $1',[quoteA])).rows,
    customer: (await client.query('SELECT id,name,notes,pipeline_stage FROM clients WHERE id = $1',[clientA])).rows,
    usage: (await client.query('SELECT count(*)::int n FROM usage_logs WHERE company_id IN ($1,$2)',[companyA,companyB])).rows[0].n,
    audit: (await client.query('SELECT count(*)::int n FROM smartcheck_audit_logs WHERE company_id IN ($1,$2)',[companyA,companyB])).rows[0].n,
    quoteCount: (await client.query('SELECT count(*)::int n FROM quotations WHERE company_id IN ($1,$2)',[companyA,companyB])).rows[0].n,
    deals: (await client.query('SELECT id,company_id,client_id FROM deals WHERE id IN ($1,$2) ORDER BY id',[dealA,foreignDeal])).rows,
    activities: (await client.query('SELECT id,company_id,deal_id FROM activities WHERE id IN ($1,$2) ORDER BY id',[activityA,foreignActivity])).rows,
  });
  try {
    assert.equal((await request(`/api/quotations/${quoteA}`,tokenA)).status,200, 'A owner must read own quote');
    assert.equal((await request(`/api/clients/${clientB}`,tokenB)).status,200, 'B owner must read own client');
    assert.equal((await request(`/api/quotations/${quoteA}`,forgedTenant)).status,403, 'JWT role/company cannot bypass membership');
    assert.equal((await request(`/api/clients/${clientB}`,tokenViewer)).status,200, 'viewer can read own client');
    assert.equal((await request(`/api/quotations/${quoteB}/status`,tokenManager,'PATCH',{status:'sent'})).status,200, 'manager can change own quote');
    const before = await snapshots();
    const ownImpact = await request(`/api/clients/${clientA}/deletion-impact`,tokenA);
    assert.equal(ownImpact.status,200, await ownImpact.clone().text());
    const ownBody = await ownImpact.json() as {clientId:string;counts:Record<string,number>;limitations:string[]};
    assert.equal(ownBody.clientId,clientA);
    assert.deepEqual(ownBody.counts,{quotations:2,revisions:1,deals:1,activities:1});
    assert.ok(ownBody.limitations.some(text => text.includes('yedek')));
    assert.ok(!JSON.stringify(ownBody).includes('private'));
    const emptyImpact = await request(`/api/clients/${clientB}/deletion-impact`,tokenAdmin);
    assert.equal(emptyImpact.status,200);
    assert.deepEqual((await emptyImpact.json() as {counts:Record<string,number>}).counts,{quotations:1,revisions:0,deals:0,activities:0});
    assert.equal((await request(`/api/clients/${clientA}/deletion-impact`,tokenB)).status,404);
    assert.equal((await request(`/api/clients/${randomUUID()}/deletion-impact`,tokenA)).status,404);
    assert.equal((await request(`/api/clients/${clientB}/deletion-impact`,tokenManager)).status,403);
    assert.equal((await request(`/api/clients/${clientB}/deletion-impact`,tokenViewer)).status,403);
    assert.equal((await request('/api/clients/not-a-uuid/deletion-impact',tokenA)).status,400);
    const edit = {clientId:clientB,quoteNumber:'B',projectName:'X',date:'2026-10-01',expiryDate:'2026-11-01',updatedAt:new Date().toISOString(),items:[{description:'x',unit:'adet',quantity:1,unitPrice:1}]};
    const cases: [string,string,string,unknown?][] = [
      ['quote detail', `/api/quotations/${quoteA}`, 'GET'],
      ['quote SmartCheck', `/api/quotations/${quoteA}/smartcheck`, 'GET'],
      ['quote edit read', `/api/quotations/${quoteA}/edit`, 'GET'],
      ['quote edit write', `/api/quotations/${quoteA}/edit`, 'PATCH', edit],
      ['quote status', `/api/quotations/${quoteA}/status`, 'PATCH', {status:'won'}],
      ['quote calibration', `/api/quotations/${quoteA}/calibration`, 'PATCH', {actualCost:100}],
      ['quote revision', `/api/quotations/${quoteA}/revision`, 'POST'],
      ['quote PDF', `/api/quotations/${quoteA}/pdf`, 'GET'],
      ['client detail', `/api/clients/${clientA}`, 'GET'],
      ['client update', `/api/clients/${clientA}`, 'PATCH', {name:'unauthorized'}],
      ['client notes', `/api/clients/${clientA}/notes`, 'POST', {stage:'lead',content:'unauthorized'}],
    ];
    for (const [label,path,method,body] of cases) {
      const response = await request(path,tokenB,method,body);
      assert.equal(response.status,404,`${label}: expected 404, received ${response.status}: ${await response.text()}`);
    }
    assert.equal((await request(`/api/quotations/${quoteB}`,tokenA)).status,404, 'A cannot read B quote');
    assert.equal((await request(`/api/clients/${clientB}`,tokenA)).status,404, 'A cannot read B client');
    assert.equal((await request(`/api/quotations/${quoteA}/status`,tokenManager,'PATCH',{status:'won'})).status,404, 'manager cannot update another tenant');
    for (const [label,path,method,body] of [
      ['client update',`/api/clients/${clientB}`,'PATCH',{name:'viewer mutation'}],
      ['quote status',`/api/quotations/${quoteB}/status`,'PATCH',{status:'won'}],
      ['quote edit',`/api/quotations/${quoteB}/edit`,'GET'],
      ['quote PDF',`/api/quotations/${quoteB}/pdf`,'GET'],
    ] as [string,string,string,unknown?][]) {
      const response = await request(path,tokenViewer,method,body);
      assert.equal(response.status,403,`${label}: viewer should be denied`);
    }
    assert.deepEqual(await snapshots(),before,'foreign and denied requests must not modify records, audit or quota');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await closeControlDatabase(); await pool.end();
    // Only fixtures with this test's generated IDs are removed from the disposable DB.
    await client.query('DELETE FROM rate_limit_buckets WHERE bucket_key = $1', [rateLimitStorageKey(`pdf:${companyB}`)]);
    await client.query('DELETE FROM smartcheck_audit_logs WHERE company_id IN ($1,$2)', [companyA,companyB]);
    await client.query('DELETE FROM usage_logs WHERE company_id IN ($1,$2)', [companyA,companyB]);
    await client.query('DELETE FROM activities WHERE id IN ($1,$2)', [activityA,foreignActivity]);
    await client.query('DELETE FROM deals WHERE id IN ($1,$2)', [dealA,foreignDeal]);
    await client.query('DELETE FROM quotations WHERE id = $1', [revisionA]);
    await client.query('DELETE FROM quotations WHERE id IN ($1,$2)', [quoteA,quoteB]);
    await client.query('DELETE FROM clients WHERE id IN ($1,$2)', [clientA,clientB]);
    await client.query('DELETE FROM subscriptions WHERE company_id IN ($1,$2)', [companyA,companyB]);
    await client.query('DELETE FROM memberships WHERE company_id IN ($1,$2)', [companyA,companyB]);
    await client.query('DELETE FROM users WHERE id IN ($1,$2,$3,$4,$5)', [userA,userB,viewer,manager,admin]);
    await client.query('DELETE FROM companies WHERE id IN ($1,$2)', [companyA,companyB]);
    await client.end();
  }
});
