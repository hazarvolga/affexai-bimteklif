import type { IfcSmartCheckEvidenceArtifact } from "../../ifc/smartcheck-evidence";
import type { Finding } from "../import/normalize";
import { validateEpysRules, type EpysValidationResult } from "./epys";
import { validateThreeByThreeRules, type ActiveStandard, type ThreeByThreeItem, type ThreeByThreeValidationResult } from "./three-by-three";

export interface IfcRuleEvaluations {
  evaluatedOn: "server";
  threeByThree: ThreeByThreeValidationResult;
  epys: EpysValidationResult;
}

function threeByThreeItems(artifact: IfcSmartCheckEvidenceArtifact): ThreeByThreeItem[] {
  // The extractor does not yet emit cover, exposure, discipline or LoadBearing; coverage reports that gap.
  return artifact.rows.map(row => ({
    elementId: row.formulaJson.elementStepId ?? row.sourceCellRange,
    elementType: row.rawDescription.split(" ")[0],
  }));
}

/** Runs the 3x3 and e-PYS rule packs on the server for one IFC SmartCheck run (E-1, E-6). */
export function evaluateIfcRulePacks(artifact: IfcSmartCheckEvidenceArtifact, activeStandard: ActiveStandard): IfcRuleEvaluations {
  return {
    evaluatedOn: "server",
    threeByThree: validateThreeByThreeRules(threeByThreeItems(artifact), { activeStandard }),
    epys: validateEpysRules({
      complianceData: artifact.summary.trPsetCsb,
      elementsWithPozNoCount: artifact.summary.elementsWithPozNoCount,
      totalElementsCount: artifact.summary.elementsWithPozNoCount + artifact.summary.elementsMissingPozNoCount,
    }),
  };
}

/** Returns a new artifact carrying the rule results, with 3x3 violations attached to their rows as findings. */
export function applyIfcRuleEvaluations(artifact: IfcSmartCheckEvidenceArtifact, evaluations: IfcRuleEvaluations): IfcSmartCheckEvidenceArtifact {
  const findingsByElement = new Map<string, Finding[]>();
  for (const violation of evaluations.threeByThree.violations) {
    const finding: Finding = {
      code: violation.ruleId,
      severity: violation.severity === "error" ? "high" : "medium",
      message: violation.message,
      ruleVersion: violation.ruleVersion,
      suggestion: `Kaynak: ${violation.source.reference}`,
    };
    findingsByElement.set(violation.elementId, [...(findingsByElement.get(violation.elementId) ?? []), finding]);
  }
  return {
    ...artifact,
    rows: artifact.rows.map(row => {
      const extra = findingsByElement.get(row.formulaJson.elementStepId ?? row.sourceCellRange);
      return extra ? { ...row, findingsJson: [...row.findingsJson, ...extra] } : row;
    }),
    ruleEvaluations: evaluations,
  };
}
