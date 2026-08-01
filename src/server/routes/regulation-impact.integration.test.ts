import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";

dotenv.config({ path: ".env.local" });
dotenv.config();

test("regulation impact query is tenant-scoped and respects effective date", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Regulation Impact A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Regulation Impact B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `impact-a-${suffix}@example.test`, fullName: "Impact Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `impact-b-${suffix}@example.test`, fullName: "Impact Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const [client] = await db.insert(schema.clients).values({ companyId: companyA.id, name: "Impact Client", type: "company" }).returning();
  const [quote] = await db.insert(schema.quotations).values({ companyId: companyA.id, clientId: client.id, quoteNumber: `IMPACT-${suffix.slice(0, 8)}`, projectName: "MEP Impact Pilot", expiryDate: new Date("2026-09-01"), subtotal: "100", discountTotal: "0", vatTotal: "20", grandTotal: "120" }).returning();
  const [item] = await db.insert(schema.quotationItems).values({ companyId: companyA.id, quotationId: quote.id, description: "Montaj işçilik", unit: "saat", quantity: "2", unitPrice: "50", costCategory: "labor", total: "100" }).returning();
  const [adapter] = await db.insert(schema.sourceIntelligenceAdapters).values({ companyId: companyA.id, adapterKey: "resmi_gazete", sourceKind: "regulation", displayName: "Resmî Gazete", authority: "Türkiye Cumhuriyeti Resmî Gazete", sourceUrl: "https://www.resmigazete.gov.tr", allowedHost: "www.resmigazete.gov.tr", createdByUserId: userA.id }).returning();
  const [run] = await db.insert(schema.sourceIngestionRuns).values({ companyId: companyA.id, adapterId: adapter.id, runKey: `impact-${suffix}`, sourceDocumentIdentifier: `RG-${suffix}`, sourceUrl: adapter.sourceUrl, status: "approved", sourceHash: "a".repeat(64), parserVersion: "test", requestedByUserId: userA.id }).returning();
  const [reviewItem] = await db.insert(schema.sourceReviewItems).values({ companyId: companyA.id, ingestionRunId: run.id, itemType: "regulation_diff", title: "Impact test", rationale: "test", proposedPayloadJson: {}, status: "approved", reviewedByUserId: userA.id, reviewedAt: new Date() }).returning();
  const [version] = await db.insert(schema.regulationVersions).values({ companyId: companyA.id, sourceReviewItemId: reviewItem.id, ingestionRunId: run.id, versionKey: `version-${suffix}`, title: "SGK advisory değişikliği", summary: "İşçilik maliyetleri için advisory inceleme.", category: "labor", impactLevel: "medium", authority: adapter.authority, sourceUrl: adapter.sourceUrl, sourceDocumentIdentifier: run.sourceDocumentIdentifier, sourceDocumentHash: run.sourceHash!, sourceText: "Test kaynağı", effectiveFrom: new Date("2026-08-01"), governanceStatus: "advisory", reviewedByUserId: userA.id, reviewedAt: new Date() }).returning();
  const server = http.createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, token = tokenA) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  try {
    const versions = await request("/api/regulations/versions");
    assert.equal(versions.status, 200);
    assert.equal((await versions.json() as Array<{ id: string }>).some((entry) => entry.id === version.id), true);
    const impact = await request(`/api/regulations/versions/${version.id}/affected-quotations?asOf=2026-07-23T00:00:00.000Z`);
    assert.equal(impact.status, 200);
    const impactBody = await impact.json() as { count: number; affectedQuotations: Array<{ quotation: { id: string }; itemIds: string[]; effectiveStatus: string }> };
    assert.equal(impactBody.count, 1);
    assert.equal(impactBody.affectedQuotations[0].quotation.id, quote.id);
    assert.deepEqual(impactBody.affectedQuotations[0].itemIds, [item.id]);
    assert.equal(impactBody.affectedQuotations[0].effectiveStatus, "upcoming");
    assert.equal((await request("/api/regulations/versions", tokenB)).status, 200);
    assert.deepEqual(await (await request("/api/regulations/versions", tokenB)).json(), []);
    assert.equal((await request(`/api/regulations/versions/${version.id}/affected-quotations`, tokenB)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.regulationVersions).where(eq(schema.regulationVersions.companyId, companyA.id));
    await db.delete(schema.sourceReviewItems).where(eq(schema.sourceReviewItems.companyId, companyA.id));
    await db.delete(schema.sourceIngestionRuns).where(eq(schema.sourceIngestionRuns.companyId, companyA.id));
    await db.delete(schema.sourceIntelligenceAdapters).where(eq(schema.sourceIntelligenceAdapters.companyId, companyA.id));
    await db.delete(schema.quotationItems).where(eq(schema.quotationItems.companyId, companyA.id));
    await db.delete(schema.quotations).where(eq(schema.quotations.companyId, companyA.id));
    await db.delete(schema.clients).where(eq(schema.clients.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});
