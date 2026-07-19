import { EvaluationMetrics, RuleCandidateEvaluationInput } from './types';
import { MatchResult } from './matcher';

export interface ComputeMetricsInput {
  expectedCount: number;
  validCandidates: RuleCandidateEvaluationInput[];
  invalidCandidatesCount: number;
  matchResult: MatchResult;
  evidenceExactMatchRate: number | null;
}

/**
 * Değerlendirme metriklerini hesaplar.
 */
export function computeMetrics(input: ComputeMetricsInput): EvaluationMetrics {
  const expectedRuleCount = input.expectedCount;

  const schemaValidCandidateCount = input.validCandidates.length;
  const schemaInvalidCandidateCount = input.invalidCandidatesCount;
  const candidateRuleCount = schemaValidCandidateCount + schemaInvalidCandidateCount;

  // Schema Validity Rate
  let schemaValidityRate = 1.0;
  if (candidateRuleCount > 0) {
    schemaValidityRate = schemaValidCandidateCount / candidateRuleCount;
  }

  // True Positive, Duplicate ve Hallucination Sayımı
  const truePositive = input.matchResult.matches.length;
  const duplicateCount = input.matchResult.duplicateCandidates.length;

  // Hallucination: expected listesinde karşılığı olmayan ve duplicate olmayan adaylar.
  // Bu değer matchResult.unmatchedCandidates uzunluğuna eşittir.
  const hallucinationCount = input.matchResult.unmatchedCandidates.length;

  // False Positive: expected ile eşleşmeyen geçerli aday sayısı
  // Eşitlik kuralı: falsePositive = duplicateCount + hallucinationCount
  const falsePositive = duplicateCount + hallucinationCount;

  // False Negative: eşleşmeyen expected kural sayısı
  const falseNegative = input.matchResult.unmatchedExpected.length;

  // Precision
  let precision = 1.0;
  if (truePositive + falsePositive > 0) {
    precision = truePositive / (truePositive + falsePositive);
  }

  // Recall
  let recall = 1.0;
  if (truePositive + falseNegative > 0) {
    recall = truePositive / (truePositive + falseNegative);
  }

  // F1 Score
  let f1Score = 0.0;
  if (precision + recall > 0) {
    f1Score = (2 * precision * recall) / (precision + recall);
  }

  return {
    expectedRuleCount,
    candidateRuleCount,
    truePositive,
    falsePositive,
    falseNegative,
    precision,
    recall,
    f1Score,
    duplicateCount,
    hallucinationCount,
    schemaValidCandidateCount,
    schemaInvalidCandidateCount,
    schemaValidityRate,
    evidenceExactMatchRate: input.evidenceExactMatchRate
  };
}
