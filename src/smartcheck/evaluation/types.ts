import { z } from 'zod';
import { SourceEvidenceSchema } from '../schemas/source-evidence.schema';

export const OperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'matches_regex',
  'greater_than',
  'less_than'
]);

export const ErrorCategorySchema = z.enum([
  'classification_code',
  'quantity_unit',
  'modeling_standard',
  'missing_duplicate',
  'pricing_margin'
]);

export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const RuleScopeTypeSchema = z.enum(['company', 'quotation']);

export const SourceEvidenceListSchema = z.array(SourceEvidenceSchema).min(1);

export const ManifestExpectationOutcomeSchema = z.enum([
  'rules_found',
  'no_rules',
  'unsupported',
  'corrupt',
  'password_protected',
  'parse_failure'
]);

export const EvaluationManifestSchema = z.object({
  schemaVersion: z.literal(1),
  caseId: z.string().min(1),
  dataset: z.enum(['development', 'blind-evaluation', 'robustness']),
  input: z.object({
    file: z.string().min(1),
    mimeType: z.string().min(1),
    language: z.array(z.string()).min(1)
  }).strict(),
  expectation: z.object({
    outcome: ManifestExpectationOutcomeSchema,
    expectedRuleCount: z.number().int().nonnegative()
  }).strict(),
  tags: z.array(z.string())
}).strict();

export type EvaluationManifest = z.infer<typeof EvaluationManifestSchema>;

export const ExpectedRuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  canonicalStatement: z.string().min(1),
  discipline: z.string().min(1),
  objectType: z.string().min(1).nullable(),
  parameter: z.string().min(1).nullable(),
  operator: OperatorSchema.nullable(),
  expectedValue: z.string().nullable(),
  errorCategory: ErrorCategorySchema,
  severity: SeveritySchema,
  scopeType: RuleScopeTypeSchema,
  competencyArea: z.string().min(1).nullable(),
  sourceEvidence: SourceEvidenceListSchema
});

export const ExpectedRuleListSchema = z.array(ExpectedRuleSchema);
export type ExpectedRule = z.infer<typeof ExpectedRuleSchema>;
export type ExpectedRuleList = z.infer<typeof ExpectedRuleListSchema>;

export const RuleCandidateEvaluationInputSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  canonicalStatement: z.string().min(1),
  discipline: z.string().min(1),
  objectType: z.string().min(1).nullable(),
  parameter: z.string().min(1).nullable(),
  operator: OperatorSchema.nullable(),
  expectedValue: z.string().nullable(),
  errorCategory: ErrorCategorySchema,
  severity: SeveritySchema,
  scopeType: RuleScopeTypeSchema,
  competencyArea: z.string().min(1).nullable(),
  sourceEvidence: SourceEvidenceListSchema
});

export type RuleCandidateEvaluationInput = z.infer<typeof RuleCandidateEvaluationInputSchema>;

export const CandidateProviderSuccessSchema = z.object({
  status: z.literal('success'),
  candidates: z.array(z.unknown()),
  usage: z.object({
    durationMs: z.number().nonnegative().optional(),
    estimatedCostUsd: z.number().nonnegative().optional()
  }).strict().optional()
}).strict();

export const CandidateProviderFailureSchema = z.object({
  status: z.enum([
    'unsupported',
    'corrupt',
    'password_protected',
    'parse_failure'
  ]),
  errorCode: z.string().optional(),
  safeMessage: z.string().optional()
}).strict();

export const CandidateProviderResultSchema = z.discriminatedUnion('status', [
  CandidateProviderSuccessSchema,
  CandidateProviderFailureSchema
]);

export type CandidateProviderResult = z.infer<typeof CandidateProviderResultSchema>;

export interface EvaluationFixture {
  manifest: EvaluationManifest;
  expectedRules: ExpectedRule[];
  fixtureRoot: string;
  caseDirectory: string;
  manifestPath: string;
  inputPath: string;
  expectedRulesPath: string;
  candidateOutputPath: string;
}

export interface CandidateProvider {
  evaluate(fixture: EvaluationFixture): Promise<CandidateProviderResult>;
}

export interface EvaluationMetrics {
  expectedRuleCount: number;
  candidateRuleCount: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1Score: number;
  duplicateCount: number;
  hallucinationCount: number;
  schemaValidCandidateCount: number;
  schemaInvalidCandidateCount: number;
  schemaValidityRate: number;
  evidenceExactMatchRate: number | null;
}

export interface RunMetadata {
  runId: string;
  startedAt: string;
  completedAt: string;
  evaluationDurationMs: number;
  estimatedCostUsd: number;
  providerName: string;
  providerVersion: string;
}

export interface RuleMismatchReport {
  expectedRuleId: string;
  matchedCandidateFingerprint?: string;
  mismatchFields: {
    field: string;
    expected: string;
    candidate: string;
  }[];
}

export type DatasetType = 'development' | 'blind-evaluation' | 'robustness';

export type ProviderFailureStatus = 'unsupported' | 'corrupt' | 'password_protected' | 'parse_failure';

export interface InvalidCandidateDiagnostic {
  candidateId: string | null;
  rawPayloadHash: string;
  issues: string[];
}

export interface MatchRecord {
  expectedRuleId: string;
  candidateId: string;
  fingerprint: string;
}

export interface RuleExtractionEvaluationResult {
  resultType: 'rule_evaluation';
  caseId: string;
  dataset: DatasetType;
  expectedOutcome: 'rules_found' | 'no_rules';
  actualOutcome: 'success';
  outcomeMatched: boolean;
  qualityGatePassed: boolean;
  metrics: EvaluationMetrics;
  matches: MatchRecord[];
  unmatchedExpected: string[];
  unmatchedCandidates: string[];
  invalidCandidates: InvalidCandidateDiagnostic[];
  mismatches: RuleMismatchReport[];
}

export interface OutcomeEvaluationResult {
  resultType: 'outcome_evaluation';
  caseId: string;
  dataset: DatasetType;
  expectedOutcome: 'unsupported' | 'corrupt' | 'password_protected' | 'parse_failure';
  actualOutcome: CandidateProviderResult['status'];
  outcomeMatched: boolean;
  qualityGatePassed: boolean;
}

export interface UnexpectedProviderFailureResult {
  resultType: 'unexpected_provider_failure';
  caseId: string;
  dataset: DatasetType;
  expectedOutcome: 'rules_found' | 'no_rules';
  actualOutcome: ProviderFailureStatus;
  outcomeMatched: false;
  qualityGatePassed: false;
  errorCode?: string;
  safeMessage?: string;
}

export type CaseEvaluationResult =
  | RuleExtractionEvaluationResult
  | OutcomeEvaluationResult
  | UnexpectedProviderFailureResult;

export type EvaluationErrorCode =
  | 'EVALUATION_DUPLICATE_CANDIDATE_ID'
  | 'EVALUATION_METRIC_INVARIANT_FAILED'
  | 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE';

export class EvaluationError extends Error {
  constructor(
    public readonly code: EvaluationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'EvaluationError';
  }
}
