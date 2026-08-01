import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";

dotenv.config({ path: ".env.local" });
dotenv.config();

test("pilot evidence control records consent, measurements, reviewer gate, and tenant isolation", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const previousSmartcheckFlag = process.env.SMARTCHECK_IMPORT_ENABLED;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
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
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const [document] = await db.insert(schema.documents).values({ companyId: companyA.id, uploadedByUserId: userA.id, originalFileName: `pilot-${suffix}.csv`, displayName: `Pilot ${suffix}`, mimeType: "text/csv", fileSizeBytes: 128, storageKey: `${companyA.id}/${suffix}/original`, checksumSha256: "d".repeat(64), status: "completed" }).returning();
  const [run] = await db.insert(schema.documentProcessingRuns).values({ companyId: companyA.id, documentId: document.id, status: "succeeded", currentStage: "completed", idempotencyKey: `pilot-run-${suffix}`, progressPercent: 100, startedAt: new Date("2026-07-23T08:00:00Z"), completedAt: new Date("2026-07-23T08:02:00Z") }).returning();
  await db.insert(schema.normalizedQuantityRows).values([
    { companyId: companyA.id, documentId: document.id, processingRunId: run.id, sheetName: "Teklif", sourceRowNumber: 2, sourceCellRange: "A2:F2", rawDescription: "Pompa", rawUnit: "adet", rawQuantity: "2", rawPrice: "100", normalizedDescription: "Pompa", normalizedUnit: "adet", normalizedQuantity: "2", normalizedPrice: "100", reviewStatus: "approved", reviewerUserId: userA.id, reviewedAt: new Date(), findingsJson: [] },
    { companyId: companyA.id, documentId: document.id, processingRunId: run.id, sheetName: "Teklif", sourceRowNumber: 3, sourceCellRange: "A3:F3", rawDescription: "Vana", rawUnit: "adet", rawQuantity: "1", rawPrice: "45", normalizedDescription: "Vana", normalizedUnit: "adet", normalizedQuantity: "1", normalizedPrice: "45", reviewStatus: "accepted_exception", reviewerUserId: userA.id, reviewedAt: new Date(), findingsJson: [{ code: "missing_position_code" }] },
    { companyId: companyA.id, documentId: document.id, processingRunId: run.id, sheetName: "Teklif", sourceRowNumber: 4, sourceCellRange: "A4:F4", rawDescription: "Kablo", rawUnit: "m", rawQuantity: "", rawPrice: "", reviewStatus: "pending_review", findingsJson: [{ code: "quantity_missing" }, { code: "price_missing" }] },
  ]);
  const server = http.createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  let caseId = "";
  try {
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
    const create = await request("/api/smartcheck/pilot-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pilotBody) });
    assert.equal(create.status, 201);
    caseId = (await create.json() as { id: string }).id;
    assert.equal((await request(`/api/smartcheck/pilot-cases/${caseId}`, {}, tokenB)).status, 404);
    const otherCases = await (await request("/api/smartcheck/pilot-cases", {}, tokenB)).json() as unknown[];
    assert.equal(otherCases.length, 0);
    const measurement = await request(`/api/smartcheck/pilot-cases/${caseId}/measure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ measurementKey: "run-1", notes: "İlk pilot ölçümü" }) });
    assert.equal(measurement.status, 201);
    const measurementBody = await measurement.json() as { measurement: { id: string }; metrics: { totalRows: number; parsedRows: number; approvedRows: number; findingCount: number; parseRate: number; manualReentryFreeRate: number; processingDurationSeconds: number; workflowDurationSeconds: number }; pilotCase: { status: string } };
    assert.equal(measurementBody.metrics.totalRows, 3);
    assert.equal(measurementBody.metrics.parsedRows, 2);
    assert.equal(measurementBody.metrics.approvedRows, 2);
    assert.equal(measurementBody.metrics.findingCount, 3);
    assert.equal(measurementBody.metrics.parseRate, 0.6667);
    assert.equal(measurementBody.metrics.manualReentryFreeRate, 0.6667);
    assert.equal(measurementBody.metrics.processingDurationSeconds, 120);
    assert.equal(measurementBody.metrics.workflowDurationSeconds, null);
    assert.equal(measurementBody.pilotCase.status, "review");
    const duplicateMeasure = await request(`/api/smartcheck/pilot-cases/${caseId}/measure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ measurementKey: "run-1" }) });
    assert.equal(duplicateMeasure.status, 201);
    assert.equal((await duplicateMeasure.json() as { measurement: { id: string } }).measurement.id, measurementBody.measurement.id);
    const review = await request(`/api/smartcheck/pilot-cases/${caseId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approved", notes: "Pilot veri reviewer onayı." }) });
    assert.equal(review.status, 200);
    assert.equal((await review.json() as { status: string; reviewerDecision: string }).status, "completed");
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
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
    if (previousSmartcheckFlag === undefined) delete process.env.SMARTCHECK_IMPORT_ENABLED;
    else process.env.SMARTCHECK_IMPORT_ENABLED = previousSmartcheckFlag;
  }
});
