import { test } from 'node:test';
import assert from 'node:assert';
import { getEvidenceLocationKey, computeEvidenceMetrics } from './evidence-metrics';
import { ExpectedRule, RuleCandidateEvaluationInput, MatchRecord } from './types';

const documentId = '11111111-1111-4111-8111-111111111111';

test('evidence-metrics: location key generation', () => {
  const pdfEv = { sourceType: 'pdf' as const, documentId, pageNumber: 5 };
  const docxEv = { sourceType: 'docx' as const, documentId, paragraphIndex: 12 };
  const xlsxEv = { sourceType: 'xlsx' as const, documentId, sheetName: 'Sheet1', cellRange: 'A1:B2' };

  assert.strictEqual(getEvidenceLocationKey(pdfEv), `pdf|${documentId}|5`);
  assert.strictEqual(getEvidenceLocationKey(docxEv), `docx|${documentId}|12`);
  assert.strictEqual(getEvidenceLocationKey(xlsxEv), `xlsx|${documentId}|sheet1|a1:b2`);
});

test('evidence-metrics: matched rule yokken rate = null davranisi', () => {
  const res = computeEvidenceMetrics([], [], []);
  assert.strictEqual(res.evidenceExactMatchRate, null);
});

test('evidence-metrics: PDF, DOCX ve XLSX exact match ve metrics', () => {
  const matches: MatchRecord[] = [
    { expectedRuleId: 'exp-1', candidateId: 'cand-1', fingerprint: 'fp-1' }
  ];

  const expected: ExpectedRule[] = [
    {
      id: 'exp-1',
      title: 'Rule 1',
      canonicalStatement: 'Check 1',
      discipline: 'Structure',
      objectType: 'column',
      parameter: 'size',
      operator: 'equals',
      expectedValue: '30x50',
      errorCategory: 'modeling_standard',
      severity: 'medium',
      scopeType: 'company',
      competencyArea: 'Area',
      sourceEvidence: [
        { sourceType: 'pdf' as const, documentId, pageNumber: 2, sourceText: 'Exp txt', extractionConfidence: 0.9 }
      ]
    }
  ];

  const candidates: RuleCandidateEvaluationInput[] = [
    {
      candidateId: 'cand-1',
      title: 'Rule 1',
      canonicalStatement: 'Check 1',
      discipline: 'Structure',
      objectType: 'column',
      parameter: 'size',
      operator: 'equals',
      expectedValue: '30x50',
      errorCategory: 'modeling_standard',
      severity: 'medium',
      scopeType: 'company',
      competencyArea: 'Area',
      sourceEvidence: [
        { sourceType: 'pdf' as const, documentId, pageNumber: 2, sourceText: 'Cand txt', extractionConfidence: 0.8 }
      ]
    }
  ];

  // Exact Match Rate = 1.0 (PDF L2 lokasyonu eslesti)
  const res = computeEvidenceMetrics(matches, expected, candidates);
  assert.strictEqual(res.evidenceExactMatchRate, 1.0);
  assert.strictEqual(res.extraCandidateEvidenceCount, 0);
});

test('evidence-metrics: one-to-one matching ve extra evidence', () => {
  const matches: MatchRecord[] = [
    { expectedRuleId: 'exp-1', candidateId: 'cand-1', fingerprint: 'fp-1' }
  ];

  const expected: ExpectedRule[] = [
    {
      id: 'exp-1',
      title: 'Rule 1',
      canonicalStatement: 'Check 1',
      discipline: 'Structure',
      objectType: 'column',
      parameter: 'size',
      operator: 'equals',
      expectedValue: '30x50',
      errorCategory: 'modeling_standard',
      severity: 'medium',
      scopeType: 'company',
      competencyArea: 'Area',
      // 2 expected evidence
      sourceEvidence: [
        { sourceType: 'docx' as const, documentId, paragraphIndex: 3, sourceText: 't1', extractionConfidence: 0.9 },
        { sourceType: 'docx' as const, documentId, paragraphIndex: 5, sourceText: 't2', extractionConfidence: 0.9 }
      ]
    }
  ];

  const candidates: RuleCandidateEvaluationInput[] = [
    {
      candidateId: 'cand-1',
      title: 'Rule 1',
      canonicalStatement: 'Check 1',
      discipline: 'Structure',
      objectType: 'column',
      parameter: 'size',
      operator: 'equals',
      expectedValue: '30x50',
      errorCategory: 'modeling_standard',
      severity: 'medium',
      scopeType: 'company',
      competencyArea: 'Area',
      // 3 candidate evidence (1 eslesen, 2 eslesmeyen)
      sourceEvidence: [
        { sourceType: 'docx' as const, documentId, paragraphIndex: 3, sourceText: 't1', extractionConfidence: 0.8 },
        { sourceType: 'docx' as const, documentId, paragraphIndex: 9, sourceText: 't3', extractionConfidence: 0.8 },
        { sourceType: 'docx' as const, documentId, paragraphIndex: 10, sourceText: 't4', extractionConfidence: 0.8 }
      ]
    }
  ];

  const res = computeEvidenceMetrics(matches, expected, candidates);
  // Expected 2 kanıttan 1'i eşleşti -> 1 / 2 = 0.5 match rate
  assert.strictEqual(res.evidenceExactMatchRate, 0.5);
  // Candidate 3, Expected 2 -> 3 - 2 = 1 extra candidate evidence
  assert.strictEqual(res.extraCandidateEvidenceCount, 1);
});

test('evidence-metrics: matched rule fakat evidence uyusmuyor -> rate = 0', () => {
  const matches: MatchRecord[] = [
    { expectedRuleId: 'exp-1', candidateId: 'cand-1', fingerprint: 'fp-1' }
  ];

  const expected: ExpectedRule[] = [
    {
      id: 'exp-1',
      title: 'Rule 1',
      canonicalStatement: 'Check 1',
      discipline: 'Structure',
      objectType: 'column',
      parameter: 'size',
      operator: 'equals',
      expectedValue: '30x50',
      errorCategory: 'modeling_standard',
      severity: 'medium',
      scopeType: 'company',
      competencyArea: 'Area',
      sourceEvidence: [
        { sourceType: 'pdf' as const, documentId, pageNumber: 2, sourceText: 'Exp txt', extractionConfidence: 0.9 }
      ]
    }
  ];

  const candidates: RuleCandidateEvaluationInput[] = [
    {
      candidateId: 'cand-1',
      title: 'Rule 1',
      canonicalStatement: 'Check 1',
      discipline: 'Structure',
      objectType: 'column',
      parameter: 'size',
      operator: 'equals',
      expectedValue: '30x50',
      errorCategory: 'modeling_standard',
      severity: 'medium',
      scopeType: 'company',
      competencyArea: 'Area',
      // Farklı sayfa numarası (mismatch)
      sourceEvidence: [
        { sourceType: 'pdf' as const, documentId, pageNumber: 99, sourceText: 'Cand txt', extractionConfidence: 0.8 }
      ]
    }
  ];

  const res = computeEvidenceMetrics(matches, expected, candidates);
  assert.strictEqual(res.evidenceExactMatchRate, 0.0);
});
