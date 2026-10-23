/**
 * BIMMetraj SmartCheck 3x3 rule pack.
 *
 * 3x3 is a COMPANY POLICY, not a normative requirement. Its canonical definition:
 *  (a) metraj deviation ≤ 3% — company policy (no TS 500 / ISO 19650 tolerance exists),
 *  (b) concrete cover not below the minimum of the company's active standard, in mm
 *      (TS 500: columns/beams 20 mm inside, 25 mm outside; slabs 15 mm;
 *       Eurocode 2 XC3: cnom 35 mm only when activeStandard = EUROCODE_2),
 *  (c) load-bearing elements modelled in the STR discipline — company policy.
 * Every violation carries its source so reviewers can tell policy from standard.
 */

export const SMARTCHECK_3X3_RULE_PACK_VERSION = "smartcheck-3x3-2026-10-v2";

export const RULE_IDS = {
  QTO_TOLERANCE_3PCT: "RULE_3X3_QTO_TOLERANCE_3PCT",
  COVER_MIN_TS500: "RULE_3X3_COVER_MIN_TS500",
  XC3_COVER_35MM: "RULE_3X3_XC3_COVER_35MM",
  LAYER_PRIORITY: "RULE_3X3_LAYER_PRIORITY",
} as const;

type RuleId = (typeof RULE_IDS)[keyof typeof RULE_IDS];
export type ActiveStandard = "TBDY_TS500" | "EUROCODE_2" | "ACI_318";

export interface RuleSource {
  kind: "company_policy" | "standard";
  reference: string;
}

const SOURCES: Record<RuleId, RuleSource> = {
  [RULE_IDS.QTO_TOLERANCE_3PCT]: { kind: "company_policy", reference: "BIMMetraj 3x3 şirket politikası: metraj sapması ≤ %3 (normatif değil)" },
  [RULE_IDS.COVER_MIN_TS500]: { kind: "standard", reference: "TS 500:2000 Md. 7.3, 7.4 (net örtü iç 20 / dış 25 mm), Md. 11.2.2 (döşeme 15 mm)" },
  [RULE_IDS.XC3_COVER_35MM]: { kind: "standard", reference: "TS EN 1992-1-1 Tablo 4.4N, XC3, S4: cmin,dur 25 + Δcdev 10 = cnom 35 mm" },
  [RULE_IDS.LAYER_PRIORITY]: { kind: "company_policy", reference: "BIMMetraj 3x3 şirket politikası: taşıyıcı eleman STR disiplininde" },
};

const TS500_MIN_COVER_MM = { interior: 20, exterior: 25, slab: 15 } as const;
const EC2_XC3_NOMINAL_COVER_MM = 35;
const QTO_TOLERANCE_PERCENT = 3;

export interface ThreeByThreeItem {
  elementId: string;
  elementType?: string;
  discipline?: "STR" | "ARC" | "MEP" | string;
  layer?: string;
  loadBearing?: boolean;
  actualQuantity?: number;
  expectedQuantity?: number;
  exposure?: "interior" | "exterior";
  exposureClass?: string;
  coverMm?: number;
  memberType?: "beam" | "column" | "slab" | "wall" | "foundation" | "other";
  surfaceCondition?: "interior" | "exterior" | "soil_contact" | "unknown";
}

export interface ThreeByThreeRuleViolation {
  ruleId: string;
  ruleVersion: string;
  elementId: string;
  severity: "error" | "warning";
  message: string;
  actualValue: number | string;
  thresholdValue: number | string;
  source: RuleSource;
}

export interface RuleCoverage {
  evaluated: number;
  missingInput: number;
}

export interface ThreeByThreeValidationResult {
  rulePackVersion: string;
  activeStandard: ActiveStandard;
  executedRules: string[];
  isValid: boolean;
  /** not_evaluated: no rule had its inputs; isValid alone would read as a false pass. */
  status: "passed" | "failed" | "not_evaluated" | "manual_review_required";
  /** Aggregate fail-closed decision for legacy and new consumers. */
  decision: "passed" | "failed" | "not_evaluated" | "manual_review_required";
  /** Company-policy violations that may drive the product-level pass/fail. */
  violations: ThreeByThreeRuleViolation[];
  /** Licensed-standard observations require expert review and never drive legacy pass/fail. */
  normativeObservations: ThreeByThreeRuleViolation[];
  /** How many elements each rule could evaluate; missing inputs are never counted as passes. */
  coverage: Record<string, RuleCoverage>;
  governance: {
    activeStandardSelection: "explicit" | "legacy_default";
    companyPolicyDecision: "passed" | "failed" | "not_evaluated";
    normativeDecision: "manual_review_required" | "not_evaluated";
    accessRequiredSources: string[];
    unsupportedReasons: string[];
    unsupportedElementIds: string[];
  };
  summary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

type Check = (item: ThreeByThreeItem) => Omit<ThreeByThreeRuleViolation, "ruleId" | "ruleVersion" | "elementId" | "source"> | null | undefined;

const normalizedElementType = (item: ThreeByThreeItem) => item.elementType?.toLowerCase() ?? "";
const isSlab = (item: ThreeByThreeItem) => item.memberType === "slab" || normalizedElementType(item).includes("slab");
const isUnsupportedCoverContext = (item: ThreeByThreeItem) =>
  item.memberType === "foundation"
  || item.surfaceCondition === "soil_contact"
  || /footing|foundation/.test(normalizedElementType(item));

const checks: Record<RuleId, Check> = {
  [RULE_IDS.QTO_TOLERANCE_3PCT]: item => {
    if (typeof item.actualQuantity !== "number" || typeof item.expectedQuantity !== "number" || item.expectedQuantity <= 0) return undefined;
    // Rounded to 0.001% so 3.00% passes and 3.0001% (float noise) does not flip the result.
    const deviation = Math.round((Math.abs(item.actualQuantity - item.expectedQuantity) / item.expectedQuantity) * 100 * 1000) / 1000;
    if (deviation <= QTO_TOLERANCE_PERCENT) return null;
    return { severity: "warning", message: `Metraj sapması %${deviation.toFixed(2)} ile şirket politikasındaki %3.00 sınırını aştı.`, actualValue: deviation, thresholdValue: QTO_TOLERANCE_PERCENT };
  },
  [RULE_IDS.COVER_MIN_TS500]: item => {
    if (isUnsupportedCoverContext(item)) return undefined;
    if (item.surfaceCondition !== "interior" && item.surfaceCondition !== "exterior") return undefined;
    if (typeof item.coverMm !== "number" || (!isSlab(item) && !item.exposure)) return undefined;
    const minimum = isSlab(item) ? TS500_MIN_COVER_MM.slab : TS500_MIN_COVER_MM[item.exposure!];
    if (item.coverMm >= minimum) return null;
    return { severity: "error", message: `Net beton örtüsü ${item.coverMm} mm, TS 500 asgari ${minimum} mm şartını sağlamıyor.`, actualValue: item.coverMm, thresholdValue: minimum };
  },
  [RULE_IDS.XC3_COVER_35MM]: item => {
    if (item.exposureClass?.toUpperCase() !== "XC3" || typeof item.coverMm !== "number") return undefined;
    if (item.coverMm >= EC2_XC3_NOMINAL_COVER_MM) return null;
    return { severity: "error", message: `XC3 maruziyet sınıfında paspayı (${item.coverMm} mm) asgari 35 mm nominal beton örtüsü şartını sağlamıyor (Eurocode 2 Tablo 4.4N).`, actualValue: item.coverMm, thresholdValue: EC2_XC3_NOMINAL_COVER_MM };
  },
  [RULE_IDS.LAYER_PRIORITY]: item => {
    if (item.loadBearing !== true || !item.discipline) return undefined;
    if (item.discipline.toUpperCase() === "STR") return null;
    return { severity: "warning", message: `Taşıyıcı eleman (LoadBearing=true) statik disiplin (STR) yerine ${item.discipline} disiplininde tanımlanmış.`, actualValue: item.discipline, thresholdValue: "STR" };
  },
};

const ACTIVE_STANDARDS: readonly ActiveStandard[] = ["TBDY_TS500", "EUROCODE_2", "ACI_318"];

export function isActiveStandard(value: unknown): value is ActiveStandard {
  return ACTIVE_STANDARDS.includes(value as ActiveStandard);
}

function rulesFor(activeStandard: ActiveStandard): RuleId[] {
  if (!isActiveStandard(activeStandard)) throw new Error("UNKNOWN_ACTIVE_STANDARD");
  // ACI 318 cover tables are not sourced in this pack, so no cover threshold is invented for it.
  const cover = activeStandard === "TBDY_TS500" ? [RULE_IDS.COVER_MIN_TS500] : activeStandard === "EUROCODE_2" ? [RULE_IDS.XC3_COVER_35MM] : [];
  return [RULE_IDS.QTO_TOLERANCE_3PCT, ...cover, RULE_IDS.LAYER_PRIORITY];
}

export function validateThreeByThreeRules(
  items: ThreeByThreeItem[],
  options: { activeStandard?: ActiveStandard } = {},
): ThreeByThreeValidationResult {
  const activeStandard = options.activeStandard ?? "TBDY_TS500";
  const activeStandardSelection = options.activeStandard ? "explicit" : "legacy_default";
  const executedRules = rulesFor(activeStandard);
  const coverage = Object.fromEntries(executedRules.map(ruleId => [ruleId, { evaluated: 0, missingInput: 0 }])) as Record<string, RuleCoverage>;
  const violations: ThreeByThreeRuleViolation[] = [];
  const normativeObservations: ThreeByThreeRuleViolation[] = [];
  let failed = 0;

  for (const item of items) {
    const itemViolations = executedRules.flatMap(ruleId => {
      const outcome = checks[ruleId](item);
      const tally = coverage[ruleId];
      coverage[ruleId] = outcome === undefined
        ? { ...tally, missingInput: tally.missingInput + 1 }
        : { ...tally, evaluated: tally.evaluated + 1 };
      return outcome ? [{ ...outcome, ruleId, ruleVersion: SMARTCHECK_3X3_RULE_PACK_VERSION, elementId: item.elementId, source: SOURCES[ruleId] }] : [];
    });
    const policyViolations = itemViolations.filter(violation => violation.source.kind === "company_policy");
    const standardObservations = itemViolations.filter(violation => violation.source.kind === "standard");
    if (policyViolations.length) failed++;
    violations.push(...policyViolations);
    normativeObservations.push(...standardObservations);
  }

  const evaluated = Object.values(coverage).some(tally => tally.evaluated > 0);
  const companyRuleIds = [RULE_IDS.QTO_TOLERANCE_3PCT, RULE_IDS.LAYER_PRIORITY];
  const companyEvaluated = companyRuleIds.some(ruleId => (coverage[ruleId]?.evaluated ?? 0) > 0);
  const companyFailed = violations.some(violation => violation.source.kind === "company_policy");
  const normativeRuleIds = executedRules.filter(ruleId => SOURCES[ruleId].kind === "standard");
  const unsupportedElementIds = items.filter(isUnsupportedCoverContext).map(item => item.elementId);
  const normativeEvaluated = normativeRuleIds.some(ruleId => (coverage[ruleId]?.evaluated ?? 0) > 0);
  const normativeReviewable = normativeEvaluated && activeStandardSelection === "explicit";
  const accessRequiredSources = normativeReviewable
    ? activeStandard === "TBDY_TS500" ? ["TS500"] : activeStandard === "EUROCODE_2" ? ["EUROCODE_2"] : []
    : [];
  const unsupportedReasons = [
    ...(activeStandard === "ACI_318" ? ["ACI 318 için lisanslı ve sürümü sabitlenmiş paspayı kural paketi yüklü değil."] : []),
    ...(unsupportedElementIds.length ? [`${unsupportedElementIds.length} temel veya zeminle temas eden eleman için doğrulanmış örtü kuralı bu pakette bulunmuyor.`] : []),
    ...(activeStandardSelection === "legacy_default" ? ["Aktif standart açıkça seçilmedi; eski varsayılan normatif karar üretmez."] : []),
  ];
  const decision: ThreeByThreeValidationResult["decision"] = companyFailed
    ? "failed"
    : normativeReviewable
        ? "manual_review_required"
        : "not_evaluated";
  return {
    rulePackVersion: SMARTCHECK_3X3_RULE_PACK_VERSION,
    activeStandard,
    executedRules,
    isValid: false,
    status: decision,
    decision,
    violations,
    normativeObservations,
    coverage,
    governance: {
      activeStandardSelection,
      companyPolicyDecision: companyFailed ? "failed" : companyEvaluated ? "passed" : "not_evaluated",
      normativeDecision: normativeReviewable ? "manual_review_required" : "not_evaluated",
      accessRequiredSources,
      unsupportedReasons,
      unsupportedElementIds,
    },
    summary: { totalChecked: items.length, passed: items.length - failed, failed },
  };
}
