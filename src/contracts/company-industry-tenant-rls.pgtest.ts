import { bootstrapDisposableRoles } from "../../scripts/ci/disposable-database-roles";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectCompanyIndustryRlsViolations, inspectRoleBoundaries } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { applyMigrations, loadMigrations } from "../../scripts/release-migrations/runner";
import { withTenantTransaction } from "../db/tenant-context";
import { CompanyIndustrySettingsService, CompanyIndustrySettingsServiceError } from "../services/company-industry-settings/service";

const databaseName = "teklifpro_upgrade_test";
const loginRoles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"] as const;
type Credentials = Record<typeof loginRoles[number], string>;
const ids = {
  companyA: "11111111-1111-4111-8111-111111111111",
  companyB: "22222222-2222-4222-8222-222222222222",
  userA: "33333333-3333-4333-8333-333333333333",
  userB: "44444444-4444-4444-8444-444444444444",
} as const;
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;

function controlUrl() {
  const raw = process.env.DATABASE_ROLE_TEST_URL;
  assert.ok(raw, "DATABASE_ROLE_TEST_URL is required");
  const url = new URL(raw);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  assert.equal(url.pathname, "/postgres");
  assert.ok(url.username && url.password && !url.search && !url.hash);
  return url;
}
function urlFor(control: URL, database: string, user?: string, password?: string) {
  const url = new URL(control); url.pathname = `/${database}`;
  if (user) url.username = user;
  if (password) url.password = password;
  return url.toString();
}
async function connect(connectionString: string) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 });
  await client.connect();
  return client;
}
async function denied(action: () => Promise<unknown>) {
  await assert.rejects(action, (error: unknown) => error instanceof pg.DatabaseError && error.code === "42501");
}

test("company industry settings and global catalog enforce exact role and tenant boundaries", { timeout: 120_000 }, async () => {
  const control = controlUrl();
  const administratorCredential = decodeURIComponent(control.password);
  const root = await connect(control.toString());
  const credentials = Object.fromEntries(loginRoles.map((role) => [role, crypto.randomBytes(32).toString("hex")])) as Credentials;
  const clients: pg.Client[] = [];
  const pools: pg.Pool[] = [];
  let created = false;
  let createdRoles: string[] = [];
  try {
    assert.equal((await root.query<{ major: number }>("select current_setting('server_version_num')::int/10000 major")).rows[0]?.major, 16);
    await root.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    assert.equal((await root.query("select 1 from pg_database where datname=$1", [databaseName])).rowCount, 0);
    assert.equal((await root.query("select 1 from pg_roles where rolname=any($1::text[])", [DATABASE_ROLE_SPECS.map(({ name }) => name)])).rowCount, 0);
    await root.query(`create database ${quote(databaseName)} template template0`); created = true;
    const admin = await connect(urlFor(control, databaseName)); clients.push(admin);
    const migrations = await loadMigrations();
    createdRoles = await bootstrapDisposableRoles(admin);
    await applyMigrations(admin, migrations, 16);
    await admin.query(`insert into industries(id,name,description,config_json,enabled) values
      ('residential','Operator Residential','operator-owned','{"operator":true}',true),
      ('operator-custom','Operator Custom','must survive','{"operator":true}',true)`);
    await applyMigrations(admin, migrations, 17);
    assert.deepEqual((await admin.query("select id,name,description,config_json,enabled from industries where id in ('residential','operator-custom') order by id")).rows, [
      { id: "operator-custom", name: "Operator Custom", description: "must survive", config_json: '{"operator":true}', enabled: true },
      { id: "residential", name: "Operator Residential", description: "operator-owned", config_json: '{"operator":true}', enabled: true },
    ], "bootstrap must preserve operator-owned and unknown rows");
    assert.deepEqual((await admin.query("select id from industries where id=any($1::text[]) order by id", [["residential", "electrical", "mechanical", "renovation"]])).rows.map(({ id }) => id), ["electrical", "mechanical", "renovation", "residential"]);
    await applyMigrations(admin, migrations);
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue = await makeWorkerUtils({ connectionString: urlFor(control, databaseName), schema: "teklifpro_queue", logger: new Logger(() => () => {}) });
    await queue.release();
    const system = (await admin.query<{ id: string }>("select system_identifier::text id from pg_control_system()")).rows[0]!.id;
    const target = { expectedDatabase: databaseName, expectedSystemIdentifier: system, requiredMarkerRegclass: "teklifpro_release.migrations" };
    await provisionDatabaseRoles(admin, credentials, target, administratorCredential);
    assert.deepEqual(await inspectCompanyIndustryRlsViolations(admin), []);
    assertRoleBoundaries(await inspectRoleBoundaries(admin));

    await admin.query("insert into companies(id,name) values ($1,'A'),($2,'B')", [ids.companyA, ids.companyB]);
    await admin.query("insert into users(id,email,full_name) values ($1,'a@t.test','A'),($2,'b@t.test','B')", [ids.userA, ids.userB]);
    await admin.query("insert into memberships(user_id,company_id,role) values ($1,$2,'owner'),($3,$4,'owner')", [ids.userA, ids.companyA, ids.userB, ids.companyB]);
    await admin.query("insert into industries(id,name,config_json,enabled) values ('disabled','Disabled','{}',false),('race','Race','{}',true)");
    await admin.query("insert into company_industry_settings(company_id,industry_id,preferred_model,custom_rules,is_enabled) values ($1,'residential','precision','preserve-me',true),($2,'residential','balanced',null,true)", [ids.companyA, ids.companyB]);

    const app = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 4 });
    const singleApp = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 1 });
    const worker = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_worker", credentials.bimmetraj_worker), max: 1 });
    const backup = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_backup", credentials.bimmetraj_backup), max: 1 });
    pools.push(app, singleApp, worker, backup);

    assert.equal((await app.query("select count(*)::int count from industries")).rows[0].count, 7, "catalog read does not require tenant GUC");
    assert.equal((await app.query("select count(*)::int count from company_industry_settings")).rows[0].count, 0, "tenant settings fail closed without context");
    const read = (companyId: string, userId: string) => withTenantTransaction(app, { companyId, userId }, async (client) => (await client.query("select company_id::text company_id,industry_id from company_industry_settings")).rows);
    assert.deepEqual(await Promise.all([read(ids.companyA, ids.userA), read(ids.companyB, ids.userB)]), [
      [{ company_id: ids.companyA, industry_id: "residential" }],
      [{ company_id: ids.companyB, industry_id: "residential" }],
    ]);
    const sameTenantDml = await withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, async (client) => ({
      inserted: (await client.query("insert into company_industry_settings(company_id,industry_id,is_enabled) values($1,'electrical',true)", [ids.companyA])).rowCount,
      updated: (await client.query("update company_industry_settings set is_enabled=false where company_id=$1 and industry_id='electrical'", [ids.companyA])).rowCount,
      deleted: (await client.query("delete from company_industry_settings where company_id=$1 and industry_id='electrical'", [ids.companyA])).rowCount,
    }));
    assert.deepEqual(sameTenantDml, { inserted: 1, updated: 1, deleted: 0 }, "app may SELECT/INSERT/UPDATE but never DELETE tenant settings");
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, (client) => client.query("insert into company_industry_settings(company_id,industry_id,is_enabled) values($1,'race',true)", [ids.companyB])));
    assert.equal((await withTenantTransaction(app, { companyId: ids.companyA, userId: ids.userA }, (client) => client.query("update company_industry_settings set is_enabled=false where company_id=$1", [ids.companyB]))).rowCount, 0);
    assert.equal((await worker.query("select count(*)::int count from industries")).rows[0].count, 0);
    assert.equal((await worker.query("select count(*)::int count from company_industry_settings")).rows[0].count, 0);
    await denied(() => worker.query("insert into industries(id,name,config_json) values('worker','Worker','{}')"));
    await denied(() => worker.query("insert into company_industry_settings(company_id,industry_id,is_enabled) values($1,'residential',true)", [ids.companyA]));
    assert.equal((await backup.query("select count(*)::int count from industries")).rows[0].count, 7);
    assert.equal((await backup.query("select count(*)::int count from company_industry_settings")).rows[0].count, 3);
    await denied(() => backup.query("update industries set enabled=false"));
    assert.equal((await app.query("update industries set enabled=false")).rowCount, 0);
    assert.equal((await app.query("delete from industries")).rowCount, 0);
    await denied(() => app.query("insert into industries(id,name,config_json) values('app','App','{}')"));

    const migrator = await connect(urlFor(control, databaseName, "bimmetraj_migrator", credentials.bimmetraj_migrator)); clients.push(migrator);
    await denied(() => migrator.query("select * from public.industries"));
    await migrator.query("begin");
    try {
      await migrator.query("set local role bimmetraj_owner");
      assert.equal((await migrator.query("select id from industries")).rowCount, 7);
      await migrator.query("insert into industries(id,name,config_json) values('migration','Migration','{}')");
    } finally { await migrator.query("rollback"); }

    let transactions = 0;
    const service = new CompanyIndustrySettingsService(app, async (database, context, work) => {
      transactions += 1;
      return withTenantTransaction(database, context, work);
    });
    const actorA = { companyId: ids.companyA, userId: ids.userA, role: "owner" };
    assert.deepEqual(await service.list(actorA), [
      { industryId: "electrical", preferredModel: "balanced", customRules: null, isEnabled: false },
      { industryId: "residential", preferredModel: "precision", customRules: "preserve-me", isEnabled: true },
    ]);
    assert.equal(transactions, 1);
    const updated = await service.setEnabled(actorA, { industryId: "residential", isEnabled: false });
    assert.deepEqual(updated, { industryId: "residential", preferredModel: "precision", customRules: "preserve-me", isEnabled: false });
    assert.equal(transactions, 2);
    assert.deepEqual(await service.setEnabled(actorA, { industryId: "mechanical", isEnabled: true }), {
      industryId: "mechanical", preferredModel: "balanced", customRules: null, isEnabled: true,
    }, "freshly bootstrapped canonical IDs must support the service path");
    assert.equal(transactions, 3);
    await assert.rejects(service.setEnabled(actorA, { industryId: "missing", isEnabled: true }), (error: unknown) => error instanceof CompanyIndustrySettingsServiceError && error.status === 404 && error.code === "INDUSTRY_NOT_FOUND");
    await assert.rejects(service.setEnabled(actorA, { industryId: "disabled", isEnabled: true }), (error: unknown) => error instanceof CompanyIndustrySettingsServiceError && error.status === 404 && error.code === "INDUSTRY_NOT_FOUND");
    await Promise.all(Array.from({ length: 8 }, (_, index) => service.setEnabled(actorA, { industryId: "residential", isEnabled: index % 2 === 0 })));
    assert.equal((await admin.query("select count(*)::int count from company_industry_settings where company_id=$1 and industry_id='residential'", [ids.companyA])).rows[0].count, 1);
    assert.deepEqual((await admin.query("select preferred_model,custom_rules from company_industry_settings where company_id=$1 and industry_id='residential'", [ids.companyA])).rows, [{ preferred_model: "precision", custom_rules: "preserve-me" }]);

    await admin.query(`create function delete_race_industry() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$ begin delete from public.industries where id='race'; return new; end $$`);
    await admin.query("create trigger company_industry_race_probe before insert on company_industry_settings for each row when (new.industry_id='race') execute function delete_race_industry()");
    try {
      await assert.rejects(service.setEnabled(actorA, { industryId: "race", isEnabled: true }), (error: unknown) => error instanceof CompanyIndustrySettingsServiceError && error.status === 503 && error.code === "INDUSTRY_CATALOG_UNAVAILABLE");
    } finally {
      await admin.query("drop trigger company_industry_race_probe on company_industry_settings");
      await admin.query("drop function delete_race_industry()");
    }

    assert.equal(await withTenantTransaction(singleApp, { companyId: ids.companyA, userId: ids.userA }, async (client) => (await client.query("select current_setting('bimmetraj.company_id') company")).rows[0].company), ids.companyA);
    assert.equal((await singleApp.query("select count(*)::int count from company_industry_settings")).rows[0].count, 0);
    await assert.rejects(withTenantTransaction(singleApp, { companyId: ids.companyA, userId: ids.userA }, async () => { throw new Error("rollback sentinel"); }), /rollback sentinel/);
    assert.equal((await singleApp.query("select count(*)::int count from company_industry_settings")).rows[0].count, 0);
    assert.deepEqual(await read(ids.companyB, ids.userB), [{ company_id: ids.companyB, industry_id: "residential" }]);

    for (const mutation of [
      "alter table company_industry_settings no force row level security",
      "drop policy company_industry_settings_app_tenant_update on company_industry_settings",
      "drop policy industries_app_read on industries",
      "delete from teklifpro_release.migrations where tag='0017_company_industry_settings_tenant_rls'",
      "alter table industries rename to industries_missing",
    ]) {
      await admin.query("begin");
      try {
        await admin.query(mutation);
        assert.ok((await inspectCompanyIndustryRlsViolations(admin)).length > 0, mutation);
        const drift = await inspectRoleBoundaries(admin);
        assert.throws(() => assertRoleBoundaries(drift), /company-industry|complete RLS table set|migration tag/i);
      } finally { await admin.query("rollback"); }
    }
    await admin.query("begin");
    try {
      await admin.query("drop table company_industry_settings,industries cascade");
      assert.ok((await inspectCompanyIndustryRlsViolations(admin)).length > 0, "an applied tag without either table must fail closed");
      await admin.query("delete from teklifpro_release.migrations where tag='0017_company_industry_settings_tenant_rls'");
      assert.deepEqual(await inspectCompanyIndustryRlsViolations(admin), [], "only the exact pre-schema state may pass");
    } finally { await admin.query("rollback"); }
    await admin.query("alter policy industries_app_read on industries rename to industries_app_read_missing");
    try {
      await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target, administratorCredential), /company-industry FORCE-RLS policy matrix drift|boundary violations/i);
    } finally { await admin.query("alter policy industries_app_read_missing on industries rename to industries_app_read"); }
  } finally {
    const cleanup: unknown[] = [];
    for (const result of await Promise.allSettled(pools.map((pool) => pool.end()))) if (result.status === "rejected") cleanup.push(result.reason);
    for (const result of await Promise.allSettled(clients.reverse().map((client) => client.end()))) if (result.status === "rejected") cleanup.push(result.reason);
    if (created) try { await root.query(`drop database if exists ${quote(databaseName)} with (force)`); } catch (error) { cleanup.push(error); }
    for (const role of [...createdRoles].reverse()) try { await root.query(`drop role if exists ${quote(role)}`); } catch (error) { cleanup.push(error); }
    await root.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))").catch((error) => cleanup.push(error));
    await root.end().catch((error) => cleanup.push(error));
    if (cleanup.length) throw new AggregateError(cleanup, "Company industry RLS cleanup failed");
  }
});
