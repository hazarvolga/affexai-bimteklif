import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectRoleBoundaries } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";

const roleNames = DATABASE_ROLE_SPECS.map(({ name }) => name);
const loginRoleNames = [
  "bimmetraj_migrator",
  "bimmetraj_app",
  "bimmetraj_worker",
  "bimmetraj_backup",
] as const;

type LoginRoleName = typeof loginRoleNames[number];
type RoleCredentials = Record<LoginRoleName, string>;

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function requireLocalPostgres16MaintenanceUrl(): URL {
  const raw = process.env.DATABASE_ROLE_TEST_URL;
  assert.ok(
    raw,
    "DATABASE_ROLE_TEST_URL is required for the explicit PostgreSQL 16 role provisioning integration test",
  );
  const url = new URL(raw);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "DATABASE_ROLE_TEST_URL must use PostgreSQL");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "DATABASE_ROLE_TEST_URL must be local");
  assert.equal(url.pathname, "/postgres", "DATABASE_ROLE_TEST_URL must target the maintenance database /postgres");
  assert.equal([...url.searchParams.keys()].length, 0, "DATABASE_ROLE_TEST_URL query overrides are forbidden");
  assert.ok(url.username, "DATABASE_ROLE_TEST_URL must identify the isolated PostgreSQL 16 administrator");
  assert.ok(url.password, "DATABASE_ROLE_TEST_URL must include the isolated administrator password");
  return url;
}

function databaseUrl(controlUrl: URL, database: string, username?: string, password?: string): string {
  const url = new URL(controlUrl);
  url.pathname = `/${database}`;
  if (username !== undefined) url.username = username;
  if (password !== undefined) url.password = password;
  return url.toString();
}

async function connect(connectionString: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 });
  await client.connect();
  return client;
}

async function assertSqlState42501(action: () => Promise<unknown>, label: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof pg.DatabaseError, `${label}: PostgreSQL DatabaseError expected`);
    assert.equal(error.code, "42501", `${label}: insufficient_privilege SQLSTATE expected`);
    return true;
  });
}

test("provisions least-privilege database roles on isolated PostgreSQL 16", { timeout: 60_000 }, async () => {
  const controlUrl = requireLocalPostgres16MaintenanceUrl();
  const suffix = crypto.randomBytes(8).toString("hex");
  const database = `teklifpro_role_contract_${suffix}`;
  const credentials = Object.fromEntries(
    loginRoleNames.map((name) => [name, crypto.randomBytes(32).toString("hex")]),
  ) as RoleCredentials;
  const control = await connect(controlUrl.toString());
  const connected: pg.Client[] = [];
  let databaseCreated = false;
  let provisionAttempted = false;
  let tablespaceOwnerChanged = false;
  let administratorRole = "";
  let defaultTablespaceOwner = "";
  let createdRoleOids = new Map<string, number>();

  try {
    const version = await control.query<{ major: number }>("select current_setting('server_version_num')::int / 10000 as major");
    assert.equal(version.rows[0]?.major, 16, "role provisioning evidence must run on PostgreSQL 16");
    assert.equal((await control.query<{ name: string }>("select current_setting('cluster_name') as name")).rows[0]?.name, "teklifpro-phase7-role-test", "dedicated disposable cluster marker required");
    administratorRole = (await control.query<{ name: string }>("select current_user as name")).rows[0]?.name ?? "";
    defaultTablespaceOwner = (await control.query<{ name: string }>("select pg_get_userbyid(spcowner) as name from pg_tablespace where spcname='pg_default'")).rows[0]?.name ?? "";
    assert.ok(administratorRole && defaultTablespaceOwner);
    await control.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    const existing = await control.query<{ name: string }>("select rolname as name from pg_roles where rolname = any($1::text[])", [roleNames]);
    assert.deepEqual(existing.rows, [], "canonical BIMMetraj roles already exist; refusing destructive shared-cluster testing");

    await control.query(`create database ${quoteIdentifier(database)}`);
    databaseCreated = true;
    const admin = await connect(databaseUrl(controlUrl, database));
    connected.push(admin);

    await admin.query("create table public.role_contract_existing (id integer primary key, note text not null)");
    await admin.query("insert into public.role_contract_existing(id,note) values (1,'pre-provision')");
    await admin.query("create type public.role_contract_state as enum ('ready')");
    await admin.query("create type public.role_contract_pair as (left_value integer, right_value integer)");
    await admin.query("create domain public.role_contract_positive as integer check (value > 0)");
    await admin.query("create type public.role_contract_range as range (subtype=integer)");
    await admin.query("create sequence public.role_contract_sequence");
    await admin.query("create view public.role_contract_view as select id,note from public.role_contract_existing");
    await admin.query("create function public.role_contract_identity(value integer) returns integer language sql immutable as 'select value'");
    await admin.query("create schema teklifpro_release");
    await admin.query("create table teklifpro_release.migrations (idx integer primary key)");
    await admin.query("create materialized view teklifpro_release.role_contract_snapshot as select idx from teklifpro_release.migrations");
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const quietLogger = new Logger(() => () => {});
    const bootstrapUtils = await makeWorkerUtils({ connectionString: databaseUrl(controlUrl, database), schema: "teklifpro_queue", logger: quietLogger });
    await bootstrapUtils.release();
    await admin.query("create function teklifpro_queue.queue_identity(value integer) returns integer language sql immutable as 'select value'");
    const fingerprint = (await admin.query<{ system_identifier: string }>("select system_identifier::text from pg_control_system()")).rows[0]?.system_identifier;
    assert.ok(fingerprint);
    provisionAttempted = true;
    const target = { expectedDatabase: database, expectedSystemIdentifier: fingerprint, requiredMarkerRegclass: "teklifpro_release.migrations" };
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, { ...target, expectedDatabase: `${database}_wrong` }), /fingerprint/i);
    const lockHolder = await connect(databaseUrl(controlUrl, database));
    connected.push(lockHolder);
    await lockHolder.query("begin");
    await lockHolder.query("select pg_advisory_xact_lock(hashtext('bimmetraj.database-roles.v1'))");
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target), /already active/i);
    await lockHolder.query("rollback");
    const sabotagedAdmin = { query: async (...args: any[]) => {
      const result = await (admin.query as any)(...args);
      const [query] = args;
      const text = typeof query === "string" ? query : query.text;
      if (text.includes("r.rolcanlogin as can_login")) {
        return { ...result, rows: result.rows.map((row: any) => row.name === "bimmetraj_app" ? { ...row, superuser: true } : row) };
      }
      return result;
    } } as pg.Client;
    await assert.rejects(() => provisionDatabaseRoles(sabotagedAdmin, credentials, target), /boundary violations/i);
    assert.deepEqual((await admin.query("select rolname from pg_roles where rolname=any($1::text[])", [roleNames])).rows, [], "failed in-transaction postcondition must roll back role creation");
    assert.equal((await admin.query<{ owner: string }>("select pg_get_userbyid(relowner) as owner from pg_class where oid='public.role_contract_existing'::regclass")).rows[0]?.owner, administratorRole, "failed postcondition must roll back ownership transfer");
    const observedSql: string[] = [];
    const instrumentedAdmin = { query: (...args: any[]) => {
      const [query] = args;
      observedSql.push(typeof query === "string" ? query : query.text);
      return (admin.query as any)(...args);
    } } as pg.Client;
    await provisionDatabaseRoles(instrumentedAdmin, credentials, target);
    await admin.query(`grant create,temporary on database ${quoteIdentifier(database)} to bimmetraj_app`);
    await admin.query("set role bimmetraj_owner");
    await admin.query("alter default privileges in schema public grant truncate on tables to bimmetraj_backup");
    await admin.query("reset role");
    await provisionDatabaseRoles(instrumentedAdmin, credentials, target);
    for (const password of Object.values(credentials)) assert.equal(observedSql.some((sql) => sql.includes(password)), false, "credential leaked into SQL text");
    createdRoleOids = new Map((await admin.query<{ name: string; oid: number }>("select rolname as name,oid from pg_roles where rolname=any($1::text[])", [roleNames])).rows.map((row) => [row.name, row.oid]));

    await control.query("create role role_contract_unexpected noinherit");
    await control.query("grant role_contract_unexpected to bimmetraj_app");
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target), /unexpected membership/i);
    await control.query("revoke role_contract_unexpected from bimmetraj_app");
    await control.query("drop role role_contract_unexpected");

    const report = await inspectRoleBoundaries(admin);
    assert.doesNotThrow(() => assertRoleBoundaries(report));
    for (const role of report.roles) {
      assert.equal(role.attributes.superuser, false, `${role.name} must be NOSUPERUSER`);
      assert.equal(role.attributes.bypassRls, false, `${role.name} must be NOBYPASSRLS`);
      assert.equal(role.attributes.createDb, false, `${role.name} must be NOCREATEDB`);
      assert.equal(role.attributes.createRole, false, `${role.name} must be NOCREATEROLE`);
    }
    const owners = await admin.query<{ type_owner: string; composite_owner: string; domain_owner: string; range_owner: string; multirange_owner: string; function_owner: string }>(`select
      (select pg_get_userbyid(t.typowner) from pg_type t where t.typname='role_contract_state') as type_owner,
      (select pg_get_userbyid(t.typowner) from pg_type t where t.typname='role_contract_pair') as composite_owner,
      (select pg_get_userbyid(t.typowner) from pg_type t where t.typname='role_contract_positive') as domain_owner,
      (select pg_get_userbyid(t.typowner) from pg_type t where t.typname='role_contract_range') as range_owner,
      (select pg_get_userbyid(t.typowner) from pg_type t where t.typname='role_contract_multirange') as multirange_owner,
      (select pg_get_userbyid(p.proowner) from pg_proc p where p.proname='role_contract_identity') as function_owner`);
    assert.deepEqual(owners.rows[0], { type_owner: "bimmetraj_owner", composite_owner: "bimmetraj_owner", domain_owner: "bimmetraj_owner", range_owner: "bimmetraj_owner", multirange_owner: "bimmetraj_owner", function_owner: "bimmetraj_owner" });

    await admin.query("grant select on public.role_contract_existing to bimmetraj_app with grant option");
    const grantOptionReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(grantOptionReport), /GRANT OPTION/);
    await admin.query("revoke grant option for select on public.role_contract_existing from bimmetraj_app cascade");

    await admin.query("grant update(note) on public.role_contract_existing to bimmetraj_backup");
    const columnAclReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(columnAclReport), /column/);
    await admin.query("revoke update(note) on public.role_contract_existing from bimmetraj_backup");

    await admin.query(`grant connect on database ${quoteIdentifier(database)} to public`);
    const publicConnectReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(publicConnectReport), /PUBLIC/);
    await admin.query(`revoke connect on database ${quoteIdentifier(database)} from public`);

    await control.query("create role role_contract_acl_outsider noinherit");
    await admin.query("grant select(note) on public.role_contract_existing to role_contract_acl_outsider");
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target), /ACL grantee/i);
    await admin.query("revoke select(note) on public.role_contract_existing from role_contract_acl_outsider");
    await control.query("drop role role_contract_acl_outsider");

    await admin.query("set role bimmetraj_owner");
    await admin.query("alter default privileges in schema public grant select on tables to bimmetraj_backup with grant option");
    await admin.query("reset role");
    const defaultGrantOptionReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(defaultGrantOptionReport), /default ACL/i);
    await provisionDatabaseRoles(admin, credentials, target);

    await control.query("grant connect on database postgres to bimmetraj_app");
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target), /another database/i);
    await control.query("revoke connect on database postgres from bimmetraj_app");

    await control.query("alter tablespace pg_default owner to bimmetraj_app");
    tablespaceOwnerChanged = true;
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target), /cluster-shared/i);
    await control.query(`alter tablespace pg_default owner to ${quoteIdentifier(defaultTablespaceOwner)}`);
    tablespaceOwnerChanged = false;

    await admin.query("comment on role bimmetraj_app is 'unexpected-provenance'");
    const provenanceDriftReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(provenanceDriftReport), /provenance/i);
    await assert.rejects(() => provisionDatabaseRoles(admin, credentials, target), /provenance/i);
    await admin.query(`comment on role bimmetraj_app is 'bimmetraj.database-roles.v1:${fingerprint}'`);

    await admin.query("grant insert on public.role_contract_existing to bimmetraj_backup");
    const driftedReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(driftedReport));
    await admin.query("revoke insert on public.role_contract_existing from bimmetraj_backup");

    await admin.query("revoke execute on function teklifpro_queue.bimmetraj_enqueue_smartcheck(text,json,text,integer,integer) from bimmetraj_app");
    const missingExecuteReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(missingExecuteReport), /EXECUTE/);
    await provisionDatabaseRoles(admin, credentials, target);

    const aclDrifts = [
      "grant execute on function teklifpro_queue.bimmetraj_remove_smartcheck_job(text) to bimmetraj_backup",
      "grant execute on function teklifpro_queue.add_job(text,json,text,timestamp with time zone,integer,text,integer,text[],text) to bimmetraj_app",
      "grant execute on function teklifpro_queue.bimmetraj_enqueue_smartcheck(text,json,text,integer,integer) to bimmetraj_app with grant option",
    ];
    for (const statement of aclDrifts) {
      await admin.query(statement);
      const aclDriftReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(aclDriftReport), /EXECUTE ACL matrix drift/);
      await provisionDatabaseRoles(admin, credentials, target);
    }
    await admin.query("revoke execute on function teklifpro_queue.bimmetraj_enqueue_smartcheck(text,json,text,integer,integer) from bimmetraj_app");
    await admin.query("grant execute on function teklifpro_queue.bimmetraj_enqueue_smartcheck(text,json,text,integer,integer) to public");
    const publicAclReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(publicAclReport), /EXECUTE ACL matrix drift/);
    await provisionDatabaseRoles(admin, credentials, target);

    await admin.query("begin");
    try {
      await admin.query(`create or replace function teklifpro_queue.bimmetraj_enqueue_smartcheck(p_identifier text,p_payload json,p_job_key text,p_max_attempts integer,p_priority integer) returns void
        language plpgsql security definer set search_path to pg_catalog,teklifpro_queue as $tampered$begin perform 1; end$tampered$`);
      const wrapperBodyReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(wrapperBodyReport), /provenance drift/i);
    } finally {
      await admin.query("rollback");
    }

    await admin.query("begin");
    try {
      const removeJobDefinition = (await admin.query<{ definition: string }>(`select pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='teklifpro_queue' and p.proname='remove_job' and oidvectortypes(p.proargtypes)='text'`)).rows[0]?.definition;
      assert.ok(removeJobDefinition);
      const tamperedRemoveJob = removeJobDefinition.replace(/AS \$function\$[\s\S]*\$function\$/i, "AS $function$\nbegin return null; end\n$function$");
      assert.notEqual(tamperedRemoveJob, removeJobDefinition);
      await admin.query(tamperedRemoveJob);
      const nestedVendorBodyReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(nestedVendorBodyReport), /provenance drift/i);
    } finally {
      await admin.query("rollback");
    }

    await admin.query("begin");
    try {
      const vendorDefinition = (await admin.query<{ definition: string }>(`select pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='teklifpro_queue' and p.proname='add_job' and oidvectortypes(p.proargtypes)='text, json, text, timestamp with time zone, integer, text, integer, text[], text'`)).rows[0]?.definition;
      assert.ok(vendorDefinition);
      const tamperedDefinition = vendorDefinition.replace(/AS \$function\$[\s\S]*\$function\$/i, "AS $function$\nbegin return null; end\n$function$");
      assert.notEqual(tamperedDefinition, vendorDefinition);
      await admin.query(tamperedDefinition);
      const vendorBodyReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(vendorBodyReport), /provenance drift/i);
    } finally {
      await admin.query("rollback");
    }

    await admin.query("alter table teklifpro_queue._private_jobs disable row level security");
    const disabledRlsReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(disabledRlsReport), /RLS/i);
    await provisionDatabaseRoles(admin, credentials, target);

    await admin.query("alter table teklifpro_queue._private_jobs force row level security");
    const forcedRlsReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(forcedRlsReport), /RLS policy matrix drift/);
    await provisionDatabaseRoles(admin, credentials, target);

    await admin.query("alter table teklifpro_queue.migrations enable row level security");
    await admin.query("create policy role_contract_unexpected on teklifpro_queue.migrations for select to bimmetraj_app using (true)");
    const migrationsRlsReport = await inspectRoleBoundaries(admin);
    assert.throws(() => assertRoleBoundaries(migrationsRlsReport), /RLS|policy/i);
    await provisionDatabaseRoles(admin, credentials, target);

    await admin.query("begin");
    try {
      await admin.query("create function teklifpro_queue.role_contract_trigger() returns trigger language plpgsql as 'begin return new; end'");
      await admin.query("create trigger role_contract_unexpected before insert on teklifpro_queue._private_jobs for each row execute function teklifpro_queue.role_contract_trigger()");
      const triggerReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(triggerReport), /structure fingerprint mismatch/);
    } finally {
      await admin.query("rollback");
    }

    await admin.query("begin");
    try {
      await admin.query("insert into teklifpro_queue.migrations(id) values (19)");
      const futureMigrationReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(futureMigrationReport), /exact Graphile Worker migration 18/);
    } finally {
      await admin.query("rollback");
    }

    await admin.query("begin");
    try {
      await admin.query("delete from teklifpro_queue.migrations where id=1");
      await admin.query("insert into teklifpro_queue.migrations(id) values (0)");
      const substitutedLedgerReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(substitutedLedgerReport), /exact Graphile Worker migration 18 ledger/);
    } finally {
      await admin.query("rollback");
    }

    await admin.query("begin");
    try {
      await admin.query("alter table teklifpro_queue._private_jobs set unlogged");
      const durabilityDriftReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(durabilityDriftReport), /structure fingerprint mismatch/);
    } finally {
      await admin.query("rollback");
    }

    const migrator = await connect(databaseUrl(controlUrl, database, "bimmetraj_migrator", credentials.bimmetraj_migrator));
    const app = await connect(databaseUrl(controlUrl, database, "bimmetraj_app", credentials.bimmetraj_app));
    const worker = await connect(databaseUrl(controlUrl, database, "bimmetraj_worker", credentials.bimmetraj_worker));
    const backup = await connect(databaseUrl(controlUrl, database, "bimmetraj_backup", credentials.bimmetraj_backup));
    connected.push(migrator, app, worker, backup);

    await assertSqlState42501(() => migrator.query("create table public.role_contract_migrator_inherited (id integer)"), "migrator requires explicit SET ROLE");
    await migrator.query("set role bimmetraj_owner");
    await migrator.query("create table public.role_contract_new (id integer primary key, note text not null)");
    await migrator.query("reset role");

    await app.query("insert into public.role_contract_existing(id,note) values (2,'app-created')");
    await app.query("update public.role_contract_existing set note='app-updated' where id=2");
    assert.equal(
      (await app.query<{ note: string }>("select note from public.role_contract_existing where id=2")).rows[0]?.note,
      "app-updated",
    );
    await app.query("delete from public.role_contract_existing where id=2");
    await app.query("insert into public.role_contract_new(id,note) values (1,'default-acl')");
    await worker.query("update public.role_contract_new set note='worker-default-acl' where id=1");
    assert.equal((await backup.query<{ note: string }>("select note from public.role_contract_new where id=1")).rows[0]?.note, "worker-default-acl");

    await worker.query("insert into public.role_contract_existing(id,note) values (3,'worker-created')");
    await worker.query("update public.role_contract_existing set note='worker-updated' where id=3");
    assert.equal(
      (await worker.query<{ note: string }>("select note from public.role_contract_existing where id=3")).rows[0]?.note,
      "worker-updated",
    );
    await worker.query("delete from public.role_contract_existing where id=3");

    assert.equal(
      (await backup.query<{ note: string }>("select note from public.role_contract_existing where id=1")).rows[0]?.note,
      "pre-provision",
    );

    await assertSqlState42501(
      () => app.query("create table public.role_contract_app_ddl (id integer)"),
      "app DDL",
    );
    await assertSqlState42501(
      () => worker.query("create table public.role_contract_worker_ddl (id integer)"),
      "worker DDL",
    );
    await assertSqlState42501(() => app.query("insert into teklifpro_release.migrations(idx) values (2)"), "app release ledger write");
    await assertSqlState42501(() => worker.query("insert into teklifpro_release.migrations(idx) values (2)"), "worker release ledger write");
    const appUtils = await makeWorkerUtils({ connectionString: databaseUrl(controlUrl, database, "bimmetraj_app", credentials.bimmetraj_app), schema: "teklifpro_queue", logger: quietLogger });
    await appUtils.release();
    const removedRunId = crypto.randomUUID();
    const executedRunId = crypto.randomUUID();
    await app.query("select teklifpro_queue.bimmetraj_enqueue_smartcheck($1,$2::json,$3,3,0)", ["process_smartcheck_document", JSON.stringify({ source: "removed" }), `smartcheck:${removedRunId}`]);
    await app.query("select teklifpro_queue.bimmetraj_enqueue_smartcheck($1,$2::json,$3,3,0)", ["process_smartcheck_document", JSON.stringify({ source: "restricted-app" }), `smartcheck:${executedRunId}`]);
    await app.query("select teklifpro_queue.bimmetraj_remove_smartcheck_job($1)", [`smartcheck:${removedRunId}`]);
    await assert.rejects(() => app.query("select teklifpro_queue.bimmetraj_enqueue_smartcheck('arbitrary_privileged_task','{}'::json,$1,3,0)", [`smartcheck:${crypto.randomUUID()}`]), /Unsupported SmartCheck task/);
    const queuedBeforeInvalidInputs = (await admin.query<{ count: string }>("select count(*)::text as count from teklifpro_queue._private_jobs")).rows[0]?.count;
    const validJobKey = `smartcheck:${crypto.randomUUID()}`;
    const invalidInputs: Array<[unknown, unknown, unknown, unknown, unknown]> = [
      [null, {}, validJobKey, 3, 0],
      ["process_smartcheck_document", null, validJobKey, 3, 0],
      ["process_smartcheck_document", {}, null, 3, 0],
      ["process_smartcheck_document", {}, "not-a-smartcheck-key", 3, 0],
      ["process_smartcheck_document", {}, validJobKey, null, 0],
      ["process_smartcheck_document", {}, validJobKey, 0, 0],
      ["process_smartcheck_document", {}, validJobKey, 6, 0],
      ["process_smartcheck_document", {}, validJobKey, 3, null],
      ["process_smartcheck_document", {}, validJobKey, 3, -1],
      ["process_smartcheck_document", {}, validJobKey, 3, 11],
      ["process_smartcheck_document", { oversized: "x".repeat(65_537) }, validJobKey, 3, 0],
    ];
    for (const [identifier, payload, jobKey, attempts, priority] of invalidInputs) {
      await assert.rejects(() => app.query(
        "select teklifpro_queue.bimmetraj_enqueue_smartcheck($1::text,$2::json,$3::text,$4::integer,$5::integer)",
        [identifier, payload === null ? null : JSON.stringify(payload), jobKey, attempts, priority],
      ), /SmartCheck|task|job key|boundary/i);
    }
    assert.equal((await admin.query<{ count: string }>("select count(*)::text as count from teklifpro_queue._private_jobs")).rows[0]?.count, queuedBeforeInvalidInputs, "rejected wrapper inputs must not enqueue jobs");
    await assertSqlState42501(() => app.query("select teklifpro_queue.add_job('process_smartcheck_document','{}'::json)"), "app direct vendor enqueue function");
    await assertSqlState42501(() => app.query("delete from teklifpro_queue._private_jobs"), "app direct queue mutation");
    await assertSqlState42501(() => app.query("select * from teklifpro_queue._private_jobs"), "app direct queue payload read");
    let executedPayload: unknown;
    const { runOnce } = await import("graphile-worker");
    await runOnce({
      connectionString: databaseUrl(controlUrl, database, "bimmetraj_worker", credentials.bimmetraj_worker),
      schema: "teklifpro_queue",
      concurrency: 1,
      noHandleSignals: true,
      logger: quietLogger,
      taskList: { process_smartcheck_document: async (payload) => { executedPayload = payload; } },
    });
    assert.deepEqual(executedPayload, { source: "restricted-app" }, "restricted app enqueue and restricted worker completion must work end-to-end");
    assert.equal((await backup.query<{ count: string }>("select count(*)::text as count from teklifpro_queue._private_jobs")).rows[0]?.count, "0");
    await assertSqlState42501(() => app.query("select public.role_contract_identity(1)"), "app public function execute");
    await assertSqlState42501(() => worker.query("select teklifpro_queue.queue_identity(1)"), "worker queue function execute without allowlist");
    await assertSqlState42501(
      () => backup.query("insert into public.role_contract_existing(id,note) values (3,'forbidden')"),
      "backup INSERT",
    );
    await assertSqlState42501(
      () => backup.query("update public.role_contract_existing set note='forbidden' where id=1"),
      "backup UPDATE",
    );
    await assertSqlState42501(
      () => backup.query("create table public.role_contract_backup_ddl (id integer)"),
      "backup DDL",
    );
  } finally {
    await Promise.allSettled(connected.reverse().map((client) => client.end()));
    const cleanupErrors: unknown[] = [];
    const attempt = async (operation: () => Promise<unknown>) => { try { await operation(); } catch (error) { cleanupErrors.push(error); } };
    if (databaseCreated) {
      await attempt(() => control.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()", [database]));
      await attempt(() => control.query(`drop database if exists ${quoteIdentifier(database)}`));
    }
    if (provisionAttempted) {
      if (tablespaceOwnerChanged && defaultTablespaceOwner) await attempt(() => control.query(`alter tablespace pg_default owner to ${quoteIdentifier(defaultTablespaceOwner)}`));
      await attempt(() => control.query("drop role if exists role_contract_unexpected"));
      await attempt(() => control.query("drop role if exists role_contract_acl_outsider"));
      await attempt(() => control.query("revoke connect on database postgres from bimmetraj_app"));
      for (const name of ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_worker", "bimmetraj_backup", "bimmetraj_owner"] as const) {
        await attempt(async () => {
          const current = await control.query<{ oid: number }>("select oid from pg_roles where rolname=$1", [name]);
          if (current.rowCount && current.rows[0]?.oid !== createdRoleOids.get(name)) throw new Error(`Refusing to drop role ${name}: provenance changed`);
          await control.query(`drop role if exists ${quoteIdentifier(name)}`);
        });
      }
    }
    await attempt(() => control.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))"));
    await attempt(() => control.end());
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "PostgreSQL role integration cleanup failed");
  }
});
