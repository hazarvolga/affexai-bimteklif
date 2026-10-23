import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pg from "pg";

import { DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { assertRoleBoundaries, inspectRoleBoundaries } from "../../scripts/database-roles/inspect";
import { loadMigrations, applyMigrations } from "../../scripts/release-migrations/runner";
import { withTenantTransaction } from "../db/tenant-context";

const databaseName = "teklifpro_upgrade_test";
const cdeTables = ["cde_projects", "cde_project_members", "cde_containers", "cde_revisions", "cde_transition_events"] as const;
const loginRoles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_worker", "bimmetraj_backup"] as const;
const allRoles = DATABASE_ROLE_SPECS.map(({ name }) => name);
type LoginRole = typeof loginRoles[number];
type Credentials = Record<LoginRole, string>;

const ids = {
  companyA: "11111111-1111-4111-8111-111111111111",
  companyB: "22222222-2222-4222-8222-222222222222",
  userA: "33333333-3333-4333-8333-333333333333",
  userB: "44444444-4444-4444-8444-444444444444",
  userC: "45555555-5555-4555-8555-555555555555",
  documentA: "51111111-1111-4111-8111-111111111111",
  documentB: "52222222-2222-4222-8222-222222222222",
  documentC: "53333333-3333-4333-8333-333333333333",
  runA: "61111111-1111-4111-8111-111111111111",
  runB: "62222222-2222-4222-8222-222222222222",
  artifactA: "71111111-1111-4111-8111-111111111111",
  artifactB: "72222222-2222-4222-8222-222222222222",
  runC: "63333333-3333-4333-8333-333333333333",
  artifactC: "73333333-3333-4333-8333-333333333333",
  projectA: "81111111-1111-4111-8111-111111111111",
  projectB: "82222222-2222-4222-8222-222222222222",
  projectMemberA: "91111111-1111-4111-8111-111111111111",
  projectMemberB: "92222222-2222-4222-8222-222222222222",
  containerA: "a1111111-1111-4111-8111-111111111111",
  containerB: "a2222222-2222-4222-8222-222222222222",
  revisionA: "b1111111-1111-4111-8111-111111111111",
  revisionB: "b2222222-2222-4222-8222-222222222222",
  eventA: "c1111111-1111-4111-8111-111111111111",
  eventB: "c2222222-2222-4222-8222-222222222222",
} as const;

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function requireControlUrl() {
  const raw = process.env.DATABASE_ROLE_TEST_URL;
  assert.ok(raw, "DATABASE_ROLE_TEST_URL is required for the explicit PostgreSQL 16 CDE RLS test");
  const url = new URL(raw);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  assert.equal(url.pathname, "/postgres");
  assert.equal(url.search, "");
  assert.ok(url.username && url.password);
  return url;
}

function databaseUrl(control: URL, database: string, username?: string, password?: string) {
  const url = new URL(control);
  url.pathname = `/${database}`;
  if (username !== undefined) url.username = username;
  if (password !== undefined) url.password = password;
  return url.toString();
}

async function connect(connectionString: string) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 });
  await client.connect();
  return client;
}

function singleClientPool(client: pg.Client): pg.Pool {
  return {
    async connect() {
      return { query: client.query.bind(client), release() {} } as unknown as pg.PoolClient;
    },
  } as unknown as pg.Pool;
}

async function assertInsufficientPrivilege(action: () => Promise<unknown>, label: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof pg.DatabaseError, `${label}: PostgreSQL error expected`);
    assert.equal(error.code, "42501", `${label}: insufficient_privilege expected`);
    return true;
  });
}

async function seedCdeFixtures(admin: pg.Client) {
  await admin.query("insert into companies(id,name) values ($1,'Tenant A'),($2,'Tenant B')", [ids.companyA, ids.companyB]);
  await admin.query("insert into users(id,email,full_name,email_verified) values ($1,'a@example.test','A User',now()),($2,'b@example.test','B User',now())", [ids.userA, ids.userB]);
  await admin.query("insert into memberships(user_id,company_id,role) values ($1,$2,'owner'),($3,$4,'owner')", [ids.userA, ids.companyA, ids.userB, ids.companyB]);
  for (const tenant of ["A", "B"] as const) {
    const lower = tenant.toLowerCase();
    const companyId = ids[`company${tenant}`];
    const userId = ids[`user${tenant}`];
    const documentId = ids[`document${tenant}`];
    const runId = ids[`run${tenant}`];
    const artifactId = ids[`artifact${tenant}`];
    const projectId = ids[`project${tenant}`];
    const projectMemberId = ids[`projectMember${tenant}`];
    const containerId = ids[`container${tenant}`];
    const revisionId = ids[`revision${tenant}`];
    const eventId = ids[`event${tenant}`];
    const hashes = ["a", "b", "c", "d", "e", tenant === "A" ? "f" : "9"].map((value) => value.repeat(64));
    await admin.query(`insert into documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256,status)
      values ($1,$2,$3,$4,$5,'application/ifc',1,$6,$7,'completed')`, [documentId, companyId, userId, `${lower}.ifc`, `Tenant ${tenant}`, `${companyId}/${lower}.ifc`, hashes[0]]);
    await admin.query(`insert into document_processing_runs(id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,provider,model,progress_percent)
      values ($1,$2,$3,'succeeded','completed',$4,1,'fixture','1',100)`, [runId, companyId, documentId, `run-${lower}`]);
    await admin.query(`insert into document_processing_artifacts(id,company_id,document_id,processing_run_id,artifact_type,storage_key,checksum_sha256,content_type,size_bytes,metadata_json)
      values ($1,$2,$3,$4,'ifc_evidence',$5,$6,'application/json',1,'{"ruleEvaluations":{"fixture":true}}'::jsonb)`, [artifactId, companyId, documentId, runId, `${companyId}/${documentId}/${runId}/evidence.json`, hashes[3]]);
    await admin.query("insert into cde_projects(id,company_id,document_id,name,created_by_user_id) values ($1,$2,$3,$4,$5)", [projectId, companyId, documentId, `Project ${tenant}`, userId]);
    await admin.query(`insert into cde_project_members(id,company_id,project_id,user_id,project_role,discipline,assigned_by_user_id)
      values ($1,$2,$3,$4,'coordinator','BIM',$4)`, [projectMemberId, companyId, projectId, userId]);
    await admin.query(`insert into cde_containers(id,company_id,project_id,container_code,title,current_state,lock_version,created_by_user_id)
      values ($1,$2,$3,$4,$5,'WIP',0,$6)`, [containerId, companyId, projectId, `CDE-${tenant}`, `Container ${tenant}`, userId]);
    await admin.query(`insert into cde_revisions(id,company_id,project_id,container_id,document_id,processing_run_id,result_artifact_id,revision_code,document_checksum_sha256,source_hash,rule_hash,result_hash,code_hash,scope_hash,created_by_user_id)
      values ($1,$2,$3,$4,$5,$6,$7,'P01.01',$8,$9,$10,$11,$12,$13,$14)`, [revisionId, companyId, projectId, containerId, documentId, runId, artifactId, ...hashes, userId]);
    await admin.query(`insert into cde_transition_events(id,company_id,project_id,container_id,revision_id,idempotency_key,request_hash,action,decision,from_state,to_state,suitability_code,revision_code,scope_hash,expected_version,resulting_version,actor_user_id,actor_project_role,actor_discipline,reason)
      values ($1,$2,$3,$4,$5,$6,$7,'scope_created','accepted','WIP','WIP','S0','P01.01',$8,0,1,$9,'coordinator','BIM','fixture')`, [eventId, companyId, projectId, containerId, revisionId, `scope-${lower}`, hashes[5], hashes[5], userId]);
  }
  await admin.query("insert into users(id,email,full_name,email_verified) values ($1,'c@example.test','C User',now())", [ids.userC]);
  await admin.query("insert into memberships(user_id,company_id,role) values ($1,$2,'manager')", [ids.userC, ids.companyA]);
  await admin.query(`insert into documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256,status)
    values ($1,$2,$3,'c.ifc','Tenant A Lifecycle','application/ifc',1,$4,$5,'completed')`, [ids.documentC, ids.companyA, ids.userA, `${ids.companyA}/c.ifc`, "1".repeat(64)]);
  await admin.query(`insert into document_processing_runs(id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,provider,model,progress_percent)
    values ($1,$2,$3,'succeeded','completed','run-c',1,'fixture','1',100)`, [ids.runC, ids.companyA, ids.documentC]);
  await admin.query(`insert into document_processing_artifacts(id,company_id,document_id,processing_run_id,artifact_type,storage_key,checksum_sha256,content_type,size_bytes,metadata_json)
    values ($1,$2,$3,$4,'ifc_evidence',$5,$6,'application/json',1,'{"ruleEvaluations":{"lifecycle":true}}'::jsonb)`,
    [ids.artifactC, ids.companyA, ids.documentC, ids.runC, `${ids.companyA}/${ids.documentC}/${ids.runC}/evidence.json`, "2".repeat(64)]);
}

type Queryable = Pick<pg.Pool | pg.PoolClient | pg.Client, "query">;

async function tableTenants(client: Queryable, table: typeof cdeTables[number]) {
  const result = await client.query<{ company_id: string }>(`select distinct company_id::text from ${quoteIdentifier(table)} order by company_id`);
  return result.rows.map(({ company_id }) => company_id);
}

async function assertCdePolicyCatalog(admin: pg.Client) {
  const tables = await admin.query<{ table_name: string; rls: boolean; force_rls: boolean }>(`select c.relname as table_name,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [cdeTables]);
  assert.equal(tables.rowCount, cdeTables.length);
  for (const table of tables.rows) {
    assert.equal(table.rls, true, `${table.table_name}: RLS must be enabled`);
    assert.equal(table.force_rls, true, `${table.table_name}: FORCE RLS must close the table-owner bypass`);
  }
  const policies = await admin.query<{ table_name: string; policy_name: string; command: string; role_oids: number[]; permissive: boolean; using_expression: string | null; check_expression: string | null }>(`select c.relname as table_name,p.polname as policy_name,
      case p.polcmd when '*' then 'all' when 'r' then 'select' else p.polcmd::text end as command,
      p.polroles::oid[] as role_oids,
      p.polpermissive as permissive,pg_get_expr(p.polqual,p.polrelid) as using_expression,pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,p.polname`, [cdeTables]);
  assert.equal(policies.rowCount, cdeTables.length * 3);
  const appExpression = "((CURRENT_USER = 'bimmetraj_app'::name) AND (company_id = (NULLIF(current_setting('bimmetraj.company_id'::text, true), ''::text))::uuid))";
  const backupExpression = "(CURRENT_USER = 'bimmetraj_backup'::name)";
  const ownerExpression = "((SESSION_USER = 'bimmetraj_migrator'::name) AND (CURRENT_USER = 'bimmetraj_owner'::name))";
  for (const table of cdeTables) {
    const tablePolicies = policies.rows.filter((policy) => policy.table_name === table);
    assert.deepEqual(tablePolicies.map(({ policy_name }) => policy_name), [`${table}_app_tenant`, `${table}_backup_read`, `${table}_owner_migration`]);
    assert.deepEqual(tablePolicies.map(({ command }) => command), ["all", "select", "all"]);
    assert.ok(tablePolicies.every(({ permissive }) => permissive));
    assert.ok(tablePolicies.every(({ role_oids }) => role_oids.length === 1 && role_oids[0] === 0));
    assert.deepEqual(tablePolicies.map(({ using_expression }) => using_expression), [appExpression, backupExpression, ownerExpression]);
    assert.deepEqual(tablePolicies.map(({ check_expression }) => check_expression), [appExpression, null, ownerExpression]);
  }
}

test("CDE tenant RLS isolates app pool reuse and concurrency while preserving explicit role boundaries", { timeout: 120_000 }, async (t) => {
  const controlUrl = requireControlUrl();
  const administratorCredential = decodeURIComponent(controlUrl.password);
  const control = await connect(controlUrl.toString());
  const credentials = Object.fromEntries(loginRoles.map((role) => [role, crypto.randomBytes(32).toString("hex")])) as Credentials;
  const clients: pg.Client[] = [];
  const pools: pg.Pool[] = [];
  let databaseCreated = false;
  let rolesProvisioned = false;
  try {
    assert.equal((await control.query<{ major: number }>("select current_setting('server_version_num')::int/10000 as major")).rows[0]?.major, 16);
    const expectedClusterName = process.env.DATABASE_ROLE_TEST_CLUSTER_NAME === "<empty>"
      ? ""
      : process.env.DATABASE_ROLE_TEST_CLUSTER_NAME ?? "teklifpro-phase7-role-test";
    assert.equal((await control.query<{ name: string }>("select current_setting('cluster_name') as name")).rows[0]?.name, expectedClusterName);
    await control.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    assert.equal((await control.query("select 1 from pg_database where datname=$1", [databaseName])).rowCount, 0, "owned disposable database must not pre-exist");
    assert.equal((await control.query("select 1 from pg_roles where rolname=any($1::text[])", [allRoles])).rowCount, 0, "canonical roles must not pre-exist");
    await control.query(`create database ${quoteIdentifier(databaseName)} template template0`);
    databaseCreated = true;
    const admin = await connect(databaseUrl(controlUrl, databaseName));
    clients.push(admin);
    const migrations = await loadMigrations();
    const cdeMigrationIndex = migrations.findIndex(({ tag }) => tag === "0013_cde_tenant_rls");
    assert.ok(cdeMigrationIndex > 0, "T41 CDE RLS migration must exist after an established baseline");
    await applyMigrations(admin, migrations);
    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue = await makeWorkerUtils({ connectionString: databaseUrl(controlUrl, databaseName), schema: "teklifpro_queue", logger: new Logger(() => () => {}) });
    await queue.release();
    const fingerprint = (await admin.query<{ id: string }>("select system_identifier::text as id from pg_control_system()")).rows[0]!.id;
    await provisionDatabaseRoles(admin, credentials, { expectedDatabase: databaseName, expectedSystemIdentifier: fingerprint, requiredMarkerRegclass: "teklifpro_release.migrations" }, administratorCredential);
    rolesProvisioned = true;
    const migrator = await connect(databaseUrl(controlUrl, databaseName, "bimmetraj_migrator", credentials.bimmetraj_migrator));
    clients.push(migrator);
    await migrator.query("set role bimmetraj_owner");
    assert.deepEqual(await applyMigrations(migrator, migrations), []);
    const cdeMigration = migrations[cdeMigrationIndex]!;
    const ledger = await migrator.query<{ idx: number; tag: string; hash: string; catalog_hash: string }>(
      "select idx,tag,hash,catalog_hash from teklifpro_release.migrations where idx=$1", [cdeMigration.idx],
    );
    assert.deepEqual(ledger.rows, [{
      idx: cdeMigration.idx,
      tag: cdeMigration.tag,
      hash: cdeMigration.sha256,
      catalog_hash: "6fcb6ee3901599db5c081bd84b6b68471aac42ff641daee7bec5d2dafe27043f",
    }]);
    await assertCdePolicyCatalog(admin);
    assertRoleBoundaries(await inspectRoleBoundaries(admin));
    await admin.query("begin");
    try {
      await admin.query("alter table cde_projects no force row level security");
      const driftReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(driftReport), /CDE FORCE-RLS policy matrix drift/);
    } finally {
      await admin.query("rollback");
    }
    await admin.query("begin");
    try {
      await admin.query(`drop table ${cdeTables.map(quoteIdentifier).join(",")} cascade`);
      const missingTablesReport = await inspectRoleBoundaries(admin);
      assert.throws(() => assertRoleBoundaries(missingTablesReport), /complete RLS table set is required/);
    } finally {
      await admin.query("rollback");
    }
    await seedCdeFixtures(admin);

    const appPool = new pg.Pool({ connectionString: databaseUrl(controlUrl, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 2 });
    const singlePool = new pg.Pool({ connectionString: databaseUrl(controlUrl, databaseName, "bimmetraj_app", credentials.bimmetraj_app), max: 1 });
    const workerPool = new pg.Pool({ connectionString: databaseUrl(controlUrl, databaseName, "bimmetraj_worker", credentials.bimmetraj_worker), max: 1 });
    const backupPool = new pg.Pool({ connectionString: databaseUrl(controlUrl, databaseName, "bimmetraj_backup", credentials.bimmetraj_backup), max: 1 });
    pools.push(appPool, singlePool, workerPool, backupPool);

    await t.test("tenant helper rejects owner, migrator and superuser connections before application work", async () => {
      let superuserWorkCalled = false;
      await assert.rejects(
        withTenantTransaction(singleClientPool(admin), { companyId: ids.companyA, userId: ids.userA }, async () => { superuserWorkCalled = true; }),
        /restricted bimmetraj_app database role/i,
      );
      assert.equal(superuserWorkCalled, false);
      await admin.query("set role bimmetraj_app");
      let setRoleWorkCalled = false;
      await assert.rejects(
        withTenantTransaction(singleClientPool(admin), { companyId: ids.companyA, userId: ids.userA }, async () => { setRoleWorkCalled = true; }),
        /restricted bimmetraj_app database role/i,
      );
      assert.equal(setRoleWorkCalled, false);
      await admin.query("reset role");
      let ownerWorkCalled = false;
      await assert.rejects(
        withTenantTransaction(singleClientPool(migrator), { companyId: ids.companyA, userId: ids.userA }, async () => { ownerWorkCalled = true; }),
        /restricted bimmetraj_app database role/i,
      );
      assert.equal(ownerWorkCalled, false);
      await migrator.query("reset role");
      let migratorWorkCalled = false;
      await assert.rejects(
        withTenantTransaction(singleClientPool(migrator), { companyId: ids.companyA, userId: ids.userA }, async () => { migratorWorkCalled = true; }),
        /restricted bimmetraj_app database role/i,
      );
      assert.equal(migratorWorkCalled, false);
      await migrator.query("set role bimmetraj_owner");
    });

    await t.test("no context denies every CDE table and A/B filter omission stays tenant-bound", async () => {
      for (const table of cdeTables) assert.deepEqual(await tableTenants(appPool, table), [], `${table}: no-context read must deny`);
      const readAll = async (client: pg.PoolClient) => {
        const tenants: string[][] = [];
        for (const table of cdeTables) tenants.push(await tableTenants(client, table));
        return tenants;
      };
      const a = await withTenantTransaction(appPool, { companyId: ids.companyA, userId: ids.userA }, readAll);
      const b = await withTenantTransaction(appPool, { companyId: ids.companyB, userId: ids.userB }, readAll);
      for (const tenants of a) assert.deepEqual(tenants, [ids.companyA]);
      for (const tenants of b) assert.deepEqual(tenants, [ids.companyB]);
      await assertInsufficientPrivilege(() => withTenantTransaction(appPool, { companyId: ids.companyA, userId: ids.userA }, (client) => client.query(
        "insert into cde_containers(id,company_id,project_id,container_code,title,created_by_user_id) values ($1,$2,$3,'CROSS-TENANT','cross tenant',$4)",
        [crypto.randomUUID(), ids.companyB, ids.projectB, ids.userB],
      )), "cross-tenant WITH CHECK");
    });

    await t.test("CDE service binds tenant context while retaining project membership RBAC", async () => {
      process.env.DATABASE_URL ??= databaseUrl(controlUrl, databaseName, "bimmetraj_app", credentials.bimmetraj_app);
      process.env.SOURCE_COMMIT = "a".repeat(40);
      const { CdeService } = await import("../services/cde/service");
      const service = new CdeService(appPool);
      const [projectsA, projectsB] = await Promise.all([
        service.listProjects({ companyId: ids.companyA, userId: ids.userA }),
        service.listProjects({ companyId: ids.companyB, userId: ids.userB }),
      ]);
      assert.deepEqual(projectsA.map(({ project }) => project.companyId), [ids.companyA]);
      assert.deepEqual(projectsB.map(({ project }) => project.companyId), [ids.companyB]);
      await assert.rejects(
        service.projectDetail({ companyId: ids.companyA, userId: ids.userB }, ids.projectA),
        (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "CDE_PROJECT_ROLE_FORBIDDEN"),
      );
      const createdProject = await service.createProject({ companyId: ids.companyA, userId: ids.userA }, { documentId: ids.documentC, name: "RLS Lifecycle" });
      assert.equal(createdProject.created, true);
      const member = await service.assignMember({ companyId: ids.companyA, userId: ids.userA }, createdProject.project.id, { userId: ids.userC, role: "approver", discipline: "QA" });
      assert.equal(member.userId, ids.userC);
      const createdContainer = await service.createContainer({ companyId: ids.companyA, userId: ids.userA }, createdProject.project.id, { containerCode: "RLS-LIFECYCLE", title: "RLS lifecycle" });
      assert.equal(createdContainer.created, true);
      const revision = await service.createOrReuseRevision({ companyId: ids.companyA, userId: ids.userA }, createdContainer.container.id, {
        revisionCode: "P01.01", processingRunId: ids.runC, resultArtifactId: ids.artifactC,
      });
      assert.equal(revision.created, true);
      const decision = await service.transition({ companyId: ids.companyA, userId: ids.userC }, createdContainer.container.id, "rls-lifecycle-share", {
        action: "approve", expectedVersion: 1, toState: "SHARED", suitabilityCode: "S1", revisionCode: "P01.01",
      });
      assert.equal(decision.event.toState, "SHARED");
      const lifecycleHistory = await service.history({ companyId: ids.companyA, userId: ids.userC }, createdContainer.container.id);
      assert.equal(lifecycleHistory.revisions.length, 1);
      assert.deepEqual(lifecycleHistory.events.map(({ event }) => event.action), ["scope_created", "approve"]);
      const beforeProjects = await service.listProjects({ companyId: ids.companyA, userId: ids.userA });
      await assert.rejects(
        service.createProject({ companyId: ids.companyA, userId: ids.userA }, { documentId: ids.documentB, name: "Cross tenant" }),
        (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "DOCUMENT_NOT_FOUND"),
      );
      const afterProjects = await service.listProjects({ companyId: ids.companyA, userId: ids.userA });
      assert.equal(afterProjects.length, beforeProjects.length, "failed cross-tenant write must roll back atomically");
    });

    await t.test("max=1 pool reuse clears context after commit, rollback and callback error", async () => {
      const first = await withTenantTransaction(singlePool, { companyId: ids.companyA, userId: ids.userA }, async (client) => ({
        pid: (await client.query("select pg_backend_pid() as pid") as { rows: Array<{ pid: number }> }).rows[0]!.pid,
        tenants: await tableTenants(client, "cde_projects"),
      }));
      const second = await withTenantTransaction(singlePool, { companyId: ids.companyB, userId: ids.userB }, async (client) => ({
        pid: (await client.query("select pg_backend_pid() as pid") as { rows: Array<{ pid: number }> }).rows[0]!.pid,
        tenants: await tableTenants(client, "cde_projects"),
      }));
      assert.equal(first.pid, second.pid);
      assert.ok(first.tenants.length >= 1 && first.tenants.every((tenant) => tenant === ids.companyA));
      assert.deepEqual(second.tenants, [ids.companyB]);
      assert.deepEqual((await singlePool.query("select company_id::text from cde_projects")).rows, []);
      await assert.rejects(withTenantTransaction(singlePool, { companyId: ids.companyA, userId: ids.userA }, async (client) => {
        assert.deepEqual(await tableTenants(client, "cde_projects"), [ids.companyA]);
        throw new Error("rollback probe");
      }), /rollback probe/);
      assert.deepEqual((await singlePool.query("select company_id::text from cde_projects")).rows, []);
    });

    await t.test("concurrent A/B transactions never cross tenant scope", async () => {
      let arrived = 0;
      let releaseBarrier!: () => void;
      const barrier = new Promise<void>((resolve) => { releaseBarrier = resolve; });
      const run = (companyId: string, userId: string) => withTenantTransaction(appPool, { companyId, userId }, async (client) => {
        arrived += 1;
        if (arrived === 2) releaseBarrier();
        await barrier;
        const rounds: string[][] = [];
        for (let iteration = 0; iteration < 25; iteration += 1) rounds.push(await tableTenants(client, cdeTables[iteration % cdeTables.length]!));
        return rounds;
      });
      const [a, b] = await Promise.all([run(ids.companyA, ids.userA), run(ids.companyB, ids.userB)]);
      for (const tenants of a) assert.ok(tenants.length >= 1 && tenants.every((tenant) => tenant === ids.companyA));
      for (const tenants of b) assert.deepEqual(tenants, [ids.companyB]);
    });

    await t.test("app-only, worker deny, backup read-only and owner migration bypass are explicit", async () => {
      const worker = await workerPool.connect();
      try {
        await worker.query("begin");
        await worker.query("select set_config('bimmetraj.company_id',$1,true),set_config('bimmetraj.user_id',$2,true)", [ids.companyA, ids.userA]);
        for (const table of cdeTables) assert.deepEqual(await tableTenants(worker, table), [], `${table}: worker must be default-deny`);
        await assertInsufficientPrivilege(() => worker.query("insert into cde_containers(id,company_id,project_id,container_code,title,created_by_user_id) values ($1,$2,$3,'WORKER-DENY','worker',$4)", [crypto.randomUUID(), ids.companyA, ids.projectA, ids.userA]), "worker insert");
        await worker.query("rollback");
      } finally { worker.release(); }
      for (const table of cdeTables) assert.deepEqual([...new Set(await tableTenants(backupPool, table))], [ids.companyA, ids.companyB]);
      await assertInsufficientPrivilege(() => backupPool.query("update cde_projects set name='forbidden'"), "backup update");
      assert.deepEqual([...new Set(await tableTenants(migrator, "cde_projects"))], [ids.companyA, ids.companyB], "SET ROLE owner is reserved for migrations through an explicit FORCE-RLS policy");
    });
  } finally {
    const cleanupErrors: unknown[] = [];
    for (const result of await Promise.allSettled(pools.map((pool) => pool.end()))) if (result.status === "rejected") cleanupErrors.push(result.reason);
    for (const result of await Promise.allSettled(clients.reverse().map((client) => client.end()))) if (result.status === "rejected") cleanupErrors.push(result.reason);
    if (databaseCreated) {
      try { await control.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()", [databaseName]); } catch (error) { cleanupErrors.push(error); }
      try { await control.query(`drop database if exists ${quoteIdentifier(databaseName)}`); } catch (error) { cleanupErrors.push(error); }
    }
    if (rolesProvisioned) {
      for (const role of [...loginRoles, "bimmetraj_owner"] as const) {
        try { await control.query(`drop role if exists ${quoteIdentifier(role)}`); } catch (error) { cleanupErrors.push(error); }
      }
    }
    try { await control.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))"); } catch (error) { cleanupErrors.push(error); }
    try { await control.end(); } catch (error) { cleanupErrors.push(error); }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "CDE tenant RLS test cleanup failed");
  }
});
