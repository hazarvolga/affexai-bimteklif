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
  const [item] = await db.insert(schema.quotationItems).values({ companyId: companyA.id, quotationId: quote.id, description: "VRF dış ünite", unit: "adet", quantity: "2", unitPrice: "525", total: "1050", sourceReference: "M-001" }).returning();
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokenA) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const sourcePayload = { sourceType: "company_actual", sourceName: "Pilot tenant actual snapshot", authority: "Tenant accounting", sourceDocumentIdentifier: `actual-${suffix}`, licenseStatus: "not_applicable", ownershipDeclaration: { kind: "tenant_company_actual", version: 1, accepted: true }, jurisdiction: "TR", region: "İstanbul", validUntil: "2026-12-31T23:59:59.000Z", rows: [{ description: "VRF dış ünite", unit: "adet", amount: 525, currency: "TRY", positionCode: "M-001", confidence: 0.92 }] };
  let sourceId = "";
  let snapshotId = "";
  try {
    const sourceResponse = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sourcePayload) });
    assert.equal(sourceResponse.status, 201);
    const imported = await sourceResponse.json() as { source: { id: string; sourceDocumentHash: string }; snapshots: Array<{ id: string }> };
    const source = imported.source;
    sourceId = source.id;
    snapshotId = imported.snapshots[0].id;
    assert.match(source.sourceDocumentHash, /^[a-f0-9]{64}$/);
    assert.equal((await request("/api/pricing/sources")).status, 200);
    const snapshotResponse = await request(`/api/pricing/snapshots?positionCode=M-001`);
    assert.equal(snapshotResponse.status, 200);
    const snapshots = await snapshotResponse.json() as Array<{ id: string; stale: boolean }>;
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].stale, false);
    assert.equal(snapshots[0].id, snapshotId);
    assert.equal((await request(`/api/pricing/snapshots?positionCode=M-001`, {}, tokenB)).status, 200);
    assert.equal((await request(`/api/pricing/sources/${sourceId}/snapshots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "cross tenant", unit: "adet", amount: 1, sourceDocumentHash: source.sourceDocumentHash }) }, tokenB)).status, 404);
    const preview = await request(`/api/quotations/${quote.id}/pricing-snapshot`);
    assert.equal(preview.status, 200);
    assert.equal((await preview.json() as { warnings: unknown[] }).warnings.length, 1);
    const unverifiedReview = await request(`/api/pricing/snapshots/${snapshotId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Kaynak incelemesi eksik." }) });
    assert.equal(unverifiedReview.status, 409);
    await db.update(schema.priceSources).set({ reviewStatus: "verified", reviewEvidenceReference: "https://example.org/test-permission", reviewScope: "Ticari teklifler", reviewAllowsQuotations: true, reviewedByUserId: userA.id, reviewedAt: new Date() }).where(eq(schema.priceSources.id, sourceId));
    const review = await request(`/api/pricing/snapshots/${snapshotId}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Tedarikçi belgesi ve birim teyit edildi." }) });
    assert.equal(review.status, 200);
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
    assert.equal((evidence[0].capturedValueJson.permissionReview as {status?:string}).status,"verified");
    assert.equal(JSON.stringify(evidence[0].capturedValueJson).includes("https://example.org/test-permission"),false);
    await db.update(schema.priceSources).set({ reviewScope:"Yeni ticari kapsam", reviewedAt:new Date(Date.now()+1000) }).where(eq(schema.priceSources.id,sourceId));
    const relock = await request(`/api/quotations/${quote.id}/pricing-snapshot/lock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ quotationItemId: item.id, priceSnapshotId: snapshotId }] }) });
    assert.equal(relock.status,200);
    assert.notEqual((await relock.json() as {lockHash:string}).lockHash,lockBody.lockHash);
    const refreshed = await db.select().from(schema.quotationItemEvidence).where(and(eq(schema.quotationItemEvidence.quotationItemId, item.id), eq(schema.quotationItemEvidence.companyId, companyA.id), eq(schema.quotationItemEvidence.status,"current")));
    assert.equal((refreshed[0].capturedValueJson.permissionReview as {scope:string}).scope,"Yeni ticari kapsam");
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
      sourceType: "company_actual",
      sourceDocumentIdentifier: `catalog-${suffix}.csv`,
      licenseStatus: "not_applicable",
      ownershipDeclaration: { kind: "tenant_company_actual", version: 1, accepted: true },
      vatPercent: "20.25",
      region: "İstanbul",
      validUntil: "2026-12-31",
      rows: [
        { positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "adet", amount: "12.500,50", currency: "TRY", externalReference: "L1", confidence: 0.7 },
        { positionCode: "M-CSV-002", description: "Bakır boru", unit: "m", amount: 245, currency: "TRY", externalReference: "L2" },
      ],
    };
    const missingDeclarationResponse = await request("/api/pricing/catalog/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...importPayload, ownershipDeclaration: undefined }),
    });
    assert.equal(missingDeclarationResponse.status, 400);
    assert.equal((await missingDeclarationResponse.json() as { code?: string }).code, "TENANT_PRICE_OWNERSHIP_CONFIRMATION_REQUIRED");
    for (const invalidVatPercent of ["NaN", -1, 100.01, "20.001"]) {
      const invalidVatResponse = await request("/api/pricing/catalog/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...importPayload, vatPercent: invalidVatPercent }),
      });
      assert.equal(invalidVatResponse.status, 400);
      assert.equal((await invalidVatResponse.json() as { code?: string }).code, "CATALOG_VAT_PERCENT_INVALID");
    }
    const importResponse = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(importPayload) });
    assert.equal(importResponse.status, 201);
    const importBody = await importResponse.json() as { source: { id: string; sourceDocumentHash: string; metadataJson: { ownershipDeclaration?: { acceptedByUserId?: string; acceptedAt?: string } } }; insertedCount: number; reusedCount: number; snapshots: Array<{ id: string; reviewStatus: string; positionCode: string; amount: string; vatPercent: string | null; stale: boolean }> };
    importedSourceIds.push(importBody.source.id);
    importedSnapshotIds.push(...importBody.snapshots.map((snapshot) => snapshot.id));
    assert.equal(importBody.insertedCount, 2);
    assert.equal(importBody.reusedCount, 0);
    assert.match(importBody.source.sourceDocumentHash, /^[a-f0-9]{64}$/);
    assert.equal(importBody.source.metadataJson.ownershipDeclaration?.acceptedByUserId, userA.id);
    assert.ok(importBody.source.metadataJson.ownershipDeclaration?.acceptedAt);
    assert.deepEqual(importBody.snapshots.map((snapshot) => snapshot.reviewStatus), ["advisory", "advisory"]);
    assert.equal(Number(importBody.snapshots[0].amount), 12500.5);
    assert.equal(importBody.snapshots[0].vatPercent, "20.25");
    assert.equal(importBody.snapshots[0].stale, false);
    const beforePermission = await request(`/api/pricing/snapshots/${importBody.snapshots[0].id}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Kaynak incelemesi eksik." }) });
    assert.equal(beforePermission.status, 409);
    await db.update(schema.priceSources).set({ reviewStatus: "verified", reviewEvidenceReference: "https://example.org/test-permission", reviewScope: "Ticari teklifler", reviewAllowsQuotations: true, reviewedByUserId: userA.id, reviewedAt: new Date() }).where(eq(schema.priceSources.id, importBody.source.id));
    for (const snapshot of importBody.snapshots) {
      const reviewResponse = await request(`/api/pricing/snapshots/${snapshot.id}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved", notes: "Tenant tarafından sağlanan katalog satırı incelendi." }) });
      assert.equal(reviewResponse.status, 200);
    }
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
    assert.equal(fuzzySuggestion.decision, "review_required");
    const unitWarningSuggestion = suggestionBody.suggestions.find((suggestion) => suggestion.rowId === "unit-warning-row")!;
    assert.equal(unitWarningSuggestion.decision, "review_required");
    assert.equal(unitWarningSuggestion.bestSuggestion?.matchType, "position_only_unit_mismatch");
    assert.ok(unitWarningSuggestion.bestSuggestion?.warnings.includes("UNIT_MISMATCH"));
    const csbModeResponse = await request("/api/pricing/snapshot-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "CSB_2026_REFERENCE", rows: [{ rowId: "csb-mode-row", positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "adet" }] }) });
    assert.equal(csbModeResponse.status, 200);
    const csbModeBody = await csbModeResponse.json() as { mode: string; suggestions: Array<{ decision: string; bestSuggestion: unknown | null }> };
    assert.equal(csbModeBody.mode, "CSB_2026_REFERENCE");
    assert.equal(csbModeBody.suggestions[0].decision, "no_match");
    assert.equal(csbModeBody.suggestions[0].bestSuggestion, null);
    const tenantBSuggestionResponse = await request("/api/pricing/snapshot-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [{ rowId: "tenant-b-row", positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "adet" }] }) }, tokenB);
    assert.equal(tenantBSuggestionResponse.status, 200);
    const tenantBSuggestionBody = await tenantBSuggestionResponse.json() as { suggestions: Array<{ decision: string; bestSuggestion: unknown | null }> };
    assert.equal(tenantBSuggestionBody.suggestions[0].decision, "no_match");
    assert.equal(tenantBSuggestionBody.suggestions[0].bestSuggestion, null);
    // Faz 1 (M-17.3): the import wizard approves a reviewed, VAT-explicit company catalogue in one step.
    const approvedImportPayload = { ...importPayload, sourceName: "Sihirbaz kataloğu", sourceDocumentIdentifier: `wizard-${suffix}.xlsx`, vatStatus: "excluded", vatPercent: "20", reviewDecision: "approved", rows: [
      { positionCode: "M-WIZ-001", description: "Sihirbaz beton", unit: "m3", amount: 3450, currency: "TRY" },
    ] };
    for (const [label, payload] of [
      ["vat unknown", { ...approvedImportPayload, vatStatus: undefined }],
      ["vat percent missing", { ...approvedImportPayload, vatPercent: undefined }],
      ["supplier quote", { ...approvedImportPayload, sourceType: "supplier_quote", licenseStatus: "verified" }],
      ["manual override", { ...approvedImportPayload, sourceType: "manual_override", ownershipDeclaration: undefined }],
      ["unknown decision", { ...approvedImportPayload, reviewDecision: "rejected" }],
    ] as const) {
      const refused = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      assert.equal(refused.status, 400, label);
      assert.equal((await refused.json() as { code?: string }).code, "CATALOG_IMPORT_APPROVAL_SCOPE_INVALID", label);
    }
    const approvedImport = await request("/api/pricing/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(approvedImportPayload) });
    assert.equal(approvedImport.status, 201);
    const approvedBody = await approvedImport.json() as { source: { id: string }; snapshots: Array<{ id: string; reviewStatus: string; reviewedByUserId: string | null; reviewedAt: string | null; vatStatus: string; vatPercent: string | null }> };
    importedSourceIds.push(approvedBody.source.id);
    importedSnapshotIds.push(...approvedBody.snapshots.map((snapshot) => snapshot.id));
    assert.deepEqual(approvedBody.snapshots.map(({ reviewStatus, reviewedByUserId, vatStatus, vatPercent }) => ({ reviewStatus, reviewedByUserId, vatStatus, vatPercent })), [
      { reviewStatus: "approved", reviewedByUserId: userA.id, vatStatus: "excluded", vatPercent: "20.00" },
    ]);
    assert.ok(approvedBody.snapshots[0].reviewedAt);
    const wizardSuggestion = await request("/api/pricing/snapshot-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [{ rowId: "wizard-row", positionCode: "M-WIZ-001", description: "Sihirbaz beton", unit: "m³" }] }) });
    const wizardSuggestionBody = await wizardSuggestion.json() as { suggestions: Array<{ decision: string; bestSuggestion: null | { snapshot: { id: string } } }> };
    assert.equal(wizardSuggestionBody.suggestions[0].decision, "no_match", "price-row approval alone must not grant source permission");
    await db.update(schema.priceSources).set({ reviewStatus: "verified", reviewEvidenceReference: "https://example.org/test-permission", reviewScope: "Ticari teklifler", reviewAllowsQuotations: true, reviewedByUserId: userA.id, reviewedAt: new Date() }).where(eq(schema.priceSources.id, approvedBody.source.id));
    const reviewedWizardSuggestion = await request("/api/pricing/snapshot-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [{ rowId: "wizard-row", positionCode: "M-WIZ-001", description: "Sihirbaz beton", unit: "m³" }] }) });
    const reviewedWizardBody = await reviewedWizardSuggestion.json() as { suggestions: Array<{ decision: string; bestSuggestion: null | { snapshot: { id: string } } }> };
    assert.equal(reviewedWizardBody.suggestions[0].decision, "safe_candidate");
    assert.equal(reviewedWizardBody.suggestions[0].bestSuggestion?.snapshot.id, approvedBody.snapshots[0].id);

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
