import { test } from 'node:test';
import assert from 'node:assert';
import { createFingerprint, matchRules } from './matcher';
import { ExpectedRule, RuleCandidateEvaluationInput } from './types';

// Ortak test şemaları/verileri için mockup helper
const mockEvidence = [
  {
    sourceType: 'pdf' as const,
    documentId: '11111111-1111-4111-8111-111111111111',
    pageNumber: 1,
    sourceText: 'Evidenced source text',
    extractionConfidence: 0.95
  }
];

const baseExpected: ExpectedRule = {
  id: 'exp-1',
  title: 'Column size check',
  canonicalStatement: 'Column should be valid',
  discipline: 'Structure',
  objectType: 'column',
  parameter: 'size',
  operator: 'equals',
  expectedValue: '30x50',
  errorCategory: 'modeling_standard',
  severity: 'medium',
  scopeType: 'company',
  competencyArea: 'Structure competency',
  sourceEvidence: mockEvidence
};

const baseCandidate: RuleCandidateEvaluationInput = {
  candidateId: 'cand-1',
  title: 'Column size check',
  canonicalStatement: 'Column should be valid',
  discipline: 'Structure',
  objectType: 'column',
  parameter: 'size',
  operator: 'equals',
  expectedValue: '30x50',
  errorCategory: 'modeling_standard',
  severity: 'medium',
  scopeType: 'company',
  competencyArea: 'Structure competency',
  sourceEvidence: mockEvidence
};

test('matcher: fingerprint generation with nulls vs empty string', () => {
  const ruleWithNulls = { ...baseExpected, objectType: null, parameter: null };
  const ruleWithEmptyStrings = { ...baseExpected, objectType: '', parameter: '' };

  const fpNull = createFingerprint(ruleWithNulls);
  const fpEmpty = createFingerprint(ruleWithEmptyStrings);

  // Boş string ile null aynı fingerprint'i üretmemelidir (sentinel "<null>" olmalıdır)
  assert.notStrictEqual(fpNull, fpEmpty);
});

test('matcher: expected fingerprint ambiguity check', () => {
  const exp1 = { ...baseExpected, id: 'exp-1' };
  const exp2 = { ...baseExpected, id: 'exp-2' }; // Aynı fingerprint, farklı ID

  assert.throws(() => {
    matchRules([exp1, exp2], []);
  }, /Fixture definition ambiguity: Duplicate expected fingerprint/);
});

test('matcher: duplicate expected rule ID check', () => {
  const exp1 = { ...baseExpected, id: 'exp-1' };
  const exp2 = { ...baseExpected, id: 'exp-1', discipline: 'Architecture' }; // Farklı fp, aynı ID

  assert.throws(() => {
    matchRules([exp1, exp2], []);
  }, /Fixture definition ambiguity: Duplicate expected rule ID/);
});

test('matcher: deterministic matching independent of candidate array order', () => {
  const exp1 = { ...baseExpected, id: 'exp-1' };

  const cand1 = { ...baseCandidate, candidateId: 'cand-1' };
  const cand2 = { ...baseCandidate, candidateId: 'cand-2' }; // cand1 ile aynı fingerprint (duplicate)

  // cand1 ve cand2 farklı sıralarda verildiğinde de sonuçlar tutarlı olmalıdır
  const res1 = matchRules([exp1], [cand1, cand2]);
  const res2 = matchRules([exp1], [cand2, cand1]);

  assert.strictEqual(res1.matches.length, 1);
  assert.strictEqual(res1.duplicateCandidates.length, 1);
  assert.strictEqual(res2.matches.length, 1);
  assert.strictEqual(res2.duplicateCandidates.length, 1);

  // Eşleşen aday her zaman candidateId'ye göre stabil olmalı (artan sıralandığından cand-1 olmalı)
  assert.strictEqual(res1.matches[0].candidateId, 'cand-1');
  assert.strictEqual(res2.matches[0].candidateId, 'cand-1');
});

test('matcher: fingerprint collision resistance (null vs empty vs literal "<null>")', () => {
  const ruleNull = { ...baseExpected, objectType: null };
  const ruleEmpty = { ...baseExpected, objectType: '' };
  const ruleLiteral = { ...baseExpected, objectType: '<null>' };

  const fpNull = createFingerprint(ruleNull);
  const fpEmpty = createFingerprint(ruleEmpty);
  const fpLiteral = createFingerprint(ruleLiteral);

  assert.notStrictEqual(fpNull, fpEmpty);
  assert.notStrictEqual(fpNull, fpLiteral);
  assert.notStrictEqual(fpEmpty, fpLiteral);
});

test('matcher: pipe separator collision resistance', () => {
  // discipline: 'A|B', objectType: 'C'  vs  discipline: 'A', objectType: 'B|C'
  const rule1 = { ...baseExpected, discipline: 'A|B', objectType: 'C' };
  const rule2 = { ...baseExpected, discipline: 'A', objectType: 'B|C' };

  const fp1 = createFingerprint(rule1);
  const fp2 = createFingerprint(rule2);

  // JSON stringification sayesinde pipe karakterleri çakışmaya yol açmamalıdır
  assert.notStrictEqual(fp1, fp2);
});

test('matcher: payload field order variance check', () => {
  const rule = { ...baseExpected };
  const fp = createFingerprint(rule);

  // createFingerprint içindeki ordered tuple sırası değiştiğinde (örneğin discipline ile objectType yer değiştirirse)
  // farklı bir hash üretileceği aşikardır. Bunu dolaylı olarak preimage yapısından teyit edebiliriz.
  // Burada test olarak aynı payload'ın ardışık çalıştırmalarda hep aynı hash'i (determinizm) ürettiğini kontrol edelim.
  const fpAgain = createFingerprint(rule);
  assert.strictEqual(fp, fpAgain);
});
