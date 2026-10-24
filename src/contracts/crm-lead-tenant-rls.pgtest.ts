import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectCrmLeadRlsViolations, inspectRoleBoundaries } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { applyMigrations, loadMigrations } from "../../scripts/release-migrations/runner";
import { withTenantTransaction } from "../db/tenant-context";
import { CrmLeadService } from "../services/crm/lead-service";
import { QuotaError } from "../services/billing/quota-policy";

const databaseName = "teklifpro_upgrade_test";
const roles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_worker", "bimmetraj_backup"] as const;
type Credentials = Record<typeof roles[number], string>;
const ids = {
  companyA: "11111111-1111-4111-8111-111111111111", companyB: "22222222-2222-4222-8222-222222222222",
  userA: "33333333-3333-4333-8333-333333333333", userB: "44444444-4444-4444-8444-444444444444",
  planA: "55555555-5555-4555-8555-555555555555", planB: "66666666-6666-4666-8666-666666666666",
} as const;
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
function controlUrl() {
  const raw = process.env.DATABASE_ROLE_TEST_URL; assert.ok(raw, "DATABASE_ROLE_TEST_URL is required");
  const url = new URL(raw); assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)); assert.equal(url.pathname, "/postgres");
  assert.ok(url.username && url.password && !url.search && !url.hash); return url;
}
function urlFor(control: URL, database: string, user?: string, password?: string) {
  const url = new URL(control); url.pathname = `/${database}`; if (user) url.username = user; if (password) url.password = password; return url.toString();
}
async function connect(connectionString: string) { const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 }); await client.connect(); return client; }
async function denied(action: () => Promise<unknown>) { await assert.rejects(action, (error: unknown) => error instanceof pg.DatabaseError && error.code === "42501"); }
async function deniedOrNoRows(action: () => Promise<pg.QueryResult>) {
  try { assert.equal((await action()).rowCount, 0); }
  catch (error) { assert.ok(error instanceof pg.DatabaseError && error.code === "42501"); }
}

test("CRM leads enforce INSERT/SELECT-only tenant RLS and atomic lead quota reservation", { timeout: 120_000 }, async () => {
  const control = controlUrl(); const root = await connect(control.toString());
  const administratorCredential = decodeURIComponent(control.password);
  const credentials = Object.fromEntries(roles.map(role => [role, crypto.randomBytes(32).toString("hex")])) as Credentials;
  const clients: pg.Client[] = []; const pools: pg.Pool[] = []; let created = false; let provisioned = false;
  try {
    assert.equal((await root.query<{ major: number }>("select current_setting('server_version_num')::int/10000 major")).rows[0]?.major, 16);
    await root.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    assert.equal((await root.query("select 1 from pg_database where datname=$1", [databaseName])).rowCount, 0);
    assert.equal((await root.query("select 1 from pg_roles where rolname=any($1::text[])", [DATABASE_ROLE_SPECS.map(role => role.name)])).rowCount, 0);
    await root.query(`create database ${quote(databaseName)} template template0`); created = true;
    const admin = await connect(urlFor(control, databaseName)); clients.push(admin);
    const migrations = await loadMigrations(); await applyMigrations(admin, migrations);
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue = await makeWorkerUtils({ connectionString: urlFor(control, databaseName), schema: "teklifpro_queue", logger: new Logger(() => () => {}) }); await queue.release();
    const system = (await admin.query<{ id: string }>("select system_identifier::text id from pg_control_system()")).rows[0]!.id;
    const target = { expectedDatabase: databaseName, expectedSystemIdentifier: system, requiredMarkerRegclass: "teklifpro_release.migrations" };
    await provisionDatabaseRoles(admin, credentials, target, administratorCredential); provisioned = true;
    assert.deepEqual(await inspectCrmLeadRlsViolations(admin), []); assertRoleBoundaries(await inspectRoleBoundaries(admin));
    assert.deepEqual((await admin.query(`select c.relname, c.relrowsecurity rls, c.relforcerowsecurity force_rls
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`,
      [["companies", "subscriptions", "usage_logs"]])).rows, [
        { relname: "companies", rls: true, force_rls: true },
        { relname: "subscriptions", rls: true, force_rls: true },
        { relname: "usage_logs", rls: true, force_rls: true },
      ], "quota dependency tables must fail closed under forced tenant RLS");

    await admin.query("insert into companies(id,name) values($1,'A'),($2,'B')", [ids.companyA, ids.companyB]);
    await admin.query("insert into users(id,email,full_name) values($1,'a@lead.test','A'),($2,'b@lead.test','B')", [ids.userA, ids.userB]);
    await admin.query("insert into memberships(user_id,company_id,role) values($1,$2,'owner'),($3,$4,'owner')", [ids.userA, ids.companyA, ids.userB, ids.companyB]);
    await admin.query("insert into plans(id,name,monthly_quote_limit,monthly_price,monthly_crm_limit) values($1,'A',10,0,5),($2,'B',10,0,2)", [ids.planA, ids.planB]);
    await admin.query("insert into subscriptions(company_id,plan_id,current_period_start,current_period_end) values($1,$2,now()-interval '1 day',now()+interval '1 month'),($3,$4,now()-interval '1 day',now()+interval '1 month')", [ids.companyA, ids.planA, ids.companyB, ids.planB]);
    await admin.query("insert into usage_logs(company_id,user_id,feature,count) values($1,$2,'SEED_A',1),($3,$4,'SEED_B',1)", [ids.companyA, ids.userA, ids.companyB, ids.userB]);
    await admin.query("insert into leads(company_id,name) values($1,'seed-a'),($2,'seed-b')", [ids.companyA, ids.companyB]);

    const app = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 6 });
    const singleApp = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 1 });
    const worker = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_worker", credentials.bimmetraj_worker), max: 1 });
    const backup = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_backup", credentials.bimmetraj_backup), max: 1 });
    pools.push(app, singleApp, worker, backup);
    const actorA = { companyId: ids.companyA, userId: ids.userA };
    const quotaDependencyView = await withTenantTransaction(app, actorA, async client => ({
      companies: (await client.query("select id::text id from companies order by id")).rows.map(row => row.id),
      subscriptions: (await client.query("select company_id::text company_id from subscriptions order by company_id")).rows.map(row => row.company_id),
      usage: (await client.query("select company_id::text company_id, feature from usage_logs order by feature")).rows,
      plans: (await client.query("select id::text id from plans order by id")).rows.map(row => row.id),
    }));
    assert.deepEqual(quotaDependencyView, {
      companies: [ids.companyA],
      subscriptions: [ids.companyA],
      usage: [{ company_id: ids.companyA, feature: "SEED_A" }],
      plans: [ids.planA, ids.planB],
    }, "app reads tenant quota dependencies only; plans remain a global read-only catalog");
    assert.equal((await app.query("select count(*)::int count from companies")).rows[0].count, 0, "tenantless company reads fail closed");
    assert.equal((await app.query("select count(*)::int count from subscriptions")).rows[0].count, 0, "tenantless subscription reads fail closed");
    assert.equal((await app.query("select count(*)::int count from usage_logs")).rows[0].count, 0, "tenantless usage reads fail closed");
    assert.equal((await app.query("select count(*)::int count from plans")).rows[0].count, 2, "plan catalog is globally readable");
    await withTenantTransaction(app, actorA, client => client.query("insert into usage_logs(company_id,user_id,feature,count) values($1,$2,'OWN_USAGE',1)", [ids.companyA, ids.userA]));
    await denied(() => withTenantTransaction(app, actorA, client => client.query("insert into usage_logs(company_id,user_id,feature,count) values($1,$2,'CROSS_USAGE',1)", [ids.companyB, ids.userA])));
    for (const mutation of [
      "insert into companies(name) values('app-forged')",
      `insert into subscriptions(company_id) values('${ids.companyA}')`,
      "insert into plans(name,monthly_quote_limit,monthly_price) values('app-forged',1,0)",
    ]) await denied(() => withTenantTransaction(app, actorA, client => client.query(mutation)));
    for (const mutation of [
      `update companies set name='forged' where id='${ids.companyA}'`,
      `delete from companies where id='${ids.companyA}'`,
      `update subscriptions set status='canceled' where company_id='${ids.companyA}'`,
      `delete from subscriptions where company_id='${ids.companyA}'`,
      `update plans set name='forged' where id='${ids.planA}'`,
      `delete from plans where id='${ids.planA}'`,
      `update usage_logs set count=99 where company_id='${ids.companyA}'`,
      `delete from usage_logs where company_id='${ids.companyA}'`,
    ]) await deniedOrNoRows(() => withTenantTransaction(app, actorA, client => client.query(mutation)));
    for (const table of ["companies", "subscriptions", "plans", "usage_logs"]) {
      await deniedOrNoRows(() => worker.query(`select * from ${table} limit 1`));
      await deniedOrNoRows(() => worker.query(`update ${table} set ${table === "usage_logs" ? "count=count" : table === "subscriptions" ? "status=status" : "name=name"}`));
      await deniedOrNoRows(() => worker.query(`delete from ${table}`));
    }
    assert.equal((await app.query("select count(*)::int count from leads")).rows[0].count, 0, "no-context reads fail closed");
    await denied(() => app.query("insert into leads(company_id,name) values($1,'tenantless')", [ids.companyA]));
    const read = (companyId: string, userId: string) => withTenantTransaction(app, { companyId, userId }, async client => (await client.query("select name from leads order by name")).rows.map(row => row.name));
    assert.deepEqual(await Promise.all([read(ids.companyA, ids.userA), read(ids.companyB, ids.userB)]), [["seed-a"], ["seed-b"]]);
    await withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, client => client.query("insert into leads(company_id,name) values($1,'own')", [ids.companyA]));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, client => client.query("insert into leads(company_id,name) values($1,'cross')", [ids.companyB])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, client =>
      client.query("update leads set name='forged' where company_id=$1", [ids.companyA])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, client =>
      client.query("delete from leads where company_id=$1", [ids.companyA])));
    await denied(() => worker.query("select count(*)::int count from leads")); await denied(() => worker.query("insert into leads(company_id,name) values($1,'worker')", [ids.companyA]));
    assert.equal((await backup.query("select count(*)::int count from leads")).rows[0].count, 3); await denied(() => backup.query("insert into leads(company_id,name) values($1,'backup')", [ids.companyA]));
    const migrator = await connect(urlFor(control, databaseName, "bimmetraj_migrator", credentials.bimmetraj_migrator)); clients.push(migrator);
    await denied(() => migrator.query("select * from public.leads")); await migrator.query("begin"); await migrator.query("set local role bimmetraj_owner"); assert.equal((await migrator.query("select count(*) from public.leads")).rowCount, 1); await migrator.query("rollback");

    let transactions = 0;
    const service = new CrmLeadService(app, async (database, context, work) => { transactions += 1; return withTenantTransaction(database, context, work); });
    const beforeCompanyIdLeak = await service.list(actorA, { limit: 200, offset: 0 }); assert.ok(beforeCompanyIdLeak.every(row => !("companyId" in row))); assert.equal(transactions, 1);
    const createdLead = await service.create(actorA, { name: " Service ", email: null }); assert.equal(createdLead.status, "new"); assert.ok(!("companyId" in createdLead)); assert.equal(transactions, 2);
    assert.equal((await admin.query("select count(*)::int count from usage_logs where company_id=$1 and feature='CRM_ACTION_EXECUTED'", [ids.companyA])).rows[0].count, 1);
    await admin.query(`create function reject_lead_probe() returns trigger language plpgsql as $$ begin if new.name='reject-me' then raise exception 'probe'; end if; return new; end $$`);
    await admin.query("create trigger reject_lead_probe before insert on leads for each row execute function reject_lead_probe()");
    await assert.rejects(service.create(actorA, { name: "reject-me" }), (error: unknown) => error instanceof Error && (error as Error & { cause?: Error }).cause?.message === "probe");
    assert.equal((await admin.query("select count(*)::int count from usage_logs where company_id=$1 and feature='CRM_ACTION_EXECUTED'", [ids.companyA])).rows[0].count, 1, "lead failure rolls quota back");
    await admin.query("drop trigger reject_lead_probe on leads; drop function reject_lead_probe()");
    await admin.query("update plans set monthly_crm_limit=1 where id=$1", [ids.planA]);
    await assert.rejects(service.create(actorA, { name: "over-limit" }), (error: unknown) => error instanceof QuotaError && error.code === "CRM_QUOTA_EXCEEDED");
    assert.equal((await admin.query("select count(*)::int count from leads where company_id=$1 and name='over-limit'", [ids.companyA])).rows[0].count, 0);

    const serviceB = new CrmLeadService(app);
    const concurrent = await Promise.allSettled(["one", "two", "three"].map(name => serviceB.create({ companyId: ids.companyB, userId: ids.userB }, { name })));
    assert.equal(concurrent.filter(result => result.status === "fulfilled").length, 2); assert.equal(concurrent.filter(result => result.status === "rejected").length, 1);
    assert.equal((await admin.query("select count(*)::int count from usage_logs where company_id=$1 and feature='CRM_ACTION_EXECUTED'", [ids.companyB])).rows[0].count, 2);
    assert.equal(await withTenantTransaction(singleApp, actorA, async client => (await client.query("select current_setting('bimmetraj.company_id') company")).rows[0].company), ids.companyA);
    assert.equal((await singleApp.query("select count(*)::int count from leads")).rows[0].count, 0);
    await assert.rejects(withTenantTransaction(singleApp, actorA, async () => { throw new Error("rollback sentinel"); }), /rollback sentinel/);
    assert.equal((await singleApp.query("select count(*)::int count from leads")).rows[0].count, 0);

    for (const mutation of ["alter table leads no force row level security", "drop policy leads_app_tenant_insert on leads", "delete from teklifpro_release.migrations where tag='0018_crm_leads_tenant_rls'"]) {
      await admin.query("begin"); try { await admin.query(mutation); assert.ok((await inspectCrmLeadRlsViolations(admin)).length > 0); const drift = await inspectRoleBoundaries(admin); assert.throws(() => assertRoleBoundaries(drift), /CRM lead|boundary violations/i); } finally { await admin.query("rollback"); }
    }
    await admin.query("begin");
    try {
      await admin.query("drop table leads");
      assert.ok((await inspectCrmLeadRlsViolations(admin)).length > 0);
      await admin.query("alter table teklifpro_release.migrations drop column tag");
      assert.ok((await inspectCrmLeadRlsViolations(admin)).length > 0, "combined protected table and canonical tag-column loss must fail closed");
      await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target, administratorCredential), /CRM leads|boundary violations/i);
    } finally { await admin.query("rollback"); }
    await admin.query("alter policy leads_app_tenant_read on leads rename to leads_app_tenant_read_missing");
    try { await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target, administratorCredential), /CRM lead FORCE-RLS policy matrix drift|boundary violations/i); }
    finally { await admin.query("alter policy leads_app_tenant_read_missing on leads rename to leads_app_tenant_read"); }
  } finally {
    const cleanup: unknown[] = [];
    for (const result of await Promise.allSettled(pools.map(pool => pool.end()))) if (result.status === "rejected") cleanup.push(result.reason);
    for (const result of await Promise.allSettled(clients.reverse().map(client => client.end()))) if (result.status === "rejected") cleanup.push(result.reason);
    if (created) try { await root.query(`drop database if exists ${quote(databaseName)} with (force)`); } catch (error) { cleanup.push(error); }
    if (provisioned) for (const role of [...DATABASE_ROLE_SPECS].reverse()) try { await root.query(`drop role if exists ${quote(role.name)}`); } catch (error) { cleanup.push(error); }
    await root.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))").catch(error => cleanup.push(error)); await root.end().catch(error => cleanup.push(error));
    if (cleanup.length) throw new AggregateError(cleanup, "CRM lead RLS cleanup failed");
  }
});
