import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { buildPriceSnapshotKey } from "../../smartcheck/pricing/snapshots";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";

dotenv.config({ path: ".env.local" });
dotenv.config();

test("supplier quote market intelligence is review-gated, outlier-aware, and tenant-isolated", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Market Intelligence A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Market Intelligence B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `market-a-${suffix}@example.test`, fullName: "Market Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `market-b-${suffix}@example.test`, fullName: "Market Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const [sourceDocument] = await db.insert(schema.documents).values({ companyId: companyA.id, uploadedByUserId: userA.id, originalFileName: `supplier-${suffix}.csv`, displayName: `Supplier ${suffix}`, mimeType: "text/csv", fileSizeBytes: 128, storageKey: `${companyA.id}/${suffix}/original`, checksumSha256: "c".repeat(64), status: "completed" }).returning();
  const [sourceRun] = await db.insert(schema.documentProcessingRuns).values({ companyId: companyA.id, documentId: sourceDocument.id, status: "succeeded", currentStage: "completed", idempotencyKey: `run-${suffix}`, pipelineVersion: 1, progressPercent: 100, progressMessage: "Tamamlandı", completedAt: new Date() }).returning();
  const [sourceRow] = await db.insert(schema.normalizedQuantityRows).values({ companyId: companyA.id, documentId: sourceDocument.id, processingRunId: sourceRun.id, sheetName: "Teklif", sourceRowNumber: 2, sourceCellRange: "A2:F2", rawDescription: "Pompa", rawPositionCode: "M-001", rawUnit: "adet", rawQuantity: "2", rawPrice: "185", normalizedDescription: "Pompa", normalizedPositionCode: "M-001", normalizedUnit: "adet", normalizedQuantity: "2", normalizedPrice: "185", reviewStatus: "approved", reviewerUserId: userA.id, reviewedAt: new Date(), findingsJson: [] }).returning();
  const [pendingSourceRow] = await db.insert(schema.normalizedQuantityRows).values({ companyId: companyA.id, documentId: sourceDocument.id, processingRunId: sourceRun.id, sheetName: "Teklif", sourceRowNumber: 3, sourceCellRange: "A3:F3", rawDescription: "Vana", rawPositionCode: "M-002", rawUnit: "adet", rawQuantity: "1", rawPrice: "45", normalizedDescription: "Vana", normalizedPositionCode: "M-002", normalizedUnit: "adet", normalizedQuantity: "1", normalizedPrice: "45", reviewStatus: "pending_review", findingsJson: [] }).returning();
  const [baselineSource] = await db.insert(schema.priceSources).values({ companyId: companyA.id, sourceType: "company_actual", name: "Firma gerçekleşenleri", authority: "Market test", sourceDocumentIdentifier: `ACTUAL-${suffix}`, sourceDocumentHash: "b".repeat(64), licenseStatus: "not_applicable", createdByUserId: userA.id }).returning();
  const baselineSnapshots = [];
  for (const amount of [100, 101, 99, 102]) {
    const capturedAt = new Date(`2026-07-${String(10 + baselineSnapshots.length).padStart(2, "0")}T00:00:00.000Z`);
    const [snapshot] = await db.insert(schema.priceSnapshots).values({ companyId: companyA.id, priceSourceId: baselineSource.id, snapshotKey: buildPriceSnapshotKey({ sourceDocumentHash: baselineSource.sourceDocumentHash, positionCode: "M-001", description: "Pompa", unit: "adet", amount, currency: "TRY", capturedAt }), positionCode: "M-001", description: "Pompa", unit: "adet", amount: String(amount), currency: "TRY", region: "İstanbul", capturedAt, sourceDocumentHash: baselineSource.sourceDocumentHash, confidence: "0.9", reviewStatus: "approved" }).returning();
    baselineSnapshots.push(snapshot.id);
  }
  const server = http.createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  let submissionId = "";
  let entryId = "";
  try {
    const create = await request("/api/market-intelligence/supplier-quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplierName: "Tedarikçi A", quoteNumber: `SUP-${suffix}`, sourceDocumentIdentifier: `SUP-${suffix}`, sourceDocumentPayload: { supplier: "Tedarikçi A", version: "1" }, region: "İstanbul", deliveryTerms: "DAP", vatStatus: "excluded", freightStatus: "included" }) });
    assert.equal(create.status, 201);
    submissionId = (await create.json() as { id: string }).id;
    const entries = await request(`/api/market-intelligence/supplier-quotes/${submissionId}/entries`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entries: [{ positionCode: "M-001", description: "Pompa", unit: "adet", quantity: 1, unitPrice: 180, region: "İstanbul", sourceRowKey: "row-1" }] }) });
    assert.equal(entries.status, 201);
    const entriesBody = await entries.json() as { insertedCount: number; evaluations: Array<{ outlierStatus: string; baselineCount: number }> ; entries: Array<{ id: string; reviewStatus: string; priceSnapshotId: string | null }> };
    assert.equal(entriesBody.insertedCount, 1);
    assert.equal(entriesBody.evaluations[0].outlierStatus, "outlier");
    assert.equal(entriesBody.evaluations[0].baselineCount, 4);
    entryId = entriesBody.entries[0].id;
    const otherTenant = await request(`/api/market-intelligence/supplier-quotes/${submissionId}`, {}, tokenB);
    assert.equal(otherTenant.status, 404);
    const approve = await request(`/api/market-intelligence/supplier-quote-entries/${entryId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Outlier manuel reviewer kararıyla kabul edildi." }) });
    assert.equal(approve.status, 200);
    const approvedEntry = await approve.json() as { reviewStatus: string; priceSnapshotId: string | null };
    assert.equal(approvedEntry.reviewStatus, "approved");
    assert.ok(approvedEntry.priceSnapshotId);
    const linkedCreate = await request("/api/market-intelligence/supplier-quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplierName: "Kaynaklı Tedarikçi", quoteNumber: `LINKED-${suffix}`, documentId: sourceDocument.id, sourceDocumentIdentifier: sourceDocument.originalFileName, region: "İstanbul", deliveryTerms: "DAP", vatStatus: "excluded", freightStatus: "included" }) });
    assert.equal(linkedCreate.status, 201);
    const linkedSubmissionId = (await linkedCreate.json() as { id: string }).id;
    const blockedImport = await request(`/api/market-intelligence/supplier-quotes/${linkedSubmissionId}/import-smartcheck-rows`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowIds: [pendingSourceRow.id] }) });
    assert.equal(blockedImport.status, 409);
    const importRows = await request(`/api/market-intelligence/supplier-quotes/${linkedSubmissionId}/import-smartcheck-rows`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowIds: [sourceRow.id] }) });
    assert.equal(importRows.status, 201);
    const importBody = await importRows.json() as { insertedCount: number; entries: Array<{ sourceProcessingRunId: string | null; sourceQuantityRowId: string | null; sourceCellRange: string | null; reviewStatus: string }> };
    assert.equal(importBody.insertedCount, 1);
    assert.equal(importBody.entries[0].sourceProcessingRunId, sourceRun.id);
    assert.equal(importBody.entries[0].sourceQuantityRowId, sourceRow.id);
    assert.equal(importBody.entries[0].sourceCellRange, "A2:F2");
    assert.equal(importBody.entries[0].reviewStatus, "pending");
    assert.equal((await request(`/api/market-intelligence/supplier-quotes/${linkedSubmissionId}/import-smartcheck-rows`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowIds: [sourceRow.id] }) })).status, 200);
    assert.equal((await request(`/api/market-intelligence/supplier-quotes/${linkedSubmissionId}/import-smartcheck-rows`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowIds: [sourceRow.id] }) }, tokenB)).status, 404);
    const detail = await request(`/api/market-intelligence/supplier-quotes/${submissionId}`);
    const detailBody = await detail.json() as { status: string; entries: Array<{ outlierStatus: string; priceSnapshotId: string | null }> };
    assert.equal(detailBody.status, "approved");
    assert.equal(detailBody.entries[0].outlierStatus, "outlier");
    assert.ok(detailBody.entries[0].priceSnapshotId);
    const memory = await request("/api/market-intelligence/price-memory?positionCode=M-001&unit=adet&region=%C4%B0stanbul");
    assert.equal(memory.status, 200);
    assert.equal((await memory.json() as { summary: { count: number; median: number } }).summary.count, 5);
    assert.deepEqual(await (await request("/api/market-intelligence/supplier-quotes", {}, tokenB)).json(), []);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.supplierQuoteEntries).where(eq(schema.supplierQuoteEntries.companyId, companyA.id));
    await db.delete(schema.supplierQuoteSubmissions).where(eq(schema.supplierQuoteSubmissions.companyId, companyA.id));
    await db.delete(schema.priceSnapshots).where(eq(schema.priceSnapshots.companyId, companyA.id));
    await db.delete(schema.priceSources).where(eq(schema.priceSources.companyId, companyA.id));
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
  }
});
