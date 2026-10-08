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

test("pricing snapshot evidence flow is tenant-isolated and lockable", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Pricing Integration A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Pricing Integration B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `pricing-a-${suffix}@example.test`, fullName: "Pricing Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `pricing-b-${suffix}@example.test`, fullName: "Pricing Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const [client] = await db.insert(schema.clients).values({ companyId: companyA.id, name: "Pricing Integration Client", type: "company" }).returning();
  const [quote] = await db.insert(schema.quotations).values({ companyId: companyA.id, clientId: client.id, quoteNumber: `PRICE-${suffix}`, projectName: "MEP Pricing Pilot", expiryDate: new Date(Date.now() + 86400000), subtotal: "1000", discountTotal: "0", vatTotal: "200", grandTotal: "1200" }).returning();
  const [item] = await db.insert(schema.quotationItems).values({ companyId: companyA.id, quotationId: quote.id, description: "VRF dış ünite", unit: "adet", quantity: "2", unitPrice: "500", total: "1000" }).returning();
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const sourcePayload = { sourceType: "supplier_quote", name: "Pilot supplier snapshot", authority: "Pilot supplier", sourceDocumentIdentifier: `supplier-${suffix}`, sourceDocumentPayload: { version: "2026-07-23", supplier: "Pilot supplier", lines: 1 }, licenseStatus: "verified", jurisdiction: "TR", region: "İstanbul" };
  let sourceId = "";
  let snapshotId = "";
  try {
    const sourceResponse = await request("/api/pricing/sources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sourcePayload) });
    assert.equal(sourceResponse.status, 201);
    const source = await sourceResponse.json() as { id: string; sourceDocumentHash: string };
    sourceId = source.id;
    assert.match(source.sourceDocumentHash, /^[a-f0-9]{64}$/);
    assert.equal((await request("/api/pricing/sources")).status, 200);
    assert.equal((await request(`/api/pricing/sources/${sourceId}/snapshots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "VRF dış ünite", unit: "adet", amount: 525, currency: "TRY", positionCode: "M-001", sourceDocumentHash: source.sourceDocumentHash, validUntil: "2026-12-31T23:59:59.000Z", confidence: 0.92 }) })).status, 201);
    const snapshotResponse = await request(`/api/pricing/snapshots?positionCode=M-001`);
    assert.equal(snapshotResponse.status, 200);
    const snapshots = await snapshotResponse.json() as Array<{ id: string; stale: boolean }>;
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].stale, false);
    snapshotId = snapshots[0].id;
    assert.equal((await request(`/api/pricing/snapshots?positionCode=M-001`, {}, tokenB)).status, 200);
    assert.equal((await request(`/api/pricing/sources/${sourceId}/snapshots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "cross tenant", unit: "adet", amount: 1, sourceDocumentHash: source.sourceDocumentHash }) }, tokenB)).status, 404);
    const preview = await request(`/api/quotations/${quote.id}/pricing-snapshot`);
    assert.equal(preview.status, 200);
    assert.equal((await preview.json() as { warnings: unknown[] }).warnings.length, 1);
    const lock = await request(`/api/quotations/${quote.id}/pricing-snapshot/lock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ quotationItemId: item.id, priceSnapshotId: snapshotId }] }) });
    assert.equal(lock.status, 200);
    const lockBody = await lock.json() as { lockStatus: string; lockHash: string };
    assert.equal(lockBody.lockStatus, "locked");
    assert.match(lockBody.lockHash, /^[a-f0-9]{64}$/);
    const afterLock = await request(`/api/quotations/${quote.id}/pricing-snapshot`);
    const afterLockBody = await afterLock.json() as { quote: { pricingSnapshotLockStatus: string }; items: Array<{ stale: boolean; snapshot: { id: string } | null }> };
    assert.equal(afterLockBody.quote.pricingSnapshotLockStatus, "locked");
    assert.equal(afterLockBody.items[0].snapshot?.id, snapshotId);
    assert.equal(afterLockBody.items[0].stale, false);
    assert.equal((await request(`/api/quotations/${quote.id}/pricing-snapshot`, {}, tokenB)).status, 404);
    const evidence = await db.select().from(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.quotationItemId, item.id), eq(schema.quotationItemEvidence.companyId, companyA.id)));
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].priceSnapshotId, snapshotId);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.quotationItemId, item.id), eq(schema.quotationItemEvidence.companyId, companyA.id)));
    await db.delete(schema.quotationItems).where(and(eq(schema.quotationItems.quotationId, quote.id), eq(schema.quotationItems.companyId, companyA.id)));
    await db.delete(schema.quotations).where(and(eq(schema.quotations.id, quote.id), eq(schema.quotations.companyId, companyA.id)));
    if (snapshotId) await db.delete(schema.priceSnapshots).where(and(eq(schema.priceSnapshots.id, snapshotId), eq(schema.priceSnapshots.companyId, companyA.id)));
    if (sourceId) await db.delete(schema.priceSources).where(and(eq(schema.priceSources.id, sourceId), eq(schema.priceSources.companyId, companyA.id)));
    await db.delete(schema.clients).where(and(eq(schema.clients.id, client.id), eq(schema.clients.companyId, companyA.id)));
    await db.delete(schema.smartcheckAuditLogs).where(eq(schema.smartcheckAuditLogs.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});

test("pricing catalog import creates advisory snapshots without cross-tenant leakage", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Catalog Import A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Catalog Import B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `catalog-a-${suffix}@example.test`, fullName: "Catalog Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `catalog-b-${suffix}@example.test`, fullName: "Catalog Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const importedSourceIds: string[] = [];
  const importedSnapshotIds: string[] = [];
  try {
    const importPayload = {
      sourceName: "Pilot CSV katalog",
      sourceType: "supplier_quote",
      sourceDocumentIdentifier: `catalog-${suffix}.csv`,
      licenseStatus: "not_applicable",
      region: "İstanbul",
      validUntil: "2026-12-31",
      rows: [
        { positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "adet", amount: "12.500,50", currency: "TRY", externalReference: "L1", confidence: 0.7 },
        { positionCode: "M-CSV-002", description: "Bakır boru", unit: "m", amount: 245, currency: "TRY", externalReference: "L2" },
      ],
    };
    const importResponse = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(importPayload) });
    assert.equal(importResponse.status, 201);
    const importBody = await importResponse.json() as { source: { id: string; sourceDocumentHash: string }; insertedCount: number; reusedCount: number; snapshots: Array<{ id: string; reviewStatus: string; positionCode: string; amount: string; stale: boolean }> };
    importedSourceIds.push(importBody.source.id);
    importedSnapshotIds.push(...importBody.snapshots.map((snapshot) => snapshot.id));
    assert.equal(importBody.insertedCount, 2);
    assert.equal(importBody.reusedCount, 0);
    assert.match(importBody.source.sourceDocumentHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(importBody.snapshots.map((snapshot) => snapshot.reviewStatus), ["advisory", "advisory"]);
    assert.equal(Number(importBody.snapshots[0].amount), 12500.5);
    assert.equal(importBody.snapshots[0].stale, false);
    const tenantASnapshots = await request("/api/pricing/snapshots?positionCode=M-CSV-001");
    assert.equal(tenantASnapshots.status, 200);
    assert.equal((await tenantASnapshots.json() as unknown[]).length, 1);
    const tenantBSnapshots = await request("/api/pricing/snapshots?positionCode=M-CSV-001", {}, tokenB);
    assert.equal(tenantBSnapshots.status, 200);
    assert.equal((await tenantBSnapshots.json() as unknown[]).length, 0);
    const suggestionResponse = await request("/api/pricing/snapshot-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [
      { rowId: "exact-row", positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "adet", region: "İstanbul" },
      { rowId: "fuzzy-row", description: "Bakır tesisat borusu", unit: "m" },
      { rowId: "unit-warning-row", positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "m" },
    ] }) });
    assert.equal(suggestionResponse.status, 200);
    const suggestionBody = await suggestionResponse.json() as { suggestions: Array<{ rowId: string; decision: string; bestSuggestion: null | { score: number; matchType: string; warnings: string[]; snapshot: { id: string; positionCode: string | null } } }> };
    const exactSuggestion = suggestionBody.suggestions.find((suggestion) => suggestion.rowId === "exact-row")!;
    assert.equal(exactSuggestion.decision, "safe_candidate");
    assert.equal(exactSuggestion.bestSuggestion?.snapshot.positionCode, "M-CSV-001");
    assert.ok((exactSuggestion.bestSuggestion?.score ?? 0) >= 0.9);
    const fuzzySuggestion = suggestionBody.suggestions.find((suggestion) => suggestion.rowId === "fuzzy-row")!;
    assert.equal(fuzzySuggestion.bestSuggestion?.snapshot.positionCode, "M-CSV-002");
    assert.match(fuzzySuggestion.bestSuggestion?.matchType ?? "", /^description_unit_/);
    const unitWarningSuggestion = suggestionBody.suggestions.find((suggestion) => suggestion.rowId === "unit-warning-row")!;
    assert.equal(unitWarningSuggestion.decision, "review_required");
    assert.equal(unitWarningSuggestion.bestSuggestion?.matchType, "position_only_unit_mismatch");
    assert.ok(unitWarningSuggestion.bestSuggestion?.warnings.includes("UNIT_MISMATCH"));
    const tenantBSuggestionResponse = await request("/api/pricing/snapshot-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [{ rowId: "tenant-b-row", positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "adet" }] }) }, tokenB);
    assert.equal(tenantBSuggestionResponse.status, 200);
    const tenantBSuggestionBody = await tenantBSuggestionResponse.json() as { suggestions: Array<{ decision: string; bestSuggestion: unknown | null }> };
    assert.equal(tenantBSuggestionBody.suggestions[0].decision, "no_match");
    assert.equal(tenantBSuggestionBody.suggestions[0].bestSuggestion, null);
    const invalidImport = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...importPayload, sourceName: "Invalid catalog", sourceType: "official_reference" }) });
    assert.equal(invalidImport.status, 400);
    const invalidDateImport = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...importPayload, sourceName: "Invalid date catalog", validUntil: "+061231-02-19T21:00:00.000Z" }) });
    assert.equal(invalidDateImport.status, 400);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const snapshotId of importedSnapshotIds) await db.delete(schema.priceSnapshots).where(eq(schema.priceSnapshots.id, snapshotId));
    for (const sourceId of importedSourceIds) await db.delete(schema.priceSources).where(eq(schema.priceSources.id, sourceId));
    await db.delete(schema.smartcheckAuditLogs).where(eq(schema.smartcheckAuditLogs.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});
