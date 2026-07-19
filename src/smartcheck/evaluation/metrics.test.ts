import { test } from 'node:test';
import assert from 'node:assert';
import { computeMetrics, ComputeMetricsInput } from './metrics';

const mockMatchResultEmpty = {
  matches: [],
  unmatchedExpected: [],
  unmatchedCandidates: [],
  duplicateCandidates: [],
  mismatches: []
};

test('metrics: expected = 0, candidates = 0 edge case', () => {
  const input: ComputeMetricsInput = {
    expectedCount: 0,
    validCandidates: [],
    invalidCandidatesCount: 0,
    matchResult: mockMatchResultEmpty,
    evidenceExactMatchRate: null
  };

  const metrics = computeMetrics(input);

  assert.strictEqual(metrics.expectedRuleCount, 0);
  assert.strictEqual(metrics.candidateRuleCount, 0);
  assert.strictEqual(metrics.truePositive, 0);
  assert.strictEqual(metrics.falsePositive, 0);
  assert.strictEqual(metrics.falseNegative, 0);
  assert.strictEqual(metrics.schemaValidityRate, 1.0);
  assert.strictEqual(metrics.precision, 1.0);
  assert.strictEqual(metrics.recall, 1.0);
  assert.strictEqual(metrics.f1Score, 1.0);
  assert.strictEqual(metrics.evidenceExactMatchRate, null);
});

test('metrics: expected > 0, candidates = 0 edge case', () => {
  const input: ComputeMetricsInput = {
    expectedCount: 2,
    validCandidates: [],
    invalidCandidatesCount: 0,
    matchResult: {
      ...mockMatchResultEmpty,
      unmatchedExpected: [{} as any, {} as any] // 2 unmatched expected
    },
    evidenceExactMatchRate: null
  };

  const metrics = computeMetrics(input);

  assert.strictEqual(metrics.expectedRuleCount, 2);
  assert.strictEqual(metrics.candidateRuleCount, 0);
  assert.strictEqual(metrics.truePositive, 0);
  assert.strictEqual(metrics.falsePositive, 0);
  assert.strictEqual(metrics.falseNegative, 2);
  assert.strictEqual(metrics.schemaValidityRate, 1.0);
  assert.strictEqual(metrics.precision, 1.0);
  assert.strictEqual(metrics.recall, 0.0);
  assert.strictEqual(metrics.f1Score, 0.0);
});

test('metrics: duplicate and hallucination invariant checks', () => {
  // expected Count = 2, candidate Count = 3 (1 match, 1 duplicate, 1 unmatched)
  const input: ComputeMetricsInput = {
    expectedCount: 2,
    validCandidates: [{} as any, {} as any, {} as any],
    invalidCandidatesCount: 0,
    matchResult: {
      matches: [{ expectedRuleId: 'exp-1', candidateId: 'cand-1', fingerprint: 'fp-1' }],
      unmatchedExpected: [{} as any], // 1 unmatched expected
      unmatchedCandidates: [{} as any], // 1 hallucinated/unmatched candidate
      duplicateCandidates: [{} as any], // 1 duplicate candidate
      mismatches: []
    },
    evidenceExactMatchRate: 0.5
  };

  const metrics = computeMetrics(input);

  assert.strictEqual(metrics.truePositive, 1);
  assert.strictEqual(metrics.duplicateCount, 1);
  assert.strictEqual(metrics.hallucinationCount, 1);
  assert.strictEqual(metrics.falsePositive, 2);
  assert.strictEqual(metrics.falseNegative, 1);

  // Invariant test: FP = duplicateCount + hallucinationCount
  assert.strictEqual(metrics.falsePositive, metrics.duplicateCount + metrics.hallucinationCount);
});

test('metrics: complete metrics mathematical invariants and invalid candidate handling', () => {
  // expected = 3, valid candidates = 2 (1 match, 1 duplicate/hallucination), invalid candidates = 1
  const input: ComputeMetricsInput = {
    expectedCount: 3,
    validCandidates: [{} as any, {} as any], // 2 valid candidates
    invalidCandidatesCount: 1, // 1 invalid candidate
    matchResult: {
      matches: [{ expectedRuleId: 'exp-1', candidateId: 'cand-1', fingerprint: 'fp-1' }],
      unmatchedExpected: [{} as any, {} as any], // 2 unmatched expected (FN = 2)
      unmatchedCandidates: [{} as any], // 1 unmatched candidate (hallucination)
      duplicateCandidates: [], // 0 duplicate
      mismatches: []
    },
    evidenceExactMatchRate: null
  };

  const metrics = computeMetrics(input);

  // 1. Invariant: candidateRuleCount = schemaValidCandidateCount + schemaInvalidCandidateCount
  assert.strictEqual(metrics.candidateRuleCount, metrics.schemaValidCandidateCount + metrics.schemaInvalidCandidateCount);

  // 2. Invariant: schemaValidCandidateCount = truePositive + falsePositive
  assert.strictEqual(metrics.schemaValidCandidateCount, metrics.truePositive + metrics.falsePositive);

  // 3. Invariant: expectedRuleCount = truePositive + falseNegative
  assert.strictEqual(metrics.expectedRuleCount, metrics.truePositive + metrics.falseNegative);

  // 4. Invariant: falsePositive = duplicateCount + hallucinationCount
  assert.strictEqual(metrics.falsePositive, metrics.duplicateCount + metrics.hallucinationCount);

  // 5. Invalid candidates isolation checks:
  assert.strictEqual(metrics.schemaInvalidCandidateCount, 1);
  assert.strictEqual(metrics.truePositive, 1);
  assert.strictEqual(metrics.falsePositive, 1); // unmatched candidate = 1 (FP = 1)
  assert.strictEqual(metrics.falseNegative, 2);
  assert.strictEqual(metrics.candidateRuleCount, 3); // 2 valid + 1 invalid = 3 total raw candidates
});
