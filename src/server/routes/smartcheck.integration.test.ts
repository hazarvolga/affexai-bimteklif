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

test("SmartCheck HTTP + PostgreSQL isolated flow and tenant boundary", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  const [{ createApiApp }, schema, dbModule, { AuthService }, processor] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"), import("../../smartcheck/import/processor"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `HTTP Integration A ${suffix}`, smartcheckMaxWastePercent: "20" }).returning(),
    db.insert(schema.companies).values({ name: `HTTP Integration B ${suffix}`, smartcheckMaxWastePercent: "20" }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [plan] = await db.insert(schema.plans).values({
    name: `Integration Plan ${suffix}`,
    monthlyPrice: 1000,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 50,
    ifcMaxFileMb: 100,
    ifcMaxConcurrent: 2,
    isActive: true,
  }).returning();
  await db.insert(schema.subscriptions).values([companyA, companyB].map(company => ({
    companyId: company.id, planId: plan.id, plan: "starter" as const, status: "active" as const,
    currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
  })));
  const [userA] = await db.insert(schema.users).values({ email: `http-a-${suffix}@example.test`, fullName: "HTTP Tenant A", emailVerified: new Date() }).returning();
  const [reviewerA] = await db.insert(schema.users).values({ email: `http-reviewer-${suffix}@example.test`, fullName: "HTTP Tenant A Reviewer", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `http-b-${suffix}@example.test`, fullName: "HTTP Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyA.id, userId: reviewerA.id, role: "manager" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const [client] = await db.insert(schema.clients).values({ companyId: companyA.id, name: "Integration Client", type: "company" }).returning();
  const [quote] = await db.insert(schema.quotations).values({ companyId: companyA.id, clientId: client.id, quoteNumber: `HTTP-${suffix}`, projectName: "MEP HTTP Pilot", expiryDate: new Date(Date.now() + 86400000), subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0" }).returning();
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const reviewerTokenA = AuthService.generateToken({ userId: reviewerA.id, companyId: companyA.id, role: "manager" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const csv = Buffer.from("Poz No,Açıklama,Birim,Miktar,Birim Fiyat\nM-001,VRF dış ünite,adet,2,12500\n");
  const checksum = crypto.createHash("sha256").update(csv).digest("hex");
  let documentId = "";
  let runId = "";
  let generatedQuoteId = "";
  let generatedClientId = "";
  let priceSourceId = "";
  let snapshotId = "";
  {
    const create = await request("/api/smartcheck/documents/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: "mep.csv", mimeType: "text/csv", fileSizeBytes: csv.length }) });
    assert.equal(create.status, 201);
    const target = await create.json() as { documentId: string; uploadUrl: string };
    documentId = target.documentId;
    assert.equal((await request(target.uploadUrl, { method: "PUT", headers: { "content-type": "text/csv" }, body: csv })).status, 204);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checksumSha256: checksum }) })).status, 200);
    const preview = await request(`/api/smartcheck/documents/${documentId}/preview`);
    assert.equal(preview.status, 200);
    assert.equal((await preview.json() as { preview: { sheets: Array<{ name: string; suggestedMapping: { quantity?: string } }> } }).preview.sheets[0].suggestedMapping.quantity, "Miktar");
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/preview`, {}, tokenB)).status, 404);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/mapping`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: "mep-tr-standard-v1", description: "Açıklama", unit: "Birim", quantity: "Miktar", positionCode: "Poz No", price: "Birim Fiyat" }) })).status, 200);
    const queued = await request(`/api/smartcheck/documents/${documentId}/process`, { method: "POST" });
    assert.equal(queued.status, 202);
    runId = (await queued.json() as { id: string }).id;
    const queue = await request("/api/smartcheck/queue");
    assert.equal(queue.status, 200);
    assert.ok((await queue.json() as Array<{ documentId: string }>).some((item) => item.documentId === documentId));
    assert.equal((await request("/api/smartcheck/queue", {}, tokenB)).status, 200);
    await db.update(schema.documentProcessingRuns).set({ status: "running", currentStage: "parsing", startedAt: new Date("2020-01-01T00:00:00Z"), updatedAt: new Date("2020-01-01T00:00:00Z") }).where(and(eq(schema.documentProcessingRuns.id, runId), eq(schema.documentProcessingRuns.companyId, companyA.id)));
    const staleQueue = await request("/api/smartcheck/queue");
    const staleRun = (await staleQueue.json() as Array<{ id: string; isStale: boolean }>).find((item) => item.id === runId);
    assert.equal(staleRun?.isStale, true);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/recover-stale`, { method: "POST" }, tokenB)).status, 404);
    const recover = await request(`/api/smartcheck/documents/${documentId}/recover-stale`, { method: "POST" });
    assert.equal(recover.status, 200);
    assert.equal((await recover.json() as { errorCode: string }).errorCode, "WORKER_STALE");
    const retry = await request(`/api/smartcheck/documents/${documentId}/retry`, { method: "POST" });
    assert.equal(retry.status, 202);
    runId = (await retry.json() as { id: string }).id;
    await processor.processSmartCheckDocument({ companyId: companyA.id, documentId, processingRunId: runId });
    const rowsResponse = await request(`/api/smartcheck/documents/${documentId}/rows`);
    assert.equal(rowsResponse.status, 200);
    const rows = await rowsResponse.json() as Array<{ id: string; findingsJson: unknown[]; reviewStatus: string }>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].findingsJson.length, 0);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/rows`, {}, tokenB)).status, 404);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) }, tokenB)).status, 404);
    const sourceFinding = { code: "IFC_SOURCE_EVIDENCE_MISSING", severity: "high", message: "Kaynak kanıtı eksik", ruleVersion: "ifc-evidence-v1", suggestion: "Kaynağı doğrulayın" };
    await db.update(schema.normalizedQuantityRows).set({ findingsJson: [sourceFinding] }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const review = (status: string, notes?: string, expectedUpdatedAt?: string) => request(`/api/smartcheck/rows/${rows[0].id}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, notes, expectedUpdatedAt }) });
    assert.equal((await review("approved")).status, 409, "source findings must block single approval");
    assert.equal((await review("accepted_exception")).status, 400, "exceptions require justification");
    const exception = await review("accepted_exception", "Kaynak kanıtı ayrıca incelenecek");
    assert.equal(exception.status, 200);
    const exceptionBody = await exception.json() as { findingsJson: unknown[]; updatedAt: string };
    assert.deepEqual(exceptionBody.findingsJson, [sourceFinding]);
    const rereview = await review("rejected", "İstisna yeniden değerlendirildi", exceptionBody.updatedAt);
    assert.equal(rereview.status, 200, "a reviewed row can be reconsidered with its current version");
    const reviewHistory = await db.select().from(schema.smartcheckAuditLogs).where(and(eq(schema.smartcheckAuditLogs.companyId, companyA.id), eq(schema.smartcheckAuditLogs.entityId, rows[0].id)));
    const firstEvent = reviewHistory.find(event => event.action === 'row_accepted_exception')!;
    const secondEvent = reviewHistory.find(event => event.action === 'row_rejected')!;
    assert.equal(firstEvent.metadataJson.previousReviewStatus, 'pending_review');
    assert.equal(firstEvent.metadataJson.reviewReason, 'Kaynak kanıtı ayrıca incelenecek');
    assert.equal(secondEvent.metadataJson.previousReviewStatus, 'accepted_exception');
    assert.equal(secondEvent.metadataJson.previousReviewReason, 'Kaynak kanıtı ayrıca incelenecek');
    assert.equal(secondEvent.metadataJson.reviewReason, 'İstisna yeniden değerlendirildi');
    assert.equal((await review("accepted_exception", "Eski karar", exceptionBody.updatedAt)).status, 409, "stale versions cannot overwrite a newer decision");
    const generalFindings = [
      { code: "MISSING_POSITION_CODE", severity: "high", message: "Poz kodu eksik.", ruleVersion: "pilot-integrity-v1", suggestion: "Poz girin" },
      { code: "MISSING_PRICE_SOURCE", severity: "medium", message: "Fiyat eksik.", ruleVersion: "pilot-cost-v1", suggestion: "Fiyat girin" },
    ];
    const ifcReview = (correction: Record<string, string>, status = "approved", notes?: string) => request(`/api/smartcheck/rows/${rows[0].id}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, correction, notes }) });
    await db.update(schema.normalizedQuantityRows).set({ findingsJson: generalFindings, reviewStatus: "pending_review", rawPositionCode: "", rawPrice: "", quantitySource: "ifc_property", formulaJson: { quantitySourcePath: "#1/AllplanAttributes/Hacim" } }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const correctedIfc = await ifcReview({ positionCode: "M-001", price: "12500" });
    assert.equal(correctedIfc.status, 200, "IFC rows may resolve general position and price findings");
    assert.deepEqual((await correctedIfc.json() as { findingsJson: unknown[] }).findingsJson, []);
    await db.update(schema.normalizedQuantityRows).set({ findingsJson: [...generalFindings, sourceFinding], reviewStatus: "pending_review", rawPositionCode: "", rawPrice: "" }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const blockedIfc = await ifcReview({ positionCode: "M-001", price: "12500" });
    assert.equal(blockedIfc.status, 409, "IFC-specific source finding remains blocking after field correction");
    assert.deepEqual((await blockedIfc.json() as { findings: unknown[] }).findings, [sourceFinding]);
    const sourceException = await ifcReview({ positionCode: "M-001", price: "12500" }, "accepted_exception", "Kaynak kontrolü gerekli");
    assert.equal(sourceException.status, 200);
    assert.deepEqual((await sourceException.json() as { findingsJson: unknown[] }).findingsJson, [sourceFinding]);
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`update ${schema.normalizedQuantityRows} set findings_json = '{}'::jsonb, review_status = 'pending_review' where id = ${rows[0].id}`);
    const malformedReview = await review("approved");
    assert.equal(malformedReview.status, 409);
    assert.equal((await malformedReview.json() as { code: string }).code, "REVIEW_FINDINGS_INVALID");
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) })).status, 409);
    for (const sourcePath of ["#1/#2:IfcShapeRepresentation/GeometryVolume", "#1/#2:IfcShapeRepresentation/GeometryArea", "#1/#2:IfcShapeRepresentation/CurveLengthArea", ""]) {
      await db.update(schema.normalizedQuantityRows).set({ findingsJson: [], reviewStatus: "pending_review", quantitySource: "ifc_property", formulaJson: { quantitySourcePath: sourcePath } }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
      assert.equal((await review("approved")).status, 409, "legacy IFC geometry or missing source must not be approved as property evidence");
      assert.equal((await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) })).status, 409);
    }
    await db.update(schema.normalizedQuantityRows).set({ reviewStatus: "approved" }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }) })).status, 409);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: client.id, projectName: "Legacy IFC", rowIds: [rows[0].id] }) })).status, 409);
    await db.update(schema.normalizedQuantityRows).set({ quantitySource: "document", formulaJson: {} }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    await db.update(schema.normalizedQuantityRows).set({ findingsJson: [], reviewStatus: "pending_review", reviewerUserId: null, reviewedAt: null, reviewerNotes: null }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const runtimeUrl = new URL(process.env.DATABASE_URL!);
    const ownerUrl = new URL(process.env.TEST_ISOLATION_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL!);
    const isolatedOptions = runtimeUrl.searchParams.get('options');
    assert.ok(isolatedOptions?.includes('teklifpro_test_'), 'owner test trigger must target the isolated schema');
    ownerUrl.searchParams.set('options', isolatedOptions);
    const { Client: PgClient } = await import("pg");
    const ownerDb = new PgClient({ connectionString: ownerUrl.toString() });
    await ownerDb.connect();
    try {
      await ownerDb.query("CREATE FUNCTION review_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$");
      await ownerDb.query("CREATE TRIGGER review_test_fail_audit BEFORE INSERT ON smartcheck_audit_logs FOR EACH ROW EXECUTE FUNCTION review_test_fail_audit()");
      assert.equal((await review("approved")).status, 500);
      assert.equal((await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) })).status, 500);
      const [unchanged] = await db.select().from(schema.normalizedQuantityRows).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
      assert.equal(unchanged.reviewStatus, "pending_review", "audit failure must roll back review");
    } finally {
      await ownerDb.query("DROP TRIGGER IF EXISTS review_test_fail_audit ON smartcheck_audit_logs");
      await ownerDb.query("DROP FUNCTION IF EXISTS review_test_fail_audit()");
      await ownerDb.end();
    }
    const concurrent = await Promise.all([review("approved"), review("rejected", "Yeniden incelenecek")]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409], "only one concurrent review may commit");
    await db.update(schema.normalizedQuantityRows).set({ findingsJson: [], reviewStatus: "pending_review", reviewerUserId: null, reviewedAt: null, reviewerNotes: null }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const bulkReview = await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id], notes: 'Toplu kaynak kontrolü yapıldı.' }) });
    assert.equal(bulkReview.status, 200);
    assert.equal((await bulkReview.json() as { approvedCount: number; rows: Array<{ reviewStatus: string }> }).approvedCount, 1);
    const bulkEvents = await db.select().from(schema.smartcheckAuditLogs).where(and(eq(schema.smartcheckAuditLogs.companyId, companyA.id), eq(schema.smartcheckAuditLogs.entityId, documentId), eq(schema.smartcheckAuditLogs.action, 'rows_bulk_approved')));
    assert.equal(bulkEvents.at(-1)?.metadataJson.reviewReason, 'Toplu kaynak kontrolü yapıldı.');
    await db.update(schema.normalizedQuantityRows).set({ reviewStatus: "accepted_exception", reviewerNotes: null }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }) })).status, 409, "legacy exception without justification cannot transfer");
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: client.id, projectName: "Unjustified exception", rowIds: [rows[0].id] }) })).status, 409);
    await db.update(schema.normalizedQuantityRows).set({ reviewStatus: "approved" }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    await db.update(schema.normalizedQuantityRows).set({ normalizedPrice: null }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const missingPrice = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }) });
    assert.equal(missingPrice.status, 409, "missing price must not become zero");
    const missingNewPrice = await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: client.id, projectName: "Missing price", rowIds: [rows[0].id] }) });
    assert.equal(missingNewPrice.status, 409, "new quotation must not treat missing price as zero");
    const zeroBody = { clientId: client.id, projectName: "Explicit zero", rowIds: [rows[0].id], overrides: { [rows[0].id]: { unitPrice: 0 } } };
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(zeroBody) })).status, 409, "zero override requires justification");
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id], overrides: { [rows[0].id]: { unitPrice: 0 } } }) })).status, 409);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...zeroBody, overrides: { [rows[0].id]: { unitPrice: 0, zeroPriceReason: "   " } } }) })).status, 409);
    const [zeroTarget] = await db.insert(schema.quotations).values({ companyId: companyA.id, clientId: client.id, quoteNumber: `ZERO-${suffix}`, projectName: "Explicit zero existing", expiryDate: new Date(Date.now() + 86400000), subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0" }).returning();
    const explicitExisting = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: zeroTarget.id, rowIds: [rows[0].id], overrides: { [rows[0].id]: { unitPrice: 0, zeroPriceReason: "İdareye bedelsiz" } } }) });
    assert.equal(explicitExisting.status, 200);
    const [existingItem] = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, zeroTarget.id));
    const [existingEvidence] = await db.select().from(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.quotationItemId, existingItem.id), eq(schema.quotationItemEvidence.evidenceType, "price")));
    assert.equal(existingEvidence.capturedValueJson.source, "manual_zero_override");
    assert.equal(existingEvidence.capturedValueJson.zeroPriceReason, "İdareye bedelsiz");
    const { quotationPdfSubject } = await import('./quotations');
    const subjectReq = { params: { id: zeroTarget.id }, user: { companyId: companyA.id, userId: userA.id } } as any;
    const beforeSubject = await quotationPdfSubject(subjectReq);
    const [beforeReplay] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, zeroTarget.id));
    const beforeTransferAudits = await db.select().from(schema.smartcheckAuditLogs).where(and(eq(schema.smartcheckAuditLogs.entityId, zeroTarget.id), eq(schema.smartcheckAuditLogs.action, 'rows_transferred')));
    const sameReplay = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: zeroTarget.id, rowIds: [rows[0].id], overrides: { [rows[0].id]: { unitPrice: 0, zeroPriceReason: "İdareye bedelsiz" } } }) });
    assert.equal(sameReplay.status, 200);
    const [afterReplay] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, zeroTarget.id));
    assert.equal(afterReplay.updatedAt.toISOString(), beforeReplay.updatedAt.toISOString(), 'no-op must not change quote version');
    assert.deepEqual(await quotationPdfSubject(subjectReq), beforeSubject, 'no-op must preserve PDF quota subject');
    assert.equal((await db.select().from(schema.smartcheckAuditLogs).where(and(eq(schema.smartcheckAuditLogs.entityId, zeroTarget.id), eq(schema.smartcheckAuditLogs.action, 'rows_transferred')))).length, beforeTransferAudits.length);
    assert.equal((await db.select().from(schema.quotationItemEvidence).where(eq(schema.quotationItemEvidence.quotationItemId, existingItem.id))).length, 2);
    const changedReplay = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: zeroTarget.id, rowIds: [rows[0].id], overrides: { [rows[0].id]: { unitPrice: 0, zeroPriceReason: "Farklı gerekçe" } } }) });
    assert.equal(changedReplay.status, 409);
    const [unchangedEvidence] = await db.select().from(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.quotationItemId, existingItem.id), eq(schema.quotationItemEvidence.evidenceType, "price")));
    assert.equal(unchangedEvidence.capturedValueJson.zeroPriceReason, "İdareye bedelsiz");
    for (const changedOverride of [{ unitPrice: 100 }, { unitPrice: 0, zeroPriceReason: "İdareye bedelsiz", quantity: 7 }, { unitPrice: 0, zeroPriceReason: "İdareye bedelsiz", costUnitPrice: 12 }, { unitPrice: 0, zeroPriceReason: "İdareye bedelsiz", wastePercent: 7 }, { unitPrice: 0, zeroPriceReason: "İdareye bedelsiz", vatPercent: 10 }, { priceSnapshotId: crypto.randomUUID() }]) {
      const response = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: zeroTarget.id, rowIds: [rows[0].id], overrides: { [rows[0].id]: changedOverride } }) });
      assert.equal(response.status, 409, `replay override must not be silently ignored: ${JSON.stringify(changedOverride)}`);
    }
    await db.delete(schema.quotationItemEvidence).where(eq(schema.quotationItemEvidence.quotationItemId, existingItem.id));
    const replay = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: zeroTarget.id, rowIds: [rows[0].id], overrides: { [rows[0].id]: { unitPrice: 0, zeroPriceReason: "Sonradan değiştirilmiş gerekçe" } } }) });
    assert.equal(replay.status, 409);
    assert.equal((await db.select().from(schema.quotationItemEvidence).where(eq(schema.quotationItemEvidence.quotationItemId, existingItem.id))).length, 0, "replay cannot invent historical evidence for an existing item");
    assert.equal((await db.select().from(schema.smartcheckAuditLogs).where(and(eq(schema.smartcheckAuditLogs.entityId, existingItem.id), eq(schema.smartcheckAuditLogs.action, "manual_zero_price_transferred")))).length, 1, "replay cannot invent a new audit event");
    const explicitZero = await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...zeroBody, overrides: { [rows[0].id]: { unitPrice: 0, zeroPriceReason: "Sözleşme kapsamında bedelsiz" } } }) });
    assert.equal(explicitZero.status, 201, "explicit zero is distinct from a missing price");
    const zeroQuote = await explicitZero.json() as { quotationId: string };
    const [zeroItem] = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, zeroQuote.quotationId));
    assert.equal(zeroItem.priceSource, "manual");
    const [zeroEvidence] = await db.select().from(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.quotationItemId, zeroItem.id), eq(schema.quotationItemEvidence.evidenceType, "price")));
    assert.equal(zeroEvidence.capturedValueJson.source, "manual_zero_override");
    assert.equal(zeroEvidence.capturedValueJson.zeroPriceReason, "Sözleşme kapsamında bedelsiz");
    assert.equal(zeroEvidence.createdByUserId, userA.id);
    const [zeroAudit] = await db.select().from(schema.smartcheckAuditLogs).where(and(eq(schema.smartcheckAuditLogs.entityId, zeroItem.id), eq(schema.smartcheckAuditLogs.action, "manual_zero_price_transferred")));
    assert.equal(zeroAudit?.metadataJson.reason, "Sözleşme kapsamında bedelsiz");
    const { assertPdfPriceSourcesCertain } = await import('../../services/pdf/price-guard');
    assert.doesNotThrow(() => assertPdfPriceSourcesCertain([zeroItem], [], [{ itemId: zeroItem.id, source: zeroEvidence.capturedValueJson.source, price: zeroEvidence.capturedValueJson.price, zeroPriceReason: zeroEvidence.capturedValueJson.zeroPriceReason, createdByUserId: zeroEvidence.createdByUserId }]));
    await db.update(schema.normalizedQuantityRows).set({ normalizedPrice: "12500" }).where(eq(schema.normalizedQuantityRows.id, rows[0].id));
    const importResponse = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceType: "manual_override", sourceName: "SmartCheck manual price", authority: "Estimator", sourceDocumentIdentifier: `smartcheck-${suffix}`, licenseStatus: "not_applicable", rows: [{ description: "VRF dış ünite", unit: "adet", amount: 777, currency: "TRY", positionCode: "M-001", confidence: 0.55 }] }) });
    assert.equal(importResponse.status, 201);
    const imported = await importResponse.json() as { source: { id: string; authorizationStatus: string }; snapshots: Array<{ id: string; createdByUserId: string }> };
    priceSourceId = imported.source.id;
    snapshotId = imported.snapshots[0].id;
    assert.equal(imported.source.authorizationStatus, "authorized");
    assert.equal(imported.snapshots[0].createdByUserId, userA.id);
    const selfReview = await request(`/api/pricing/snapshots/${snapshotId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Kendi manuel fiyatımı onaylıyorum." }) });
    assert.equal(selfReview.status, 409);
    assert.equal((await selfReview.json() as { code: string }).code, "MANUAL_TWO_PERSON_REVIEW_REQUIRED");
    const independentReview = await request(`/api/pricing/snapshots/${snapshotId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Belge, birim ve fiyat farklı kullanıcı tarafından doğrulandı." }) }, reviewerTokenA);
    assert.equal(independentReview.status, 200);
    const transfer = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }) });
    assert.equal(transfer.status, 200);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }), }, tokenB)).status, 404);
    const generated = await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientName: "SmartCheck Generated Client", projectName: "Generated SmartCheck Quote", rowIds: [rows[0].id], overrides: { [rows[0].id]: { priceSnapshotId: snapshotId } } }) });
    assert.equal(generated.status, 201);
    const generatedBody = await generated.json() as { quotationId: string; clientId: string; transferredCount: number };
    generatedQuoteId = generatedBody.quotationId;
    generatedClientId = generatedBody.clientId;
    assert.equal(generatedBody.transferredCount, 1);
    const [generatedQuote] = await db.select().from(schema.quotations).where(and(eq(schema.quotations.id, generatedQuoteId), eq(schema.quotations.companyId, companyA.id)));
    assert.equal(generatedQuote.projectName, "Generated SmartCheck Quote");
    const generatedItems = await db.select().from(schema.quotationItems).where(and(eq(schema.quotationItems.quotationId, generatedQuoteId), eq(schema.quotationItems.companyId, companyA.id)));
    assert.equal(generatedItems.length, 1);
    assert.equal(generatedItems[0].sourceQuantityRowId, rows[0].id);
    assert.equal(generatedItems[0].priceSnapshotId, snapshotId);
    assert.equal(generatedItems[0].priceSnapshotStatus, "attached");
    assert.equal(Number(generatedItems[0].unitPrice), 777);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientName: "Tenant B Client", projectName: "Tenant B Quote", rowIds: [rows[0].id] }) }, tokenB)).status, 404);
  }
});

test("SmartCheck IFC HTTP upload queues worker and persists evidence rows", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  const [{ createApiApp }, schema, dbModule, { AuthService }, processor] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"), import("../../smartcheck/import/processor"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `IFC Integration A ${suffix}`, smartcheckMaxWastePercent: "20" }).returning(),
    db.insert(schema.companies).values({ name: `IFC Integration B ${suffix}`, smartcheckMaxWastePercent: "20" }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `ifc-a-${suffix}@example.test`, fullName: "IFC Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `ifc-b-${suffix}@example.test`, fullName: "IFC Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const ifc = Buffer.from([
    "ISO-10303-21;",
    "HEADER;",
    "FILE_SCHEMA(('IFC4X3_ADD2'));",
    "ENDSEC;",
    "DATA;",
    "#5= IFCOWNERHISTORY($,$,$,.ADDED.,$,$,$,0);",
    "#10= IFCBUILDINGSTOREY('0STOREY00000000000000',#5,'B01',$,$,$,$,$,.ELEMENT.,-1.9);",
    "#20= IFCSLAB('0SLAB000000000000000',#5,'Döşeme Test',$,$,$,$,$,$);",
    "#30= IFCPROPERTYSINGLEVALUE('Hacim',$,IFCVOLUMEMEASURE(7.5),$);",
    "#31= IFCPROPERTYSET('0PSET000000000000000',#5,'AllplanAttributes',$,(#30));",
    "#32= IFCRELDEFINESBYPROPERTIES('0RELPROP000000000000',#5,$,$,(#20),#31);",
    "#40= IFCRELCONTAINEDINSPATIALSTRUCTURE('0RELSPATIAL000000000',#5,$,$,(#20),#10);",
    "ENDSEC;",
    "END-ISO-10303-21;",
  ].join("\n"));
  const checksum = crypto.createHash("sha256").update(ifc).digest("hex");
  let documentId = "";
  let runId = "";
  {
    const create = await request("/api/smartcheck/documents/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: "model.ifc", mimeType: "model/ifc", fileSizeBytes: ifc.length }) });
    assert.equal(create.status, 201);
    const target = await create.json() as { documentId: string; uploadUrl: string; maxFileSizeBytes: number };
    documentId = target.documentId;
    assert.equal(target.maxFileSizeBytes >= ifc.length, true);
    assert.equal((await request(target.uploadUrl, { method: "PUT", headers: { "content-type": "model/ifc" }, body: ifc })).status, 204);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checksumSha256: checksum }) })).status, 200);
    const preview = await request(`/api/smartcheck/documents/${documentId}/preview`);
    assert.equal(preview.status, 409);
    assert.equal((await preview.json() as { code: string }).code, "IFC_PREVIEW_USES_PROCESSING_ARTIFACT");
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/preview`, {}, tokenB)).status, 404);
    const queued = await request(`/api/smartcheck/documents/${documentId}/process`, { method: "POST" });
    assert.equal(queued.status, 202);
    runId = (await queued.json() as { id: string }).id;
    const { runOnce, Logger } = await import('graphile-worker');
    const { ifcWorkerTaskList } = await import('../../smartcheck/import/ifc-worker');
    await runOnce({
      connectionString: process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL,
      schema: process.env.GRAPHILE_WORKER_SCHEMA,
      concurrency: 1,
      noHandleSignals: true,
      logger: new Logger(() => () => {}),
      taskList: ifcWorkerTaskList,
    });
    const [storedRun] = await db.select().from(schema.documentProcessingRuns).where(eq(schema.documentProcessingRuns.id, runId));
    assert.notEqual(storedRun?.status, 'failed', 'real IFC worker failed');
    assert.equal(storedRun?.status, 'succeeded', 'real Graphile IFC worker must consume the committed upload job');

    const rowsResponse = await request(`/api/smartcheck/documents/${documentId}/rows`);
    assert.equal(rowsResponse.status, 200);
    const rows = await rowsResponse.json() as Array<{ id: string; quantitySource: string; priceSource: string; reviewStatus: string; normalizedQuantity: string; normalizedUnit: string; findingsJson: Array<{ code: string }> }>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].quantitySource, "ifc_property");
    assert.equal(rows[0].priceSource, "manual_required");
    assert.equal(rows[0].reviewStatus, "pending_review");
    assert.equal(Number(rows[0].normalizedQuantity), 7.5);
    assert.equal(rows[0].normalizedUnit, "m³");
    assert.deepEqual(rows[0].findingsJson.map((finding) => finding.code), ["MISSING_POSITION_CODE", "MISSING_PRICE_SOURCE"]);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/rows`, {}, tokenB)).status, 404);
    const blockedBulkReview = await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) });
    assert.equal(blockedBulkReview.status, 409);
    assert.equal((await blockedBulkReview.json() as { code: string }).code, "BULK_REVIEW_FINDINGS_PRESENT");
    const [artifact] = await db.select().from(schema.documentProcessingArtifacts).where(and(eq(schema.documentProcessingArtifacts.processingRunId, runId), eq(schema.documentProcessingArtifacts.companyId, companyA.id), eq(schema.documentProcessingArtifacts.artifactType, "ifc_evidence")));
    assert.equal(Boolean(artifact), true);
    assert.equal((artifact.metadataJson as { summary?: { evidenceRowCount?: number; blockedElementCount?: number } }).summary?.evidenceRowCount, 1);
    assert.equal((artifact.metadataJson as { summary?: { blockedElementCount?: number } }).summary?.blockedElementCount, 0);
    const rules = (artifact.metadataJson as { ruleEvaluations?: { threeByThree: { activeStandard: string; rulePackVersion: string }; epys: { score: number } } }).ruleEvaluations;
    assert.equal(rules?.threeByThree.activeStandard, "TBDY_TS500", "3x3 runs server-side with the company standard");
    assert.equal(rules?.threeByThree.rulePackVersion, "smartcheck-3x3-2026-10-v2");
    assert.equal(typeof rules?.epys.score, "number", "e-PYS runs server-side");
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/epys-preflight`)).status, 404, "legacy engine stores no RG 33331 pre-check");
    await db.insert(schema.documentProcessingArtifacts).values({ companyId: companyA.id, documentId, processingRunId: runId, artifactType: "epys_preflight", storageKey: `${companyA.id}/${documentId}/${runId}/epys-preflight.json`, checksumSha256: "a".repeat(64), contentType: "application/json", sizeBytes: 1, metadataJson: { kind: "epys_preflight", summary: { hata: 1, uyari: 0, bilgi: 0, elle: 3 }, ek9: [{ no: 1, karar: "Elle" }] } });
    const preflight = await request(`/api/smartcheck/documents/${documentId}/epys-preflight`);
    assert.equal(preflight.status, 200);
    assert.equal((await preflight.json() as { summary: { hata: number } }).summary.hata, 1);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/epys-preflight`, {}, tokenB)).status, 404, "other tenants cannot read the pre-check");
  }
});
