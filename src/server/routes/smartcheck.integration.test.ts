import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";

dotenv.config({ path: ".env.local" });
dotenv.config();

test("SmartCheck HTTP + PostgreSQL isolated flow and tenant boundary", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  process.env.SMARTCHECK_LOCAL_STORAGE_DIR = ".data/smartcheck-integration-test";
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
  const [userA] = await db.insert(schema.users).values({ email: `http-a-${suffix}@example.test`, fullName: "HTTP Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `http-b-${suffix}@example.test`, fullName: "HTTP Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const [client] = await db.insert(schema.clients).values({ companyId: companyA.id, name: "Integration Client", type: "company" }).returning();
  const [quote] = await db.insert(schema.quotations).values({ companyId: companyA.id, clientId: client.id, quoteNumber: `HTTP-${suffix}`, projectName: "MEP HTTP Pilot", expiryDate: new Date(Date.now() + 86400000), subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0" }).returning();
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
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
  try {
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
    const bulkReview = await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) });
    assert.equal(bulkReview.status, 200);
    assert.equal((await bulkReview.json() as { approvedCount: number; rows: Array<{ reviewStatus: string }> }).approvedCount, 1);
    const sourceResponse = await request("/api/pricing/sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceType: "manual_override", name: "SmartCheck manual price", authority: "Estimator", sourceDocumentIdentifier: `smartcheck-${suffix}`, sourceDocumentPayload: { rowId: rows[0].id, amount: 777, currency: "TRY" }, licenseStatus: "not_applicable" }) });
    assert.equal(sourceResponse.status, 201);
    const sourceBody = await sourceResponse.json() as { id: string; sourceDocumentHash: string };
    priceSourceId = sourceBody.id;
    const snapshotResponse = await request(`/api/pricing/sources/${priceSourceId}/snapshots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "VRF dış ünite", unit: "adet", amount: 777, currency: "TRY", positionCode: "M-001", sourceDocumentHash: sourceBody.sourceDocumentHash, confidence: 0.55 }) });
    assert.equal(snapshotResponse.status, 201);
    snapshotId = (await snapshotResponse.json() as { id: string }).id;
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
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.companyId, companyA.id), eq(schema.quotationItemEvidence.quotationId, quote.id)));
    if (generatedQuoteId) await db.delete(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.companyId, companyA.id), eq(schema.quotationItemEvidence.quotationId, generatedQuoteId)));
    if (runId) await db.delete(schema.normalizedQuantityRows).where(and(eq(schema.normalizedQuantityRows.processingRunId, runId), eq(schema.normalizedQuantityRows.companyId, companyA.id)));
    if (documentId) {
      await db.delete(schema.documentProcessingArtifacts).where(and(eq(schema.documentProcessingArtifacts.documentId, documentId), eq(schema.documentProcessingArtifacts.companyId, companyA.id)));
      await db.delete(schema.documentProcessingRuns).where(and(eq(schema.documentProcessingRuns.documentId, documentId), eq(schema.documentProcessingRuns.companyId, companyA.id)));
      await db.delete(schema.documents).where(and(eq(schema.documents.id, documentId), eq(schema.documents.companyId, companyA.id)));
    }
    await db.delete(schema.quotationItems).where(and(eq(schema.quotationItems.quotationId, quote.id), eq(schema.quotationItems.companyId, companyA.id)));
    if (generatedQuoteId) await db.delete(schema.quotationItems).where(and(eq(schema.quotationItems.quotationId, generatedQuoteId), eq(schema.quotationItems.companyId, companyA.id)));
    if (generatedQuoteId) await db.delete(schema.quotations).where(eq(schema.quotations.id, generatedQuoteId));
    if (generatedClientId) await db.delete(schema.clients).where(eq(schema.clients.id, generatedClientId));
    if (snapshotId) await db.delete(schema.priceSnapshots).where(and(eq(schema.priceSnapshots.id, snapshotId), eq(schema.priceSnapshots.companyId, companyA.id)));
    if (priceSourceId) await db.delete(schema.priceSources).where(and(eq(schema.priceSources.id, priceSourceId), eq(schema.priceSources.companyId, companyA.id)));
    await db.delete(schema.quotations).where(eq(schema.quotations.id, quote.id));
    await db.delete(schema.clients).where(eq(schema.clients.id, client.id));
    await db.delete(schema.smartcheckAuditLogs).where(eq(schema.smartcheckAuditLogs.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});

test("SmartCheck IFC HTTP upload queues worker and persists evidence rows", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  process.env.SMARTCHECK_LOCAL_STORAGE_DIR = ".data/smartcheck-ifc-integration-test";
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
  try {
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
    await processor.processSmartCheckDocument({ companyId: companyA.id, documentId, processingRunId: runId });
    const rowsResponse = await request(`/api/smartcheck/documents/${documentId}/rows`);
    assert.equal(rowsResponse.status, 200);
    const rows = await rowsResponse.json() as Array<{ id: string; quantitySource: string; priceSource: string; reviewStatus: string; normalizedQuantity: string; normalizedUnit: string; findingsJson: Array<{ code: string }> }>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].quantitySource, "ifc_property");
    assert.equal(rows[0].priceSource, "manual_required");
    assert.equal(rows[0].reviewStatus, "pending_review");
    assert.equal(Number(rows[0].normalizedQuantity), 7.5);
    assert.equal(rows[0].normalizedUnit, "m³");
    assert.deepEqual(rows[0].findingsJson.map((finding) => finding.code), ["MISSING_PRICE_SOURCE"]);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/rows`, {}, tokenB)).status, 404);
    const blockedBulkReview = await request(`/api/smartcheck/documents/${documentId}/bulk-review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", rowIds: [rows[0].id] }) });
    assert.equal(blockedBulkReview.status, 409);
    assert.equal((await blockedBulkReview.json() as { code: string }).code, "BULK_REVIEW_FINDINGS_PRESENT");
    const [artifact] = await db.select().from(schema.documentProcessingArtifacts).where(and(eq(schema.documentProcessingArtifacts.processingRunId, runId), eq(schema.documentProcessingArtifacts.companyId, companyA.id), eq(schema.documentProcessingArtifacts.artifactType, "ifc_evidence")));
    assert.equal(Boolean(artifact), true);
    assert.equal((artifact.metadataJson as { summary?: { evidenceRowCount?: number; blockedElementCount?: number } }).summary?.evidenceRowCount, 1);
    assert.equal((artifact.metadataJson as { summary?: { blockedElementCount?: number } }).summary?.blockedElementCount, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (runId) await db.delete(schema.normalizedQuantityRows).where(and(eq(schema.normalizedQuantityRows.processingRunId, runId), eq(schema.normalizedQuantityRows.companyId, companyA.id)));
    if (documentId) {
      await db.delete(schema.documentProcessingArtifacts).where(and(eq(schema.documentProcessingArtifacts.documentId, documentId), eq(schema.documentProcessingArtifacts.companyId, companyA.id)));
      await db.delete(schema.documentProcessingRuns).where(and(eq(schema.documentProcessingRuns.documentId, documentId), eq(schema.documentProcessingRuns.companyId, companyA.id)));
      await db.delete(schema.documents).where(and(eq(schema.documents.id, documentId), eq(schema.documents.companyId, companyA.id)));
    }
    await db.delete(schema.smartcheckAuditLogs).where(eq(schema.smartcheckAuditLogs.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});
