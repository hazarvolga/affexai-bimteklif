import assert from "node:assert/strict";
import test from "node:test";
import { assertQuotationItemCalculationSafe, buildCalmTransferRequestHash, buildCalmTransferScopeHash, buildQuotationBaselineHash, buildQuotationBaselineSnapshot, projectApprovedRowsToCalmQuotationLines, snapshotAmountForCalculation, snapshotVatPercent } from "./calm-transfer";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "00000000-0000-4000-8000-000000000001",
  documentId: "00000000-0000-4000-8000-000000000010",
  processingRunId: "00000000-0000-4000-8000-000000000020",
  sourceCellRange: "IfcWall#1",
  rawDescription: "IfcSlab · C30 Betonarme",
  rawPositionCode: "15.150.1006",
  rawUnit: "m3",
  rawQuantity: "1.2500",
  formulaJson: { materialLayers: JSON.stringify(["Beton_C30"]) },
  quantitySource: "ifc_qto",
  normalizedDescription: "C30/37 Betonarme",
  normalizedPositionCode: "15.150.1006",
  normalizedUnit: "m³",
  normalizedQuantity: "1.2500",
  normalizedWastePercent: "0",
  reviewStatus: "approved",
  reviewedAt: new Date("2026-10-23T09:00:00.000Z"),
  reviewerUserId: "00000000-0000-4000-8000-000000000099",
  ...overrides,
});

test("Calm transfer projection aggregates approved source rows with exact fixed precision and keeps row lineage", () => {
  const rows = [
    row(),
    row({ id: "00000000-0000-4000-8000-000000000002", sourceCellRange: "IfcWall#2", normalizedQuantity: "2.1000" }),
  ];

  const projected = projectApprovedRowsToCalmQuotationLines(rows, {});
  const lines = projectApprovedRowsToCalmQuotationLines(rows, {
    [projected[0].lineId]: "00000000-0000-4000-8000-000000000030",
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, "3.3500");
  assert.deepEqual(lines[0].sourceRows.map((source) => source.rowId).sort(), rows.map(({ id }) => id).sort());
  assert.equal(lines[0].sourceRuleVersion, "calm-icmal.v1");
});

test("Calm transfer projection fails closed for non-approved, missing quantity, missing position and missing price selection", () => {
  for (const invalid of [
    row({ reviewStatus: "accepted_exception" }),
    row({ normalizedQuantity: null }),
    row({ normalizedQuantity: "0" }),
    row({ reviewerUserId: null }),
    row({ reviewedAt: null }),
  ]) {
    assert.throws(
      () => projectApprovedRowsToCalmQuotationLines([invalid], {}),
      /CALM_TRANSFER_/,
    );
  }
  const valid = row();
  const canonical = projectApprovedRowsToCalmQuotationLines([valid], {});
  assert.throws(() => projectApprovedRowsToCalmQuotationLines([valid], { unexpected: "00000000-0000-4000-8000-000000000030" }), /CALM_TRANSFER_PRICE_SELECTION_INVALID/);
  assert.throws(() => projectApprovedRowsToCalmQuotationLines([valid], {}, true), /CALM_TRANSFER_PRICE_SELECTION_REQUIRED/);
  assert.ok(canonical[0].lineId);
});

test("server Calm projection preserves layering and minha with canonical line identities", () => {
  const layered = row({
    rawDescription: "IfcCovering · Duvar kaplaması",
    normalizedDescription: "Duvar kaplaması",
    normalizedUnit: "m²",
    normalizedQuantity: "35.4000",
    rawUnit: "m2",
    rawQuantity: "35.4000",
    formulaJson: { materialLayers: JSON.stringify(["Fayans_a", "Sıva_2CM"]), coveringPredefinedType: "CLADDING", grossAreaM2: "40.68", openingAreaM2: "5.28" },
  });
  const lines = projectApprovedRowsToCalmQuotationLines([layered], {});
  assert.deepEqual(lines.map((line) => line.lineId).sort(), ["duvar-fayans", "duvar-ic-siva-2cm"]);
  assert.ok(lines.every((line) => line.quantity === "35.4000" && line.sourceRows[0].rowId === layered.id));
});

test("request hash is canonical, binds actor/tenant/target/source/selections and rejects payload drift", () => {
  const base = {
    companyId: "company-a",
    actorUserId: "actor-a",
    sourceDocumentId: "document-a",
    targetQuotationId: "quote-a",
    priceSnapshotIdsByCalmLineId: { "line-b": "snapshot-b", "line-a": "snapshot-a" },
  };
  assert.equal(buildCalmTransferRequestHash(base), buildCalmTransferRequestHash({
    ...base,
    priceSnapshotIdsByCalmLineId: { "line-a": "snapshot-a", "line-b": "snapshot-b" },
  }));
  assert.notEqual(buildCalmTransferRequestHash(base), buildCalmTransferRequestHash({ ...base, targetQuotationId: "quote-b" }));
  assert.notEqual(buildCalmTransferRequestHash(base), buildCalmTransferRequestHash({ ...base, actorUserId: "actor-b" }));
});

test("quotation baseline hash is canonical and binds items plus evidence", () => {
  const quotation = { id: "q", revisionVersion: 2, currency: "TRY", subtotal: "10.00" };
  const items = [{ id: "b", quantity: "2" }, { id: "a", quantity: "1" }];
  const evidence = [{ id: "e2", evidenceKey: "b" }, { id: "e1", evidenceKey: "a" }];
  const baseline = buildQuotationBaselineHash(quotation, items, evidence);
  assert.equal(baseline, buildQuotationBaselineHash(quotation, [...items].reverse(), [...evidence].reverse()));
  assert.notEqual(baseline, buildQuotationBaselineHash(quotation, [{ ...items[0], quantity: "3" }, items[1]], evidence));
  const snapshot = buildQuotationBaselineSnapshot(quotation, [{ id: "a", createdAt: new Date("2026-10-23T00:00:00.000Z") }], evidence);
  assert.equal((snapshot.items[0] as { createdAt: string }).createdAt, "2026-10-23T00:00:00.000Z");
  assert.equal(buildQuotationBaselineHash(snapshot.quotation, snapshot.items, snapshot.evidence), buildQuotationBaselineHash(quotation, [{ id: "a", createdAt: new Date("2026-10-23T00:00:00.000Z") }], evidence));
  for (const changedField of [
    { clientId: "changed-client" },
    { projectName: "changed-project" },
    { date: "2026-10-24T00:00:00.000Z" },
    { expiryDate: "2027-01-01T00:00:00.000Z" },
    { notes: "changed-notes" },
    { industryId: "changed-industry" },
    { procurementPackageCode: "changed-package" },
    { escalationIndexCode: "changed-index" },
    { informationDeliveryMilestone: "changed-milestone" },
    { calibrationProfileVersion: "changed-calibration" },
  ]) assert.notEqual(baseline, buildQuotationBaselineHash({ ...quotation, ...changedField }, items, evidence));
});

test("source contributions reconcile exactly after Calm presentation rounding", () => {
  const tinyRows = [row({ id: "00000000-0000-4000-8000-000000000101", normalizedQuantity: "0.0050", rawQuantity: "0.0050" }), row({ id: "00000000-0000-4000-8000-000000000102", normalizedQuantity: "0.0050", rawQuantity: "0.0050" })];
  const [line] = projectApprovedRowsToCalmQuotationLines(tinyRows, {});
  assert.equal(line.sourceRows.reduce((sum, source) => sum + BigInt(source.contributedQuantity.replace(".", "")), 0n), BigInt(line.quantity.replace(".", "")));
  assert.throws(() => projectApprovedRowsToCalmQuotationLines([row({ normalizedQuantity: "0.0040", rawQuantity: "0.0040" })], {}), /CALM_TRANSFER_QUANTITY_INVALID/);
  assert.throws(() => projectApprovedRowsToCalmQuotationLines([row({ normalizedQuantity: "9007199254740993.0000", rawQuantity: "9007199254740993.0000" })], {}), /CALM_TRANSFER_QUANTITY_RANGE_UNSUPPORTED/);
});

test("snapshot amount conversion rejects unsafe or sub-cent values without changing cents", () => {
  assert.deepEqual(snapshotAmountForCalculation("123.40"), { amount: "123.40", numeric: 123.4 });
  assert.throws(() => snapshotAmountForCalculation("9007199254740993.00"), /CALM_TRANSFER_PRICE_RANGE_UNSUPPORTED/);
  assert.throws(() => snapshotAmountForCalculation("1.0010"), /CALM_TRANSFER_PRICE_SCALE_UNSUPPORTED/);
});

test("all successor items reject unsafe cloned fixed-point arithmetic", () => {
  assert.doesNotThrow(() => assertQuotationItemCalculationSafe({ quantity: "0.0090", unitPrice: "9007199254.00", discountPercent: "0", vatPercent: "0" }));
  assert.throws(() => assertQuotationItemCalculationSafe({ quantity: "0.0090", unitPrice: "9007199254740993.00", discountPercent: "0", vatPercent: "0" }), /CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED/);
});

test("VAT parsing is decimal-safe and bounded", () => {
  assert.equal(snapshotVatPercent("20.00"), "20.00");
  for (const invalid of [null, "", "NaN", "100.01", "-0.01", "20.001", "Infinity"]) assert.throws(() => snapshotVatPercent(invalid), /CALM_TRANSFER_VAT_INVALID/);
});

test("scope hash binds processing artifact, source review state, pricing authorization and policy version", () => {
  const base = {
    requestPayloadHash: "a".repeat(64),
    document: { id: "document", checksumSha256: "b".repeat(64) },
    run: { id: "run", pipelineVersion: 4, provider: "ifcopenshell", model: "0.8.5", status: "succeeded", currentStage: "completed" },
    artifact: { id: "artifact", checksumSha256: "c".repeat(64), schemaVersion: 1 },
    rows: [{ id: "row", reviewStatus: "approved", reviewedAt: "2026-10-23T00:00:00.000Z", reviewerUserId: "reviewer", quantity: "1.0000" }],
    pricing: [{ snapshotId: "snapshot", snapshotHash: "d".repeat(64), amount: "100.00", vatStatus: "excluded", vatPercent: "20.00", positionCode: "15.150", description: "Beton", unit: "m³", currency: "TRY", reviewStatus: "approved", sourceType: "supplier_quote", licenseStatus: "verified", authorizationStatus: "authorized", reviewedAt: "2026-10-23T00:00:00.000Z", authorizationEvidenceHash: "e".repeat(64), authorizationScope: "quotation", sourceDocumentHash: "f".repeat(64) }],
    policy: { calmRuleVersion: "calm-icmal.v1", requireApprovedRows: true, requireAuthorizedFreshSnapshots: true },
  };
  const initial = buildCalmTransferScopeHash(base);
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, artifact: { ...base.artifact, checksumSha256: "f".repeat(64) } }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, rows: [{ ...base.rows[0], reviewStatus: "rejected" }] }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, policy: { ...base.policy, calmRuleVersion: "calm-icmal.v2" } }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, pricing: [{ ...base.pricing[0], vatPercent: "10.00" }] }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, pricing: [{ ...base.pricing[0], vatStatus: "included" }] }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, pricing: [{ ...base.pricing[0], licenseStatus: "restricted" }] }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, pricing: [{ ...base.pricing[0], amount: "101.00" }] }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, evaluatedAt: "2026-10-23T12:00:00.000Z" }));
  assert.notEqual(initial, buildCalmTransferScopeHash({ ...base, pricing: [{ ...base.pricing[0], snapshotKey: "changed-snapshot-key" }] }));
});
