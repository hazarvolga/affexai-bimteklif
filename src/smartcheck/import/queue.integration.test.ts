import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';

dotenv.config({ path: '.env.local' });
dotenv.config();
const isolation = useTestIsolation();

test('atomic enqueue, retry and recovery in isolated application and worker schemas', async (t) => {
  const { db } = await import('../../db');
  const { companies, users, memberships, documents, documentProcessingRuns, smartcheckAuditLogs, plans, subscriptions } = await import('../../db/schema');
  const { eq } = await import('drizzle-orm');
  const { changeProcessingRun, ensureQueueSchema } = await import('./service');
  await ensureQueueSchema();
  const fixture = await isolation.fixtureClient();
  const worker = `"${process.env.GRAPHILE_WORKER_SCHEMA!.replace(/"/g, '""')}"`;
  const [company] = await db.insert(companies).values({ name: 'Queue test' }).returning();
  const [plan] = await db.insert(plans).values({
    name: 'Queue Test Plan',
    monthlyPrice: 1000,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 50,
    ifcMaxFileMb: 100,
    ifcMaxConcurrent: 5,
    isActive: true,
  }).returning();
  await db.insert(subscriptions).values({
    companyId: company.id,
    planId: plan.id,
    status: 'active',
  });
  const [user] = await db.insert(users).values({ email: 'queue@example.test', fullName: 'Queue test' }).returning();
  await db.insert(memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  const [document] = await db.insert(documents).values({ companyId: company.id, uploadedByUserId: user.id, originalFileName: 'test.csv', displayName: 'test', mimeType: 'text/csv', fileSizeBytes: 1, storageKey: 'test.csv', checksumSha256: 'a'.repeat(64) }).returning();
  const adapter = await import("./storage").then(m => m.createStorageAdapter());
  await adapter.put('test.csv', Buffer.from("a,b,c\n1,2,3"), 'text/csv');
  const input = { companyId: company.id, userId: user.id, documentId: document.id };
  const jobs = () => fixture.query(`select * from ${worker}.jobs`);

  await t.test('provider enqueue failure rolls back run, document and audit; retry succeeds', async () => {
    await fixture.query(`create function fail_queue() returns trigger language plpgsql as $$ begin raise exception 'injected queue failure'; end $$`);
    await fixture.query(`create trigger fail_queue before insert on ${worker}._private_jobs for each row execute function fail_queue()`);
    try {
      await assert.rejects(changeProcessingRun({ ...input, action: 'process' }));
      assert.equal((await db.select().from(documentProcessingRuns)).length, 0);
      assert.equal((await db.select().from(smartcheckAuditLogs)).length, 0);
      assert.equal((await db.select().from(documents))[0].status, document.status);
    } finally {
      await fixture.query(`drop trigger if exists fail_queue on ${worker}._private_jobs`);
    }
  });
  await t.test('concurrent process requests create one run and one job in configured schema', async () => {
    const results = await Promise.all([changeProcessingRun({ ...input, action: 'process' }), changeProcessingRun({ ...input, action: 'process' })]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 202]);
    assert.equal((await db.select().from(documentProcessingRuns)).length, 1);
    assert.equal((await jobs()).rows.length, 1);
  });
  await t.test('locked stale job refuses recovery and rolls back Graphile remove_job mutation', async () => {
    await db.update(documentProcessingRuns).set({ status: 'running', updatedAt: new Date(0), createdAt: new Date(0) });
    await fixture.query(`update ${worker}._private_jobs set locked_at = now(), locked_by = $1`, ['test-worker']);
    try {
      await assert.rejects(changeProcessingRun({ ...input, action: 'recover' }), /PROCESSING_JOB_ACTIVE/);
      assert.ok((await jobs()).rows[0].key);
      assert.equal((await db.select().from(documentProcessingRuns))[0].status, 'running');
    } finally {
      await fixture.query(`update ${worker}._private_jobs set locked_at = null, locked_by = null`);
    }
  });
  await t.test('recovery removes old pending job; concurrent retries create only one successor', async () => {
    assert.equal((await changeProcessingRun({ ...input, action: 'recover' })).status, 200);
    assert.equal((await jobs()).rows.length, 0);
    const results = await Promise.allSettled([changeProcessingRun({ ...input, action: 'retry' }), changeProcessingRun({ ...input, action: 'retry' })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await jobs()).rows.length, 1);
    assert.equal((await db.select().from(documentProcessingRuns)).length, 2);
  });
  await t.test('audit failure rolls back job removal, successor enqueue and run writes', async () => {
    await db.update(documentProcessingRuns).set({ status: 'failed' });
    const before = (await jobs()).rows[0].key;
    await fixture.query(`create trigger fail_audit before insert on smartcheck_audit_logs for each row execute function fail_queue()`);
    try {
      await assert.rejects(changeProcessingRun({ ...input, action: 'retry' }));
      assert.equal((await jobs()).rows[0].key, before);
      assert.equal((await db.select().from(documentProcessingRuns)).length, 2);
    } finally {
      await fixture.query(`drop trigger if exists fail_audit on smartcheck_audit_logs`);
    }
    assert.equal((await changeProcessingRun({ ...input, action: 'retry' })).status, 202);
    assert.equal((await jobs()).rows.length, 1);
  });
  await t.test('foreign company cannot create or recover runs', async () => {
    const [foreign] = await db.insert(companies).values({ name: 'Foreign' }).returning();
    await assert.rejects(changeProcessingRun({ ...input, companyId: foreign.id, action: 'recover' }), /DOCUMENT_NOT_FOUND/);
    assert.equal((await db.select().from(documents).where(eq(documents.id, document.id)))[0].companyId, company.id);
  });
  await t.test('legacy jobless queued run can be recovered then reissued', async () => {
    await fixture.query(`delete from ${worker}._private_jobs`);
    await db.update(documentProcessingRuns).set({ updatedAt: new Date(0) });
    assert.equal((await changeProcessingRun({ ...input, action: 'recover' })).status, 200);
    assert.equal((await changeProcessingRun({ ...input, action: 'retry' })).status, 202);
    assert.equal((await jobs()).rows.length, 1);
  });
  await t.test('real Graphile worker observes committed run and retries a transient task failure', { timeout: 20_000 }, async () => {
    const { EventEmitter } = await import('node:events');
    const { run, Logger } = await import('graphile-worker');
    const events = new EventEmitter();
    events.on('pool:listen:notification', ({ message }: { message?: { channel?: string; payload?: string } }) => {
      if (message?.channel === 'worker:migrate') message.payload = '{}';
    });
    let attempts = 0;
    const runner = await run({ connectionString: process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL, schema: process.env.GRAPHILE_WORKER_SCHEMA,
      concurrency: 1, pollInterval: 100, noHandleSignals: true, events: events as never, logger: new Logger(() => () => {}),
      taskList: { process_smartcheck_document: async (payload) => {
        const { processingRunId } = payload as { processingRunId: string };
        assert.equal((await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, processingRunId))).length, 1);
        attempts++;
        if (attempts === 1) throw new Error('injected transient task failure');
      } },
    });
    try {
      const deadline = Date.now() + 15_000;
      while ((await jobs()).rows.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal((await jobs()).rows.length, 0);
      assert.equal(attempts, 2);
    } finally { try { await runner.stop(); } catch {} }
  });

  await t.test("IFC document routes to process_smartcheck_ifc_document while CSV routes to process_smartcheck_document", async () => {
    // 1. Create an IFC document
    const ifcContent = Buffer.from("ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;");
    const [ifcDoc] = await db.insert(documents).values({
      companyId: company.id, uploadedByUserId: user.id, originalFileName: "model.ifc", displayName: "model", mimeType: "application/ifc",
      fileSizeBytes: ifcContent.length, storageKey: "model.ifc", checksumSha256: "b".repeat(64)
    }).returning();
    await adapter.put("model.ifc", ifcContent, "application/ifc");

    await changeProcessingRun({ companyId: company.id, userId: user.id, documentId: ifcDoc.id, action: "process" });
    const ifcRun = (await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.documentId, ifcDoc.id)))[0];
    const ifcJobRows = (await fixture.query(`select task_identifier from ${worker}.jobs where key = $1`, ['smartcheck:' + ifcRun.id])).rows;
    assert.equal(ifcJobRows[0]?.task_identifier, "process_smartcheck_ifc_document");

    // 2. CSV document routes to process_smartcheck_document
    const [csvDoc] = await db.insert(documents).values({
      companyId: company.id, uploadedByUserId: user.id, originalFileName: "data.csv", displayName: "data", mimeType: "text/csv",
      fileSizeBytes: 10, storageKey: "data.csv", checksumSha256: "e".repeat(64)
    }).returning();
    await adapter.put("data.csv", Buffer.from("a,b,c\n1,2,3"), "text/csv");
    const csvRun = await changeProcessingRun({ companyId: company.id, userId: user.id, documentId: csvDoc.id, action: "process" });
    const csvJobRows = (await fixture.query(`select task_identifier from ${worker}.jobs where key = $1`, ['smartcheck:' + csvRun.run.id])).rows;
    assert.equal(csvJobRows[0]?.task_identifier, "process_smartcheck_document");
  });

  await t.test("worker.ts does not register process_smartcheck_ifc_document task", async () => {
    const { workerTaskList } = await import("./worker");
    assert.equal("process_smartcheck_document" in workerTaskList, true);
    assert.equal("process_smartcheck_ifc_document" in workerTaskList, false);
  });

  await t.test("recover succeeds without storage access even if file is missing in storage", async () => {
    const [missingDoc] = await db.insert(documents).values({
      companyId: company.id, uploadedByUserId: user.id, originalFileName: "missing.csv", displayName: "missing", mimeType: "text/csv",
      fileSizeBytes: 10, storageKey: "missing_from_disk.csv", checksumSha256: "c".repeat(64)
    }).returning();
    const [staleRun] = await db.insert(documentProcessingRuns).values({
      companyId: company.id, documentId: missingDoc.id, idempotencyKey: "missing:stale", pipelineVersion: 1, status: "running",
      progressMessage: "running", createdAt: new Date(0), updatedAt: new Date(0)
    }).returning();

    // Storage does NOT have missing_from_disk.csv, but recover MUST still succeed
    const res = await changeProcessingRun({ companyId: company.id, userId: user.id, documentId: missingDoc.id, action: "recover" });
    assert.equal(res.status, 200);
    assert.equal(res.run.status, "failed");
    assert.equal(res.run.errorCode, "WORKER_STALE");
  });

  await t.test("real ifc-worker picks up and processes process_smartcheck_ifc_document task", { timeout: 20_000 }, async () => {
    const { runOnce, Logger } = await import("graphile-worker");
    const [ifcDoc] = await db.insert(documents).values({
      companyId: company.id, uploadedByUserId: user.id, originalFileName: "worker_test.ifc", displayName: "worker_test", mimeType: "application/ifc",
      fileSizeBytes: 100, storageKey: "worker_test.ifc", checksumSha256: "d".repeat(64)
    }).returning();
    const ifcContent = Buffer.from("ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;");
    await adapter.put("worker_test.ifc", ifcContent, "application/ifc");

    const runResult = await changeProcessingRun({ companyId: company.id, userId: user.id, documentId: ifcDoc.id, action: "process" });
    assert.equal(runResult.status, 202);

    let executed = false;
    await runOnce({
      connectionString: process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL,
      schema: process.env.GRAPHILE_WORKER_SCHEMA,
      concurrency: 1,
      noHandleSignals: true,
      logger: new Logger(() => () => {}),
      taskList: {
        process_smartcheck_ifc_document: async (payload) => {
          const { documentId } = payload as { documentId: string };
          assert.equal(documentId, ifcDoc.id);
          executed = true;
        },
      },
    });
    assert.equal(executed, true, "ifc worker task should have executed");
  });

  await t.test("parallel process requests for two different IFC documents with maxConcurrent=1: exactly one gets 202, other rejected with TENANT_IFC_CONCURRENCY_LIMIT_EXCEEDED", async () => {
    const [c1Company] = await db.insert(companies).values({ name: "C1 Company" }).returning();
    const [c1Plan] = await db.insert(plans).values({
      name: "Concurrency 1 Plan",
      monthlyPrice: 500,
      monthlyQuoteLimit: 100,
      monthlyIfcLimit: 50,
      ifcMaxFileMb: 100,
      ifcMaxConcurrent: 1,
      isActive: true,
    }).returning();
    await db.insert(subscriptions).values({
      companyId: c1Company.id,
      planId: c1Plan.id,
      status: "active",
    });
    const [c1User] = await db.insert(users).values({ email: "c1@example.test", fullName: "C1 User" }).returning();
    await db.insert(memberships).values({ companyId: c1Company.id, userId: c1User.id, role: "owner" });

    const ifcContent = Buffer.from("ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;");
    const [doc1] = await db.insert(documents).values({
      companyId: c1Company.id, uploadedByUserId: c1User.id, originalFileName: "concurrent1.ifc", displayName: "concurrent1", mimeType: "application/ifc",
      fileSizeBytes: ifcContent.length, storageKey: "concurrent1.ifc", checksumSha256: "1".repeat(64)
    }).returning();
    await adapter.put("concurrent1.ifc", ifcContent, "application/ifc");

    const [doc2] = await db.insert(documents).values({
      companyId: c1Company.id, uploadedByUserId: c1User.id, originalFileName: "concurrent2.ifc", displayName: "concurrent2", mimeType: "application/ifc",
      fileSizeBytes: ifcContent.length, storageKey: "concurrent2.ifc", checksumSha256: "2".repeat(64)
    }).returning();
    await adapter.put("concurrent2.ifc", ifcContent, "application/ifc");

    const results = await Promise.allSettled([
      changeProcessingRun({ companyId: c1Company.id, userId: c1User.id, documentId: doc1.id, action: "process" }),
      changeProcessingRun({ companyId: c1Company.id, userId: c1User.id, documentId: doc2.id, action: "process" }),
    ]);

    const fulfilled = results.filter((r): r is PromiseFulfilledResult<{ status: number; run: any }> => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "exactly one request should succeed");
    assert.equal(fulfilled[0].value.status, 202);
    assert.equal(rejected.length, 1, "exactly one request should be rejected");
    assert.match(rejected[0].reason?.message || "", /TENANT_IFC_CONCURRENCY_LIMIT_EXCEEDED/);
    assert.equal(rejected[0].reason?.code, "TENANT_IFC_CONCURRENCY_LIMIT_EXCEEDED");
    assert.equal(rejected[0].reason?.status, 409);
  });
});
