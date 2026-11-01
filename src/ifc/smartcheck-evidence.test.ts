import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseIfcText } from "./parser/legacy-parser";
import { buildIfcSmartCheckEvidenceArtifact, pickIfcScreenSummary } from "./smartcheck-evidence";
import { buildCalmIfcDatasetFromArtifact } from "./calm-icmal";
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
  trPsetCsb: { source: null },
  elementsWithPozNoCount: 0,
  elementsMissingPozNoCount: 0,
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

  it("admits QTO-backed quantities as first-class SmartCheck evidence rows", () => {
    const elements: ParsedIfcElement[] = [
      {
        id: "2250",
        guid: "2EiaBgKpn0FfR5lxdBlbEc",
        type: "IfcSlab",
        name: "Döşeme QTO",
        storey: "B01",
        storeySource: "ifc_spatial",
        storeySourcePath: "#100/#10:IfcRelContainedInSpatialStructure/IfcBuildingStorey",
        volumeM3: 8.25,
        formworkM2: 0,
        rebarKg: 0,
        quantitySource: "qto",
        quantitySourcePath: "#200/#201/#202:Qto_SlabBaseQuantities/NetVolume",
        quantityConfidence: 0.95,
        smartCheckStatus: "review",
      },
    ];

    const artifact = buildIfcSmartCheckEvidenceArtifact(elements, { ...succeededSummary, totalElements: 1 }, {
      fileName: "unit-qto.ifc",
      checksumSha256: "b".repeat(64),
      schemaName: "IFC4X3_ADD2",
    });

    assert.equal(artifact.summary.evidenceRowCount, 1);
    assert.equal(artifact.summary.qtoQuantityCount, 1);
    assert.equal(artifact.summary.propertyQuantityCount, 0);
    assert.equal(artifact.rows[0].quantitySource, "ifc_qto");
    assert.equal(artifact.rows[0].normalizedQuantity, "8.25");
    assert.equal(artifact.rows[0].mappingConfidence, "0.95");
  });

  it("blocks geometry fallback quantities until deterministic geometry rules are implemented", () => {
    const elements: ParsedIfcElement[] = [
      {
        id: "500",
        guid: "2GEOMBgKpn0FfR5lxdBlb",
        type: "IfcWall",
        name: "Duvar Geometry",
        storey: "B01",
        storeySource: "ifc_spatial",
        storeySourcePath: "#100/#10:IfcRelContainedInSpatialStructure/IfcBuildingStorey",
        volumeM3: 4.75,
        formworkM2: 0,
        rebarKg: 0,
        quantitySource: "geometry",
        quantitySourcePath: "#500/IfcExtrudedAreaSolid",
        quantityConfidence: 0.7,
        smartCheckStatus: "review",
      },
    ];

    const artifact = buildIfcSmartCheckEvidenceArtifact(elements, { ...succeededSummary, totalElements: 1 }, {
      fileName: "unit-geometry.ifc",
      checksumSha256: "c".repeat(64),
      schemaName: "IFC4X3_ADD2",
    });

    assert.equal(artifact.summary.evidenceRowCount, 0);
    assert.equal(artifact.summary.blockedElementCount, 1);
    assert.equal(artifact.summary.geometryBlockedCount, 1);
    assert.deepEqual(artifact.blockedElements.map((element) => element.code), ["IFC_GEOMETRY_FALLBACK_BLOCKED"]);
    assert.match(artifact.blockedElements[0].reason, /opening deductions/);
  });

  it("blocks old artifacts whose property source path actually identifies derived geometry", () => {
    for (const path of ["#1/#2:IfcShapeRepresentation/GeometryVolume", "#1/#2:IfcShapeRepresentation/GeometryArea", "#1/#2:IfcShapeRepresentation/CurveLengthArea"]) {
      const element: ParsedIfcElement = { id: "1", guid: "LEGACY_GEOMETRY", type: "IfcWall", name: "Wall", storey: "B01", storeySource: "ifc_spatial", volumeM3: 4, formworkM2: 0, rebarKg: 0, quantitySource: "property", quantitySourcePath: path, smartCheckStatus: "review" };
      const artifact = buildIfcSmartCheckEvidenceArtifact([element], { ...succeededSummary, totalElements: 1 }, { fileName: "legacy.ifc" });
      assert.equal(artifact.rows.length, 0, path);
      assert.equal(artifact.blockedElements[0]?.code, "IFC_GEOMETRY_FALLBACK_BLOCKED", path);
      assert.equal(artifact.blockedElements[0]?.sourceReference, path);
    }
  });

  it("excludes legacy geometry rows from artifact-derived Calm totals with an explicit notice", () => {
    const element: ParsedIfcElement = { id: "1", guid: "OLD_GEOM", type: "IfcSlab", name: "Beton C30", materialLayers: ["Beton_C30"], storey: "B01", storeySource: "ifc_spatial", volumeM3: 4, formworkM2: 0, rebarKg: 0, quantitySource: "property", quantitySourcePath: "#1/AllplanAttributes/Hacim", smartCheckStatus: "review" };
    const source = buildIfcSmartCheckEvidenceArtifact([element], { ...succeededSummary, totalElements: 1 }, { fileName: "old.ifc" });
    assert.equal(source.rows.length, 1);
    const legacy = { ...source, rows: [{ ...source.rows[0], formulaJson: { ...source.rows[0].formulaJson, quantitySourcePath: "#1/#2:IfcShapeRepresentation/GeometryVolume" } }] };
    const dataset = buildCalmIfcDatasetFromArtifact(legacy);
    assert.equal(dataset.groups.flatMap(group => group.items).length, 0);
    assert.match(dataset.projectSubtitle, /1 doğrulanamayan kaynak satırı.*icmal dışında/i);
  });

  it("admits source-backed rebar mass as kg and keeps estimated rebar/formwork blocked", () => {
    const elements: ParsedIfcElement[] = [
      {
        id: "700",
        guid: "2REBARgKpn0FfR5lxdBlb",
        type: "IfcReinforcingBar",
        name: "Donatı QTO",
        storey: "B01",
        storeySource: "ifc_spatial",
        storeySourcePath: "#100/#10:IfcRelContainedInSpatialStructure/IfcBuildingStorey",
        volumeM3: 0.02,
        formworkM2: 0,
        rebarKg: 157,
        quantitySource: "qto",
        quantitySourcePath: "#700/#701/#702:Qto_ReinforcingElementBaseQuantities/Weight",
        quantityConfidence: 0.95,
        smartCheckStatus: "review",
      },
      {
        id: "800",
        guid: "2BEAMBgKpn0FfR5lxdBlb",
        type: "IfcBeam",
        name: "Kiriş Estimate",
        storey: "B01",
        storeySource: "ifc_spatial",
        volumeM3: 1.25,
        formworkM2: 5.5,
        rebarKg: 140,
        quantitySource: "estimate",
        smartCheckStatus: "warning",
      },
    ];

    const artifact = buildIfcSmartCheckEvidenceArtifact(elements, { ...succeededSummary, totalElements: 2 }, {
      fileName: "unit-rebar.ifc",
      checksumSha256: "d".repeat(64),
      schemaName: "IFC4X3_ADD2",
    });

    assert.equal(artifact.summary.evidenceRowCount, 1);
    assert.equal(artifact.rows[0].normalizedUnit, "kg");
    assert.equal(artifact.rows[0].normalizedQuantity, "157");
    assert.equal(artifact.rows[0].normalizedDescription, "IfcReinforcingBar Donatı QTO donatı kütlesi · B01 · #700/#701/#702:Qto_ReinforcingElementBaseQuantities/Weight");
    assert.equal(artifact.summary.rebarBlockedCount, 0);
    assert.equal(artifact.summary.formworkEstimateBlockedCount, 1);
    assert.deepEqual(artifact.blockedElements.map((element) => element.code), [
      "IFC_ESTIMATE_QUANTITY_BLOCKED",
    ]);
  });

  it("does not report a successful rebar match when source-backed mass is zero", () => {
    const artifact = buildIfcSmartCheckEvidenceArtifact([{
      id: "701", guid: "2REBARzero000000000001", type: "IfcReinforcingBar", name: "Pozlu ama ölçüsüz donatı",
      storey: "B01", storeySource: "ifc_spatial", volumeM3: 0, formworkM2: 0, rebarKg: 0,
      quantitySource: "qto", quantitySourcePath: "#701/Qto_ReinforcingElementBaseQuantities/Weight",
      pozNo: "15.160.1001", smartCheckStatus: "review",
    }], { ...succeededSummary, totalElements: 1 }, { fileName: "zero-rebar.ifc" });

    assert.equal(artifact.summary.evidenceRowCount, 0);
    assert.equal(artifact.summary.rebarBlockedCount, 1);
    assert.equal(artifact.blockedElements[0].code, "IFC_REBAR_EVIDENCE_POLICY_PENDING");
    assert.match(artifact.blockedElements[0].reason, /positive direct weight\/mass/i);
  });

  it("blocks nominal diameter-length derived rebar mass even when a misleading property source is supplied", () => {
    const artifact = buildIfcSmartCheckEvidenceArtifact([{
      id: "702", guid: "2REBARderived0000000001", type: "IfcReinforcingBar", name: "Nominal türetilmiş donatı",
      storey: "B01", storeySource: "ifc_spatial", volumeM3: 0.0024, formworkM2: 0, rebarKg: 18.9,
      quantitySource: "property", quantitySourcePath: "#702:IfcReinforcingBar/NominalAttributes",
      pozNo: "15.160.1001", smartCheckStatus: "review",
    }], { ...succeededSummary, totalElements: 1 }, { fileName: "derived-rebar.ifc" });

    assert.equal(artifact.summary.evidenceRowCount, 0);
    assert.equal(artifact.summary.rebarBlockedCount, 1);
    assert.equal(artifact.blockedElements[0].code, "IFC_REBAR_EVIDENCE_POLICY_PENDING");
    assert.match(artifact.blockedElements[0].reason, /direct.*weight/i);
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

  it("admits IfcCovering areaM2 (m2) and TREpys_PozOzellikSeti positionCode into SmartCheck evidence rows", () => {
    const elements: ParsedIfcElement[] = [
      {
        id: "910",
        guid: "2COVRgKpn0FfR5lxdBlb",
        type: "IfcCovering",
        name: "MM-KPL-seramik_zemin",
        storey: "Kat 1 (0.0 m)",
        storeySource: "ifc_spatial",
        storeySourcePath: "#100/#10:Kat 1",
        volumeM3: 0,
        areaM2: 42.5,
        formworkM2: 0,
        rebarKg: 0,
        quantitySource: "qto",
        quantitySourcePath: "#911/#912/#913:Qto_CoveringBaseQuantities/NetArea",
        quantityConfidence: 0.95,
        smartCheckStatus: "review",
        pozNo: "15.275.1104",
        pozNoSourcePath: "#914/#915/#916:TREpys_PozOzellikSeti/PozNo",
      },
    ];

    const artifact = buildIfcSmartCheckEvidenceArtifact(
      elements,
      { ...succeededSummary, totalElements: 1, coveringCount: 1, coveringAreaM2: 42.5, elementsWithPozNoCount: 1 },
      { fileName: "unit-covering.ifc", checksumSha256: "e".repeat(64), schemaName: "IFC4X3_ADD2" },
    );

    assert.equal(artifact.summary.evidenceRowCount, 1);
    assert.equal(artifact.rows[0].normalizedUnit, "m²");
    assert.equal(artifact.rows[0].normalizedQuantity, "42.5");
    assert.equal(artifact.rows[0].normalizedPositionCode, "15.275.1104");
  });
});

it("the screen summary keeps openings and source software from stored evidence, and nothing else", () => {
  const openings = [{ id: "1", kind: "door", widthM: 0.9, heightM: 2.1 }];
  const authoringSoftware = { family: "revit", rawApplicationName: "Autodesk Revit 2015" };
  assert.deepEqual(
    pickIfcScreenSummary({ summary: { openings, authoringSoftware, parserContract: { fileSha256: "x" } } }),
    { openings, authoringSoftware },
  );
});

it("the stored consistency report is kept, so the coverage card counts every element of the model", () => {
  const consistencyReport = { totalElementCount: 1731, measuredElementCount: 1731, pozMatchedElementCount: 160 };
  assert.deepEqual(pickIfcScreenSummary({ summary: { consistencyReport } }), { consistencyReport });
  assert.deepEqual(pickIfcScreenSummary({ summary: { consistencyReport: "x" } }), {});
});

it("evidence from before these fields, or of another shape, gives an empty summary", () => {
  assert.deepEqual(pickIfcScreenSummary(null), {});
  assert.deepEqual(pickIfcScreenSummary({ summary: {} }), {});
  assert.deepEqual(pickIfcScreenSummary({ summary: { openings: "x", authoringSoftware: 3 } }), {});
});

it("the stored evidence keeps the apartment schedule the worker read, and the screen summary returns it", () => {
  const apartmentSchedule = [{ unitCode: "D01", unitLabel: "Daire D01", storey: "K01", roomCount: 8, netSweepableM2: 65.68, balconyM2: 4.73, totalNetM2: 70.41, unitGrossM2: null, generalGrossM2: null, rooms: [] }];
  assert.deepEqual(pickIfcScreenSummary({ summary: { apartmentSchedule } }), { apartmentSchedule });
  assert.deepEqual(pickIfcScreenSummary({ summary: { apartmentSchedule: "x" } }), {});
});

describe("apartment schedule in the stored evidence", () => {
  it("is copied from the worker summary, so the result screen can show the units and rooms", () => {
    const apartmentSchedule = [{ unitCode: "D01", unitLabel: "Daire D01", storey: "K01", roomCount: 1, netSweepableM2: 20, balconyM2: 0, totalNetM2: 20, unitGrossM2: null, generalGrossM2: null, rooms: [] }];
    const artifact = buildIfcSmartCheckEvidenceArtifact([], { ...succeededSummary, totalElements: 0, apartmentSchedule } as IfcParseSummary, { fileName: "u.ifc", checksumSha256: "a".repeat(64), schemaName: "IFC4" });
    assert.deepEqual(artifact.summary.apartmentSchedule, apartmentSchedule);
    assert.deepEqual(pickIfcScreenSummary({ summary: artifact.summary }).apartmentSchedule, apartmentSchedule);
  });
});

describe("class inventory in the stored evidence", () => {
  it("is copied from the worker summary and returned by the screen summary", () => {
    const classInventory = [{ ifcClass: "IfcSpace", count: 178 }, { ifcClass: "IfcRailing", count: 144 }];
    const artifact = buildIfcSmartCheckEvidenceArtifact([], { ...succeededSummary, totalElements: 0, classInventory } as IfcParseSummary, { fileName: "u.ifc", checksumSha256: "a".repeat(64), schemaName: "IFC4" });
    assert.deepEqual(artifact.summary.classInventory, classInventory);
    assert.deepEqual(pickIfcScreenSummary({ summary: artifact.summary }).classInventory, classInventory);
    assert.deepEqual(pickIfcScreenSummary({ summary: { classInventory: "x" } }), {});
  });
});
