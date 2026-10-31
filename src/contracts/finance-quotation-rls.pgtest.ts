import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import { inspectFinanceQuotationRlsViolations } from '../../scripts/database-roles/inspect';

/** Only a task-owned disposable DB, never a shared or production database. */
test('finance rows follow their parent quotation across restricted app tenants', { timeout: 30000 }, async () => {
  const raw = process.env.FINANCE_RLS_TEST_URL;
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.CI_DISPOSABLE_DATABASE, 'true');
  assert.ok(raw);
  const url = new URL(raw);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/teklifpro_bootstrap_test');
  assert.equal(url.username, 'postgres');
  const admin = new pg.Client({ connectionString: raw });
  const appUrl = new URL(raw); appUrl.username = 'bimmetraj_app';
  const app = new pg.Client({ connectionString: appUrl.toString() });
  const urlFor = (name: string) => { const result = new URL(raw); result.username = name; return result.toString(); };
  const backup = new pg.Client({ connectionString: urlFor('bimmetraj_backup') });
  const worker = new pg.Client({ connectionString: urlFor('bimmetraj_worker') });
  const migrator = new pg.Client({ connectionString: urlFor('bimmetraj_migrator') });
  await admin.connect(); await app.connect(); await backup.connect(); await worker.connect(); await migrator.connect();
  try {
    // CI role bootstrap creates roles but does not run production db-provision.
    // Install only the grants this disposable, task-owned database needs for the smoke.
    await admin.query('grant select,insert,update,delete on public.cost_components,public.quotation_financials to bimmetraj_app,bimmetraj_owner');
    await admin.query('grant select on public.quotations,public.cost_components,public.quotation_financials to bimmetraj_backup');
    await admin.query('grant select on public.quotations to bimmetraj_app,bimmetraj_owner');
    await admin.query('grant select,insert,update,delete on public.quotations,public.quotation_items,public.clients,public.quotation_item_evidence to bimmetraj_app');
    await admin.query('grant select on public.pilot_applications,public.industries,public.quotation_transfer_ledgers,public.quotation_transfer_source_rows to bimmetraj_app');
    const a = crypto.randomUUID(), b = crypto.randomUUID(), ua = crypto.randomUUID(), ub = crypto.randomUUID();
    const ca = crypto.randomUUID(), cb = crypto.randomUUID(), qa = crypto.randomUUID(), qa2 = crypto.randomUUID(), qb = crypto.randomUUID(), qb2 = crypto.randomUUID();
    await admin.query("insert into companies(id,name) values($1,'RLS A'),($2,'RLS B')", [a,b]);
    await admin.query("insert into users(id,email,full_name,email_verified) values($1,$2,'A',now()),($3,$4,'B',now())", [ua,`${ua}@example.test`,ub,`${ub}@example.test`]);
    await admin.query("insert into memberships(user_id,company_id,role) values($1,$2,'owner'),($3,$4,'owner')", [ua,a,ub,b]);
    await admin.query("insert into clients(id,company_id,name,type) values($1,$2,'A','company'),($3,$4,'B','company')", [ca,a,cb,b]);
    for (const [id, company, client] of [[qa,a,ca],[qa2,a,ca],[qb,b,cb],[qb2,b,cb]]) await admin.query("insert into quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total) values($1,$2,$3,$4,'RLS','2030-01-01',0,0,0,0)",[id,company,client,id]);
    for (const quote of [qa,qb]) { await admin.query('insert into cost_components(quotation_id,material_cost) values($1,1)',[quote]); await admin.query("insert into quotation_financials(quotation_id,total_cost,total_price,profit,margin,risk_level) values($1,1,2,1,50,'low')",[quote]); }
    for (const table of ['cost_components','quotation_financials']) {
      assert.equal((await app.query(`select * from ${table} where quotation_id=any($1::uuid[])`,[[qa,qb]])).rowCount,0,`${table}: missing tenant must see nothing`);
      await app.query('begin');
      await app.query("select set_config('bimmetraj.company_id',$1,true),set_config('bimmetraj.user_id',$2,true)",[a,ua]);
      assert.deepEqual((await app.query(`select quotation_id from ${table} where quotation_id=any($1::uuid[])`,[[qa,qb]])).rows.map(x=>x.quotation_id),[qa]);
      assert.equal((await app.query(`update ${table} set quotation_id=quotation_id where quotation_id=$1`,[qb])).rowCount,0);
      assert.equal((await app.query(`delete from ${table} where quotation_id=$1`,[qb])).rowCount,0);
      await app.query('savepoint before_illegal');
      const insert = table === 'cost_components' ? `insert into ${table}(quotation_id) values($1)` : `insert into ${table}(quotation_id,total_cost,total_price,profit,margin,risk_level) values($1,1,2,1,50,'low')`;
      await assert.rejects(() => app.query(insert,[qb2]),(err: unknown)=>err instanceof pg.DatabaseError && err.code==='42501');
      await app.query('rollback to savepoint before_illegal');
      await assert.rejects(() => app.query(`update ${table} set quotation_id=$1 where quotation_id=$2`,[qb2,qa]),(err: unknown)=>err instanceof pg.DatabaseError && err.code==='42501');
      await app.query('rollback');
      assert.equal((await backup.query(`select * from ${table} where quotation_id=any($1::uuid[])`,[[qa,qb]])).rowCount,2,`${table}: backup must retain both tenants`);
      await assert.rejects(() => worker.query(`select * from ${table}`),(err: unknown)=>err instanceof pg.DatabaseError && err.code==='42501');
      await migrator.query('begin');
      await migrator.query('set local role bimmetraj_owner');
      assert.equal((await migrator.query(`select * from ${table} where quotation_id=any($1::uuid[])`,[[qa,qb]])).rowCount,2,`${table}: owner migration policy`);
      await migrator.query('rollback');
      await app.query('begin');
      await app.query("select set_config('bimmetraj.company_id',$1,true),set_config('bimmetraj.user_id',$2,true)",[b,ub]);
      assert.deepEqual((await app.query(`select quotation_id from ${table} where quotation_id=any($1::uuid[])`,[[qa,qb]])).rows.map(x=>x.quotation_id),[qb]);
      await app.query('rollback');
      await app.query('begin');
      await app.query("select set_config('bimmetraj.company_id',$1,true),set_config('bimmetraj.user_id',$2,true)",[a,ua]);
      assert.equal((await app.query(insert,[qa2])).rowCount,1);
      assert.equal((await app.query(`update ${table} set quotation_id=quotation_id where quotation_id=$1`,[qa])).rowCount,1);
      assert.equal((await app.query(`${insert} on conflict (quotation_id) do update set quotation_id=excluded.quotation_id`,[qa])).rowCount,1,`${table}: own upsert must remain usable`);
      await app.query('rollback');
    }
    const rls = await admin.query("select relname,relrowsecurity,relforcerowsecurity from pg_class where relname=any($1::text[])",[['cost_components','quotation_financials']]);
    assert.equal(rls.rowCount,2); for (const row of rls.rows) assert.ok(row.relrowsecurity && row.relforcerowsecurity);
    const previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = appUrl.toString();
    try {
      const [{ registerProfitRoutes }, { registerCompanyRoutes }, { editManualQuotation, editQuotationInput, loadEditableQuotation }, dbModule] = await Promise.all([import('../server/routes/profit'), import('../server/routes/company'), import('../services/quotations/edit'), import('../db')]);
      const handlers = new Map<string, Function>();
      const express = Object.fromEntries(['post', 'get', 'patch', 'put', 'delete'].map(method => [method, (path: string, ...fns: Function[]) => handlers.set(`${method} ${path}`, fns.at(-1)!)])) as any;
      const profit = { analyzeProfitability: async () => ({ totalCost: 10, totalPrice: 20, profit: 10, margin: 50, riskScore: 0, riskLevel: 'low', costStatus: 'complete', costBreakdown: { material: 10, labor: 0, logistics: 0, subcontractor: 0, overhead: 0 } }) } as any;
      registerProfitRoutes(express, profit, () => {});
      registerCompanyRoutes(express);
      const call = async (key: string, quotationId: string) => {
        const result = { code: 200, body: undefined as any, status(code: number) { this.code = code; return this; }, json(body: unknown) { this.body = body; return this; } };
        await handlers.get(key)!({ user: { userId: ua, companyId: a }, body: { quotationId }, params: { quotationId } }, result);
        return result;
      };
      assert.equal((await call('post /api/profit/calculate', qa)).code, 200, 'own finance upsert must work through the route');
      assert.equal((await call('post /api/profit/calculate', qb)).code, 404, 'other tenant quote cannot be calculated');
      assert.equal((await call('get /api/profit/report/:quotationId', qa)).code, 200);
      assert.equal((await call('get /api/profit/report/:quotationId', qb)).code, 404);
      const calibration = await call('get /api/company/risk-calibration', qa);
      assert.equal(calibration.code, 200);
      assert.equal(calibration.body.financialReportCount, 1, 'company summary excludes other tenant finance');
      await admin.query("update quotations set calibration_status='collected', observed_actual_cost=12 where id=any($1::uuid[])", [[qa,qb]]);
      const report = await call('get /api/company/risk-calibration/report', qa);
      assert.equal(report.code, 200);
      assert.equal(report.body.observationCount, 1, 'company report excludes other tenant finance');
      const storedQuote = await loadEditableQuotation({ userId: ua, companyId: a }, qa);
      const edit = editQuotationInput.parse({ clientId: ca, quoteNumber: qa, projectName: 'Edited', date: '2026-10-28', expiryDate: '2030-01-01', currency: 'TRY', status: 'draft', updatedAt: storedQuote.updatedAt.toISOString(), items: [{ description: 'Test', unit: 'adet', quantity: 1, unitPrice: 10 }] });
      await editManualQuotation({ userId: ua, companyId: a }, qa, edit);
      assert.equal((await admin.query('select * from quotation_financials where quotation_id=$1',[qa])).rowCount, 0, 'editing own quote clears stale finance');
      assert.equal((await admin.query('select * from quotation_financials where quotation_id=$1',[qb])).rowCount, 1, 'editing own quote leaves other tenant finance intact');
      await dbModule.pool.end();
    } finally {
      if (previousUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousUrl;
    }
    assert.deepEqual(await inspectFinanceQuotationRlsViolations(admin), []);
    await admin.query('alter table public.cost_components no force row level security');
    try { assert.ok((await inspectFinanceQuotationRlsViolations(admin)).some(issue => issue.includes('cost_components'))); }
    finally { await admin.query('alter table public.cost_components force row level security'); }
  } finally { await migrator.end(); await worker.end(); await backup.end(); await app.end(); await admin.end(); }
});
