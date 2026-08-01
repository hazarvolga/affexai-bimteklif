import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseIfcText } from "../components/bimplan/BimIfcParser";
import { buildIfcSmartCheckEvidenceArtifact } from "./smartcheck-evidence";
import type { IfcParseSummary, ParsedIfcElement } from "./types";

interface EProjeManifest {
  fixtureName: string;
  relativePath: string;
  sha256: string;
  ifcSchema: string;
  knownQuantityEvidence: {
    recognizedSlabMatches: number;
    recognizedSlabVolumeSumM3: number;
  };
}

const manifestPath = resolve("src/ifc/fixtures/e-proje_4x3.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as EProjeManifest;
const samplePath = resolve(manifest.relativePath);

const succeededSummary: IfcParseSummary = {
  parseStatus: "succeeded",
  extractionMode: "demo_estimate",
  quantitySource: "estimate",
  quoteTransferStatus: "needs_review",
  warnings: [],
  unsupportedReasons: [],
  totalElements: 2,
  totalVolumeM3: 12.5,
  totalFormworkM2: 0,
  totalRebarKg: 0,
  totalRebarTon: 0,
  beamCount: 1,
  beamVolumeM3: 5,
  columnCount: 0,
  columnVolumeM3: 0,
  slabCount: 1,
  slabVolumeM3: 7.5,
  wallCount: 0,
  wallVolumeM3: 0,
  rebarCount: 0,
  rebarByDiameter: {},
};

describe("IFC SmartCheck evidence adapter", () => {
  it("admits only property-backed quantities into pending review rows", () => {
    const elements: ParsedIfcElement[] = [
      {
        id: "2250",
        guid: "2EiaBgKpn0FfR5lxdBlbEc",
        type: "IfcSlab",
        name: "Döşeme A",
        storey: "B01",
        storeySource: "ifc_spatial",
        storeySourcePath: "#100/#10:IfcRelContainedInSpatialStructure/IfcBuildingStorey",
        volumeM3: 7.5,
        formworkM2: 0,
        rebarKg: 0,
        quantitySource: "property",
        quantitySourcePath: "#200/#201/#202:AllplanAttributes/Hacim",
        quantityConfidence: 0.9,
        smartCheckStatus: "review",
      },
      {
        id: "42",
        guid: "0JTESTBEAM00000000000",
        type: "IfcBeam",
        name: "Kiriş Demo",
        storey: "Kat 1",
        storeySource: "estimate",
        volumeM3: 5,
        formworkM2: 20,
        rebarKg: 500,
        quantitySource: "estimate",
        smartCheckStatus: "warning",
      },
    ];

    const artifact = buildIfcSmartCheckEvidenceArtifact(elements, succeededSummary, {
      fileName: "unit.ifc",
      checksumSha256: "a".repeat(64),
      schemaName: "IFC4X3_ADD2",
    });

    assert.equal(artifact.summary.evidenceRowCount, 1);
    assert.equal(artifact.summary.blockedElementCount, 1);
    assert.equal(artifact.rows[0].sourceCellRange, "IFC#2250");
    assert.equal(artifact.rows[0].quantitySource, "ifc_property");
    assert.equal(artifact.rows[0].priceSource, "manual_required");
    assert.equal(artifact.rows[0].reviewStatus, "pending_review");
    assert.equal(artifact.rows[0].normalizedUnit, "m³");
    assert.equal(artifact.rows[0].normalizedQuantity, "7.5");
    assert.equal(artifact.rows[0].mappingConfidence, "0.90");
    assert.deepEqual(artifact.blockedElements.map((element) => element.code), ["IFC_ESTIMATE_QUANTITY_BLOCKED"]);
    assert.match(artifact.rows[0].findingsJson.map((finding) => finding.code).join(","), /MISSING_PRICE_SOURCE/);
  });

  it("matches the e-proje_4x3 property-volume evidence count when the sample IFC is present", { skip: !existsSync(samplePath) }, () => {
    const sample = readFileSync(samplePath, "utf8");
    const sha256 = createHash("sha256").update(sample).digest("hex");
    const result = parseIfcText(sample);
    const artifact = buildIfcSmartCheckEvidenceArtifact(result.elements, result.summary, {
      fileName: manifest.fixtureName,
      checksumSha256: sha256,
      schemaName: manifest.ifcSchema,
    });

    const totalQuantity = artifact.rows.reduce((sum, row) => sum + Number(row.normalizedQuantity), 0);

    assert.equal(sha256, manifest.sha256);
    assert.equal(artifact.summary.evidenceRowCount, manifest.knownQuantityEvidence.recognizedSlabMatches);
    assert.equal(artifact.summary.spatiallyAssignedEvidenceRowCount, manifest.knownQuantityEvidence.recognizedSlabMatches);
    assert.ok(Math.abs(totalQuantity - manifest.knownQuantityEvidence.recognizedSlabVolumeSumM3) < 1e-9);
    assert.equal(artifact.summary.blockedElementCount, result.summary.totalElements - manifest.knownQuantityEvidence.recognizedSlabMatches);
    assert.equal(artifact.rows.some((row) => row.quantitySource !== "ifc_property"), false);
  });
});
