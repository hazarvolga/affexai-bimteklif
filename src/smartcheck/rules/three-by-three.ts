/**
 * TeklifPro SmartCheck 3x3 Rules Engine
 * Implements versioned 3x3 domain validation rules:
 * 1. 3.00% QTO / Volume tolerance boundary check (TS 500 / ISO 19650)
 * 2. XC3 Exposure Class 35mm concrete cover check (Eurocode 2 EN 1992-1-1 Table 4.4N)
 * 3. Structural vs Architectural discipline layer priority hierarchy
 */

export const SMARTCHECK_3X3_RULE_PACK_VERSION = "smartcheck-3x3-2024-v1";

export const RULE_IDS = {
  QTO_TOLERANCE_3PCT: "RULE_3X3_QTO_TOLERANCE_3PCT",
  XC3_COVER_35MM: "RULE_3X3_XC3_COVER_35MM",
  LAYER_PRIORITY: "RULE_3X3_LAYER_PRIORITY",
} as const;

export interface ThreeByThreeItem {
  elementId: string;
  discipline?: "STR" | "ARC" | "MEP" | string;
  layer?: string;
  loadBearing?: boolean;
  actualQuantity?: number;
  expectedQuantity?: number;
  exposureClass?: string;
  coverMm?: number;
}

export interface ThreeByThreeRuleViolation {
  ruleId: string;
  ruleVersion: string;
  elementId: string;
  severity: "error" | "warning";
  message: string;
  actualValue: number | string;
  thresholdValue: number | string;
}

export interface ThreeByThreeValidationResult {
  rulePackVersion: string;
  executedRules: string[];
  isValid: boolean;
  violations: ThreeByThreeRuleViolation[];
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

export function validateThreeByThreeRules(items: ThreeByThreeItem[]): ThreeByThreeValidationResult {
  const executedRules = [
    RULE_IDS.QTO_TOLERANCE_3PCT,
    RULE_IDS.XC3_COVER_35MM,
    RULE_IDS.LAYER_PRIORITY,
  ];

  const violations: ThreeByThreeRuleViolation[] = [];
  let totalChecked = 0;
  let failed = 0;

  for (const item of items) {
    totalChecked++;
    let itemHasViolation = false;

    // 1. QTO Tolerance Rule: maximum allowed deviation is 3.00%
    if (
      typeof item.actualQuantity === "number" &&
      typeof item.expectedQuantity === "number" &&
      item.expectedQuantity > 0
    ) {
      const percentageDeviation =
        (Math.abs(item.actualQuantity - item.expectedQuantity) / item.expectedQuantity) * 100;
      
      // Floating point safe comparison: threshold is strictly 3.00%
      // 2.99% <= 3.00% -> PASS; 3.00% <= 3.00% -> PASS; 3.0001% > 3.00% -> FAIL
      const roundedDev = Math.round(percentageDeviation * 1000) / 1000;
      if (roundedDev > 3.00) {
        violations.push({
          ruleId: RULE_IDS.QTO_TOLERANCE_3PCT,
          ruleVersion: SMARTCHECK_3X3_RULE_PACK_VERSION,
          elementId: item.elementId,
          severity: "warning",
          message: `Metraj sapması %${roundedDev.toFixed(2)} ile izin verilen %3.00 tolerans sınırını aştı.`,
          actualValue: roundedDev,
          thresholdValue: 3.00,
        });
        itemHasViolation = true;
      }
    }

    // 2. XC3 Cover Rule: minimum nominal cover is 35 mm
    if (
      item.exposureClass?.toUpperCase() === "XC3" &&
      typeof item.coverMm === "number"
    ) {
      if (item.coverMm < 35) {
        violations.push({
          ruleId: RULE_IDS.XC3_COVER_35MM,
          ruleVersion: SMARTCHECK_3X3_RULE_PACK_VERSION,
          elementId: item.elementId,
          severity: "error",
          message: `XC3 maruziyet sınıfında paspayı (${item.coverMm} mm) asgari 35 mm nominal beton örtüsü şartını sağlamıyor (Eurocode 2 Tablo 4.4N).`,
          actualValue: item.coverMm,
          thresholdValue: 35,
        });
        itemHasViolation = true;
      }
    }

    // 3. Layer Priority Rule: For load-bearing elements, structural model (STR) takes precedence
    if (item.loadBearing === true && item.discipline) {
      const disc = item.discipline.toUpperCase();
      if (disc !== "STR") {
        violations.push({
          ruleId: RULE_IDS.LAYER_PRIORITY,
          ruleVersion: SMARTCHECK_3X3_RULE_PACK_VERSION,
          elementId: item.elementId,
          severity: "warning",
          message: `Taşıyıcı eleman (LoadBearing=true) statik disiplin (STR) yerine ${item.discipline} disiplininde tanımlanmış.`,
          actualValue: item.discipline,
          thresholdValue: "STR",
        });
        itemHasViolation = true;
      }
    }

    if (itemHasViolation) {
      failed++;
    }
  }

  return {
    rulePackVersion: SMARTCHECK_3X3_RULE_PACK_VERSION,
    executedRules,
    isValid: violations.length === 0,
    violations,
    summary: {
      totalChecked,
      passed: totalChecked - failed,
      failed,
    },
  };
}
