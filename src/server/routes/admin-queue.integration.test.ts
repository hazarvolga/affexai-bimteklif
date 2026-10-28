import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { useTestIsolation } from './test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });
const isolation = useTestIsolation();

const sha256 = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');

test('Admin /queue/retry and /queue/recover integration tests', async (t) => {
  const [{ db }, schema, { createApiApp }, { AuthService }, { createStorageAdapter }, { ensureQueueSchema }] = await Promise.all([
    import('../../db'),
    import('../../db/schema'),
    import('../app'),
    import('../../services/auth/authService'),
    import('../../smartcheck/import/storage'),
    import('../../smartcheck/import/service'),
  ]);

  await ensureQueueSchema();
  const fixture = await isolation.fixtureClient();
  const workerSchema = `"${process.env.GRAPHILE_WORKER_SCHEMA!.replace(/"/g, '""')}"`;

  const [admin] = await db.insert(schema.users).values({
    email: 'queue-admin@example.test',
    fullName: 'Queue Admin',
    isSuperAdmin: true,
    emailVerified: new Date(),
  }).returning();

  const adminToken = AuthService.generateToken({ userId: admin.id, companyId: null, role: null });

  const server = createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const postRetry = (runId: string) => fetch(`${baseUrl}/api/admin/queue/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ runId }),
  });

  const postRecover = (runId: string) => fetch(`${baseUrl}/api/admin/queue/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ runId }),
  });

  const [company] = await db.insert(schema.companies).values({ name: 'Admin Queue Co' }).returning();
  const [tenantUser] = await db.insert(schema.users).values({ email: 'tenant@example.test', fullName: 'Tenant User' }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: tenantUser.id, role: 'owner' });

  const [plan] = await db.insert(schema.plans).values({
    name: 'Admin Queue Plan',
    monthlyPrice: 1000,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 5,
    ifcMaxFileMb: 100,
    ifcMaxConcurrent: 1,
    isActive: true,
  }).returning();

  await db.insert(schema.subscriptions).values({
    companyId: company.id,
    planId: plan.id,
    status: 'active',
    bonusIfcLimit: 0,
  });

  await t.test('dashboard distinguishes list-price MRR and approved transfer events, and empty queues have no age', async () => {
    const tenantToken = AuthService.generateToken({ userId: tenantUser.id, companyId: company.id, role: 'owner' });
    for (const route of ['/api/admin/dashboard', '/api/admin/queue']) {
      const denied = await fetch(`${baseUrl}${route}`, { headers: { Authorization: `Bearer ${tenantToken}` } });
      assert.equal(denied.status, 403, 'tenant owner must not receive global admin metrics');
    }
    await db.insert(schema.adminAuditLogs).values([
      { adminId: admin.id, action: 'billing.payment_request.approved', details: { requestId: 'metrics-a', amountTry: 1000 } },
      { adminId: admin.id, action: 'billing.payment_request.approved', details: { requestId: 'metrics-a', amountTry: 1000 } },
      { adminId: admin.id, action: 'billing.payment_request.approved', details: { requestId: 'metrics-b', amountTry: 2000 } },
      { adminId: admin.id, action: 'billing.payment_request.approved', createdAt: new Date('2024-01-01T00:00:00Z'), details: { requestId: 'metrics-old', amountTry: 100 } },
      { adminId: admin.id, action: 'billing.payment_request.rejected', details: { requestId: 'metrics-c', amountTry: 9000 } },
    ]);
    // Legacy timestamp-without-time-zone stores the same instant in different
    // calendar months when writer sessions use different PostgreSQL time zones.
    await fixture.query("set time zone 'America/Los_Angeles'");
    await fixture.query("insert into admin_audit_logs(admin_id,action,details,created_at) values($1,'billing.payment_request.approved',$2::jsonb,$3::timestamptz)", [admin.id, JSON.stringify({ requestId: 'tz-west', amountTry: 100 }), '2026-03-01T00:15:00Z']);
    await fixture.query("set time zone 'Pacific/Kiritimati'");
    await fixture.query("insert into admin_audit_logs(admin_id,action,details,created_at) values($1,'billing.payment_request.approved',$2::jsonb,$3::timestamptz)", [admin.id, JSON.stringify({ requestId: 'tz-east', amountTry: 100 }), '2026-03-01T00:15:00Z']);
    await fixture.query("set time zone 'UTC'");
    const months = await fixture.query("select extract(month from created_at)::int as month from admin_audit_logs where details->>'requestId' in ('tz-west','tz-east') order by month");
    assert.deepEqual(months.rows.map((row: any) => row.month), [2, 3]);
    const response = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(response.status, 200);
    const dashboard = await response.json();
    assert.deepEqual(dashboard.approvedTransfersTotal, { amountTry: 3300, count: 5, complete: true });
    if (process.env.EXPECT_WORKER_SIGNALS === 'true') {
      assert.equal(dashboard.workerSignals.length, 2);
      const signal = dashboard.workerSignals.find((item: any) => item.kind === 'worker');
      assert.ok(signal.activeInstances >= 1);
      assert.equal(signal.revision, 'abcdef1234567');
      assert.equal(signal.revisionSource, 'build');
      assert.ok(signal.lastSeen);
    }
    assert.equal(dashboard.totalMRR, Number(plan.monthlyPrice));
    assert.equal(dashboard.queueStats.oldestQueuedAt, null);
    assert.equal(dashboard.queueStats.oldestQueuedAgeSeconds, null);
    const [missingCompany] = await db.insert(schema.companies).values({ name: 'Planı olmayan aktif firma' }).returning();
    const [missingSubscription] = await db.insert(schema.subscriptions).values({ companyId: missingCompany.id, planId: null, status: 'active' }).returning();
    const missingPlan = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const missingPlanBody = await missingPlan.json();
    assert.equal(missingPlanBody.totalMRR, null);
    assert.equal(missingPlanBody.missingPlanCount, 1);
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, missingSubscription.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, missingCompany.id));
    const queue = await fetch(`${baseUrl}/api/admin/queue`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(queue.status, 200);
    const queueBody = await queue.json();
    if (process.env.EXPECT_WORKER_SIGNALS === 'true') assert.equal(queueBody.workerSignals.find((item: any) => item.kind === 'worker')?.revision, 'abcdef1234567');
    assert.equal(queueBody.summary.oldestQueuedAt, null);
    assert.equal(queueBody.summary.oldestQueuedAgeSeconds, null);
    const [malformed] = await db.insert(schema.adminAuditLogs).values({ adminId: admin.id, action: 'billing.payment_request.approved', details: { requestId: 'malformed' } }).returning();
    const unavailable = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal((await unavailable.json()).approvedTransfersTotal.amountTry, null);
    await db.delete(schema.adminAuditLogs).where(eq(schema.adminAuditLogs.id, malformed.id));
  });

  const validIfcContent = Buffer.from(
    "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n" +
    "#1=IFCPROJECT('0YvctVUKr0kuhdA1mMGL7b',#2,'Project',$,$,$,$,(#3),#4);\n" +
    "#2=IFCOWNERHISTORY(#5,#6,$,.ADDED.,$,$,$,1700000000);\n" +
    "#3=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#7,$);\n" +
    "#4=IFCUNITASSIGNMENT((#8));\n" +
    "#5=IFCPERSONANDORGANIZATION(#9,#10,$);\n" +
    "#6=IFCAPPLICATION(#10,'2024','App','App');\n" +
    "#7=IFCAXIS2PLACEMENT3D(#11,$,$);\n" +
    "#8=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);\n" +
    "#9=IFCPERSON($,'User',$,$,$,$,$,$);\n" +
    "#10=IFCORGANIZATION($,'Org',$,$,$);\n" +
    "#11=IFCCARTESIANPOINT((0.,0.,0.));\n" +
    "#12=IFCWALL('2O2Fr$t4X7Zf8NOew3FL9r',#2,'Wall-01',$,$,#13,#14,'guid-wall-01');\n" +
    "#13=IFCLOCALPLACEMENT($,#7);\n" +
    "#14=IFCPRODUCTDEFINITIONSHAPE($,$,(#15));\n" +
    "#15=IFCSHAPEREPRESENTATION(#3,'Body','SweptSolid',(#16));\n" +
    "#16=IFCEXTRUDEDAREASOLID(#17,#7,#18,3.0);\n" +
    "#17=IFCRECTANGLEPROFILEDEF(.AREA.,$,#19,5.0,0.2);\n" +
    "#18=IFCDIRECTION((0.,0.,1.));\n" +
    "#19=IFCAXIS2PLACEMENT2D(#20,$);\n" +
    "#20=IFCCARTESIANPOINT((0.,0.));\n" +
    "#21=IFCQUANTITYVOLUME('NetVolume',$,$,3.0);\n" +
    "#22=IFCELEMENTQUANTITY('3k9F8H5t14$vJ6L4M1P3Q5',#2,'BaseQuantities',$,$,(#21));\n" +
    "#23=IFCRELDEFINESBYPROPERTIES('1a2b3c4d5e6f7a8b9c0d1e',#2,$,$,(#12),#22);\n" +
    "ENDSEC;\nEND-ISO-10303-21;\n"
  );
  const validIfcHash = sha256(validIfcContent);
  const storage = createStorageAdapter();

  const [document] = await db.insert(schema.documents).values({
    companyId: company.id,
    uploadedByUserId: tenantUser.id,
    originalFileName: 'admin_test.ifc',
    displayName: 'admin_test',
    mimeType: 'application/ifc',
    fileSizeBytes: validIfcContent.length,
    storageKey: 'admin_test.ifc',
    checksumSha256: validIfcHash,
    status: 'failed',
  }).returning();
  await storage.put('admin_test.ifc', validIfcContent, 'application/ifc');

  const [failedRun] = await db.insert(schema.documentProcessingRuns).values({
    companyId: company.id,
    documentId: document.id,
    idempotencyKey: 'test:failed:1',
    pipelineVersion: 1,
    status: 'failed',
    currentStage: 'failed',
    errorCode: 'IFC_WORKER_CRASHED',
    errorMessage: 'Worker crashed',
    progressMessage: 'Failed',
    completedAt: new Date(),
  }).returning();

  let newRunId = '';

  await t.test('1. Admin retry on failed run succeeds, audits in adminAuditLogs and NOT smartcheckAuditLogs', async () => {
    const res = await postRetry(failedRun.id);
    assert.equal(res.status, 202);
    const body = await res.json() as { success: boolean; run: { id: string; status: string } };
    assert.equal(body.success, true);
    assert.equal(body.run.status, 'queued');
    newRunId = body.run.id;

    // Verify adminAuditLogs
    const adminLogs = await db.select().from(schema.adminAuditLogs).where(
      and(
        eq(schema.adminAuditLogs.adminId, admin.id),
        eq(schema.adminAuditLogs.action, 'processing_retried')
      )
    );
    assert.equal(adminLogs.length, 1);
    assert.equal(adminLogs[0].targetCompanyId, company.id);
    assert.equal((adminLogs[0].details as any)?.newRunId, newRunId);

    // Verify smartcheckAuditLogs has NOT been written for this admin retry
    const smartcheckLogs = await db.select().from(schema.smartcheckAuditLogs).where(
      and(
        eq(schema.smartcheckAuditLogs.companyId, company.id),
        eq(schema.smartcheckAuditLogs.action, 'processing_retried')
      )
    );
    assert.equal(smartcheckLogs.length, 0, 'admin retry must not write to smartcheckAuditLogs as tenant');
  });

  await t.test('2. Admin retry while a run is active is rejected with 409 PROCESSING_RUN_ACTIVE', async () => {
    // newRunId is currently queued
    const res = await postRetry(failedRun.id);
    assert.equal(res.status, 409);
    const body = await res.json() as { error: string; code: string };
    assert.ok(body.code === 'PROCESSING_RUN_ACTIVE' || body.code === 'PROCESSING_RUN_SUPERSEDED');
  });

  await t.test('3. Admin retry on superseded (not latest) run is rejected with 409 PROCESSING_RUN_SUPERSEDED', async () => {
    // Mark newRunId as failed so it is no longer active
    await db.update(schema.documentProcessingRuns).set({ status: 'failed' }).where(eq(schema.documentProcessingRuns.id, newRunId));
    await db.update(schema.documents).set({ status: 'failed' }).where(eq(schema.documents.id, document.id));

    // Now try to retry the OLD failedRun (not the latest run)
    const res = await postRetry(failedRun.id);
    assert.equal(res.status, 409);
    const body = await res.json() as { error: string; code: string };
    assert.equal(body.code, 'PROCESSING_RUN_SUPERSEDED');
  });

  await t.test('4. Admin retry when tenant IFC monthly quota is exceeded is rejected with 403 IFC_QUOTA_EXCEEDED', async () => {
    const period = new Date().toISOString().slice(0, 7);
    // Fill up quota: monthlyIfcLimit = 5
    await db.delete(schema.usageRecords).where(and(eq(schema.usageRecords.companyId, company.id), eq(schema.usageRecords.period, period)));
    await db.insert(schema.usageRecords).values({
      companyId: company.id,
      period,
      quoteCount: 0,
      ifcCount: 5,
    });

    const res = await postRetry(newRunId);
    assert.equal(res.status, 403);
    const body = await res.json() as { error: string; code: string };
    assert.equal(body.code, 'IFC_QUOTA_EXCEEDED');
  });

  await t.test('5. Admin /queue/recover returns 409 when job is actively locked by worker', async () => {
    // Create a stale-looking run
    const [staleRun] = await db.insert(schema.documentProcessingRuns).values({
      companyId: company.id,
      documentId: document.id,
      idempotencyKey: 'test:stale:1',
      pipelineVersion: 1,
      status: 'running',
      currentStage: 'parsing',
      progressMessage: 'Running',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }).returning();

    // Fixture-only vendor calls use the admin connection; HTTP still uses runtime roles.
    const jobKey = 'smartcheck:' + staleRun.id;
    await fixture.query(
      `select ${workerSchema}.add_job($1, $2::json, job_key := $3)`,
      ['process_smartcheck_ifc_document', '{}', jobKey],
    );
    try {
      await fixture.query(
        `update ${workerSchema}._private_jobs set locked_at = now(), locked_by = $1 where key = $2`,
        ['test-worker-node', jobKey],
      );
      const res = await postRecover(staleRun.id);
      assert.equal(res.status, 409, 'locked job must return 409, not 500');
      const body = await res.json() as { error: string; code?: string };
      assert.equal(body.code, 'PROCESSING_JOB_ACTIVE');
    } finally {
      await fixture.query(
        `update ${workerSchema}._private_jobs set locked_at = null, locked_by = null where key = $1`,
        [jobKey],
      );
      await fixture.query(`select ${workerSchema}.remove_job($1)`, [jobKey]);
    }
  });

  await t.test('6. GET /queue computes metrics across 150+ jobs, paginates and filters correctly (P1-2, P1-3)', async () => {
    // Clean up existing test runs
    await db.delete(schema.documentProcessingRuns);

    // Create a 2nd company and documents of different kinds
    const [company2] = await db.insert(schema.companies).values({ name: 'Queue Co 2' }).returning();
    await db.insert(schema.memberships).values({ companyId: company2.id, userId: tenantUser.id, role: 'owner' });
    const [ifcDoc] = await db.insert(schema.documents).values({
      companyId: company.id,
      uploadedByUserId: tenantUser.id,
      originalFileName: 'building.ifc',
      displayName: 'building.ifc',
      mimeType: 'model/ifc',
      fileSizeBytes: 1024,
      storageKey: 'keys/b.ifc',
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000001',
    }).returning();

    const [xlsxDoc] = await db.insert(schema.documents).values({
      companyId: company2.id,
      uploadedByUserId: tenantUser.id,
      originalFileName: 'quantities.xlsx',
      displayName: 'quantities.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSizeBytes: 2048,
      storageKey: 'keys/q.xlsx',
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000002',
    }).returning();

    const now = Date.now();
    const runRows: Array<typeof schema.documentProcessingRuns.$inferInsert> = [];

    // 50 queued normal (5m old -> not stale, since queued stale is 60m)
    for (let i = 0; i < 50; i++) {
      runRows.push({
        companyId: company.id,
        documentId: ifcDoc.id,
        idempotencyKey: `q:norm:${i}`,
        pipelineVersion: 1,
        status: 'queued',
        currentStage: 'queued',
        createdAt: new Date(now - 5 * 60_000),
        updatedAt: new Date(now - 5 * 60_000),
      });
    }

    // 1 queued stale (65m old -> stale, since 65m >= 60m)
    runRows.push({
      companyId: company.id,
      documentId: ifcDoc.id,
      idempotencyKey: 'q:stale:1',
      pipelineVersion: 1,
      status: 'queued',
      currentStage: 'queued',
      createdAt: new Date(now - 65 * 60_000),
      updatedAt: new Date(now - 65 * 60_000),
    });

    // 30 running normal (3m old -> not stale, running stale is 10m)
    for (let i = 0; i < 30; i++) {
      runRows.push({
        companyId: company.id,
        documentId: ifcDoc.id,
        idempotencyKey: `r:norm:${i}`,
        pipelineVersion: 1,
        status: 'running',
        currentStage: 'parsing',
        startedAt: new Date(now - 3 * 60_000),
        createdAt: new Date(now - 3 * 60_000),
        updatedAt: new Date(now - 3 * 60_000),
      });
    }

    // 10 running stale (15m old -> stale, since 15m >= 10m)
    for (let i = 0; i < 10; i++) {
      runRows.push({
        companyId: company2.id,
        documentId: xlsxDoc.id,
        idempotencyKey: `r:stale:${i}`,
        pipelineVersion: 1,
        status: 'running',
        currentStage: 'parsing',
        startedAt: new Date(now - 15 * 60_000),
        createdAt: new Date(now - 15 * 60_000),
        updatedAt: new Date(now - 15 * 60_000),
      });
    }

    // 30 succeeded in last 24h
    for (let i = 0; i < 30; i++) {
      runRows.push({
        companyId: company.id,
        documentId: ifcDoc.id,
        idempotencyKey: `s:recent:${i}`,
        pipelineVersion: 1,
        status: 'succeeded',
        currentStage: 'completed',
        completedAt: new Date(now - 1 * 3600_000),
        createdAt: new Date(now - 2 * 3600_000),
        updatedAt: new Date(now - 1 * 3600_000),
      });
    }

    // 30 failed in last 24h
    for (let i = 0; i < 30; i++) {
      runRows.push({
        companyId: company2.id,
        documentId: xlsxDoc.id,
        idempotencyKey: `f:recent:${i}`,
        pipelineVersion: 1,
        status: 'failed',
        currentStage: 'failed',
        completedAt: new Date(now - 2 * 3600_000),
        createdAt: new Date(now - 3 * 3600_000),
        updatedAt: new Date(now - 2 * 3600_000),
      });
    }

    // Total: 50 + 1 + 30 + 10 + 30 + 30 = 151 jobs
    assert.equal(runRows.length, 151);
    await db.insert(schema.documentProcessingRuns).values(runRows);

    // 1. Unfiltered request with default pagination (limit 50)
    const resAll = await fetch(`${baseUrl}/api/admin/queue`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resAll.status, 200);
    const dataAll = await resAll.json() as any;

    // Verify summary metrics calculated from all 151 jobs in SQL
    assert.equal(dataAll.summary.pending, 51);
    assert.equal(dataAll.summary.running, 40);
    assert.equal(dataAll.summary.stale, 11); // 1 queued (>60m) + 10 running (>10m)
    assert.equal(dataAll.summary.failed24h, 30);
    assert.equal(dataAll.summary.completed24h, 30);
    assert.equal(dataAll.summary.succeeded24h, 30);
    assert.ok(dataAll.summary.oldestQueuedAt);
    assert.ok(dataAll.summary.oldestQueuedAgeSeconds >= 65 * 60);

    // Verify pagination
    assert.equal(dataAll.pagination.total, 151);
    assert.equal(dataAll.pagination.page, 1);
    assert.equal(dataAll.pagination.limit, 50);
    assert.equal(dataAll.pagination.totalPages, 4);
    assert.equal(dataAll.runs.length, 50);

    // Verify page 4
    const resP4 = await fetch(`${baseUrl}/api/admin/queue?page=4&limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataP4 = await resP4.json() as any;
    assert.equal(dataP4.pagination.page, 4);
    assert.equal(dataP4.runs.length, 1);

    // 2. Filter by status: stale
    const resStale = await fetch(`${baseUrl}/api/admin/queue?status=stale`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataStale = await resStale.json() as any;
    assert.equal(dataStale.pagination.total, 11);
    assert.ok(dataStale.runs.every((r: any) => r.isStale === true));

    // 3. Filter by companyId
    const resCo2 = await fetch(`${baseUrl}/api/admin/queue?companyId=${company2.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataCo2 = await resCo2.json() as any;
    // company2 has 10 running + 30 failed = 40
    assert.equal(dataCo2.pagination.total, 40);
    assert.ok(dataCo2.runs.every((r: any) => r.companyId === company2.id));

    // 4. Filter by kind: xlsx vs ifc
    const resXlsx = await fetch(`${baseUrl}/api/admin/queue?kind=xlsx`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataXlsx = await resXlsx.json() as any;
    assert.equal(dataXlsx.pagination.total, 40);
    assert.ok(dataXlsx.runs.every((r: any) => r.kind === 'xlsx'));

    const resIfc = await fetch(`${baseUrl}/api/admin/queue?kind=ifc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataIfc = await resIfc.json() as any;
    // ifc: 50 + 1 + 30 + 30 = 111
    assert.equal(dataIfc.pagination.total, 111);
    assert.ok(dataIfc.runs.every((r: any) => r.kind === 'ifc'));
  });
});
