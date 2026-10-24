import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import { useTestIsolation } from "./test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("pilot evidence control records consent, measurements, reviewer gate, and tenant isolation", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const previousSmartcheckFlag = process.env.SMARTCHECK_IMPORT_ENABLED;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  const [{ createApiApp }, schema, dbModule, { AuthService }, { PilotEvidenceService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"), import("../../services/pilot-evidence/service"),
  ]);
  const { eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Pilot Evidence A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Pilot Evidence B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `pilot-evidence-a-${suffix}@example.test`, fullName: "Pilot Evidence A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `pilot-evidence-b-${suffix}@example.test`, fullName: "Pilot Evidence B", emailVerified: new Date() }).returning();
  const [reviewerA] = await db.insert(schema.users).values({ email: `pilot-evidence-reviewer-${suffix}@example.test`, fullName: "Pilot Evidence Reviewer", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyA.id, userId: reviewerA.id, role: "manager" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const reviewerToken = AuthService.generateToken({ userId: reviewerA.id, companyId: companyA.id, role: "manager" });
  const [document] = await db.insert(schema.documents).values({ companyId: companyA.id, uploadedByUserId: userA.id, originalFileName: `pilot-${suffix}.csv`, displayName: `Pilot ${suffix}`, mimeType: "text/csv", fileSizeBytes: 128, storageKey: `${companyA.id}/${suffix}/original`, checksumSha256: "d".repeat(64), status: "completed" }).returning();
  const [run] = await db.insert(schema.documentProcessingRuns).values({ companyId: companyA.id, documentId: document.id, status: "succeeded", currentStage: "completed", idempotencyKey: `pilot-run-${suffix}`, progressPercent: 100, startedAt: new Date("2026-07-23T08:00:00Z"), completedAt: new Date("2026-07-23T08:02:00Z") }).returning();
  await db.insert(schema.normalizedQuantityRows).values([
    { companyId: companyA.id, documentId: document.id, processingRunId: run.id, sheetName: "Teklif", sourceRowNumber: 2, sourceCellRange: "A2:F2", rawDescription: "Pompa", rawUnit: "adet", rawQuantity: "2", rawPrice: "100", normalizedDescription: "Pompa", normalizedUnit: "adet", normalizedQuantity: "2", normalizedPrice: "100", reviewStatus: "approved", reviewerUserId: userA.id, reviewedAt: new Date(), findingsJson: [] },
    { companyId: companyA.id, documentId: document.id, processingRunId: run.id, sheetName: "Teklif", sourceRowNumber: 3, sourceCellRange: "A3:F3", rawDescription: "Vana", rawUnit: "adet", rawQuantity: "1", rawPrice: "45", normalizedDescription: "Vana", normalizedUnit: "adet", normalizedQuantity: "1", normalizedPrice: "45", reviewStatus: "accepted_exception", reviewerUserId: userA.id, reviewedAt: new Date(), findingsJson: [{ code: "missing_position_code" }] },
    { companyId: companyA.id, documentId: document.id, processingRunId: run.id, sheetName: "Teklif", sourceRowNumber: 4, sourceCellRange: "A4:F4", rawDescription: "Kablo", rawUnit: "m", rawQuantity: "", rawPrice: "", reviewStatus: "pending_review", findingsJson: [{ code: "quantity_missing" }, { code: "price_missing" }] },
  ]);
  const isolatedTenantTransaction = async <T>(_pool: typeof dbModule.pool, context: { companyId: string; userId: string }, work: (client: import("pg").PoolClient) => Promise<T>) => {
    const client = await dbModule.pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('bimmetraj.company_id',$1,true),set_config('bimmetraj.user_id',$2,true)", [context.companyId, context.userId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally { client.release(); }
  };
  const server = http.createServer(createApiApp({ pilotEvidenceService: new PilotEvidenceService(dbModule.pool, isolatedTenantTransaction) }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  let caseId = "";
  try {
    class FailingFeatureGateService extends PilotEvidenceService {
      override async isEnabled(): Promise<boolean> { throw new Error("feature gate database failure probe"); }
    }
    const failureServer = http.createServer(createApiApp({ pilotEvidenceService: new FailingFeatureGateService(dbModule.pool, isolatedTenantTransaction) }));
    await new Promise<void>((resolve) => failureServer.listen(0, "127.0.0.1", resolve));
    try {
      const failureAddress = failureServer.address();
      const failureResponse = await fetch(`http://127.0.0.1:${typeof failureAddress === "object" && failureAddress ? failureAddress.port : 0}/api/smartcheck/pilot-cases`, { headers: { Authorization: `Bearer ${tokenA}` } });
      assert.equal(failureResponse.status, 500, "feature-gate database failures must reach the error middleware");
    } finally {
      await new Promise<void>((resolve) => failureServer.close(() => resolve()));
    }
    const rateFailureServer = http.createServer(createApiApp({
      pilotEvidenceService: new PilotEvidenceService(dbModule.pool, isolatedTenantTransaction),
      pilotEvidenceRateLimiter: async () => { throw new Error("rate limit database failure probe"); },
    }));
    await new Promise<void>((resolve) => rateFailureServer.listen(0, "127.0.0.1", resolve));
    try {
      const failureAddress = rateFailureServer.address();
      const failureResponse = await fetch(`http://127.0.0.1:${typeof failureAddress === "object" && failureAddress ? failureAddress.port : 0}/api/smartcheck/pilot-cases`, { headers: { Authorization: `Bearer ${tokenA}` } });
      assert.equal(failureResponse.status, 500, "rate-limit database failures must reach the error middleware");
    } finally {
      await new Promise<void>((resolve) => rateFailureServer.close(() => resolve()));
    }
    const pilotBody = { documentId: document.id, pilotId: `mep-${suffix}`, customerReference: "CUSTOMER-REF-01", projectReference: "PROJECT-REF-01", discipline: "MEP", permissionReference: "CONSENT-REF-01", permissionGrantedAt: "2026-07-20", retentionUntil: "2026-12-31", expectedRowCount: 3, workflowStartedAt: "2026-07-23T07:55:00Z" };
    const futurePermission = await request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...pilotBody, pilotId: `future-${suffix}`, permissionGrantedAt: "2099-01-01", retentionUntil: "2099-01-02" }) });
    assert.equal(futurePermission.status, 400);
    assert.equal((await futurePermission.json() as { error: string }).error, "İzin tarihi gelecekte olamaz.");
    const expiredRetention = await request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...pilotBody, pilotId: `expired-${suffix}`, permissionGrantedAt: "2019-01-01", retentionUntil: "2020-01-01" }) });
    assert.equal(expiredRetention.status, 400);
    assert.equal((await expiredRetention.json() as { error: string }).error, "Retention tarihi pilot kabul tarihini kapsamalıdır.");
    const zeroRows = await request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...pilotBody, pilotId: `zero-${suffix}`, expectedRowCount: 0 }) });
    assert.equal(zeroRows.status, 400);
    assert.equal((await zeroRows.json() as { error: string }).error, "Beklenen satır sayısı sıfırdan büyük olmalıdır.");
    const invalidWorkflowStart = await request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...pilotBody, pilotId: `invalid-date-${suffix}`, workflowStartedAt: "not-a-date" }) });
    assert.equal(invalidWorkflowStart.status, 400);
    const creates = await Promise.all([
      request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pilotBody) }),
      request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pilotBody) }),
    ]);
    assert.deepEqual(creates.map(({ status }) => status).sort(), [201, 409]);
    const create = creates.find(({ status }) => status === 201)!;
    caseId = (await create.json() as { id: string }).id;
    assert.equal((await request("/api/smartcheck/pilot-cases/not-a-uuid")).status, 400);
    assert.equal((await request(`/api/smartcheck/pilot-cases/${caseId}`, {}, tokenB)).status, 404);
    const otherCases = await (await request("/api/smartcheck/pilot-cases", {}, tokenB)).json() as unknown[];
    assert.equal(otherCases.length, 0);
    const measurement = await request(`/api/smartcheck/pilot-cases/${caseId}/measure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ measurementKey: "run-1", notes: "İlk pilot ölçümü" }) });
    assert.equal(measurement.status, 201);
    const measurementBody = await measurement.json() as { measurement: { id: string; requestHash: string }; metrics: { totalRows: number; parsedRows: number; approvedRows: number; exceptionRows: number; findingCount: number; parseRate: number; manualReentryFreeRate: number; processingDurationSeconds: number; workflowDurationSeconds: number }; pilotCase: { status: string } };
    // Test isolation clones tables without production triggers; the PG16 contract separately proves automatic audit creation.
    await db.insert(schema.smartcheckAuditLogs).values({ companyId: companyA.id, userId: userA.id, action: "pilot_case_measured", entityType: "smartcheck_pilot_case", entityId: caseId, metadataJson: { measurementId: measurementBody.measurement.id, measurementKey: "run-1", requestHash: measurementBody.measurement.requestHash } });
    const concurrentReplay = await request(`/api/smartcheck/pilot-cases/${caseId}/measure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ measurementKey: "run-1", notes: "İlk pilot ölçümü" }) });
    assert.equal(concurrentReplay.status, 201);
    assert.equal((await concurrentReplay.json() as { measurement: { id: string } }).measurement.id, measurementBody.measurement.id);
    assert.equal(measurementBody.metrics.totalRows, 3);
    assert.equal(measurementBody.metrics.parsedRows, 2);
    assert.equal(measurementBody.metrics.approvedRows, 1);
    assert.equal(measurementBody.metrics.exceptionRows, 1);
    assert.equal(measurementBody.metrics.findingCount, 3);
    assert.equal(measurementBody.metrics.parseRate, 0.6667);
    assert.equal(measurementBody.metrics.manualReentryFreeRate, 0.6667);
    assert.equal(measurementBody.metrics.processingDurationSeconds, 120);
    assert.equal(measurementBody.metrics.workflowDurationSeconds, null);
    assert.equal(measurementBody.pilotCase.status, "review");
    const changedPayload = await request(`/api/smartcheck/pilot-cases/${caseId}/measure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ measurementKey: "run-1", notes: "Farklı istek" }) });
    assert.equal(changedPayload.status, 409);
    assert.equal((await changedPayload.json() as { code: string }).code, "MEASUREMENT_IDEMPOTENCY_CONFLICT");
    const [approvedReview, conflictingReview] = await Promise.all([
      request(`/api/smartcheck/pilot-cases/${caseId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approved", notes: "Pilot veri reviewer onayı." }) }, reviewerToken),
      request(`/api/smartcheck/pilot-cases/${caseId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "rejected", notes: "Eşzamanlı red." }) }, reviewerToken),
    ]);
    assert.deepEqual([approvedReview.status, conflictingReview.status].sort(), [200, 409]);
    const successfulReview = approvedReview.status === 200 ? approvedReview : conflictingReview;
    const successfulBody = await successfulReview.json() as { status: string; reviewerDecision: string };
    assert.ok(successfulBody.status === "completed" || successfulBody.status === "rejected");
    const exactRetry = await request(`/api/smartcheck/pilot-cases/${caseId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: successfulBody.reviewerDecision, notes: successfulBody.reviewerDecision === "approved" ? "Pilot veri reviewer onayı." : "Eşzamanlı red." }) }, reviewerToken);
    assert.equal(exactRetry.status, 200);
    assert.equal((await exactRetry.json() as { replayed: boolean }).replayed, true);
    assert.equal((await request(`/api/smartcheck/pilot-cases/${caseId}/measure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ measurementKey: "run-2" }) })).status, 409);
    const metrics = await request("/api/smartcheck/pilot-metrics");
    assert.equal(metrics.status, 200);
    const metricsBody = await metrics.json() as { summary: { caseCount: number; parseRate: number }; gates: { fiveCases: boolean; parseRateAtLeast90: boolean }; reviewedCaseCount: number };
    assert.equal(metricsBody.summary.caseCount, 1);
    assert.equal(metricsBody.summary.parseRate, 0.6667);
    assert.equal(metricsBody.gates.fiveCases, false);
    assert.equal(metricsBody.gates.parseRateAtLeast90, false);
    assert.equal(metricsBody.reviewedCaseCount, 1);
    assert.equal((await request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pilotBody) })).status, 409);
    const otherMetrics = await (await request("/api/smartcheck/pilot-metrics", {}, tokenB)).json() as { summary: { caseCount: number } };
    assert.equal(otherMetrics.summary.caseCount, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.smartcheckPilotMeasurements).where(eq(schema.smartcheckPilotMeasurements.companyId, companyA.id));
    await db.delete(schema.smartcheckPilotCases).where(eq(schema.smartcheckPilotCases.companyId, companyA.id));
    await db.delete(schema.smartcheckAuditLogs).where(eq(schema.smartcheckAuditLogs.companyId, companyA.id));
    await db.delete(schema.normalizedQuantityRows).where(eq(schema.normalizedQuantityRows.companyId, companyA.id));
    await db.delete(schema.documentProcessingRuns).where(eq(schema.documentProcessingRuns.companyId, companyA.id));
    await db.delete(schema.documents).where(eq(schema.documents.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, reviewerA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, reviewerA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
    if (previousSmartcheckFlag === undefined) delete process.env.SMARTCHECK_IMPORT_ENABLED;
    else process.env.SMARTCHECK_IMPORT_ENABLED = previousSmartcheckFlag;
  }
});
