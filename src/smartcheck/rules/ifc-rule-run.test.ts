import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IfcSmartCheckEvidenceArtifact } from "../../ifc/smartcheck-evidence";
import { applyIfcRuleEvaluations, evaluateIfcRulePacks } from "./ifc-rule-run";
import { RULE_IDS } from "./three-by-three";

const row = (id: string, type: string) => ({
  sheetName: "IFC", sourceRowNumber: 1, sourceCellRange: `IFC#${id}`, rawDescription: `${type} Eleman beton hacmi · K1 · #1`,
  rawPositionCode: "", rawUnit: "m3", rawQuantity: "1", rawPrice: "", rawWastePercent: "0",
  formulaJson: { elementStepId: `#${id}` }, normalizedDescription: null, normalizedPositionCode: null, normalizedUnit: "m3",
  normalizedQuantity: "1", normalizedPrice: null, normalizedWastePercent: "0", quantitySource: "ifc_property" as const,
  priceSource: "manual_required" as const, mappingConfidence: "0.80", reviewStatus: "pending_review" as const, findingsJson: [],
});

const artifact = (overrides: Partial<IfcSmartCheckEvidenceArtifact["summary"]> = {}): IfcSmartCheckEvidenceArtifact => ({
  schemaVersion: 1, kind: "ifc_smartcheck_quantity_evidence", document: { fileName: "m.ifc" },
  summary: { parseStatus: "succeeded", extractionMode: "demo_estimate", totalElements: 4, evidenceRowCount: 2, blockedElementCount: 2,
    qtoQuantityCount: 0, propertyQuantityCount: 2, geometryBlockedCount: 0, rebarBlockedCount: 0, formworkEstimateBlockedCount: 0,
    spatiallyAssignedEvidenceRowCount: 2, elementsWithPozNoCount: 0, elementsMissingPozNoCount: 4, trPsetCsb: { source: null }, ...overrides },
  rows: [row("1", "IfcColumn"), row("2", "IfcSlab")], blockedElements: [],
});

describe("server-side IFC rule run (E-1, E-6)", () => {
  it("runs 3x3 with the company's standard and records honest coverage for missing inputs", () => {
    const result = evaluateIfcRulePacks(artifact(), "TBDY_TS500");
    assert.equal(result.threeByThree.activeStandard, "TBDY_TS500");
    assert.equal(result.threeByThree.summary.totalChecked, 2);
    assert.deepEqual(result.threeByThree.coverage[RULE_IDS.COVER_MIN_TS500], { evaluated: 0, missingInput: 2 });
    assert.equal(result.evaluatedOn, "server");
  });

  it("runs e-PYS on the server from the artifact's parcel and poz evidence", () => {
    const missing = evaluateIfcRulePacks(artifact(), "TBDY_TS500").epys;
    assert.equal(missing.isValid, false);
    assert.ok(missing.errors.some(error => error.includes("TREpys_ParselOzellikSeti")));
    assert.ok(missing.warnings.some(warning => warning.includes("CSBPozNo")));
    const complete = evaluateIfcRulePacks(artifact({ trPsetCsb: { source: "ifc_site", taks: 0.3, kaks: 1.2, cekmeOn: 5, cekmeYan: 3, cekmeArka: 3 }, elementsWithPozNoCount: 4, elementsMissingPozNoCount: 0 }), "TBDY_TS500").epys;
    assert.equal(complete.isValid, true);
    assert.equal(complete.score, 100);
  });

  it("stores rule results in the artifact and 3x3 violations as row findings without mutating the input", () => {
    const input = artifact();
    const evaluations = evaluateIfcRulePacks(input, "TBDY_TS500");
    const withViolation = { ...evaluations, threeByThree: { ...evaluations.threeByThree, violations: [{
      ruleId: RULE_IDS.COVER_MIN_TS500, ruleVersion: "v", elementId: "#1", severity: "error" as const, message: "low cover",
      actualValue: 10, thresholdValue: 20, source: { kind: "standard" as const, reference: "TS 500" } }] } };
    const output = applyIfcRuleEvaluations(input, withViolation);
    assert.equal(input.rows[0].findingsJson.length, 0);
    assert.deepEqual(output.rows[0].findingsJson.map(finding => [finding.code, finding.severity]), [[RULE_IDS.COVER_MIN_TS500, "high"]]);
    assert.equal(output.rows[1].findingsJson.length, 0);
    assert.equal(output.ruleEvaluations?.threeByThree.rulePackVersion, evaluations.threeByThree.rulePackVersion);
  });

  it("evaluates 3x3 rules when extractor populates coverMm, exposure, loadBearing, discipline, and expectedQuantity in formulaJson", () => {
    const base = artifact();
    base.rows[0] = {
      ...base.rows[0],
      rawQuantity: "10.5",
      normalizedQuantity: "10.5",
      formulaJson: {
        elementStepId: "#1",
        loadBearing: "true",
        discipline: "ARC",
        exposure: "exterior",
        coverMm: "18",
        expectedQuantity: "10.0",
      },
    };
    const result = evaluateIfcRulePacks(base, "TBDY_TS500");
    assert.equal(result.threeByThree.status, "failed");
    assert.deepEqual(result.threeByThree.coverage[RULE_IDS.QTO_TOLERANCE_3PCT], { evaluated: 1, missingInput: 1 });
    assert.deepEqual(result.threeByThree.coverage[RULE_IDS.COVER_MIN_TS500], { evaluated: 1, missingInput: 1 });
    assert.deepEqual(result.threeByThree.coverage[RULE_IDS.LAYER_PRIORITY], { evaluated: 1, missingInput: 1 });
    assert.equal(result.threeByThree.violations.length, 3);
  });
});
