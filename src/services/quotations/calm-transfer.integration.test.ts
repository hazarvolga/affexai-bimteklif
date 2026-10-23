import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "../../server/routes/test-db-reachability";
import { useTestIsolation } from "../../server/routes/test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("Calm transfer is tenant-safe, transactional, replayable and creates exactly one immutable successor", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t, "Calm transfer integration test")) return;
  const [{ db }, schema, drizzle, service] = await Promise.all([
    import("../../db"), import("../../db/schema"), import("drizzle-orm"), import("./calm-transfer"),
  ]);
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await db.insert(schema.companies).values([{ name: `Calm A ${suffix}` }, { name: `Calm B ${suffix}` }]).returning();
  const [actor, reviewer, authorizer, otherActor] = await db.insert(schema.users).values([
    { email: `calm-actor-${suffix}@example.test`, fullName: "Calm Actor", emailVerified: new Date() },
    { email: `calm-reviewer-${suffix}@example.test`, fullName: "Calm Reviewer", emailVerified: new Date() },
    { email: `calm-authorizer-${suffix}@example.test`, fullName: "Calm Authorizer", emailVerified: new Date() },
    { email: `calm-other-${suffix}@example.test`, fullName: "Other Actor", emailVerified: new Date() },
  ]).returning();
  await db.insert(schema.memberships).values([
    { companyId: companyA.id, userId: actor.id, role: "owner" },
    { companyId: companyA.id, userId: reviewer.id, role: "viewer" },
    { companyId: companyA.id, userId: authorizer.id, role: "admin" },
    { companyId: companyB.id, userId: otherActor.id, role: "owner" },
  ]);
  const [client] = await db.insert(schema.clients).values({ companyId: companyA.id, name: "Calm Client", type: "company" }).returning();
  const quote = async (name: string) => (await db.insert(schema.quotations).values({
    companyId: companyA.id,
    clientId: client.id,
    quoteNumber: `CALM-${name}-${suffix}`,
    projectName: name,
    expiryDate: new Date("2027-01-01T00:00:00Z"),
    subtotal: "0",
    discountTotal: "0",
    vatTotal: "0",
    grandTotal: "0",
  }).returning())[0];
  const root = await quote("root");
  const rollbackRoot = await quote("rollback");
  const raceRoot = await quote("race");
  const vatRoot = await quote("vat");
  const [baselineItem] = await db.insert(schema.quotationItems).values({
    companyId: companyA.id,
    quotationId: root.id,
    description: "Mevcut teklif kalemi",
    unit: "adet",
    quantity: "1",
    unitPrice: "10",
    total: "12",
    vatPercent: "20",
  }).returning();
  await db.insert(schema.quotationItemEvidence).values({
    companyId: companyA.id,
    quotationId: root.id,
    quotationItemId: baselineItem.id,
    evidenceType: "source",
    evidenceKey: `baseline-${suffix}`,
    capturedValueJson: { origin: "integration-fixture", amount: "10.00" },
    status: "current",
    createdByUserId: actor.id,
  });
  const [document] = await db.insert(schema.documents).values({
    companyId: companyA.id,
    uploadedByUserId: actor.id,
    originalFileName: "calm.ifc",
    displayName: "Calm IFC",
    mimeType: "application/x-step",
    fileSizeBytes: 1024,
    storageKey: `${companyA.id}/calm.ifc`,
    checksumSha256: "a".repeat(64),
  }).returning();
  const [run] = await db.insert(schema.documentProcessingRuns).values({
    companyId: companyA.id,
    documentId: document.id,
    status: "succeeded",
    currentStage: "completed",
    idempotencyKey: `calm-${suffix}`,
    pipelineVersion: 5,
    provider: "ifcopenshell",
    model: "0.8.5",
    progressPercent: 100,
    completedAt: new Date("2026-10-23T10:00:00Z"),
  }).returning();
  await db.insert(schema.documentProcessingArtifacts).values({
    companyId: companyA.id,
    documentId: document.id,
    processingRunId: run.id,
    artifactType: "ifc_evidence",
    storageKey: `${companyA.id}/${run.id}/ifc-evidence.json`,
    checksumSha256: "b".repeat(64),
    schemaVersion: 1,
    contentType: "application/json",
    sizeBytes: 128,
  });
  const rows = await db.insert(schema.normalizedQuantityRows).values([1, 2].map((number) => ({
    companyId: companyA.id,
    documentId: document.id,
    processingRunId: run.id,
    sheetName: "IFC",
    sourceRowNumber: number,
    sourceCellRange: `IfcWall#${number}`,
    normalizedDescription: "C30/37 Betonarme",
    normalizedPositionCode: "15.150.1006",
    normalizedUnit: "m³",
    normalizedQuantity: number === 1 ? "1.2500" : "2.1000",
    rawDescription: "IfcSlab · Beton_C30",
    rawPositionCode: "15.150.1006",
    rawUnit: "m3",
    rawQuantity: number === 1 ? "1.2500" : "2.1000",
    formulaJson: { materialLayers: JSON.stringify(["Beton_C30"]) },
    quantitySource: "ifc_qto",
    reviewStatus: "approved",
    reviewerUserId: reviewer.id,
    reviewedAt: new Date("2026-10-23T11:00:00Z"),
  }))).returning();
  const [olderRun] = await db.insert(schema.documentProcessingRuns).values({
    companyId: companyA.id, documentId: document.id, status: "succeeded", currentStage: "completed",
    idempotencyKey: `calm-older-${suffix}`, pipelineVersion: 4, provider: "ifcopenshell", model: "0.8.4",
    progressPercent: 100, completedAt: new Date("2026-10-23T09:00:00Z"),
  }).returning();
  await db.insert(schema.documentProcessingArtifacts).values({
    companyId: companyA.id, documentId: document.id, processingRunId: olderRun.id, artifactType: "ifc_evidence",
    storageKey: `${companyA.id}/${olderRun.id}/ifc-evidence.json`, checksumSha256: "f".repeat(64), schemaVersion: 1,
    contentType: "application/json", sizeBytes: 128,
  });
  await db.insert(schema.normalizedQuantityRows).values({
    companyId: companyA.id, documentId: document.id, processingRunId: olderRun.id, sheetName: "IFC", sourceRowNumber: 1,
    sourceCellRange: "IfcSlab#old", rawDescription: "IfcSlab · Beton_C30", rawPositionCode: "15.150.1006", rawUnit: "m3", rawQuantity: "99",
    normalizedDescription: "C30/37 Betonarme", normalizedPositionCode: "15.150.1006", normalizedUnit: "m³", normalizedQuantity: "99",
    formulaJson: { materialLayers: JSON.stringify(["Beton_C30"]) }, quantitySource: "ifc_qto", reviewStatus: "approved",
    reviewerUserId: reviewer.id, reviewedAt: new Date("2026-10-23T09:30:00Z"),
  });
  const [source] = await db.insert(schema.priceSources).values({
    companyId: companyA.id,
    sourceType: "supplier_quote",
    name: "Authorized Supplier",
    sourceDocumentHash: "c".repeat(64),
    licenseStatus: "verified",
    authorizationStatus: "authorized",
    authorizationScope: JSON.stringify({ version: 1, capabilities: ["commercial_quotation"], tenantScope: "own" }),
    authorizationEvidenceHash: "d".repeat(64),
    authorizedAt: new Date("2026-10-23T09:00:00Z"),
    authorizedByUserId: authorizer.id,
    createdByUserId: actor.id,
  }).returning();
  const [snapshot] = await db.insert(schema.priceSnapshots).values({
    companyId: companyA.id,
    priceSourceId: source.id,
    snapshotKey: `calm-snapshot-${suffix}`,
    positionCode: "15.150.1006",
    description: "C30/37 Betonarme",
    unit: "m³",
    amount: "2500",
    currency: "TRY",
    vatStatus: "excluded",
    vatPercent: "20",
    validFrom: new Date("2026-10-01T00:00:00Z"),
    validUntil: new Date("2026-12-31T23:59:59Z"),
    sourceDocumentHash: "e".repeat(64),
    reviewStatus: "approved",
    reviewedByUserId: reviewer.id,
    reviewedAt: new Date("2026-10-23T09:30:00Z"),
    createdByUserId: actor.id,
  }).returning();
  const calmLines = service.projectApprovedRowsToCalmQuotationLines(rows, {});
  const input = (quotationId: string) => ({
    sourceDocumentId: document.id,
    targetQuotationId: quotationId,
    priceSnapshotIdsByCalmLineId: Object.fromEntries(calmLines.map((line) => [line.lineId, snapshot.id])),
  });
  const at = new Date("2026-10-23T12:00:00Z");

  const concurrentReplay = await Promise.all([
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "same-request", input(root.id), at),
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "same-request", input(root.id), at),
  ]);
  assert.deepEqual(concurrentReplay.map((result) => result.replayed).sort(), [false, true]);
  assert.equal(new Set(concurrentReplay.map((result) => result.quotation.id)).size, 1);
  const successorId = concurrentReplay[0].quotation.id;
  const series = await db.select().from(schema.quotations).where(drizzle.or(drizzle.eq(schema.quotations.id, root.id), drizzle.eq(schema.quotations.parentId, root.id)));
  assert.deepEqual(series.map((quotation) => quotation.revisionVersion).sort(), [1, 2]);
  assert.equal(series.filter((quotation) => quotation.isLatest).length, 1);
  const [storedLedger] = await db.select().from(schema.quotationTransferLedgers).where(drizzle.eq(schema.quotationTransferLedgers.targetQuotationId, successorId));
  assert.ok(storedLedger);
  const storedScope = storedLedger.scopeSnapshotJson as Record<string, unknown>;
  assert.ok(storedScope.quotationBaselineHash, "ledger must preserve the canonical quotation baseline snapshot hash");
  assert.ok(Array.isArray(storedScope.pricing), "ledger must preserve the canonical price/source scope snapshot");
  const storedBaseline = storedScope.quotationBaseline as { quotation: Record<string, unknown>; items: Record<string, unknown>[]; evidence: Record<string, unknown>[] };
  assert.equal(storedBaseline.quotation.id, root.id);
  assert.ok(storedBaseline.items.length > 0, "stored baseline must include source quotation items");
  assert.ok(storedBaseline.evidence.length > 0, "stored baseline must include source quotation evidence");
  assert.equal(
    service.buildQuotationBaselineHash(storedBaseline.quotation, storedBaseline.items, storedBaseline.evidence),
    storedScope.quotationBaselineHash,
    "stored canonical baseline must reproduce the ledger scope hash input",
  );
  const transferred = await db.select().from(schema.quotationItems).where(drizzle.and(drizzle.eq(schema.quotationItems.quotationId, successorId), drizzle.eq(schema.quotationItems.sourceRuleVersion, "calm-icmal.v1")));
  assert.equal(transferred.length, 1);
  assert.equal(transferred[0].quantity, "3.3500");
  assert.equal((await db.select().from(schema.quotationTransferSourceRows).where(drizzle.eq(schema.quotationTransferSourceRows.targetQuotationItemId, transferred[0].id))).length, 2);

  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "same-source-new-key", input(successorId), at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_SOURCE_ROWS_ALREADY_TRANSFERRED",
  );

  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "same-request", { ...input(root.id), priceSnapshotIdsByCalmLineId: { [calmLines[0].lineId]: crypto.randomUUID() } }, at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_IDEMPOTENCY_CONFLICT",
  );
  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyB.id, userId: otherActor.id }, "cross-tenant", input(root.id), at),
    (error: unknown) => error instanceof service.CalmTransferError && error.status === 404,
  );
  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: reviewer.id }, "viewer-cannot-transfer", input(root.id), at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_ACTOR_NOT_AUTHORIZED" && error.status === 403,
  );

  await db.update(schema.priceSources).set({ licenseStatus: "restricted" }).where(drizzle.eq(schema.priceSources.id, source.id));
  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "restricted-vendor", input(rollbackRoot.id), at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_PRICE_SNAPSHOT_INVALID",
  );
  await db.update(schema.priceSources).set({ licenseStatus: "verified" }).where(drizzle.eq(schema.priceSources.id, source.id));

  for (const [vatStatus, vatPercent, idempotencyKey] of [
    ["included", "20.00", "vat-included"],
    ["unknown", "20.00", "vat-unknown"],
    ["excluded", null, "vat-null"],
  ] as const) {
    await db.update(schema.priceSnapshots).set({ vatStatus, vatPercent }).where(drizzle.eq(schema.priceSnapshots.id, snapshot.id));
    await assert.rejects(
      service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, idempotencyKey, input(vatRoot.id), at),
      (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_VAT_INVALID",
    );
  }
  await db.update(schema.priceSnapshots).set({ vatStatus: "excluded", vatPercent: "20.00" }).where(drizzle.eq(schema.priceSnapshots.id, snapshot.id));
  const explicitVatResult = await service.transferCalmRowsToQuotationRevision(
    { companyId: companyA.id, userId: actor.id }, "vat-excluded-explicit", input(vatRoot.id), at,
  );
  assert.equal(explicitVatResult.quotation.subtotal, "8375.00");
  assert.equal(explicitVatResult.quotation.vatTotal, "1675.00");
  assert.equal(explicitVatResult.quotation.grandTotal, "10050.00");

  await db.update(schema.priceSnapshots).set({ vatPercent: "100.01" }).where(drizzle.eq(schema.priceSnapshots.id, snapshot.id));
  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "invalid-vat", input(rollbackRoot.id), at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_VAT_INVALID",
  );
  await db.update(schema.priceSnapshots).set({ vatPercent: "20.00" }).where(drizzle.eq(schema.priceSnapshots.id, snapshot.id));

  const beforeRollback = await db.select().from(schema.quotations).where(drizzle.or(drizzle.eq(schema.quotations.id, rollbackRoot.id), drizzle.eq(schema.quotations.parentId, rollbackRoot.id)));
  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "rollback", { ...input(rollbackRoot.id), priceSnapshotIdsByCalmLineId: Object.fromEntries(calmLines.map((line) => [line.lineId, crypto.randomUUID()])) }, at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_PRICE_SNAPSHOT_INVALID",
  );
  const afterRollback = await db.select().from(schema.quotations).where(drizzle.or(drizzle.eq(schema.quotations.id, rollbackRoot.id), drizzle.eq(schema.quotations.parentId, rollbackRoot.id)));
  assert.deepEqual(afterRollback.map(({ id, isLatest, revisionVersion }) => ({ id, isLatest, revisionVersion })), beforeRollback.map(({ id, isLatest, revisionVersion }) => ({ id, isLatest, revisionVersion })));
  assert.equal((await db.select().from(schema.quotationTransferLedgers).where(drizzle.eq(schema.quotationTransferLedgers.idempotencyKey, "rollback"))).length, 0);

  const races = await Promise.allSettled([
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "race-a", input(raceRoot.id), at),
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "race-b", input(raceRoot.id), at),
  ]);
  assert.equal(races.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(races.filter((result) => result.status === "rejected" && result.reason instanceof service.CalmTransferError && result.reason.code === "CALM_TRANSFER_QUOTATION_CHANGED").length, 1);

  const [secondDocument] = await db.insert(schema.documents).values({
    companyId: companyA.id, uploadedByUserId: actor.id, originalFileName: "calm-second.ifc", displayName: "Calm IFC 2",
    mimeType: "application/x-step", fileSizeBytes: 512, storageKey: `${companyA.id}/calm-second.ifc`, checksumSha256: "1".repeat(64),
  }).returning();
  const [secondRun] = await db.insert(schema.documentProcessingRuns).values({
    companyId: companyA.id, documentId: secondDocument.id, status: "succeeded", currentStage: "completed",
    idempotencyKey: `calm-second-${suffix}`, pipelineVersion: 5, provider: "ifcopenshell", model: "0.8.5",
    progressPercent: 100, completedAt: new Date("2026-10-23T12:10:00Z"),
  }).returning();
  await db.insert(schema.documentProcessingArtifacts).values({
    companyId: companyA.id, documentId: secondDocument.id, processingRunId: secondRun.id, artifactType: "ifc_evidence",
    storageKey: `${companyA.id}/${secondRun.id}/ifc-evidence.json`, checksumSha256: "2".repeat(64), schemaVersion: 1,
    contentType: "application/json", sizeBytes: 96,
  });
  const [secondRow] = await db.insert(schema.normalizedQuantityRows).values({
    companyId: companyA.id, documentId: secondDocument.id, processingRunId: secondRun.id, sheetName: "IFC", sourceRowNumber: 1,
    sourceCellRange: "IfcSlab#second", rawDescription: "IfcSlab · Beton_C30", rawPositionCode: "15.150.1006", rawUnit: "m3", rawQuantity: "1.0000",
    normalizedDescription: "C30/37 Betonarme", normalizedPositionCode: "15.150.1006", normalizedUnit: "m³", normalizedQuantity: "1.0000",
    formulaJson: { materialLayers: JSON.stringify(["Beton_C30"]) }, quantitySource: "ifc_qto", reviewStatus: "approved",
    reviewerUserId: reviewer.id, reviewedAt: new Date("2026-10-23T12:15:00Z"),
  }).returning();
  const secondLines = service.projectApprovedRowsToCalmQuotationLines([secondRow], {});
  const secondResult = await service.transferCalmRowsToQuotationRevision(
    { companyId: companyA.id, userId: actor.id },
    "second-distinct-document",
    { sourceDocumentId: secondDocument.id, targetQuotationId: successorId, priceSnapshotIdsByCalmLineId: Object.fromEntries(secondLines.map((line) => [line.lineId, snapshot.id])) },
    new Date("2026-10-23T12:20:00Z"),
  );
  assert.equal(secondResult.quotation.revisionVersion, 3);
  const latestCalmItems = await db.select().from(schema.quotationItems).where(drizzle.and(
    drizzle.eq(schema.quotationItems.quotationId, secondResult.quotation.id),
    drizzle.eq(schema.quotationItems.sourceRuleVersion, "calm-icmal.v1"),
  ));
  assert.equal(latestCalmItems.length, 2);
  const latestEvidence = await db.select().from(schema.quotationItemEvidence).where(drizzle.and(
    drizzle.eq(schema.quotationItemEvidence.quotationId, secondResult.quotation.id),
    drizzle.eq(schema.quotationItemEvidence.evidenceType, "quantity"),
  ));
  const carriedEvidence = latestEvidence.find((record) => {
    const captured = record.capturedValueJson as { transferLedgerId?: string; sourceRows?: Array<{ rowId?: string }> };
    return captured.transferLedgerId === storedLedger.id && captured.sourceRows?.some((row) => rows.some((sourceRow) => sourceRow.id === row.rowId));
  });
  assert.ok(carriedEvidence, "second transfer must carry the first aggregate Calm quantity evidence");
  const carriedItem = latestCalmItems.find((item) => item.id === carriedEvidence.quotationItemId);
  assert.equal(carriedItem?.verificationStatus, "verified");
  const originalJunctionRows = await db.select().from(schema.quotationTransferSourceRows).where(drizzle.eq(schema.quotationTransferSourceRows.transferLedgerId, storedLedger.id));
  assert.deepEqual(new Set(originalJunctionRows.map((row) => row.sourceQuantityRowId)), new Set(rows.map((row) => row.id)));

  await db.update(schema.memberships).set({ role: "viewer" }).where(drizzle.and(
    drizzle.eq(schema.memberships.companyId, companyA.id),
    drizzle.eq(schema.memberships.userId, actor.id),
  ));
  await assert.rejects(
    service.transferCalmRowsToQuotationRevision({ companyId: companyA.id, userId: actor.id }, "same-request", input(root.id), at),
    (error: unknown) => error instanceof service.CalmTransferError && error.code === "CALM_TRANSFER_ACTOR_NOT_AUTHORIZED" && error.status === 403,
    "idempotent replay must re-check current tenant authorization",
  );
});
