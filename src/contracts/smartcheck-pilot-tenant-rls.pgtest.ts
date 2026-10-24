import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectRoleBoundaries, inspectSmartcheckPilotRlsViolations } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { applyMigrations, loadMigrations } from "../../scripts/release-migrations/runner";
import { withTenantTransaction } from "../db/tenant-context";
import { PilotEvidenceService, PilotEvidenceServiceError } from "../services/pilot-evidence/service";

const databaseName = "teklifpro_upgrade_test";
const loginRoles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"] as const;
type Credentials = Record<typeof loginRoles[number], string>;
const ids = {
  companyA: "11111111-1111-4111-8111-111111111111", companyB: "22222222-2222-4222-8222-222222222222",
  makerA: "33333333-3333-4333-8333-333333333333", reviewerA: "34444444-4444-4444-8444-444444444444", userB: "45555555-5555-4555-8555-555555555555",
  documentA: "51111111-1111-4111-8111-111111111111", documentB: "52222222-2222-4222-8222-222222222222",
  caseA: "61111111-1111-4111-8111-111111111111", caseB: "62222222-2222-4222-8222-222222222222",
  measurementA: "71111111-1111-4111-8111-111111111111", measurementB: "72222222-2222-4222-8222-222222222222",
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
  if (user) url.username = user; if (password) url.password = password;
  return url.toString();
}
async function connect(connectionString: string) { const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 }); await client.connect(); return client; }
async function denied(action: () => Promise<unknown>) {
  await assert.rejects(action, (error: unknown) => error instanceof pg.DatabaseError && (error.code === "42501" || error.code === "P0001"));
}
async function seed(admin: pg.Client) {
  await admin.query("insert into companies(id,name,is_smartcheck_enabled) values ($1,'Pilot A',true),($2,'Pilot B',true)", [ids.companyA, ids.companyB]);
  await admin.query("insert into users(id,email,full_name,email_verified) values ($1,'maker@a.test','Maker A',now()),($2,'reviewer@a.test','Reviewer A',now()),($3,'user@b.test','User B',now())", [ids.makerA, ids.reviewerA, ids.userB]);
  await admin.query("insert into memberships(user_id,company_id,role) values ($1,$2,'owner'),($3,$2,'manager'),($4,$5,'owner')", [ids.makerA, ids.companyA, ids.reviewerA, ids.userB, ids.companyB]);
  for (const [company, user, document, name] of [[ids.companyA, ids.makerA, ids.documentA, 'a'], [ids.companyB, ids.userB, ids.documentB, 'b']] as const) {
    await admin.query(`insert into documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256,status)
      values ($1,$2,$3,$4,$4,'text/csv',1,$5,$6,'completed')`, [document, company, user, `${name}.csv`, `${company}/${name}.csv`, name.repeat(64)]);
  }
  await admin.query(`insert into smartcheck_pilot_cases(id,company_id,document_id,pilot_id,customer_reference,project_reference,permission_reference,permission_granted_at,retention_until,expected_row_count,created_by_user_id)
    values ($1,$2,$3,'pilot-a','customer-a','project-a','consent-a',now(),now()+interval '30 days',1,$4),($5,$6,$7,'pilot-b','customer-b','project-b','consent-b',now(),now()+interval '30 days',1,$8)`, [ids.caseA, ids.companyA, ids.documentA, ids.makerA, ids.caseB, ids.companyB, ids.documentB, ids.userB]);
  await admin.query(`insert into smartcheck_pilot_measurements(id,company_id,pilot_case_id,measured_by_user_id,measurement_key)
    values ($1,$2,$3,$4,'seed-a'),($5,$6,$7,$8,'seed-b')`, [ids.measurementA, ids.companyA, ids.caseA, ids.makerA, ids.measurementB, ids.companyB, ids.caseB, ids.userB]);
}

test("SmartCheck pilot evidence enforces exact RLS, append-only history, atomic service replay and tenant isolation", { timeout: 120_000 }, async () => {
  const control = controlUrl();
  const administratorCredential = decodeURIComponent(control.password);
  const root = await connect(control.toString());
  const credentials = Object.fromEntries(loginRoles.map((role) => [role, crypto.randomBytes(32).toString("hex")])) as Credentials;
  const clients: pg.Client[] = []; const pools: pg.Pool[] = []; let created = false;
  try {
    assert.equal((await root.query<{ major: number }>("select current_setting('server_version_num')::int/10000 major")).rows[0]?.major, 16);
    assert.equal((await root.query("select 1 from pg_database where datname=$1", [databaseName])).rowCount, 0);
    assert.equal((await root.query("select 1 from pg_roles where rolname=any($1::text[])", [DATABASE_ROLE_SPECS.map(({ name }) => name)])).rowCount, 0);
    await root.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    await root.query(`create database ${quote(databaseName)} template template0`); created = true;
    const admin = await connect(urlFor(control, databaseName)); clients.push(admin);
    const migrations = await loadMigrations(); await applyMigrations(admin, migrations);
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue = await makeWorkerUtils({ connectionString: urlFor(control, databaseName), schema: "teklifpro_queue", logger: new Logger(() => () => {}) }); await queue.release();
    const system = (await admin.query<{ id: string }>("select system_identifier::text id from pg_control_system()")).rows[0]!.id;
    await provisionDatabaseRoles(admin, credentials, { expectedDatabase: databaseName, expectedSystemIdentifier: system, requiredMarkerRegclass: "teklifpro_release.migrations" }, administratorCredential);
    assertRoleBoundaries(await inspectRoleBoundaries(admin));
    assert.deepEqual(await inspectSmartcheckPilotRlsViolations(admin), []);
    for (const mutation of [
      "alter table smartcheck_pilot_cases no force row level security",
      "drop policy smartcheck_pilot_measurements_app_tenant_read on smartcheck_pilot_measurements",
      "alter table smartcheck_pilot_measurements disable trigger smartcheck_pilot_measurements_append_only",
      "alter table smartcheck_pilot_measurements disable trigger smartcheck_pilot_measurements_insert_guard",
      "alter table smartcheck_pilot_cases disable trigger smartcheck_pilot_cases_mutation_guard",
      "alter table smartcheck_audit_logs disable trigger smartcheck_pilot_audit_append_only",
      "drop trigger smartcheck_pilot_measurements_record_evidence on smartcheck_pilot_measurements; create trigger smartcheck_pilot_measurements_record_evidence before insert on smartcheck_pilot_measurements for each row execute function record_smartcheck_pilot_measurement_evidence()",
      `create or replace function validate_smartcheck_pilot_measurement_insert() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$ begin
        /* pilot measurement insert requires bound tenant actor */ return new; end $$`,
      "drop policy smartcheck_audit_logs_app_read on smartcheck_audit_logs; create policy smartcheck_audit_logs_app_read on smartcheck_audit_logs for select to public using (true)",
      "drop policy smartcheck_audit_logs_app_insert on smartcheck_audit_logs; create policy smartcheck_audit_logs_app_insert on smartcheck_audit_logs for insert to public with check (true)",
      "drop trigger smartcheck_pilot_measurements_append_only on smartcheck_pilot_measurements",
      "drop function prevent_smartcheck_pilot_measurement_mutation() cascade",
      "delete from teklifpro_release.migrations where tag='0016_smartcheck_pilot_evidence_tenant_rls'",
    ]) {
      await admin.query("begin");
      try { await admin.query(mutation); assert.ok((await inspectSmartcheckPilotRlsViolations(admin)).length > 0, mutation); }
      finally { await admin.query("rollback"); }
    }
    await seed(admin);
    const app = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 4 });
    const worker = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_worker", credentials.bimmetraj_worker), max: 1 });
    const backup = new pg.Pool({ connectionString: urlFor(control, databaseName, "bimmetraj_backup", credentials.bimmetraj_backup), max: 1 });
    pools.push(app, worker, backup);
    assert.deepEqual((await app.query("select id from smartcheck_pilot_cases")).rows, []);
    const readCases = (companyId: string, userId: string) => withTenantTransaction(app, { companyId, userId }, async (client) => (await client.query<{ company_id: string }>("select distinct company_id::text company_id from smartcheck_pilot_cases order by 1")).rows.map((row) => row.company_id));
    assert.deepEqual(await Promise.all([readCases(ids.companyA, ids.makerA), readCases(ids.companyB, ids.userB)]), [[ids.companyA], [ids.companyB]]);
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("insert into smartcheck_pilot_cases(company_id,document_id,pilot_id,customer_reference,project_reference,permission_reference,permission_granted_at,retention_until,created_by_user_id) values($1,$2,'cross','x','x','x',now(),now(),$3)", [ids.companyB, ids.documentB, ids.userB])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("insert into smartcheck_pilot_measurements(company_id,pilot_case_id,measured_by_user_id,measurement_key) values($1,$2,$3,'cross')", [ids.companyB, ids.caseB, ids.userB])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("insert into smartcheck_pilot_measurements(company_id,pilot_case_id,measured_by_user_id,measurement_key) values($1,$2,$3,'same-tenant-forgery')", [ids.companyA, ids.caseA, ids.makerA])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("update smartcheck_pilot_cases set customer_reference='forged' where id=$1", [ids.caseA])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("delete from smartcheck_pilot_cases where id=$1", [ids.caseA])));
    assert.deepEqual((await worker.query("select id from smartcheck_pilot_cases")).rows, []);
    await denied(() => worker.query("insert into smartcheck_pilot_measurements(company_id,pilot_case_id,measured_by_user_id,measurement_key) values($1,$2,$3,'worker')", [ids.companyA, ids.caseA, ids.makerA]));
    await denied(() => worker.query("insert into smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json) values($1,$2,'pilot_case_measured','smartcheck_pilot_case',$3,'{}')", [ids.companyA, ids.makerA, ids.caseA]));
    assert.equal((await backup.query("select id from smartcheck_pilot_cases")).rowCount, 2);
    await denied(() => backup.query("update smartcheck_pilot_cases set status='failed'"));
    const migrator = await connect(urlFor(control, databaseName, "bimmetraj_migrator", credentials.bimmetraj_migrator)); clients.push(migrator); await migrator.query("set role bimmetraj_owner");
    assert.equal((await migrator.query("select id from smartcheck_pilot_measurements")).rowCount, 2);
    await denied(() => migrator.query("update smartcheck_pilot_measurements set notes='mutated' where id=$1", [ids.measurementA]));
    await denied(() => migrator.query("delete from smartcheck_pilot_measurements where id=$1", [ids.measurementA]));

    process.env.SMARTCHECK_IMPORT_ENABLED = "true";
    let tenantTransactions = 0;
    const service = new PilotEvidenceService(app, async (database, context, work) => {
      tenantTransactions += 1;
      return withTenantTransaction(database, context, work);
    });
    assert.equal(await service.isEnabled({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }), true);
    assert.equal(tenantTransactions, 1, "feature fallback must use exactly one tenant transaction");
    await assert.rejects(service.review({ companyId: ids.companyA, userId: ids.reviewerA, role: "owner" }, ids.caseA, { decision: "approved", notes: "legacy" }), (error: unknown) => error instanceof PilotEvidenceServiceError && error.code === "PILOT_MEASUREMENT_UNVERIFIED");
    const createdCase = await service.create({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, { documentId: ids.documentA, pilotId: "service-pilot", customerReference: "customer", projectReference: "project", discipline: "MEP", permissionReference: "consent", permissionGrantedAt: new Date(), retentionUntil: new Date(Date.now() + 86400000), expectedRowCount: 1, workflowStartedAt: new Date() });
    assert.deepEqual(await withTenantTransaction(app, { companyId: ids.companyB, userId: ids.userB }, async (client) => (await client.query("select id from smartcheck_audit_logs where entity_id=$1", [createdCase.id])).rows), []);
    await denied(() => withTenantTransaction(app, { companyId: ids.companyB, userId: ids.userB }, (client) => client.query("insert into smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json) values($1,$2,'pilot_case_admitted','smartcheck_pilot_case',$3,'{}')", [ids.companyA, ids.userB, createdCase.id])));
    await denied(() => withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("insert into smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json) values($1,$2,'pilot_case_approved','smartcheck_pilot_case',$3,$4)", [ids.companyA, ids.makerA, createdCase.id, { measurementId: ids.measurementA, decision: "approved" }])));
    const measureInput = { measurementKey: "service-run-1", complete: false, notes: "stable", workflowCompletedAt: null };
    const [first, replay] = await Promise.all([
      service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id, measureInput),
      service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id, measureInput),
    ]);
    assert.equal(first.measurement.id, replay.measurement.id);
    assert.equal((await admin.query("select count(*)::int count from smartcheck_pilot_measurements where pilot_case_id=$1", [createdCase.id])).rows[0].count, 1);
    assert.equal((await admin.query("select count(*)::int count from smartcheck_audit_logs where entity_id=$1 and action='pilot_case_measured'", [createdCase.id])).rows[0].count, 1);
    await assert.rejects(service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id, { ...measureInput, notes: "changed" }), (error: unknown) => error instanceof PilotEvidenceServiceError && error.code === "MEASUREMENT_IDEMPOTENCY_CONFLICT");
    await Promise.all([
      service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id, { ...measureInput, measurementKey: "service-run-2", notes: "second" }),
      service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id, { ...measureInput, measurementKey: "service-run-3", notes: "third" }),
    ]);
    const latestMeasurement = (await admin.query<{ id: string; case_revision: number }>("select id,case_revision from smartcheck_pilot_measurements where pilot_case_id=$1 order by case_revision desc limit 1", [createdCase.id])).rows[0]!;
    assert.equal(latestMeasurement.case_revision, 3);
    assert.equal((await service.detail({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id)).measurements[0]?.id, latestMeasurement.id);
    const reviews = await Promise.allSettled([
      service.review({ companyId: ids.companyA, userId: ids.reviewerA, role: "manager" }, createdCase.id, { decision: "approved", notes: "ok" }),
      service.review({ companyId: ids.companyA, userId: ids.reviewerA, role: "manager" }, createdCase.id, { decision: "rejected", notes: "no" }),
    ]);
    assert.equal(reviews.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(reviews.filter((result) => result.status === "rejected" && result.reason instanceof PilotEvidenceServiceError && result.reason.code === "PILOT_REVIEW_CONFLICT").length, 1);
    const winner = reviews.find((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")!.value;
    const reviewAudit = (await admin.query<{ measurement_id: string }>("select metadata_json->>'measurementId' measurement_id from smartcheck_audit_logs where entity_id=$1 and action in ('pilot_case_approved','pilot_case_rejected','pilot_case_accepted_exception') order by created_at desc limit 1", [createdCase.id])).rows[0]!;
    assert.equal(reviewAudit.measurement_id, latestMeasurement.id);
    const exact = await service.review({ companyId: ids.companyA, userId: ids.reviewerA, role: "manager" }, createdCase.id, { decision: winner.reviewerDecision, notes: winner.reviewerNotes });
    assert.equal(exact.replayed, true);
    assert.equal((await withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("update smartcheck_audit_logs set metadata_json='{}'::jsonb where entity_id=$1 and action='pilot_case_measured'", [createdCase.id]))).rowCount, 0);
    assert.equal((await withTenantTransaction(app, { companyId: ids.companyA, userId: ids.makerA }, (client) => client.query("delete from smartcheck_audit_logs where entity_id=$1 and action='pilot_case_measured'", [createdCase.id]))).rowCount, 0);
    await assert.rejects(service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, createdCase.id, { ...measureInput, measurementKey: "after-review" }), (error: unknown) => error instanceof PilotEvidenceServiceError && error.code === "PILOT_CASE_TERMINAL");

    const rollbackCase = await service.create({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, { documentId: ids.documentA, pilotId: "audit-rollback-pilot", customerReference: "customer", projectReference: "project", discipline: "MEP", permissionReference: "consent", permissionGrantedAt: new Date(), retentionUntil: new Date(Date.now() + 86400000), expectedRowCount: 1, workflowStartedAt: new Date() });
    await admin.query(`create function reject_pilot_measure_audit() returns trigger language plpgsql as $$ begin
      if new.action='pilot_case_measured' and new.entity_id='${rollbackCase.id}'::uuid then raise exception 'audit failure probe'; end if; return new; end $$`);
    await admin.query("create trigger reject_pilot_measure_audit before insert on smartcheck_audit_logs for each row execute function reject_pilot_measure_audit()");
    await assert.rejects(service.measure({ companyId: ids.companyA, userId: ids.makerA, role: "owner" }, rollbackCase.id, { ...measureInput, measurementKey: "rollback-run" }), (error: unknown) => {
      const cause = error && typeof error === "object" && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
      return cause instanceof Error && /audit failure probe/.test(cause.message);
    });
    assert.equal((await admin.query("select count(*)::int count from smartcheck_pilot_measurements where pilot_case_id=$1", [rollbackCase.id])).rows[0].count, 0);
    assert.equal((await admin.query("select status from smartcheck_pilot_cases where id=$1", [rollbackCase.id])).rows[0].status, "admitted");
    await admin.query("drop trigger reject_pilot_measure_audit on smartcheck_audit_logs");
    await admin.query("drop function reject_pilot_measure_audit()");
  } finally {
    for (const pool of pools) await pool.end().catch(() => undefined);
    for (const client of clients.reverse()) await client.end().catch(() => undefined);
    if (created) { await root.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()", [databaseName]); await root.query(`drop database if exists ${quote(databaseName)}`); }
    await root.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))").catch(() => undefined);
    for (const role of [...DATABASE_ROLE_SPECS].reverse()) await root.query(`drop role if exists ${quote(role.name)}`).catch(() => undefined);
    await root.end();
  }
});
