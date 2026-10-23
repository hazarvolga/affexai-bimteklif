export type EvaluationStatus =
  | "passed"
  | "failed"
  | "not_evaluated"
  | "manual_review_required"
  | "unsupported";

export type GovernanceStatus =
  | "approved"
  | "advisory"
  | "expert_review_required"
  | "access_required"
  | "identity_pending"
  | "scope_pending";

export interface RuleContext {
  ruleId: string;
  ruleVersion: string;
  jurisdiction: string;
  evaluationDate: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceIds: string[];
  governanceStatus: GovernanceStatus;
  unitPolicy: string;
  roundingPolicy: string;
}

export interface EvaluationEnvelope<T> {
  status: EvaluationStatus;
  value: T | null;
  context: RuleContext;
  missingInputs: string[];
  reasons: string[];
}

interface BuildEvaluationInput<T> {
  requestedStatus: EvaluationStatus;
  value: T | null;
  context: RuleContext;
  missingInputs?: string[];
  reasons?: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) {
    throw new Error(`${field} must be an ISO YYYY-MM-DD date`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid ISO YYYY-MM-DD date`);
  }
}

function assertContext(context: RuleContext): void {
  const requiredText: Array<[string, string]> = [
    ["ruleId", context.ruleId], ["ruleVersion", context.ruleVersion],
    ["jurisdiction", context.jurisdiction], ["unitPolicy", context.unitPolicy],
    ["roundingPolicy", context.roundingPolicy],
  ];
  for (const [field, value] of requiredText) {
    if (!value.trim()) throw new Error(`${field} must not be blank`);
  }
  if (context.sourceIds.length === 0 || context.sourceIds.some(sourceId => !sourceId.trim())) {
    throw new Error("sourceIds must contain non-blank source identifiers");
  }
}

export function isRuleEffective(context: RuleContext): boolean {
  assertContext(context);
  assertIsoDate(context.evaluationDate, "evaluationDate");
  if (context.effectiveFrom) assertIsoDate(context.effectiveFrom, "effectiveFrom");
  if (context.effectiveTo) assertIsoDate(context.effectiveTo, "effectiveTo");
  if (context.effectiveFrom && context.effectiveTo && context.effectiveFrom > context.effectiveTo) {
    throw new Error("effectiveFrom must not be after effectiveTo");
  }

  if (context.effectiveFrom && context.evaluationDate < context.effectiveFrom) return false;
  if (context.effectiveTo && context.evaluationDate > context.effectiveTo) return false;
  return true;
}

export function buildEvaluation<T>(input: BuildEvaluationInput<T>): EvaluationEnvelope<T> {
  const missingInputs = [...new Set(input.missingInputs ?? [])];
  const reasons = [...(input.reasons ?? [])];

  if (missingInputs.length > 0) {
    return {
      status: "not_evaluated",
      value: null,
      context: input.context,
      missingInputs,
      reasons: [...reasons, "Required inputs are missing."],
    };
  }

  if (!isRuleEffective(input.context)) {
    return {
      status: "unsupported",
      value: null,
      context: input.context,
      missingInputs,
      reasons: [...reasons, "The selected rule is not effective on the evaluation date."],
    };
  }

  if ((input.requestedStatus === "passed" || input.requestedStatus === "failed") && input.value === null) {
    return {
      status: "not_evaluated",
      value: null,
      context: input.context,
      missingInputs: ["evaluationValue"],
      reasons: [...reasons, "A decision status requires an evaluation value."],
    };
  }

  if (input.requestedStatus === "passed" && input.context.governanceStatus !== "approved") {
    return {
      status: "manual_review_required",
      value: input.value,
      context: input.context,
      missingInputs,
      reasons: [...reasons, `A normative pass requires approved governance; current status is ${input.context.governanceStatus}.`],
    };
  }

  return {
    status: input.requestedStatus,
    value: input.requestedStatus === "unsupported" || input.requestedStatus === "not_evaluated" ? null : input.value,
    context: input.context,
    missingInputs,
    reasons,
  };
}
