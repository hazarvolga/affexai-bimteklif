import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTenderDefenseManifest,
  classifyTenderSourceRows,
  prepareVerifiedAdtInputs,
  reconcileTenderTotal,
  type TenderSourceRow,
} from "./tender-defense";

const row = (overrides: Partial<TenderSourceRow> = {}): TenderSourceRow => ({
  sourceArtifact: {
    documentId: "doc-1",
    fileName: "ihale-acilis.pdf",
    mediaType: "application/pdf",
    checksumSha256: "b".repeat(64),
  },
  locator: { page: 2, row: 4 },
  extractionMethod: "pdf_text",
  confidence: 0.99,
  fields: { bidderName: "Örnek Yapı A.Ş.", offerAmount: "1250000.00" },
  ...overrides,
});

describe("tender defense evidence preparation", () => {
  it("preserves PDF/XLSX row provenance and detects duplicate business rows", () => {
    const classified = classifyTenderSourceRows([
      row(),
      row({
        sourceArtifact: {
          documentId: "doc-2",
          fileName: "ihale-acilis.xlsx",
          mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          checksumSha256: "c".repeat(64),
        },
        locator: { sheet: "Teklifler", row: 8 },
        extractionMethod: "xlsx_cell",
      }),
    ]);
    assert.equal(classified[0].reviewStatus, "REVIEW_REQUIRED");
    assert.equal(classified[1].reviewStatus, "DUPLICATE");
    assert.deepEqual(classified[1].provenance.locator, { sheet: "Teklifler", row: 8 });
  });

  it("marks OCR and low-confidence extraction as OCR_REQUIRED", () => {
    const classified = classifyTenderSourceRows([
      row({ extractionMethod: "pdf_ocr", confidence: 0.98 }),
      row({ locator: { page: 3, row: 1 }, confidence: 0.72, fields: { bidderName: "B Ltd.", offerAmount: "980000.00" } }),
    ]);
    assert.equal(classified[0].reviewStatus, "OCR_REQUIRED");
    assert.equal(classified[1].reviewStatus, "OCR_REQUIRED");
  });

  it("fails closed on invalid checksum or media/extraction provenance", () => {
    const classified = classifyTenderSourceRows([
      row({
        sourceArtifact: { ...row().sourceArtifact, checksumSha256: "invalid" },
        locator: { sheet: "Teklifler", row: 2 },
        extractionMethod: "xlsx_cell",
      }),
    ]);
    assert.equal(classified[0].reviewStatus, "SOURCE_INVALID");
    const prepared = prepareVerifiedAdtInputs(classified, [{
      rowId: classified[0].rowId,
      decision: "accepted",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-10-23T13:00:00.000Z",
    }]);
    assert.deepEqual(prepared, { status: "blocked", reasons: ["INVALID_SOURCE_PROVENANCE"] });
  });

  it("allows only explicit accept/correct decisions into verified ADT inputs", () => {
    const classified = classifyTenderSourceRows([
      row(),
      row({ locator: { page: 2, row: 5 }, fields: { bidderName: "B Ltd.", offerAmount: "900000.00" } }),
      row({ locator: { page: 2, row: 6 }, fields: { bidderName: "C Ltd.", offerAmount: "850000.00" } }),
    ]);
    const prepared = prepareVerifiedAdtInputs(classified, [
      { rowId: classified[0].rowId, decision: "accepted", reviewedBy: "reviewer-1", reviewedAt: "2026-10-23T13:00:00.000Z" },
      { rowId: classified[1].rowId, decision: "corrected", correctedFields: { bidderName: "B İnşaat Ltd.", offerAmount: "910000.00" }, reviewedBy: "reviewer-1", reviewedAt: "2026-10-23T13:01:00.000Z" },
      { rowId: classified[2].rowId, decision: "rejected", reason: "Tutanakta iptal edilmiş", reviewedBy: "reviewer-1", reviewedAt: "2026-10-23T13:02:00.000Z" },
    ]);
    assert.equal(prepared.status, "ready");
    if (prepared.status !== "ready") return;
    assert.deepEqual(prepared.inputs.map((input) => input.offerAmount), ["1250000.00", "910000.00"]);
    assert.ok(prepared.inputs.every((input) => input.verificationStatus === "user_verified"));
  });

  it("fails closed when OCR, duplicates, missing review or invalid correction remains", () => {
    const classified = classifyTenderSourceRows([
      row({ extractionMethod: "pdf_ocr" }),
      row({ locator: { page: 2, row: 5 }, fields: { bidderName: "B Ltd.", offerAmount: "900000.00" } }),
    ]);
    const prepared = prepareVerifiedAdtInputs(classified, [{
      rowId: classified[1].rowId,
      decision: "corrected",
      correctedFields: { bidderName: "", offerAmount: "not-money" },
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-10-23T13:01:00.000Z",
    }]);
    assert.equal(prepared.status, "blocked");
    if (prepared.status === "blocked") {
      assert.ok(prepared.reasons.includes("UNRESOLVED_OCR_REQUIRED"));
      assert.ok(prepared.reasons.includes("INVALID_CORRECTION"));
    }
  });

  it("never admits a duplicate row into the ADT input set even when a reviewer accepts it", () => {
    const classified = classifyTenderSourceRows([
      row(),
      row({ locator: { page: 3, row: 7 } }),
    ]);
    const prepared = prepareVerifiedAdtInputs(classified, [
      { rowId: classified[0].rowId, decision: "accepted", reviewedBy: "reviewer-1", reviewedAt: "2026-10-23T13:00:00.000Z" },
      { rowId: classified[1].rowId, decision: "accepted", reviewedBy: "reviewer-1", reviewedAt: "2026-10-23T13:01:00.000Z" },
    ]);
    assert.equal(prepared.status, "blocked");
    if (prepared.status === "blocked") assert.ok(prepared.reasons.includes("DUPLICATE_MUST_BE_REJECTED"));
  });

  it("reconciles exact decimal totals without binary floating point", () => {
    assert.deepEqual(reconcileTenderTotal(["1000000.10", "249999.90"], "1250000.00"), {
      status: "reconciled",
      expectedTotal: "1250000.00",
      actualTotal: "1250000.00",
      difference: "0.00",
    });
    assert.deepEqual(reconcileTenderTotal(["100.00", "50.00"], "151.00"), {
      status: "mismatch",
      expectedTotal: "151.00",
      actualTotal: "150.00",
      difference: "-1.00",
    });
  });

  it("builds a checksum manifest and permanently disables automatic official submission", () => {
    const classified = classifyTenderSourceRows([row()]);
    const prepared = prepareVerifiedAdtInputs(classified, [{
      rowId: classified[0].rowId,
      decision: "accepted",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-10-23T13:00:00.000Z",
    }]);
    assert.equal(prepared.status, "ready");
    if (prepared.status !== "ready") return;
    const manifest = buildTenderDefenseManifest(prepared.inputs, [row().sourceArtifact]);
    assert.equal(manifest.automaticOfficialSubmission, false);
    assert.equal(manifest.sourceArtifacts.length, 1);
    assert.match(manifest.checksumSha256, /^[a-f0-9]{64}$/);
    assert.equal(manifest.inputCount, 1);
  });

  it("fails closed when a verified input source is absent from the manifest artifacts", () => {
    const classified = classifyTenderSourceRows([row()]);
    const prepared = prepareVerifiedAdtInputs(classified, [{
      rowId: classified[0].rowId,
      decision: "accepted",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-10-23T13:00:00.000Z",
    }]);
    assert.equal(prepared.status, "ready");
    if (prepared.status !== "ready") return;
    assert.throws(
      () => buildTenderDefenseManifest(prepared.inputs, []),
      /SOURCE_ARTIFACT_NOT_BOUND/,
    );
  });

  it("fails closed when document id exists with a different checksum or duplicate binding", () => {
    const classified = classifyTenderSourceRows([row()]);
    const prepared = prepareVerifiedAdtInputs(classified, [{
      rowId: classified[0].rowId,
      decision: "accepted",
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-10-23T13:00:00.000Z",
    }]);
    assert.equal(prepared.status, "ready");
    if (prepared.status !== "ready") return;
    assert.throws(
      () => buildTenderDefenseManifest(prepared.inputs, [{ ...row().sourceArtifact, checksumSha256: "c".repeat(64) }]),
      /SOURCE_ARTIFACT_CHECKSUM_MISMATCH/,
    );
    assert.throws(
      () => buildTenderDefenseManifest(prepared.inputs, [row().sourceArtifact, { ...row().sourceArtifact }]),
      /DUPLICATE_SOURCE_ARTIFACT/,
    );
  });
});
