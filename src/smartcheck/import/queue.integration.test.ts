import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';

dotenv.config({ path: '.env.local' });
dotenv.config();
useTestIsolation();

test('atomic enqueue, retry and recovery in isolated application and worker schemas', async (t) => {
  const { db } = await import('../../db');
  const { companies, users, memberships, documents, documentProcessingRuns, smartcheckAuditLogs } = await import('../../db/schema');
  const { eq, sql } = await import('drizzle-orm');
  const { changeProcessingRun, ensureQueueSchema } = await import('./service');
  await ensureQueueSchema();
  const worker = sql.identifier(process.env.GRAPHILE_WORKER_SCHEMA!);
  const [company] = await db.insert(companies).values({ name: 'Queue test' }).returning();
  const [user] = await db.insert(users).values({ email: 'queue@example.test', fullName: 'Queue test' }).returning();
  await db.insert(memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  const [document] = await db.insert(documents).values({ companyId: company.id, uploadedByUserId: user.id, originalFileName: 'test.csv', displayName: 'test', mimeType: 'text/csv', fileSizeBytes: 1, storageKey: 'test.csv', checksumSha256: 'a'.repeat(64) }).returning();
  const adapter = await import("./storage").then(m => m.createStorageAdapter());
  await adapter.put('test.csv', Buffer.from("a,b,c\n1,2,3"), 'text/csv');
  const input = { companyId: company.id, userId: user.id, documentId: document.id };
  const jobs = () => db.execute(sql`select * from ${worker}.jobs`);

  await t.test('provider enqueue failure rolls back run, document and audit; retry succeeds', async () => {
    await db.execute(sql`create function fail_queue() returns trigger language plpgsql as $$ begin raise exception 'injected queue failure'; end $$`);
    await db.execute(sql`create trigger fail_queue before insert on ${worker}._private_jobs for each row execute function fail_queue()`);
    await assert.rejects(changeProcessingRun({ ...input, action: 'process' }));
    assert.equal((await db.select().from(documentProcessingRuns)).length, 0);
    assert.equal((await db.select().from(smartcheckAuditLogs)).length, 0);
    assert.equal((await db.select().from(documents))[0].status, document.status);
    await db.execute(sql`drop trigger fail_queue on ${worker}._private_jobs`);
  });
  await t.test('concurrent process requests create one run and one job in configured schema', async () => {
    const results = await Promise.all([changeProcessingRun({ ...input, action: 'process' }), changeProcessingRun({ ...input, action: 'process' })]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 202]);
    assert.equal((await db.select().from(documentProcessingRuns)).length, 1);
    assert.equal((await jobs()).rows.length, 1);
  });
  await t.test('locked stale job refuses recovery and rolls back Graphile remove_job mutation', async () => {
    await db.update(documentProcessingRuns).set({ status: 'running', updatedAt: new Date(0), createdAt: new Date(0) });
    await db.execute(sql`update ${worker}._private_jobs set locked_at = now(), locked_by = 'test-worker'`);
    await assert.rejects(changeProcessingRun({ ...input, action: 'recover' }), /PROCESSING_JOB_ACTIVE/);
    assert.ok((await jobs()).rows[0].key);
    assert.equal((await db.select().from(documentProcessingRuns))[0].status, 'running');
    await db.execute(sql`update ${worker}._private_jobs set locked_at = null, locked_by = null`);
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
    await db.execute(sql`create trigger fail_audit before insert on smartcheck_audit_logs for each row execute function fail_queue()`);
    await assert.rejects(changeProcessingRun({ ...input, action: 'retry' }));
    assert.equal((await jobs()).rows[0].key, before);
    assert.equal((await db.select().from(documentProcessingRuns)).length, 2);
    await db.execute(sql`drop trigger fail_audit on smartcheck_audit_logs`);
    assert.equal((await changeProcessingRun({ ...input, action: 'retry' })).status, 202);
    assert.equal((await jobs()).rows.length, 1);
  });
  await t.test('foreign company cannot create or recover runs', async () => {
    const [foreign] = await db.insert(companies).values({ name: 'Foreign' }).returning();
    await assert.rejects(changeProcessingRun({ ...input, companyId: foreign.id, action: 'recover' }), /DOCUMENT_NOT_FOUND/);
    assert.equal((await db.select().from(documents).where(eq(documents.id, document.id)))[0].companyId, company.id);
  });
  await t.test('legacy jobless queued run can be recovered then reissued', async () => {
    await db.execute(sql`delete from ${worker}._private_jobs`);
    await db.update(documentProcessingRuns).set({ updatedAt: new Date(0) });
    assert.equal((await changeProcessingRun({ ...input, action: 'recover' })).status, 200);
    assert.equal((await changeProcessingRun({ ...input, action: 'retry' })).status, 202);
    assert.equal((await jobs()).rows.length, 1);
  });
  await t.test('real Graphile worker observes committed run and retries a transient task failure', { timeout: 20_000 }, async () => {
    const { run, Logger } = await import('graphile-worker');
    let attempts = 0;
    const runner = await run({ connectionString: process.env.DATABASE_URL, schema: process.env.GRAPHILE_WORKER_SCHEMA,
      concurrency: 1, pollInterval: 100, noHandleSignals: true, logger: new Logger(() => () => {}),
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
    } finally { await runner.stop(); }
  });
});

import fs from 'node:fs';
