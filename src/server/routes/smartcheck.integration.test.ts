import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

test("SmartCheck HTTP + PostgreSQL isolated flow and tenant boundary", { timeout: 30_000 }, async (t) => {
  if (!process.env.DATABASE_URL) return t.skip("DATABASE_URL is required for the isolated HTTP integration test");
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
  try {
    const create = await request("/api/smartcheck/documents/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: "mep.csv", mimeType: "text/csv", fileSizeBytes: csv.length }) });
    assert.equal(create.status, 201);
    const target = await create.json() as { documentId: string; uploadUrl: string };
    documentId = target.documentId;
    assert.equal((await request(target.uploadUrl, { method: "PUT", headers: { "content-type": "text/csv" }, body: csv })).status, 204);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checksumSha256: checksum }) })).status, 200);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/mapping`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "Açıklama", unit: "Birim", quantity: "Miktar", positionCode: "Poz No", price: "Birim Fiyat" }) })).status, 200);
    const queued = await request(`/api/smartcheck/documents/${documentId}/process`, { method: "POST" });
    assert.equal(queued.status, 202);
    runId = (await queued.json() as { id: string }).id;
    await processor.processSmartCheckDocument({ companyId: companyA.id, documentId, processingRunId: runId });
    const rowsResponse = await request(`/api/smartcheck/documents/${documentId}/rows`);
    assert.equal(rowsResponse.status, 200);
    const rows = await rowsResponse.json() as Array<{ id: string; findingsJson: unknown[] }>;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].findingsJson.length, 0);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/rows`, {}, tokenB)).status, 404);
    assert.equal((await request(`/api/smartcheck/rows/${rows[0].id}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved" }) })).status, 200);
    const transfer = await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }) });
    assert.equal(transfer.status, 200);
    assert.equal((await request(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quotationId: quote.id, rowIds: [rows[0].id] }), }, tokenB)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (runId) await db.delete(schema.normalizedQuantityRows).where(and(eq(schema.normalizedQuantityRows.processingRunId, runId), eq(schema.normalizedQuantityRows.companyId, companyA.id)));
    if (documentId) {
      await db.delete(schema.documentProcessingArtifacts).where(and(eq(schema.documentProcessingArtifacts.documentId, documentId), eq(schema.documentProcessingArtifacts.companyId, companyA.id)));
      await db.delete(schema.documentProcessingRuns).where(and(eq(schema.documentProcessingRuns.documentId, documentId), eq(schema.documentProcessingRuns.companyId, companyA.id)));
      await db.delete(schema.documents).where(and(eq(schema.documents.id, documentId), eq(schema.documents.companyId, companyA.id)));
    }
    await db.delete(schema.quotationItems).where(and(eq(schema.quotationItems.quotationId, quote.id), eq(schema.quotationItems.companyId, companyA.id)));
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
