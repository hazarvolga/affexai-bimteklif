import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateThreeByThreeRules,
  SMARTCHECK_3X3_RULE_PACK_VERSION,
  RULE_IDS,
} from "./three-by-three";

describe("SmartCheck 3x3 Domain Rules", () => {
  describe("QTO Tolerance 3.00% Boundary Checks", () => {
    it("passes when quantity deviation is strictly below 3.00% (2.99%)", () => {
      // expected = 100, actual = 102.99 -> deviation = 2.99%
      const result = validateThreeByThreeRules([
        {
          elementId: "WALL_001",
          expectedQuantity: 100,
          actualQuantity: 102.99,
        },
      ]);

      assert.equal(result.isValid, true);
      assert.equal(result.violations.length, 0);
      assert.equal(result.summary.passed, 1);
      assert.equal(result.summary.failed, 0);
    });

    it("passes exactly at the 3.00% boundary", () => {
      // expected = 100, actual = 103.00 -> deviation = 3.00%
      const result = validateThreeByThreeRules([
        {
          elementId: "WALL_002",
          expectedQuantity: 100,
          actualQuantity: 103.00,
        },
      ]);

      assert.equal(result.isValid, true);
      assert.equal(result.violations.length, 0);
      assert.equal(result.summary.passed, 1);
    });

    it("fails when quantity deviation exceeds 3.00% (3.01%)", () => {
      // expected = 100, actual = 103.01 -> deviation = 3.01%
      const result = validateThreeByThreeRules([
        {
          elementId: "WALL_003",
          expectedQuantity: 100,
          actualQuantity: 103.01,
        },
      ]);

      assert.equal(result.isValid, false);
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0].ruleId, RULE_IDS.QTO_TOLERANCE_3PCT);
      assert.equal(result.violations[0].ruleVersion, SMARTCHECK_3X3_RULE_PACK_VERSION);
      assert.equal(result.violations[0].actualValue, 3.01);
      assert.equal(result.summary.failed, 1);
    });
  });

  describe("XC3 Exposure Class 35mm Cover Boundary Checks (activeStandard = EUROCODE_2)", () => {
    const ec2 = { activeStandard: "EUROCODE_2" } as const;
    it("passes when cover exceeds 35mm (e.g. 36mm)", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "COL_001",
          exposureClass: "XC3",
          coverMm: 36,
        },
      ], ec2);

      assert.equal(result.isValid, true);
      assert.equal(result.violations.length, 0);
    });

    it("passes exactly at 35mm minimum cover", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "COL_002",
          exposureClass: "XC3",
          coverMm: 35,
        },
      ], ec2);

      assert.equal(result.isValid, true);
      assert.equal(result.violations.length, 0);
    });

    it("fails when cover is below 35mm (e.g. 34mm)", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "COL_003",
          exposureClass: "XC3",
          coverMm: 34,
        },
      ], ec2);

      assert.equal(result.isValid, false);
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0].ruleId, RULE_IDS.XC3_COVER_35MM);
      assert.equal(result.violations[0].actualValue, 34);
      assert.equal(result.violations[0].thresholdValue, 35);
    });

    it("ignores non-XC3 elements without cover specifications", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "SLAB_001",
          exposureClass: "X0",
          coverMm: 20,
        },
      ], ec2);

      assert.equal(result.isValid, true);
    });
  });

  describe("Layer Priority Hierarchy", () => {
    it("passes when load-bearing element belongs to structural discipline (STR)", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "BEAM_STR",
          loadBearing: true,
          discipline: "STR",
        },
      ]);

      assert.equal(result.isValid, true);
      assert.equal(result.violations.length, 0);
    });

    it("fails when load-bearing element is misplaced in architectural discipline (ARC)", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "BEAM_ARC",
          loadBearing: true,
          discipline: "ARC",
        },
      ]);

      assert.equal(result.isValid, false);
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0].ruleId, RULE_IDS.LAYER_PRIORITY);
    });
  });

  describe("TS 500 minimum net cover (default activeStandard = TBDY_TS500)", () => {
    it("checks columns and beams at 20 mm inside, 25 mm outside and slabs at 15 mm", () => {
      const result = validateThreeByThreeRules([
        { elementId: "COL_IN_OK", elementType: "IfcColumn", exposure: "interior", coverMm: 20 },
        { elementId: "COL_IN_LOW", elementType: "IfcColumn", exposure: "interior", coverMm: 19 },
        { elementId: "BEAM_OUT_LOW", elementType: "IfcBeam", exposure: "exterior", coverMm: 24 },
        { elementId: "SLAB_OK", elementType: "IfcSlab", exposure: "interior", coverMm: 15 },
        { elementId: "SLAB_LOW", elementType: "IfcSlab", exposure: "interior", coverMm: 14 },
      ]);
      assert.deepEqual(result.violations.map(v => [v.elementId, v.thresholdValue]), [["COL_IN_LOW", 20], ["BEAM_OUT_LOW", 25], ["SLAB_LOW", 15]]);
      assert.ok(result.violations.every(v => v.ruleId === RULE_IDS.COVER_MIN_TS500 && v.source.kind === "standard" && /TS 500/.test(v.source.reference)));
    });

    it("does not apply the Eurocode XC3 35 mm rule to TS 500 companies", () => {
      const result = validateThreeByThreeRules([{ elementId: "COL", elementType: "IfcColumn", exposure: "interior", exposureClass: "XC3", coverMm: 30 }]);
      assert.equal(result.isValid, true);
      assert.ok(!result.executedRules.includes(RULE_IDS.XC3_COVER_35MM));
    });

    it("skips cover checks it cannot source for ACI 318 instead of inventing a threshold", () => {
      const result = validateThreeByThreeRules([{ elementId: "COL", elementType: "IfcColumn", coverMm: 5 }], { activeStandard: "ACI_318" });
      assert.equal(result.isValid, true);
      assert.deepEqual(result.executedRules, [RULE_IDS.QTO_TOLERANCE_3PCT, RULE_IDS.LAYER_PRIORITY]);
    });
  });

  describe("Rule sources and coverage", () => {
    it("labels the 3% tolerance and STR priority as company policy, not a standard", () => {
      const result = validateThreeByThreeRules([
        { elementId: "Q", expectedQuantity: 100, actualQuantity: 110 },
        { elementId: "L", loadBearing: true, discipline: "ARC" },
      ]);
      assert.deepEqual(result.violations.map(v => v.source.kind), ["company_policy", "company_policy"]);
      assert.ok(result.violations.every(v => !/TS 500|ISO 19650/.test(v.source.reference)));
    });

    it("reports how many elements each rule could actually evaluate", () => {
      const result = validateThreeByThreeRules([
        { elementId: "A", expectedQuantity: 10, actualQuantity: 10 },
        { elementId: "B" },
      ]);
      assert.deepEqual(result.coverage[RULE_IDS.QTO_TOLERANCE_3PCT], { evaluated: 1, missingInput: 1 });
      assert.deepEqual(result.coverage[RULE_IDS.COVER_MIN_TS500], { evaluated: 0, missingInput: 2 });
      assert.deepEqual(result.coverage[RULE_IDS.LAYER_PRIORITY], { evaluated: 0, missingInput: 2 });
    });
  });

  describe("Rule Pack Metadata", () => {
    it("records rulePackVersion, standard and executed rules", () => {
      const result = validateThreeByThreeRules([]);

      assert.equal(result.rulePackVersion, "smartcheck-3x3-2026-10-v2");
      assert.equal(result.activeStandard, "TBDY_TS500");
      assert.deepEqual(result.executedRules, [
        "RULE_3X3_QTO_TOLERANCE_3PCT",
        "RULE_3X3_COVER_MIN_TS500",
        "RULE_3X3_LAYER_PRIORITY",
      ]);
    });
  });
});
