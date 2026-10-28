import assert from "node:assert/strict";
import test from "node:test";
import { buildCalmTransferSelection, calmTransferAttemptScope, calmTransferTargetHint, getOrCreateCalmTransferAttempt, isCalmTransferTargetReady } from "./calm-transfer-ui";
import { buildCalmIfcDatasetFromElements, parseSmartCheckRowToPseudoElement } from "../../ifc/calm-icmal";
import { projectApprovedRowsToCalmQuotationLines } from "../../services/quotations/calm-transfer";

test("Calm transfer selection maps aggregate items to deterministic source row snapshot choices", () => {
  const selection = buildCalmTransferSelection([
    { lineId: "line-b", sourceQuantityRowIds: ["row-b", "row-a"], priceSnapshotId: "snapshot-1" },
    { lineId: "line-a", sourceQuantityRowIds: ["row-c"], priceSnapshotId: "snapshot-2" },
  ]);
  assert.deepEqual(selection, {
    priceSnapshotIdsByCalmLineId: {
      "line-a": "snapshot-2",
      "line-b": "snapshot-1",
    },
  });
});

test("Calm transfer selection fails closed for missing lineage and conflicting aggregate prices", () => {
  assert.throws(
    () => buildCalmTransferSelection([{ lineId: "line-a", sourceQuantityRowIds: [], priceSnapshotId: "snapshot-1" }]),
    /CALM_TRANSFER_SOURCE_LINEAGE_REQUIRED/,
  );
  assert.throws(
    () => buildCalmTransferSelection([
      { lineId: "line-a", sourceQuantityRowIds: ["row-a"], priceSnapshotId: "snapshot-1" },
      { lineId: "line-a", sourceQuantityRowIds: ["row-a"], priceSnapshotId: "snapshot-2" },
    ]),
    /CALM_TRANSFER_PRICE_CONFLICT/,
  );
});

test("Calm transfer attempt reuses the idempotency key and persisted successor for the same payload", () => {
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { records.set(key, value); },
  };
  const first = getOrCreateCalmTransferAttempt(storage, "doc", "quote", {
    priceSnapshotIdsByCalmLineId: { "line-a": "snapshot-1" },
  }, () => "attempt-1");
  storage.setItem(first.storageKey, JSON.stringify({ ...first.record, resultQuotationId: "successor" }));
  const replay = getOrCreateCalmTransferAttempt(storage, "doc", "quote", {
    priceSnapshotIdsByCalmLineId: { "line-a": "snapshot-1" },
  }, () => "attempt-2");
  assert.equal(replay.record.idempotencyKey, "attempt-1");
  assert.equal(replay.record.resultQuotationId, "successor");

  const changed = getOrCreateCalmTransferAttempt(storage, "doc", "quote", {
    priceSnapshotIdsByCalmLineId: { "line-a": "snapshot-2" },
  }, () => "attempt-2");
  assert.equal(changed.record.idempotencyKey, "attempt-2");
  assert.equal(changed.record.resultQuotationId, undefined);
});

test("UI and server produce identical canonical Calm lines for layered minha fixture", () => {
  const source = {
    id: "11111111-1111-4111-8111-111111111111", documentId: "22222222-2222-4222-8222-222222222222",
    processingRunId: "33333333-3333-4333-8333-333333333333", sourceCellRange: "IfcCovering#1",
    rawDescription: "IfcCovering · Duvar kaplaması", rawPositionCode: "15.390.1002", rawUnit: "m2", rawQuantity: "35.4",
    normalizedDescription: "Duvar kaplaması", normalizedPositionCode: "15.390.1002", normalizedUnit: "m²", normalizedQuantity: "35.4000",
    normalizedWastePercent: "0", reviewStatus: "approved", reviewedAt: new Date("2026-10-23T09:00:00.000Z"), reviewerUserId: "44444444-4444-4444-8444-444444444444", quantitySource: "ifc_qto",
    formulaJson: { materialLayers: JSON.stringify(["Fayans_a", "Sıva_2CM"]), coveringPredefinedType: "CLADDING", grossAreaM2: "40.68", openingAreaM2: "5.28", quantitySourcePath: "#10/#11/#12:Qto_CoveringBaseQuantities/NetArea" },
  };
  const uiItems = buildCalmIfcDatasetFromElements([parseSmartCheckRowToPseudoElement(source, 0)], null, "fixture.ifc").groups.flatMap((group) => group.items);
  const serverLines = projectApprovedRowsToCalmQuotationLines([source], {});
  assert.deepEqual(
    serverLines.map((line) => ({ lineId: line.lineId, quantity: Number(line.quantity), sourceRowIds: line.sourceRows.map((row) => row.rowId) })),
    uiItems.sort((a, b) => a.id.localeCompare(b.id)).map((item) => ({ lineId: item.id, quantity: item.netQuantity, sourceRowIds: item.sourceQuantityRowIds })),
  );
});

test("Calm transfer target separates a new quotation from a revision and scopes retries by what the server hashes", () => {
  const fresh = { mode: "new" as const, clientName: "  ", projectName: "" };
  assert.equal(isCalmTransferTargetReady(fresh), false);
  assert.equal(calmTransferTargetHint(fresh), "Yeni teklif için müşteri adını yazın.");
  const named = { ...fresh, clientName: "Örnek Yapı A.Ş.", projectName: "Konut A Blok" };
  assert.equal(isCalmTransferTargetReady(named), true);
  assert.equal(calmTransferTargetHint(named), null);
  assert.equal(calmTransferAttemptScope(named), calmTransferAttemptScope({ ...named, clientName: " Örnek Yapı A.Ş. " }));
  assert.notEqual(calmTransferAttemptScope(named), calmTransferAttemptScope({ ...named, clientName: "Başka Firma" }));
  const revision = { mode: "revision" as const, quotationId: "" };
  assert.equal(calmTransferTargetHint(revision), "Revizyon eklenecek teklifi seçin.");
  assert.equal(calmTransferAttemptScope({ mode: "revision", quotationId: "q-1" }), "q-1", "revision attempts keep their existing storage key");
});
