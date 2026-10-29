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

test("official source adapter ingest is hash-bound, review-gated, and tenant-isolated", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Source Integration A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Source Integration B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `source-a-${suffix}@example.test`, fullName: "Source Tenant A", emailVerified: new Date() }).returning();
  const [reviewerA] = await db.insert(schema.users).values({ email: `source-reviewer-a-${suffix}@example.test`, fullName: "Source Reviewer A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `source-b-${suffix}@example.test`, fullName: "Source Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyA.id, userId: reviewerA.id, role: "admin" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenReviewerA = AuthService.generateToken({ userId: reviewerA.id, companyId: companyA.id, role: "admin" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  let adapterId = "";
  let regulationAdapterId = "";
  let runId = "";
  let regulationRunId = "";
  let priceSourceId = "";
  let snapshotId = "";
  try {
    const createAdapter = await request("/api/source-intelligence/official-adapters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ adapterKey: "yfk" }) });
    assert.equal(createAdapter.status, 201);
    adapterId = (await createAdapter.json() as { id: string }).id;
    const payload = { sourceDocumentIdentifier: `YFK-${suffix}`, sourceVersion: "2026.07", entries: [{ positionCode: "M-001", description: "VRF dış ünite", unit: "adet", amount: 125000, currency: "TRY", confidence: 0.9, validUntil: "2026-12-31T23:59:59.000Z" }] };
    const ingest = await request(`/api/source-intelligence/official-adapters/${adapterId}/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePayload: payload, sourceDocumentIdentifier: payload.sourceDocumentIdentifier }) });
    assert.equal(ingest.status, 201);
    const ingestBody = await ingest.json() as { run: { id: string; status: string }; reviewItemIds: string[]; snapshotIds: string[]; priceSourceId: string; diff: { added: number } };
    runId = ingestBody.run.id;
    priceSourceId = ingestBody.priceSourceId;
    snapshotId = ingestBody.snapshotIds[0];
    assert.equal(ingestBody.run.status, "awaiting_review");
    assert.equal(ingestBody.diff.added, 1);
    assert.equal(ingestBody.reviewItemIds.length, 1);
    assert.equal((await request(`/api/source-intelligence/official-adapters/${adapterId}/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePayload: payload }) })).status, 200);
    assert.equal((await request(`/api/source-intelligence/official-adapters/${adapterId}/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePayload: payload }) }, tokenB)).status, 404);
    assert.equal((await request("/api/source-intelligence/review-queue")).status, 200);
    const queue = await request("/api/source-intelligence/review-queue");
    const queueItems = await queue.json() as Array<{ id: string; itemType: string; run: { id: string }; adapter: { adapterKey: string } }>;
    assert.equal(queueItems.length, 1);
    assert.equal(queueItems[0].itemType, "price_snapshot");
    const selfReview = await request(`/api/source-intelligence/review-items/${queueItems[0].id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Kendi kendime onay" }) }, tokenA);
    assert.equal(selfReview.status, 409);
    const pendingPermission = await request(`/api/source-intelligence/review-items/${queueItems[0].id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Kaynak izni eksik." }) }, tokenReviewerA);
    assert.equal(pendingPermission.status, 409);
    await db.update(schema.priceSources).set({ reviewStatus: "verified", reviewEvidenceReference: "https://example.org/test-permission", reviewScope: "Ticari teklifler", reviewAllowsQuotations: true, reviewedByUserId: userA.id, reviewedAt: new Date() }).where(eq(schema.priceSources.id, priceSourceId));
    const review = await request(`/api/source-intelligence/review-items/${queueItems[0].id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "YFK resmi kaynak kontrolü tamamlandı." }) }, tokenReviewerA);
    assert.equal(review.status, 200);
    const [approvedSnapshot] = await db.select().from(schema.priceSnapshots).where(and(eq(schema.priceSnapshots.id, snapshotId), eq(schema.priceSnapshots.companyId, companyA.id)));
    assert.equal(approvedSnapshot.reviewStatus, "approved");
    const health = await request("/api/source-intelligence/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json() as Array<{ health: string }>)[0].health, "healthy");
    const createRegulationAdapter = await request("/api/source-intelligence/official-adapters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ adapterKey: "resmi_gazete" }) });
    assert.equal(createRegulationAdapter.status, 201);
    regulationAdapterId = (await createRegulationAdapter.json() as { id: string }).id;
    const regulationPayload = { sourceDocumentIdentifier: `RG-${suffix}`, sourceVersion: "2026-07-23", changes: [{ title: "Örnek tebliğ değişikliği", summary: "KDV uygulamasına ilişkin advisory değişiklik.", category: "tax", impactLevel: "medium", effectiveFrom: "2026-08-01", sourceText: "Resmî kaynak metni; canonical kural değildir." }] };
    const regulationIngest = await request(`/api/source-intelligence/official-adapters/${regulationAdapterId}/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePayload: regulationPayload }) });
    assert.equal(regulationIngest.status, 201);
    regulationRunId = (await regulationIngest.json() as { run: { id: string } }).run.id;
    const regulationQueue = await request("/api/source-intelligence/review-queue");
    const regulationItem = (await regulationQueue.json() as Array<{ id: string; itemType: string }>).find((item) => item.itemType === "regulation_diff");
    assert.ok(regulationItem);
    assert.equal((await request(`/api/source-intelligence/review-items/${regulationItem.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Değişiklik canonical rule üretmeden advisory olarak kabul edildi." }) }, tokenReviewerA)).status, 200);
    const regulationVersions = await db.select().from(schema.regulationVersions).where(and(eq(schema.regulationVersions.companyId, companyA.id), eq(schema.regulationVersions.sourceReviewItemId, regulationItem.id)));
    assert.equal(regulationVersions.length, 1);
    assert.equal(regulationVersions[0].governanceStatus, "advisory");
    const [regulationRun] = await db.select().from(schema.sourceIngestionRuns).where(and(eq(schema.sourceIngestionRuns.id, regulationRunId), eq(schema.sourceIngestionRuns.companyId, companyA.id)));
    assert.equal(regulationRun.status, "approved");
    assert.equal((await request("/api/source-intelligence/review-queue", {}, tokenB)).status, 200);
    assert.equal((await request(`/api/source-intelligence/official-adapters/${adapterId}/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePayload: payload }) }, tokenB)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.regulationVersions).where(eq(schema.regulationVersions.companyId, companyA.id));
    await db.delete(schema.regulationAlerts).where(eq(schema.regulationAlerts.companyId, companyA.id));
    await db.delete(schema.sourceReviewItems).where(eq(schema.sourceReviewItems.companyId, companyA.id));
    await db.delete(schema.sourceIngestionArtifacts).where(eq(schema.sourceIngestionArtifacts.companyId, companyA.id));
    await db.delete(schema.sourceIngestionRuns).where(eq(schema.sourceIngestionRuns.companyId, companyA.id));
    await db.delete(schema.priceSnapshots).where(eq(schema.priceSnapshots.companyId, companyA.id));
    await db.delete(schema.priceSources).where(eq(schema.priceSources.companyId, companyA.id));
    await db.delete(schema.smartcheckAuditLogs).where(eq(schema.smartcheckAuditLogs.companyId, companyA.id));
    await db.delete(schema.sourceIntelligenceAdapters).where(eq(schema.sourceIntelligenceAdapters.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, reviewerA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, reviewerA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});
