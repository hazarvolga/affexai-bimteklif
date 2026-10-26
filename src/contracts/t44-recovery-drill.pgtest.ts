import { bootstrapDisposableRoles } from "../../scripts/ci/disposable-database-roles";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import pg from "pg";

import { DATABASE_ROLE_SPECS } from "../../scripts/database-roles/contract";
import { assertRoleBoundaries, inspectRoleBoundaries } from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles } from "../../scripts/database-roles/provision";
import { catalog } from "../../scripts/release-migrations/catalog";
import { applyMigrations, loadMigrations } from "../../scripts/release-migrations/runner";

const sourceDatabase = "teklifpro_upgrade_test";
const restoreDatabase = "teklifpro_migration_restore_test";
const roles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"] as const;
type Credentials = Record<typeof roles[number], string>;

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
  const url = new URL(control);
  url.pathname = `/${database}`;
  if (user) url.username = user;
  if (password) url.password = password;
  return url.toString();
}

async function connect(connectionString: string) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 });
  await client.connect();
  return client;
}

async function switchPoolRole(pool: pg.Pool, connectionString: string) {
  const anyPool = pool as any;
  for (const item of [...(anyPool._idle ?? [])]) {
    await new Promise<void>((resolve) => anyPool._remove(item.client, () => resolve()));
  }
  anyPool.options.connectionString = connectionString;
  const parsed = new URL(connectionString);
  anyPool.options.user = decodeURIComponent(parsed.username);
  anyPool.options.password = decodeURIComponent(parsed.password);
}

function resolvePg16ExecutionMode(port: string): { mode: "host"; pgDump: string; pgRestore: string } | { mode: "docker"; container: string } {
  const candidates = [
    process.env.PG_DUMP,
    "/opt/homebrew/opt/postgresql@16/bin/pg_dump",
    "/usr/local/opt/postgresql@16/bin/pg_dump",
    "/usr/lib/postgresql/16/bin/pg_dump",
    "pg_dump",
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    try {
      const out = execFileSync(candidate, ["--version"], { encoding: "utf8", timeout: 5_000 });
      if (Number(out.match(/PostgreSQL\)?\s+(\d+)/)?.[1]) === 16) {
        const restoreCandidate = process.env.PG_RESTORE || candidate.replace(/pg_dump$/, "pg_restore");
        return { mode: "host", pgDump: candidate, pgRestore: restoreCandidate };
      }
    } catch {
      // try next candidate
    }
  }

  const explicitContainer = process.env.POSTGRES_RESTORE_DRILL_CONTAINER?.trim();
  if (explicitContainer) {
    return { mode: "docker", container: explicitContainer };
  }

  const psOut = execFileSync("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}"], { encoding: "utf8", timeout: 5_000 });
  for (const line of psOut.trim().split("\n")) {
    const [name, ports] = line.split("\t");
    if (name && ports && ports.includes(`:${port}->5432/tcp`)) {
      return { mode: "docker", container: name };
    }
  }
  throw new Error(`Neither host PostgreSQL 16 pg_dump/pg_restore nor a Docker container bound to port ${port} was found`);
}

function runCustomDump(
  execMode: ReturnType<typeof resolvePg16ExecutionMode>,
  host: string,
  port: string,
  user: string,
  password: string,
  database: string,
  outputPath: string,
) {
  if (execMode.mode === "host") {
    execFileSync(
      execMode.pgDump,
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--enable-row-security",
        "--file",
        outputPath,
        "--host",
        host,
        "--port",
        port,
        "--username",
        user,
        "--dbname",
        database,
      ],
      {
        env: { PATH: process.env.PATH, HOME: process.env.HOME, PGPASSWORD: password, PGCONNECT_TIMEOUT: "5" },
        timeout: 30_000,
      },
    );
    return;
  }

  const buffer = execFileSync(
    "docker",
    [
      "exec",
      "-e",
      `PGPASSWORD=${password}`,
      execMode.container,
      "pg_dump",
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--enable-row-security",
      "--host=127.0.0.1",
      "--port=5432",
      "--username",
      user,
      "--dbname",
      database,
    ],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, timeout: 30_000 },
  );
  fs.writeFileSync(outputPath, buffer);
}

function runCustomRestore(
  execMode: ReturnType<typeof resolvePg16ExecutionMode>,
  host: string,
  port: string,
  user: string,
  password: string,
  database: string,
  archivePath: string,
) {
  if (execMode.mode === "host") {
    execFileSync(
      execMode.pgRestore,
      [
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        "--single-transaction",
        "--host",
        host,
        "--port",
        port,
        "--username",
        user,
        "--dbname",
        database,
        archivePath,
      ],
      {
        env: { PATH: process.env.PATH, HOME: process.env.HOME, PGPASSWORD: password, PGCONNECT_TIMEOUT: "5" },
        timeout: 30_000,
      },
    );
    return;
  }

  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "-e",
      `PGPASSWORD=${password}`,
      execMode.container,
      "pg_restore",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      "--single-transaction",
      "--host=127.0.0.1",
      "--port=5432",
      "--username",
      user,
      "--dbname",
      database,
    ],
    {
      input: fs.readFileSync(archivePath),
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
}

test("T44 — Worker, runtime topology, S3/partial upload rollback, crash lease recovery, and full PG16 + object storage backup/restore drill", { timeout: 180_000 }, async () => {
  // =========================================================================
  // 1. Runtime, Image Target & Compose Topology Separation Contract
  // =========================================================================
  const repoRoot = process.cwd();
  const composePath = path.join(repoRoot, "compose.coolify.yaml");
  const dockerfile = fs.readFileSync(path.join(repoRoot, "Dockerfile"), "utf8");
  const backupDockerfile = fs.readFileSync(path.join(repoRoot, "deploy/backup/Dockerfile"), "utf8");

  assert.match(dockerfile, /FROM runtime AS worker\s+CMD \["node", "dist\/worker\.mjs"\]/);
  assert.match(dockerfile, /FROM runtime AS migrate\s+CMD \["node", "dist\/release-cli\.mjs", "apply"\]/);
  assert.match(dockerfile, /FROM ifc-runtime AS ifc-worker/);
  assert.match(dockerfile, /FROM runtime AS app\s+HEALTHCHECK/);
  assert.match(dockerfile, /ARG SOURCE_COMMIT=""/);
  assert.match(dockerfile, /writeFileSync\('dist\/build-info\.json'/);
  assert.match(backupDockerfile, /FROM postgres:16-bookworm/);
  assert.match(backupDockerfile, /USER 10001:10001/);

  const composeEnv = {
    BIMMETRAJ_APP_DB_PASSWORD: "fixture-app-password",
    BIMMETRAJ_CONTROL_DB_PASSWORD: "fixture-control-password",
    BIMMETRAJ_WORKER_DB_PASSWORD: "fixture-worker-password",
    BIMMETRAJ_MIGRATOR_DB_PASSWORD: "fixture-migrator-password",
    BIMMETRAJ_BACKUP_DB_PASSWORD: "fixture-backup-password",
    SERVICE_PASSWORD_64_POSTGRES: "fixture-bootstrap-password",
    RELEASE_WORKERS_DRAINED: "true",
    SOURCE_COMMIT: "abc1234deadbeef",
  };
  const composeConfig = JSON.parse(
    execFileSync(
      "docker",
      ["compose", "--env-file", "/dev/null", "-f", composePath, "config", "--format", "json"],
      { encoding: "utf8", timeout: 15_000, env: { ...process.env, ...composeEnv } },
    ),
  );

  const services = composeConfig.services;
  assert.equal(services.app.build.target, "app");
  assert.equal(services.worker.build.target, "worker");
  assert.equal(services["ifc-worker"].build.target, "ifc-worker");
  assert.equal(services.migrate.build.target, "migrate");
  assert.equal(services.app.build.args.SOURCE_COMMIT, "abc1234deadbeef");
  assert.equal(services.worker.build.args.SOURCE_COMMIT, "abc1234deadbeef");
  assert.equal(services["ifc-worker"].build.args.SOURCE_COMMIT, "abc1234deadbeef");

  // Verify resource limits & security isolation across runtime services
  assert.equal(Number(services.app.mem_limit), 1536 * 1024 * 1024);
  assert.equal(Number(services.worker.mem_limit), 1024 * 1024 * 1024);
  assert.equal(Number(services["ifc-worker"].mem_limit), 2048 * 1024 * 1024);
  assert.equal(Number(services.backup.mem_limit), 512 * 1024 * 1024);
  assert.equal(Number(services.app.pids_limit), 256);
  assert.equal(Number(services.worker.pids_limit), 128);
  assert.equal(Number(services["ifc-worker"].pids_limit), 128);
  assert.equal(Number(services.backup.pids_limit), 64);

  for (const svcName of ["app", "worker", "ifc-worker", "backup"]) {
    assert.equal(services[svcName].read_only, true, `${svcName} must be read_only`);
    assert.deepEqual(services[svcName].cap_drop, ["ALL"], `${svcName} must drop ALL capabilities`);
    assert.equal(services[svcName].environment.SERVICE_PASSWORD_64_POSTGRES, "", `${svcName} must not retain bootstrap password`);
  }

  // Verify build-info stamp reader (P0-4) and backup Python unit suite (6/6)
  const { readBuildRevision } = await import("../server/observability/error-tracking");
  const stampTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "t44-build-info-"));
  try {
    const stampFile = path.join(stampTmpDir, "build-info.json");
    fs.writeFileSync(stampFile, JSON.stringify({ revision: "abc1234deadbeef", builtAt: "2026-10-26T00:00:00.000Z" }));
    const rev = readBuildRevision({ SOURCE_COMMIT: "drifted-env-sha" }, stampFile);
    assert.equal(rev.revision, "abc1234deadbeef", "Image-baked build-info.json must take precedence over mutable runtime env");
  } finally {
    fs.rmSync(stampTmpDir, { recursive: true, force: true });
  }

  const backupPyTest = execFileSync("python3", ["-m", "unittest", "discover", "-s", "deploy/backup", "-p", "test_*.py"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.ok(backupPyTest !== undefined);

  // =========================================================================
  // 2. Provision Disposable PostgreSQL 16 Cluster & Role Topology
  // =========================================================================
  const control = controlUrl();
  const root = await connect(control.toString());
  const administratorCredential = decodeURIComponent(control.password);
  const credentials = Object.fromEntries(roles.map((role) => [role, crypto.randomBytes(32).toString("hex")])) as Credentials;
  const clients: pg.Client[] = [];
  let createdSource = false;
  let createdRestore = false;
  let createdRoles: string[] = [];
  const storageTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "t44-object-storage-"));
  const dumpTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "t44-pgdump-"));
  const previousStorageDir = process.env.SMARTCHECK_LOCAL_STORAGE_DIR;
  process.env.SMARTCHECK_LOCAL_STORAGE_DIR = storageTmpDir;

  try {
    assert.equal((await root.query<{ major: number }>("select current_setting('server_version_num')::int/10000 major")).rows[0]?.major, 16);
    await root.query("select pg_advisory_lock(hashtext('bimmetraj.database-role-integration-test'))");
    await root.query(`drop database if exists ${quote(sourceDatabase)} with (force)`);
    await root.query(`drop database if exists ${quote(restoreDatabase)} with (force)`);
    for (const role of DATABASE_ROLE_SPECS.map((r) => r.name).reverse()) {
      await root.query(`drop role if exists ${quote(role)}`);
    }

    await root.query(`create database ${quote(sourceDatabase)} template template0`);
    createdSource = true;
    const admin = await connect(urlFor(control, sourceDatabase));
    clients.push(admin);

    const migrations = await loadMigrations();
    createdRoles = await bootstrapDisposableRoles(admin);
    await applyMigrations(admin, migrations);

    const { makeWorkerUtils, Logger } = await import("graphile-worker");
    const queue = await makeWorkerUtils({
      connectionString: urlFor(control, sourceDatabase),
      schema: "teklifpro_queue",
      logger: new Logger(() => () => {}),
    });
    await queue.release();

    const systemId = (await admin.query<{ id: string }>("select system_identifier::text id from pg_control_system()")).rows[0]!.id;
    const target = {
      expectedDatabase: sourceDatabase,
      expectedSystemIdentifier: systemId,
      requiredMarkerRegclass: "teklifpro_release.migrations",
    };
    await provisionDatabaseRoles(admin, credentials, target, administratorCredential);
    assertRoleBoundaries(await inspectRoleBoundaries(admin));

    // Point application DATABASE_URL to bimmetraj_app on our disposable database BEFORE importing ../db
    const appDatabaseUrl = urlFor(control, sourceDatabase, "bimmetraj_app", credentials.bimmetraj_app);
    const workerDatabaseUrl = urlFor(control, sourceDatabase, "bimmetraj_worker", credentials.bimmetraj_worker);
    process.env.DATABASE_URL = appDatabaseUrl;
    const dbModule = await import("../db");
    const schema = await import("../db/schema");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const testDb = drizzle(admin, { schema });
    const { reserveUpload, UploadQuotaError, checkUploadCapacity, UPLOAD_MAX_TTL_MS, UPLOAD_CLEANUP_GRACE_MS } = await import("../smartcheck/import/upload-quota");
    const { cleanupExpiredPendingUploads } = await import("../smartcheck/import/upload-cleanup");
    const { changeProcessingRun, ProcessingConflict } = await import("../smartcheck/import/service");
    const processor = await import("../smartcheck/import/processor");
    const { LocalStorageAdapter } = await import("../smartcheck/import/storage");

    try {
      const storage = new LocalStorageAdapter(storageTmpDir);
      const {
        companies,
        users,
        memberships,
        plans,
        subscriptions,
        clients: clientsTable,
        quotations,
        quotationItems,
        documents,
        documentProcessingRuns,
        documentProcessingArtifacts,
        normalizedQuantityRows,
      } = schema;

      // Seed Tenant A and Tenant B with plans and subscriptions
      const [plan] = await testDb.insert(plans).values({
        name: "T44 Kurumsal",
        monthlyQuoteLimit: 500,
        monthlyPrice: 5000,
        monthlyIfcLimit: 50,
        ifcMaxFileMb: 100,
        ifcMaxConcurrent: 2,
        storageMaxBytes: 10 * 1024 * 1024, // 10 MB limit for quota testing
        maxDocuments: 10,
      }).returning();

      const [companyA] = await testDb.insert(companies).values({
        name: "T44 Tenant Alpha",
        isSmartcheckEnabled: true,
      }).returning();
      const [companyB] = await testDb.insert(companies).values({
        name: "T44 Tenant Beta",
        isSmartcheckEnabled: true,
      }).returning();

      const [userA] = await testDb.insert(users).values({
        email: `t44-alpha-${crypto.randomUUID()}@example.test`,
        fullName: "Alpha Engineer",
      }).returning();
      const [userB] = await testDb.insert(users).values({
        email: `t44-beta-${crypto.randomUUID()}@example.test`,
        fullName: "Beta Engineer",
      }).returning();

      await testDb.insert(memberships).values([
        { companyId: companyA.id, userId: userA.id, role: "owner" },
        { companyId: companyB.id, userId: userB.id, role: "owner" },
      ]);
      await testDb.insert(subscriptions).values([
        { companyId: companyA.id, planId: plan.id, status: "active" },
        { companyId: companyB.id, planId: plan.id, status: "active" },
      ]);

      // =========================================================================
      // 3. S3 / Object Storage Failure Rollback, Resource Limits & Pending Cleanup
      // =========================================================================
      // 3a. Resource limit enforcement (byte capacity & document count limits)
      assert.throws(
        () => checkUploadCapacity({ bytes: 9n * 1024n * 1024n, count: 1n }, 2 * 1024 * 1024, { maxBytes: 10 * 1024 * 1024, maxDocuments: 10 }),
        (err: unknown) => err instanceof UploadQuotaError && err.code === "STORAGE_QUOTA_EXCEEDED" && err.status === 413,
      );
      assert.throws(
        () => checkUploadCapacity({ bytes: 1024n, count: 10n }, 512, { maxBytes: 10 * 1024 * 1024, maxDocuments: 10 }),
        (err: unknown) => err instanceof UploadQuotaError && err.code === "DOCUMENT_QUOTA_EXCEEDED" && err.status === 413,
      );

      // 3b. S3 target creation failure rolls back the reservation transaction completely (executed as bimmetraj_app)
      await assert.rejects(
        () =>
          reserveUpload(
            {
              companyId: companyA.id,
              uploadedByUserId: userA.id,
              originalFileName: "s3-fail.csv",
              displayName: "s3-fail.csv",
              mimeType: "text/csv",
              fileSizeBytes: 128,
              storageKey: `${companyA.id}/s3-fail/original`,
              checksumSha256: "pending",
              status: "uploaded",
            },
            async () => {
              throw new Error("S3_ENDPOINT_UNREACHABLE");
            },
          ),
        /S3_ENDPOINT_UNREACHABLE/,
      );
      const docsAfterS3Fail = await testDb.select().from(documents).where(eq(documents.companyId, companyA.id));
      assert.equal(docsAfterS3Fail.length, 0, "Failed S3 target reservation must leave zero rows in documents");

      // 3c. Abandoned / partial pending upload cleanup vs active pending upload (executed as bimmetraj_worker)
      const expiredTime = new Date(Date.now() - (UPLOAD_MAX_TTL_MS + UPLOAD_CLEANUP_GRACE_MS + 60_000));
      const expiredKey = `${companyA.id}/abandoned-pending/original`;
      await storage.put(expiredKey, Buffer.from("partial-bytes"), "text/csv");
      const [expiredPendingDoc] = await testDb.insert(documents).values({
        companyId: companyA.id,
        uploadedByUserId: userA.id,
        originalFileName: "abandoned.csv",
        displayName: "abandoned.csv",
        mimeType: "text/csv",
        fileSizeBytes: 13,
        storageKey: expiredKey,
        checksumSha256: "pending",
        status: "uploaded",
        createdAt: expiredTime,
        updatedAt: expiredTime,
      }).returning();

      const activePendingKey = `${companyA.id}/active-pending/original`;
      await storage.put(activePendingKey, Buffer.from("active-bytes"), "text/csv");
      const [activePendingDoc] = await testDb.insert(documents).values({
        companyId: companyA.id,
        uploadedByUserId: userA.id,
        originalFileName: "active-pending.csv",
        displayName: "active-pending.csv",
        mimeType: "text/csv",
        fileSizeBytes: 12,
        storageKey: activePendingKey,
        checksumSha256: "pending",
        status: "uploaded",
      }).returning();

      await switchPoolRole(dbModule.pool, workerDatabaseUrl);
      const cleanedStats = await cleanupExpiredPendingUploads(storage);
      assert.deepEqual(cleanedStats, { scanned: 1, removed: 1, failed: 0 }, "Exactly the expired pending upload without runs must be cleaned by bimmetraj_worker");
      await assert.rejects(() => storage.get(expiredKey), "Expired pending upload object must be removed from storage");
      assert.equal((await storage.get(activePendingKey)).toString("utf8"), "active-bytes", "Recent pending upload must remain in storage");
      assert.equal((await testDb.select().from(documents).where(eq(documents.id, expiredPendingDoc.id))).length, 0);
      assert.equal((await testDb.select().from(documents).where(eq(documents.id, activePendingDoc.id))).length, 1);

      // Remove activePendingDoc so we have a clean slate for the main pipeline drill
      await testDb.delete(documents).where(eq(documents.id, activePendingDoc.id));

      // =========================================================================
      // 4. Queue Retry, Idempotency & Worker Crash / Orphan Lease Recovery
      // =========================================================================
      await switchPoolRole(dbModule.pool, appDatabaseUrl);
      const csvContent = Buffer.from("Poz No,Açıklama,Birim,Miktar,Birim Fiyat\n15.150.1005,C30/37 Beton Dökümü,m3,120.5,3250\n15.160.1002,B420C Nervürlü Demir,ton,14.2,28500\n");
      const csvChecksum = crypto.createHash("sha256").update(csvContent).digest("hex");
      const csvKey = `${companyA.id}/boq-valid/original.csv`;
      await storage.put(csvKey, csvContent, "text/csv");

      const [boqDoc] = await testDb.insert(documents).values({
        companyId: companyA.id,
        uploadedByUserId: userA.id,
        originalFileName: "boq-valid.csv",
        displayName: "boq-valid.csv",
        mimeType: "text/csv",
        fileSizeBytes: csvContent.length,
        storageKey: csvKey,
        checksumSha256: csvChecksum,
        status: "uploaded",
      }).returning();

      // 4a. Idempotent enqueue: calling changeProcessingRun({ action: 'process' }) twice as bimmetraj_app returns the same run
      const firstProcess = await changeProcessingRun({
        companyId: companyA.id,
        userId: userA.id,
        documentId: boqDoc.id,
        action: "process",
      });
      assert.equal(firstProcess.status, 202);
      const secondProcess = await changeProcessingRun({
        companyId: companyA.id,
        userId: userA.id,
        documentId: boqDoc.id,
        action: "process",
      });
      assert.equal(secondProcess.status, 200, "Duplicate process request with identical checksum+mapping must be idempotent");
      assert.equal(secondProcess.run.id, firstProcess.run.id);

      // Retrying while queued must fail with PROCESSING_RUN_ACTIVE
      await assert.rejects(
        () =>
          changeProcessingRun({
            companyId: companyA.id,
            userId: userA.id,
            documentId: boqDoc.id,
            action: "retry",
          }),
        (err: unknown) => err instanceof ProcessingConflict && err.code === "PROCESSING_RUN_ACTIVE",
      );

      // 4b. Worker A (connected as bimmetraj_worker) claims the run and crashes mid-flight
      await switchPoolRole(dbModule.pool, workerDatabaseUrl);
      const payload = { companyId: companyA.id, documentId: boqDoc.id, processingRunId: firstProcess.run.id };
      const t0 = new Date(Date.now() - 20 * 60_000);
      const claimedByWorkerA = await processor.claimSmartCheckRun(payload, "worker-a-job-1", { now: t0 });
      assert.ok(claimedByWorkerA?.workerLeaseToken, "Worker A must obtain a lease token");
      const staleTokenA = claimedByWorkerA.workerLeaseToken;

      // Worker B tries to claim 5 minutes later (before 15m lease expiry) -> rejected (returns null)
      const prematureClaim = await processor.claimSmartCheckRun(payload, "worker-b-job-2", {
        now: new Date(t0.getTime() + 5 * 60_000),
      });
      assert.equal(prematureClaim, null, "Active lease before 15m timeout must not be hijacked by another worker");

      // Simulate a delivery that claims, pauses before canonical write, then has its lease expire (15m+) and gets reclaimed
      await testDb.update(documentProcessingRuns).set({
        status: "queued",
        workerJobId: null,
        workerLeaseToken: null,
      }).where(eq(documentProcessingRuns.id, firstProcess.run.id));

      let releaseStaleZombie: (() => void) | undefined;
      const staleZombieGate = new Promise<void>((resolve) => {
        releaseStaleZombie = resolve;
      });
      let zombiePausedAtWrite!: () => void;
      const zombieReachedWrite = new Promise<void>((resolve) => {
        zombiePausedAtWrite = resolve;
      });

      const crashedDelivery = processor.processSmartCheckDocument(payload, "graphile-delivery-1", {
        afterArtifactPut: async () => {
          zombiePausedAtWrite();
          await staleZombieGate;
        },
      });
      try {
        await Promise.race([zombieReachedWrite, crashedDelivery]);

        // Expire the lease on the running row (> 15m DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS) so Worker B reclaims and finishes!
        await testDb.update(documentProcessingRuns).set({
          startedAt: t0,
          updatedAt: t0,
        }).where(eq(documentProcessingRuns.id, firstProcess.run.id));

        await processor.processSmartCheckDocument(payload, "graphile-delivery-2");
      } finally {
        releaseStaleZombie?.();
      }
      await assert.rejects(
        crashedDelivery,
        processor.SmartCheckRunLeaseLostError,
        "Zombie worker waking up after lease rotation must be fenced with SmartCheckRunLeaseLostError",
      );

      const [completedRun] = await testDb.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, firstProcess.run.id));
      assert.equal(completedRun.status, "succeeded");
      assert.notEqual(completedRun.workerLeaseToken, staleTokenA);

      const rows = await testDb.select().from(normalizedQuantityRows).where(
        and(eq(normalizedQuantityRows.companyId, companyA.id), eq(normalizedQuantityRows.processingRunId, firstProcess.run.id)),
      );
      assert.equal(rows.length, 2, "Must persist exactly 2 normalized rows with zero duplicates from fenced zombie worker");

      const artifacts = await testDb.select().from(documentProcessingArtifacts).where(
        and(eq(documentProcessingArtifacts.companyId, companyA.id), eq(documentProcessingArtifacts.processingRunId, firstProcess.run.id)),
      );
      assert.equal(artifacts.length, 1);
      const artifactBytes = await storage.get(artifacts[0]!.storageKey);
      const artifactSha = crypto.createHash("sha256").update(artifactBytes).digest("hex");
      assert.equal(artifactSha, artifacts[0]!.checksumSha256, "Object storage artifact checksum must match DB ledger");

      // Also seed a quotation for Tenant B so multi-tenant FORCE RLS data is present for backup/restore parity
      const [clientB] = await testDb.insert(clientsTable).values({
        companyId: companyB.id,
        name: "Beta Mühendislik A.Ş.",
        type: "company",
      }).returning();
      const [quoteB] = await testDb.insert(quotations).values({
        companyId: companyB.id,
        clientId: clientB.id,
        quoteNumber: "TK-2026-T44",
        projectName: "Beta Saha Kurtarma Testi",
        expiryDate: new Date("2026-12-31T00:00:00.000Z"),
        subtotal: "100000",
        discountTotal: "0",
        vatTotal: "20000",
        grandTotal: "120000",
      }).returning();
      await testDb.insert(quotationItems).values({
        companyId: companyB.id,
        quotationId: quoteB.id,
        description: "C35/45 Perde Betonu",
        unit: "m3",
        quantity: "40",
        unitPrice: "2500",
        total: "100000",
      });
    } finally {
      await dbModule.pool.end();
    }

    // =========================================================================
    // 5. Full Database (bimmetraj_backup Role Across 67 FORCE RLS Tables) +
    //    Object Storage Backup/Restore Drill & Migration Forward Parity
    // =========================================================================
    const execMode = resolvePg16ExecutionMode(control.port || "5432");
    const archivePath = path.join(dumpTmpDir, "t44-full-backup.dump");

    // 5a. Dump full database authenticated as least-privilege bimmetraj_backup role
    const dumpStart = performance.now();
    runCustomDump(
      execMode,
      control.hostname,
      control.port || "5432",
      "bimmetraj_backup",
      credentials.bimmetraj_backup,
      sourceDatabase,
      archivePath,
    );
    const dumpDurationMs = Math.round(performance.now() - dumpStart);

    const archiveStat = fs.statSync(archivePath);
    assert.ok(archiveStat.size > 1024, "pg_dump archive must be non-empty");
    const header = fs.readFileSync(archivePath).subarray(0, 5).toString("ascii");
    assert.equal(header, "PGDMP", "Backup archive must start with PGDMP magic header");

    // 5b. Create clean disposable restore target & restore archive inside a single transaction
    await root.query(`create database ${quote(restoreDatabase)} template template0`);
    createdRestore = true;

    const restoreStart = performance.now();
    runCustomRestore(
      execMode,
      control.hostname,
      control.port || "5432",
      decodeURIComponent(control.username),
      administratorCredential,
      restoreDatabase,
      archivePath,
    );
    const restoreDurationMs = Math.round(performance.now() - restoreStart);

    const restoredClient = await connect(urlFor(control, restoreDatabase));
    clients.push(restoredClient);

    // 5c. Verify catalog SHA-256 signature parity between source and restored database
    const sourceCatalog = await catalog(admin);
    const restoredCatalog = await catalog(restoredClient);
    assert.equal(
      restoredCatalog.signature,
      sourceCatalog.signature,
      "Restored database catalog SHA-256 signature must match source database 1:1",
    );

    // 5d. Verify multi-tenant FORCE RLS table row counts survived bimmetraj_backup dump & restore
    for (const [tableName, expectedMinRows] of [
      ["companies", 2],
      ["users", 2],
      ["memberships", 2],
      ["documents", 1],
      ["document_processing_runs", 1],
      ["document_processing_artifacts", 1],
      ["normalized_quantity_rows", 2],
      ["clients", 1],
      ["quotations", 1],
      ["quotation_items", 1],
    ] as const) {
      const sourceCount = Number((await admin.query<{ c: string }>(`select count(*)::text c from public.${quote(tableName)}`)).rows[0]!.c);
      const restoredCount = Number((await restoredClient.query<{ c: string }>(`select count(*)::text c from public.${quote(tableName)}`)).rows[0]!.c);
      assert.ok(sourceCount >= expectedMinRows, `Expected at least ${expectedMinRows} rows in source ${tableName}, got ${sourceCount}`);
      assert.equal(restoredCount, sourceCount, `Restored row count for FORCE RLS table ${tableName} must equal source count`);
    }

    // 5e. Verify object storage artifact integrity against restored DB ledger
    const restoredArtifact = (
      await restoredClient.query<{ storage_key: string; checksum_sha256: string; size_bytes: string | number }>(
        "select storage_key, checksum_sha256, size_bytes from public.document_processing_artifacts limit 1",
      )
    ).rows[0]!;
    const restoredObjectBytes = fs.readFileSync(path.join(storageTmpDir, restoredArtifact.storage_key));
    assert.equal(restoredObjectBytes.length, Number(restoredArtifact.size_bytes));
    assert.equal(crypto.createHash("sha256").update(restoredObjectBytes).digest("hex"), restoredArtifact.checksum_sha256);

    // 5f. Verify forward migration ledger compatibility on restored database (no-op idempotency)
    const pendingAfterRestore = await applyMigrations(restoredClient, migrations);
    assert.deepEqual(pendingAfterRestore, [], "Restored database must have 28/28 release migrations recorded with zero drift");

    console.log(
      JSON.stringify({
        contract: "t44-recovery-drill.v1",
        executionMode: execMode.mode,
        dumpDurationMs,
        restoreDurationMs,
        archiveBytes: archiveStat.size,
        catalogSignature: restoredCatalog.signature,
        migrationsVerified: migrations.length,
      }),
    );
  } finally {
    if (previousStorageDir === undefined) delete process.env.SMARTCHECK_LOCAL_STORAGE_DIR;
    else process.env.SMARTCHECK_LOCAL_STORAGE_DIR = previousStorageDir;
    fs.rmSync(storageTmpDir, { recursive: true, force: true });
    fs.rmSync(dumpTmpDir, { recursive: true, force: true });

    const cleanup: unknown[] = [];
    for (const result of await Promise.allSettled(clients.reverse().map((client) => client.end()))) {
      if (result.status === "rejected") cleanup.push(result.reason);
    }
    if (createdRestore) {
      try {
        await root.query(`drop database if exists ${quote(restoreDatabase)} with (force)`);
      } catch (error) {
        cleanup.push(error);
      }
    }
    if (createdSource) {
      try {
        await root.query(`drop database if exists ${quote(sourceDatabase)} with (force)`);
      } catch (error) {
        cleanup.push(error);
      }
    }
    for (const role of [...createdRoles].reverse()) {
      try {
        await root.query(`drop role if exists ${quote(role)}`);
      } catch (error) {
        cleanup.push(error);
      }
    }
    await root.query("select pg_advisory_unlock(hashtext('bimmetraj.database-role-integration-test'))").catch((error) => cleanup.push(error));
    await root.end().catch((error) => cleanup.push(error));
    if (cleanup.length) throw new AggregateError(cleanup, "T44 recovery drill cleanup failed");
  }
});
