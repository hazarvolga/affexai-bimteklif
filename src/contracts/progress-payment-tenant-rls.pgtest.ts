import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_PROGRESS_PAYMENT_RLS_TABLES, DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectRoleBoundaries } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { applyMigrations, loadMigrations } from "../../scripts/release-migrations/runner";
import { withTenantTransaction } from "../db/tenant-context";
import { ProgressPaymentService } from "../services/progress-payments/service";

const databaseName = "teklifpro_upgrade_test";
const roles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"] as const;
type Credentials = Record<typeof roles[number], string>;
const ids = {
  companyA: "11111111-1111-4111-8111-111111111111", companyB: "22222222-2222-4222-8222-222222222222",
  userA: "33333333-3333-4333-8333-333333333333", userB: "44444444-4444-4444-8444-444444444444",
};
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
function requireControlUrl() {
  const raw = process.env.DATABASE_ROLE_TEST_URL;
  assert.ok(raw, "DATABASE_ROLE_TEST_URL is required for the explicit disposable PostgreSQL 16 progress-payment RLS test");
  const url = new URL(raw);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  assert.equal(url.pathname, "/postgres");
  assert.ok(url.username && url.password);
  return url;
}
function dbUrl(control: URL, database: string, user?: string, password?: string) {
  const url = new URL(control); url.pathname = `/${database}`;
  if (user) url.username = user; if (password) url.password = password;
  return url.toString();
}
async function connect(url: string) { const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 3_000 }); await client.connect(); return client; }
async function assertDenied(action: () => Promise<unknown>, label: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof pg.DatabaseError, `${label}: PostgreSQL error expected`);
    assert.equal(error.code, "42501", `${label}: insufficient_privilege expected`);
    return true;
  });
}

async function assertPolicyCatalog(admin: pg.Client) {
  const state = await admin.query<{ name: string; rls: boolean; forced: boolean }>(`select c.relname name,c.relrowsecurity rls,c.relforcerowsecurity forced from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [DATABASE_PROGRESS_PAYMENT_RLS_TABLES]);
  assert.equal(state.rowCount, 10);
  assert.ok(state.rows.every(({ rls, forced }) => rls && forced));
  const policies = await admin.query<{ table_name: string; policy_name: string; command: string }>(`select c.relname table_name,p.polname policy_name,p.polcmd command from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,p.polname`, [DATABASE_PROGRESS_PAYMENT_RLS_TABLES]);
  assert.equal(policies.rowCount, 30);
  for (const table of DATABASE_PROGRESS_PAYMENT_RLS_TABLES) assert.deepEqual(policies.rows.filter((row) => row.table_name === table).map(({ policy_name, command }) => [policy_name, command]), [
    [`${table}_app_tenant`, "*"], [`${table}_backup_read`, "r"], [`${table}_owner_migration`, "*"],
  ]);
}

async function seed(admin: pg.Client) {
  await admin.query("insert into companies(id,name) values ($1,'A'),($2,'B')", [ids.companyA, ids.companyB]);
  await admin.query("insert into users(id,email,full_name) values ($1,'a@t.test','A'),($2,'b@t.test','B')", [ids.userA, ids.userB]);
  await admin.query("insert into memberships(user_id,company_id,role) values ($1,$2,'owner'),($3,$4,'owner')", [ids.userA, ids.companyA, ids.userB, ids.companyB]);
  await admin.query("set session_replication_role=replica");
  try {
    for (const [suffix, company, user] of [["1", ids.companyA, ids.userA], ["2", ids.companyB, ids.userB]] as const) {
      const u = (lead: string) => `${lead}${suffix.repeat(7)}-${suffix.repeat(4)}-4${suffix.repeat(3)}-8${suffix.repeat(3)}-${suffix.repeat(12)}`;
      const contract=u("a"), item=u("b"), period=u("c"), measurement=u("d");
      await admin.query(`insert into construction_contracts(id,company_id,contract_number,project_name,regime,initial_amount,source_document_hash,status,created_by_user_id) values($1,$2,$3,'Fixture','unit_price',10,$4,'active',$5)`, [contract,company,`C-${suffix}`,suffix.repeat(64),user]);
      await admin.query(`insert into construction_contract_items(id,company_id,contract_id,item_code,description,unit,contract_quantity,unit_price,source_hash) values($1,$2,$3,'I','Item','m',1,10,$4)`, [item,company,contract,suffix.repeat(64)]);
      await admin.query(`insert into progress_payment_periods(id,company_id,contract_id,payment_number,period_start,period_end,status,version,created_by_user_id) values($1,$2,$3,1,now(),now(),'draft',1,$4)`, [period,company,contract,user]);
      await admin.query(`insert into progress_measurements(id,company_id,contract_id,period_id,contract_item_id,location,source_type,quantity,unit,source_identity,review_status,created_by_user_id) values($1,$2,$3,$4,$5,'L','manual',1,'m',$6,'pending_review',$7)`, [measurement,company,contract,period,item,`source-${suffix}`,user]);
      await admin.query(`insert into progress_payment_lines(company_id,contract_id,period_id,contract_item_id,previous_quantity,current_quantity,cumulative_quantity,unit_price_snapshot,current_amount,cumulative_amount) values($1,$2,$3,$4,0,1,1,10,10,10)`, [company,contract,period,item]);
      await admin.query(`insert into progress_measurement_review_events(company_id,contract_id,period_id,measurement_id,decision,reason,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id) values($1,$2,$3,$4,'approved','fixture',0,1,$5,$6,$7)`, [company,contract,period,measurement,`review-${suffix}`,suffix.repeat(64),user]);
      await admin.query(`insert into progress_payment_adjustments(company_id,contract_id,period_id,adjustment_type,amount,evidence_hash,created_by_user_id) values($1,$2,$3,'other',0,$4,$5)`, [company,contract,period,suffix.repeat(64),user]);
      await admin.query(`insert into progress_payment_events(company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id) values($1,$2,$3,'cancel','draft','cancelled',0,1,$4,$5,$6)`, [company,contract,period,`event-${suffix}`,suffix.repeat(64),user]);
      await admin.query(`insert into contract_variations(company_id,contract_id,variation_number,kind,amount,created_by_user_id) values($1,$2,1,'addition',0,$3)`, [company,contract,user]);
      await admin.query(`insert into final_accounts(company_id,contract_id,revision_number,status,result_json,source_aggregate_hash,created_by_user_id) values($1,$2,1,'draft','{}',$3,$4)`, [company,contract,suffix.repeat(64),user]);
    }
  } finally { await admin.query("set session_replication_role=origin"); }
}

test("progress-payment bounded context enforces tenant RLS and runtime role boundaries", { timeout: 120_000 }, async () => {
  const controlUrl = requireControlUrl(); const adminPassword = decodeURIComponent(controlUrl.password);
  const control = await connect(controlUrl.toString()); const clients: pg.Client[] = [control]; const pools: pg.Pool[] = [];
  const credentials = Object.fromEntries(roles.map((role) => [role, crypto.randomBytes(24).toString("hex")])) as Credentials;
  let created=false, provisioned=false;
  try {
    assert.equal((await control.query<{ major:number }>("select current_setting('server_version_num')::int/10000 major")).rows[0]?.major,16);
    await control.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    await control.query(`create database ${quote(databaseName)} template template0`); created=true;
    const admin=await connect(dbUrl(controlUrl,databaseName)); clients.push(admin);
    await applyMigrations(admin, await loadMigrations());
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue=await makeWorkerUtils({connectionString:dbUrl(controlUrl,databaseName),schema:"teklifpro_queue",logger:new Logger(()=>()=>{})}); await queue.release();
    const system=(await admin.query<{id:string}>("select system_identifier::text id from pg_control_system()")).rows[0]!.id;
    await provisionDatabaseRoles(admin,credentials,{expectedDatabase:databaseName,expectedSystemIdentifier:system,requiredMarkerRegclass:"teklifpro_release.migrations"},adminPassword); provisioned=true;
    await assertPolicyCatalog(admin); assertRoleBoundaries(await inspectRoleBoundaries(admin)); await seed(admin);
    const app=new pg.Pool({connectionString:dbUrl(controlUrl,databaseName,"bimmetraj_app",credentials.bimmetraj_app),max:2});
    const singleApp=new pg.Pool({connectionString:dbUrl(controlUrl,databaseName,"bimmetraj_app",credentials.bimmetraj_app),max:1});
    const worker=new pg.Pool({connectionString:dbUrl(controlUrl,databaseName,"bimmetraj_worker",credentials.bimmetraj_worker),max:1});
    const backup=new pg.Pool({connectionString:dbUrl(controlUrl,databaseName,"bimmetraj_backup",credentials.bimmetraj_backup),max:1}); pools.push(app,worker,backup);
    pools.push(singleApp);
    const migrator=await connect(dbUrl(controlUrl,databaseName,"bimmetraj_migrator",credentials.bimmetraj_migrator)); clients.push(migrator);
    for (const table of DATABASE_PROGRESS_PAYMENT_RLS_TABLES) {
      assert.equal((await app.query(`select count(*)::int count from ${quote(table)}`)).rows[0].count,0,`${table}: no context deny`);
      const [a,b]=await Promise.all([withTenantTransaction(app,{companyId:ids.companyA,userId:ids.userA},c=>c.query(`select distinct company_id::text company_id from ${quote(table)}`)),withTenantTransaction(app,{companyId:ids.companyB,userId:ids.userB},c=>c.query(`select distinct company_id::text company_id from ${quote(table)}`))]);
      assert.deepEqual(a.rows,[{company_id:ids.companyA}],`${table}: tenant A isolation`); assert.deepEqual(b.rows,[{company_id:ids.companyB}],`${table}: tenant B isolation`);
      assert.equal((await worker.query(`select count(*)::int count from ${quote(table)}`)).rows[0].count,0,`${table}: worker default deny`);
      assert.equal((await backup.query(`select count(*)::int count from ${quote(table)}`)).rows[0].count,2,`${table}: backup read`);
    }
    await assertDenied(() => worker.query(`insert into construction_contracts(company_id,contract_number,project_name,regime,initial_amount,source_document_hash,status,created_by_user_id) values($1,'WORKER','Worker','unit_price',0,$2,'draft',$3)`, [ids.companyA,"f".repeat(64),ids.userA]), "worker progress-payment write");
    await assertDenied(() => backup.query("update construction_contracts set project_name='forbidden'"), "backup progress-payment write");
    await assertDenied(() => migrator.query("select * from public.construction_contracts"), "migrator direct progress-payment read");
    await migrator.query("begin");
    try {
      await migrator.query("set local role bimmetraj_owner");
      assert.equal((await migrator.query<{count:number}>("select count(*)::int count from public.construction_contracts")).rows[0]!.count,2);
    } finally { await migrator.query("rollback"); }
    const firstContext = await withTenantTransaction(singleApp,{companyId:ids.companyA,userId:ids.userA},async c => (await c.query<{company:string}>("select current_setting('bimmetraj.company_id') company")).rows[0]!.company);
    assert.equal(firstContext, ids.companyA);
    assert.deepEqual((await singleApp.query("select company_id::text from construction_contracts")).rows, [], "COMMIT must clear transaction-local tenant context");
    await assert.rejects(withTenantTransaction(singleApp,{companyId:ids.companyA,userId:ids.userA},async c => { await c.query("select 1"); throw new Error("rollback sentinel"); }), /rollback sentinel/);
    assert.deepEqual((await singleApp.query("select company_id::text from construction_contracts")).rows, [], "ROLLBACK must clear transaction-local tenant context");
    const reused = await withTenantTransaction(singleApp,{companyId:ids.companyB,userId:ids.userB},async c => ({ context:(await c.query<{company:string}>("select current_setting('bimmetraj.company_id') company")).rows[0]!.company, count:(await c.query<{count:number}>("select count(*)::int count from construction_contracts")).rows[0]!.count }));
    assert.deepEqual(reused,{context:ids.companyB,count:1});
    await assert.rejects(withTenantTransaction(app,{companyId:ids.companyA,userId:ids.userA},c=>c.query(`insert into construction_contracts(company_id,contract_number,project_name,regime,initial_amount,source_document_hash,status,created_by_user_id) values($1,'X','X','unit_price',0,$2,'draft',$3)`,[ids.companyB,"f".repeat(64),ids.userB])),(e:unknown)=>e instanceof pg.DatabaseError&&e.code==="42501");
    const tenantBContract = "a2222222-2222-4222-8222-222222222222";
    const crossTenantMutation = await withTenantTransaction(app,{companyId:ids.companyA,userId:ids.userA},async c => ({
      updated: (await c.query("update construction_contracts set project_name='forbidden' where id=$1",[tenantBContract])).rowCount,
      deleted: (await c.query("delete from construction_contracts where id=$1",[tenantBContract])).rowCount,
    }));
    assert.deepEqual(crossTenantMutation,{updated:0,deleted:0});
    const service=new ProgressPaymentService(app);
    const createdContract=await service.createContract({companyId:ids.companyA,userId:ids.userA},{contractNumber:"SERVICE-A",projectName:"Service",currency:"TRY",regime:"unit_price",initialAmount:"10.00",sourceDocumentHash:"e".repeat(64),items:[{itemCode:"S",description:"Service item",unit:"m",contractQuantity:"1.0000",unitPrice:"10.00",sourceHash:"d".repeat(64)}]});
    assert.equal((createdContract.contract as {contract_number:string}).contract_number,"SERVICE-A");
    assert.ok((await service.list({companyId:ids.companyA,userId:ids.userA})).some((row:any)=>row.contract_number==="SERVICE-A"));
    await admin.query("alter table teklifpro_release.migrations rename column tag to tag_missing");
    try {
      const missingTagColumn = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(missingTagColumn), /release ledger with migration tag 0013_cde_tenant_rls|required managed schema/i);
      await assert.rejects(() => provisionDatabaseRoles(admin,credentials,{expectedDatabase:databaseName,expectedSystemIdentifier:system,requiredMarkerRegclass:"teklifpro_release.migrations"},adminPassword), /migration tag 0013_cde_tenant_rls|boundary violations/i);
    } finally { await admin.query("alter table teklifpro_release.migrations rename column tag_missing to tag"); }
    await admin.query("update teklifpro_release.migrations set tag='0013_cde_tenant_rls_missing' where tag='0013_cde_tenant_rls'");
    try {
      const missingCdeTag = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(missingCdeTag), /applied migration tag 0013_cde_tenant_rls/);
    } finally { await admin.query("update teklifpro_release.migrations set tag='0013_cde_tenant_rls' where tag='0013_cde_tenant_rls_missing'"); }
    await admin.query("update teklifpro_release.migrations set tag='0015_progress_payment_tenant_rls_missing' where tag='0015_progress_payment_tenant_rls'");
    try {
      const missingProgressTag = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(missingProgressTag), /applied migration tag 0015_progress_payment_tenant_rls/);
      await assert.rejects(() => provisionDatabaseRoles(admin,credentials,{expectedDatabase:databaseName,expectedSystemIdentifier:system,requiredMarkerRegclass:"teklifpro_release.migrations"},adminPassword), /migration tag 0015_progress_payment_tenant_rls|boundary violations/i);
    } finally { await admin.query("update teklifpro_release.migrations set tag='0015_progress_payment_tenant_rls' where tag='0015_progress_payment_tenant_rls_missing'"); }
    await admin.query("alter table final_accounts rename to final_accounts_missing");
    try {
      const partialTables = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(partialTables), /complete RLS table set is required/);
      await assert.rejects(() => provisionDatabaseRoles(admin,credentials,{expectedDatabase:databaseName,expectedSystemIdentifier:system,requiredMarkerRegclass:"teklifpro_release.migrations"},adminPassword), /complete RLS table set|boundary violations/i);
    } finally { await admin.query("alter table final_accounts_missing rename to final_accounts"); }
    await admin.query("alter policy construction_contracts_app_tenant on construction_contracts rename to construction_contracts_app_tenant_missing");
    try {
      const missingPolicy = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(missingPolicy), /progress-payment FORCE-RLS policy matrix drift/);
      await assert.rejects(() => provisionDatabaseRoles(admin,credentials,{expectedDatabase:databaseName,expectedSystemIdentifier:system,requiredMarkerRegclass:"teklifpro_release.migrations"},adminPassword), /policy matrix drift|boundary violations/i);
    } finally { await admin.query("alter policy construction_contracts_app_tenant_missing on construction_contracts rename to construction_contracts_app_tenant"); }
    await admin.query("begin");
    try {
      await admin.query(`drop table ${DATABASE_PROGRESS_PAYMENT_RLS_TABLES.map(quote).join(",")} cascade`);
      const appliedTagWithoutTables = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(appliedTagWithoutTables), /public progress-payment: complete RLS table set is required/);
    } finally { await admin.query("rollback"); }
    await admin.query("begin");
    try {
      await admin.query("alter table construction_contracts no force row level security");
      const drift = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(drift), /progress-payment FORCE-RLS policy matrix drift/);
    } finally { await admin.query("rollback"); }
  } finally {
    const cleanupErrors: unknown[] = [];
    for (const result of await Promise.allSettled(pools.map(pool=>pool.end()))) if (result.status === "rejected") cleanupErrors.push(result.reason);
    for (const result of await Promise.allSettled(clients.slice(1).reverse().map(client=>client.end()))) if (result.status === "rejected") cleanupErrors.push(result.reason);
    if (created) try { await control.query(`drop database if exists ${quote(databaseName)} with (force)`); } catch (error) { cleanupErrors.push(error); }
    if (provisioned) for (const role of [...DATABASE_ROLE_SPECS].reverse()) try { await control.query(`drop role if exists ${quote(role.name)}`); } catch (error) { cleanupErrors.push(error); }
    try { await control.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))"); } catch (error) { cleanupErrors.push(error); }
    try { await control.end(); } catch (error) { cleanupErrors.push(error); }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Progress-payment tenant RLS test cleanup failed");
  }
});
