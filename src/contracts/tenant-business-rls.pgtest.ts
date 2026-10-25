import { bootstrapDisposableRoles } from "../../scripts/ci/disposable-database-roles";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_ROLE_SPECS, DATABASE_TENANT_BUSINESS_RLS_TABLES } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectRoleBoundaries, inspectTenantBusinessRlsViolations } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { applyMigrations, loadMigrations } from "../../scripts/release-migrations/runner";
import { withTenantDrizzleTransaction, withTenantTransaction, type TenantContext } from "../db/tenant-context";
import { registerCrmRoutes, type CrmTenantAccess } from "../server/routes/crm";

const databaseName = "teklifpro_upgrade_test";
const roles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"] as const;
type Credentials = Record<typeof roles[number], string>;
type Table = typeof DATABASE_TENANT_BUSINESS_RLS_TABLES[number];
const ids = {
  companyA: "11111111-1111-4111-8111-111111111111", companyB: "22222222-2222-4222-8222-222222222222",
  userA: "33333333-3333-4333-8333-333333333333", userB: "44444444-4444-4444-8444-444444444444",
  clientA: "55555555-5555-4555-8555-555555555555", clientB: "66666666-6666-4666-8666-666666666666",
} as const;
const actorA: TenantContext = { companyId: ids.companyA, userId: ids.userA };
const actorB: TenantContext = { companyId: ids.companyB, userId: ids.userB };

/** Minimal valid row per table: `$1` is the company, `$2` (when present) a unique text tag. */
const rowSql: Record<Table, string> = {
  usage_alerts: "insert into usage_alerts(company_id,type,message) values($1,'quota',$2)",
  deals: "insert into deals(company_id,client_id,name) values($1,gen_random_uuid(),$2)",
  activities: "insert into activities(company_id,deal_id,type,description) values($1,gen_random_uuid(),'note',$2)",
  supplier_quote_submissions: "insert into supplier_quote_submissions(company_id,source_document_hash,source_document_identifier,supplier_name,created_by_user_id) values($1,repeat('a',16),$2,$2,gen_random_uuid())",
  supplier_quote_entries: "insert into supplier_quote_entries(company_id,submission_id,source_row_key,description,unit,unit_price) values($1,gen_random_uuid(),$2,$2,'m3',1)",
  rule_candidates: "insert into rule_candidates(company_id,document_id,processing_run_id,rule_code,title,description,original_text_evidence,severity,error_category,competency_area,suggested_action,confidence_score,source_evidence_json) values($1,gen_random_uuid(),gen_random_uuid(),$2,$2,$2,$2,'critical','classification_code',$2,$2,0.5,'{}')",
  rule_registry: "insert into rule_registry(company_id,rule_code,scope,created_by_user_id) values($1,$2,'company',gen_random_uuid())",
  rule_versions: "insert into rule_versions(company_id,rule_id,version,title,description,severity,error_category,competency_area,suggested_action,canonical_statement,structured_condition_json,source_evidence_json,created_by_user_id) values($1,gen_random_uuid(),1,$2,$2,'critical','classification_code',$2,$2,$2,'{}','{}',gen_random_uuid())",
  review_sessions: "insert into review_sessions(company_id,quotation_id,created_by_user_id) values($1,gen_random_uuid(),gen_random_uuid())",
  review_findings: "insert into review_findings(company_id,review_session_id,quotation_id,quotation_item_id,reported_by_user_id,error_category,severity,details,original_value) values($1,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'classification_code','critical',$2,$2)",
  competency_signals: "insert into competency_signals(company_id,user_id,error_category,competency_area,signal_fingerprint) values($1,gen_random_uuid(),'classification_code',$2,$2)",
  competency_signal_evidence: "insert into competency_signal_evidence(company_id,competency_signal_id,review_finding_id,observed_user_id) values($1,gen_random_uuid(),gen_random_uuid(),gen_random_uuid())",
  assistance_resources: "insert into assistance_resources(company_id,created_by_user_id,title,resource_type,error_category,competency_area,content_body) values($1,gen_random_uuid(),$2,'checklist','classification_code',$2,$2)",
  rule_assistance_resources: "insert into rule_assistance_resources(rule_id,assistance_resource_id,company_id) values(gen_random_uuid(),gen_random_uuid(),$1)",
};
const rowParams = (table: Table, companyId: string, tag: string) => rowSql[table].includes("$2") ? [companyId, tag] : [companyId];

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
function response() {
  return { code: 200, body: undefined as any, status(code: number) { this.code = code; return this; }, json(body: unknown) { this.body = body; return this; } };
}

test("tenant business tables enforce FORCE RLS, pool-safe tenant context and CRM route isolation", { timeout: 120_000 }, async () => {
  const control = controlUrl(); const root = await connect(control.toString());
  const administratorCredential = decodeURIComponent(control.password);
  const credentials = Object.fromEntries(roles.map(role => [role, crypto.randomBytes(32).toString("hex")])) as Credentials;
  const clients: pg.Client[] = []; const pools: pg.Pool[] = []; let created = false; let createdRoles: string[] = [];
  try {
    assert.equal((await root.query<{ major: number }>("select current_setting('server_version_num')::int/10000 major")).rows[0]?.major, 16);
    await root.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    assert.equal((await root.query("select 1 from pg_database where datname=$1", [databaseName])).rowCount, 0);
    assert.equal((await root.query("select 1 from pg_roles where rolname=any($1::text[])", [DATABASE_ROLE_SPECS.map(role => role.name)])).rowCount, 0);
    await root.query(`create database ${quote(databaseName)} template template0`); created = true;
    const admin = await connect(urlFor(control, databaseName)); clients.push(admin);
    const migrations = await loadMigrations(); createdRoles = await bootstrapDisposableRoles(admin);
    await applyMigrations(admin, migrations);
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue = await makeWorkerUtils({ connectionString: urlFor(control, databaseName), schema: "teklifpro_queue", logger: new Logger(() => () => {}) }); await queue.release();
    const system = (await admin.query<{ id: string }>("select system_identifier::text id from pg_control_system()")).rows[0]!.id;
    const target = { expectedDatabase: databaseName, expectedSystemIdentifier: system, requiredMarkerRegclass: "teklifpro_release.migrations" };
    await provisionDatabaseRoles(admin, credentials, target, administratorCredential);
    assert.deepEqual(await inspectTenantBusinessRlsViolations(admin), []); assertRoleBoundaries(await inspectRoleBoundaries(admin));
    const states = await admin.query<{ relname: string; rls: boolean; force_rls: boolean; owner: string }>(`select c.relname, c.relrowsecurity rls, c.relforcerowsecurity force_rls, pg_get_userbyid(c.relowner) owner
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [DATABASE_TENANT_BUSINESS_RLS_TABLES]);
    assert.equal(states.rowCount, DATABASE_TENANT_BUSINESS_RLS_TABLES.length);
    for (const state of states.rows) assert.deepEqual(state, { relname: state.relname, rls: true, force_rls: true, owner: "bimmetraj_owner" });

    await admin.query("insert into companies(id,name) values($1,'A'),($2,'B')", [ids.companyA, ids.companyB]);
    await admin.query("insert into users(id,email,full_name) values($1,'a@business.test','A'),($2,'b@business.test','B')", [ids.userA, ids.userB]);
    await admin.query("insert into memberships(user_id,company_id,role) values($1,$2,'owner'),($3,$4,'owner')", [ids.userA, ids.companyA, ids.userB, ids.companyB]);
    await admin.query("insert into clients(id,company_id,name,type) values($1,$2,'Client A','company'),($3,$4,'Client B','company')", [ids.clientA, ids.companyA, ids.clientB, ids.companyB]);
    // Seed one row per tenant and table; FK triggers are bypassed only for this superuser seed.
    await admin.query("begin"); await admin.query("set local session_replication_role = replica");
    for (const table of DATABASE_TENANT_BUSINESS_RLS_TABLES) {
      await admin.query(rowSql[table], rowParams(table, ids.companyA, `seed-a-${table}`));
      await admin.query(rowSql[table], rowParams(table, ids.companyB, `seed-b-${table}`));
    }
    await admin.query("commit");

    const app = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 6 });
    const singleApp = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 1 });
    const controlPlane = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_control", credentials.bimmetraj_control), max: 1 });
    const worker = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_worker", credentials.bimmetraj_worker), max: 1 });
    const backup = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_backup", credentials.bimmetraj_backup), max: 1 });
    pools.push(app, singleApp, controlPlane, worker, backup);
    const companiesSeen = async (actor: TenantContext, table: Table) => withTenantTransaction(app, actor, async client =>
      (await client.query<{ company_id: string }>(`select company_id::text company_id from ${quote(table)}`)).rows.map(row => row.company_id));
    const adminCount = async (table: Table, companyId: string) =>
      (await admin.query<{ count: number }>(`select count(*)::int count from ${quote(table)} where company_id=$1`, [companyId])).rows[0]!.count;

    for (const table of DATABASE_TENANT_BUSINESS_RLS_TABLES) {
      assert.equal((await app.query(`select count(*)::int count from ${quote(table)}`)).rows[0].count, 0, `${table}: tenantless app reads fail closed`);
      await denied(() => app.query(rowSql[table], rowParams(table, ids.companyA, `tenantless-${table}`)));
      // App SQL without any company filter still sees only the bound tenant.
      assert.deepEqual(await companiesSeen(actorA, table), [ids.companyA], `${table}: unfiltered read is tenant A only`);
      assert.deepEqual(await companiesSeen(actorB, table), [ids.companyB], `${table}: unfiltered read is tenant B only`);
      await denied(() => withTenantTransaction(app, actorA, client => client.query(rowSql[table], rowParams(table, ids.companyB, `cross-${table}`))));
      await denied(() => withTenantTransaction(app, actorA, client => client.query(`update ${quote(table)} set company_id=$1`, [ids.companyB])));
      const crossUpdate = await withTenantTransaction(app, actorA, client => client.query(`update ${quote(table)} set company_id=company_id where company_id=$1`, [ids.companyB]));
      assert.equal(crossUpdate.rowCount, 0, `${table}: foreign rows are invisible to UPDATE`);
      const crossDelete = await withTenantTransaction(app, actorA, client => client.query(`delete from ${quote(table)} where company_id=$1`, [ids.companyB]));
      assert.equal(crossDelete.rowCount, 0, `${table}: foreign rows are invisible to DELETE`);
      assert.equal(await adminCount(table, ids.companyB), 1, `${table}: tenant B row survives tenant A writes`);
      await deniedOrNoRows(() => worker.query(`select * from ${quote(table)}`));
      await denied(() => worker.query(rowSql[table], rowParams(table, ids.companyA, `worker-${table}`)));
      await deniedOrNoRows(() => worker.query(`delete from ${quote(table)}`));
      await denied(() => controlPlane.query(`select * from ${quote(table)} limit 1`));
      assert.equal((await backup.query(`select count(*)::int count from ${quote(table)}`)).rows[0].count, 2, `${table}: backup reads every tenant`);
      await denied(() => backup.query(rowSql[table], rowParams(table, ids.companyA, `backup-${table}`)));
    }
    await withTenantTransaction(app, actorA, client => client.query(rowSql.usage_alerts, rowParams("usage_alerts", ids.companyA, "own-alert")));
    assert.equal(await adminCount("usage_alerts", ids.companyA), 2, "own-tenant insert succeeds");
    const migrator = await connect(urlFor(control, databaseName, "bimmetraj_migrator", credentials.bimmetraj_migrator)); clients.push(migrator);
    await denied(() => migrator.query("select * from public.deals"));
    await migrator.query("begin"); await migrator.query("set local role bimmetraj_owner");
    assert.equal((await migrator.query("select count(*)::int count from public.deals")).rows[0].count, 2); await migrator.query("rollback");

    // Pool reuse: a single physical connection carries no tenant GUC across commit, rollback or tenant switch.
    assert.deepEqual(await withTenantTransaction(singleApp, actorA, async client => (await client.query("select company_id::text company_id from deals")).rows.map(row => row.company_id)), [ids.companyA]);
    assert.equal((await singleApp.query("select count(*)::int count from deals")).rows[0].count, 0);
    assert.equal((await singleApp.query("select coalesce(current_setting('bimmetraj.company_id', true), '') company")).rows[0].company, "");
    await assert.rejects(withTenantTransaction(singleApp, actorA, async () => { throw new Error("rollback sentinel"); }), /rollback sentinel/);
    assert.equal((await singleApp.query("select count(*)::int count from activities")).rows[0].count, 0);
    assert.deepEqual(await withTenantTransaction(singleApp, actorB, async client => (await client.query("select company_id::text company_id from deals")).rows.map(row => row.company_id)), [ids.companyB]);
    const rounds = await Promise.all(Array.from({ length: 25 }, (_, index) => {
      const actor = index % 2 === 0 ? actorA : actorB;
      return companiesSeen(actor, "deals").then(seen => ({ expected: actor.companyId, seen }));
    }));
    for (const round of rounds) assert.deepEqual(round.seen, [round.expected], "concurrent A/B tenant transactions never cross");

    // CRM route handlers run against the restricted app role through the same tenant transaction contract.
    const tenant: CrmTenantAccess = {
      read: ((actor, work, options) => withTenantDrizzleTransaction(app, actor, work, options)) as CrmTenantAccess["read"],
      transaction: ((actor, work, options) => withTenantDrizzleTransaction(app, actor, database => database.transaction(work), options)) as CrmTenantAccess["transaction"],
    };
    const handlers = new Map<string, Function>();
    const expressApp: any = {
      get: (path: string, ...fns: Function[]) => handlers.set(`GET ${path}`, fns.at(-1)!),
      post: (path: string, ...fns: Function[]) => handlers.set(`POST ${path}`, fns.at(-1)!),
    };
    registerCrmRoutes(expressApp, {} as any, () => {}, undefined, tenant);
    const call = async (key: string, req: Record<string, unknown>) => { const res = response(); await handlers.get(key)!({ query: {}, params: {}, body: {}, ...req }, res); return res; };
    const userA = { companyId: ids.companyA, userId: ids.userA };
    const userB = { companyId: ids.companyB, userId: ids.userB };
    const createdDeal = await call("POST /api/crm/deals", { user: userA, body: { name: "A route deal", clientId: ids.clientA, value: 10 } });
    assert.equal(createdDeal.code, 201, JSON.stringify(createdDeal.body));
    const dealId = createdDeal.body.id as string;
    assert.equal((await call("POST /api/crm/deals", { user: userA, body: { name: "foreign client", clientId: ids.clientB, value: 1 } })).code, 404);
    assert.equal((await call("POST /api/crm/activities", { user: userA, body: { dealId, description: "route note" } })).code, 201);
    assert.equal((await call("POST /api/crm/deals/update-stage", { user: userA, body: { dealId, stage: "won" } })).body.stage, "won");
    const activitiesA = await call("GET /api/crm/deals/:id/activities", { user: userA, params: { id: dealId } });
    assert.deepEqual(activitiesA.body.map((row: { type: string }) => row.type).sort(), ["note", "note", "stage_change"]);
    assert.equal((await call("GET /api/crm/deals/:id", { user: userA, params: { id: dealId } })).code, 200);
    assert.equal((await call("GET /api/crm/deals/:id", { user: userB, params: { id: dealId } })).code, 404, "tenant B cannot open tenant A's deal");
    assert.deepEqual((await call("GET /api/crm/deals/:id/activities", { user: userB, params: { id: dealId } })).body, []);
    assert.equal((await call("POST /api/crm/activities", { user: userB, body: { dealId, description: "forged" } })).code, 404);
    assert.equal((await call("POST /api/crm/deals/update-stage", { user: userB, body: { dealId, stage: "lost" } })).code, 404);
    const pipelineB = await call("GET /api/crm/pipeline", { user: userB });
    assert.ok(pipelineB.body.every((deal: { companyId: string }) => deal.companyId === ids.companyB));
    assert.ok(!pipelineB.body.some((deal: { id: string }) => deal.id === dealId));
    assert.equal((await admin.query("select stage::text stage from deals where id=$1", [dealId])).rows[0].stage, "won");

    for (const mutation of [
      "alter table deals no force row level security",
      "drop policy usage_alerts_app_tenant on usage_alerts",
      "alter table rule_versions disable row level security",
      "delete from teklifpro_release.migrations where tag='0022_tenant_business_rls'",
    ]) {
      await admin.query("begin");
      try {
        await admin.query(mutation);
        assert.ok((await inspectTenantBusinessRlsViolations(admin)).length > 0, mutation);
        const drift = await inspectRoleBoundaries(admin);
        assert.throws(() => assertRoleBoundaries(drift), /tenant business|boundary violations/i);
      } finally { await admin.query("rollback"); }
    }
    await admin.query("alter policy activities_app_tenant on activities rename to activities_app_tenant_missing");
    try { await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target, administratorCredential), /tenant business FORCE-RLS policy matrix drift|boundary violations/i); }
    finally { await admin.query("alter policy activities_app_tenant_missing on activities rename to activities_app_tenant"); }
  } finally {
    const cleanup: unknown[] = [];
    for (const result of await Promise.allSettled(pools.map(pool => pool.end()))) if (result.status === "rejected") cleanup.push(result.reason);
    for (const result of await Promise.allSettled(clients.reverse().map(client => client.end()))) if (result.status === "rejected") cleanup.push(result.reason);
    if (created) try { await root.query(`drop database if exists ${quote(databaseName)} with (force)`); } catch (error) { cleanup.push(error); }
    for (const role of [...createdRoles].reverse()) try { await root.query(`drop role if exists ${quote(role)}`); } catch (error) { cleanup.push(error); }
    await root.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))").catch(error => cleanup.push(error)); await root.end().catch(error => cleanup.push(error));
    if (cleanup.length) throw new AggregateError(cleanup, "tenant business RLS cleanup failed");
  }
});
