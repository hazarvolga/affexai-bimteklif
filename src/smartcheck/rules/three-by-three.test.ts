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

  describe("XC3 Exposure Class 35mm Cover Boundary Checks", () => {
    it("passes when cover exceeds 35mm (e.g. 36mm)", () => {
      const result = validateThreeByThreeRules([
        {
          elementId: "COL_001",
          exposureClass: "XC3",
          coverMm: 36,
        },
      ]);

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
      ]);

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
      ]);

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
      ]);

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

  describe("Rule Pack Metadata", () => {
    it("records rulePackVersion and full executedRules set", () => {
      const result = validateThreeByThreeRules([]);

      assert.equal(result.rulePackVersion, "smartcheck-3x3-2024-v1");
      assert.deepEqual(result.executedRules, [
        "RULE_3X3_QTO_TOLERANCE_3PCT",
        "RULE_3X3_XC3_COVER_35MM",
        "RULE_3X3_LAYER_PRIORITY",
      ]);
    });
  });
});
