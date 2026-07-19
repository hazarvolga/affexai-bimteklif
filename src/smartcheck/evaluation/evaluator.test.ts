import { test } from 'node:test';
import assert from 'node:assert';
import {
  evaluateFixture,
  canonicalJsonStringify,
  calculateRawPayloadHash
} from './evaluator';
import {
  EvaluationFixture,
  CandidateProvider,
  EvaluationError,
  ExpectedRule,
  RuleCandidateEvaluationInput
} from './types';

// Helper: Temel bir ideal expected rule şablonu (documentId geçerli bir UUID olmalıdır)
const defaultExpectedRule: ExpectedRule = {
  id: 'rule-1',
  title: 'Rule 1',
  canonicalStatement: 'Must check steel column size',
  discipline: 'Architecture',
  objectType: 'column',
  parameter: 'size',
  operator: 'equals',
  expectedValue: '30x50',
  errorCategory: 'modeling_standard',
  severity: 'medium',
  scopeType: 'company',
  competencyArea: 'Structure',
  sourceEvidence: [
    {
      sourceType: 'pdf',
      documentId: '11111111-1111-4111-8111-111111111111',
      pageNumber: 2,
      sourceText: 'Steel column size must be 30x50',
      extractionConfidence: 0.95
    }
  ]
};

// Helper: Temel bir valid candidate şablonu (documentId geçerli bir UUID olmalıdır)
const defaultCandidate: RuleCandidateEvaluationInput = {
  candidateId: 'cand-1',
  title: 'Rule 1',
  canonicalStatement: 'Must check steel column size',
  discipline: 'Architecture',
  objectType: 'column',
  parameter: 'size',
  operator: 'equals',
  expectedValue: '30x50',
  errorCategory: 'modeling_standard',
  severity: 'medium',
  scopeType: 'company',
  competencyArea: 'Structure',
  sourceEvidence: [
    {
      sourceType: 'pdf',
      documentId: '11111111-1111-4111-8111-111111111111',
      pageNumber: 2,
      sourceText: 'Steel column size must be 30x50',
      extractionConfidence: 0.95
    }
  ]
};

// Helper: Mock Fixture üretici
function createMockFixture(options: {
  caseId?: string;
  dataset?: 'development' | 'blind-evaluation' | 'robustness';
  outcome?: any;
  expectedRuleCount?: number;
  expectedRules?: ExpectedRule[];
}): EvaluationFixture {
  return {
    manifest: {
      schemaVersion: 1,
      caseId: options.caseId || 'case-001',
      dataset: options.dataset || 'development',
      input: { file: 'test.pdf', mimeType: 'application/pdf', language: ['tr'] },
      expectation: {
        outcome: options.outcome || 'rules_found',
        expectedRuleCount: options.expectedRuleCount !== undefined ? options.expectedRuleCount : (options.expectedRules ? options.expectedRules.length : 1)
      },
      tags: ['test']
    },
    expectedRules: options.expectedRules || [defaultExpectedRule],
    fixtureRoot: '/mock',
    caseDirectory: '/mock/case-001',
    manifestPath: '/mock/case-001/manifest.json',
    inputPath: '/mock/case-001/test.pdf',
    expectedRulesPath: '/mock/case-001/expected-rules.json',
    candidateOutputPath: '/mock/case-001/candidate-output.json'
  };
}

// Helper: Mock Provider üretici
function createMockProvider(status: any, candidates: unknown[] = [], extra: any = {}): CandidateProvider {
  return {
    evaluate: async () => {
      if (status instanceof Error) {
        throw status;
      }
      if (status === 'success') {
        return {
          status: 'success',
          candidates,
          usage: { durationMs: 120, estimatedCostUsd: 0.002 }
        };
      }
      return {
        status,
        errorCode: extra.errorCode || 'TEST_ERROR',
        safeMessage: extra.safeMessage || 'Safe test error message'
      } as any;
    }
  };
}

// 1. İdeal rules_found sonucu
test('evaluator: ideal rules_found outcome', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const provider = createMockProvider('success', [defaultCandidate]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.outcomeMatched, true);
    assert.strictEqual(result.qualityGatePassed, true);
    assert.strictEqual(result.metrics.truePositive, 1);
    assert.strictEqual(result.metrics.precision, 1.0);
    assert.strictEqual(result.metrics.recall, 1.0);
    assert.strictEqual(result.metrics.f1Score, 1.0);
    assert.strictEqual(result.metrics.evidenceExactMatchRate, 1.0);
    assert.strictEqual(result.matches.length, 1);
  }
});

// 2. İdeal no_rules sonucu
test('evaluator: ideal no_rules outcome', async () => {
  const fixture = createMockFixture({ outcome: 'no_rules', expectedRules: [] });
  const provider = createMockProvider('success', []);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.outcomeMatched, true);
    assert.strictEqual(result.qualityGatePassed, true);
    assert.strictEqual(result.metrics.expectedRuleCount, 0);
    assert.strictEqual(result.metrics.candidateRuleCount, 0);
    assert.strictEqual(result.metrics.evidenceExactMatchRate, null);
  }
});

// 3. Duplicate candidate metriği ve quality gate false
test('evaluator: duplicate candidate metric and quality gate false', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  // İki tane birebir aynı candidate gönderiyoruz (farklı candidateId ile)
  const cand2 = { ...defaultCandidate, candidateId: 'cand-2' };
  const provider = createMockProvider('success', [defaultCandidate, cand2]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.qualityGatePassed, false);
    assert.strictEqual(result.metrics.duplicateCount, 1);
    assert.strictEqual(result.metrics.falsePositive, 1);
    assert.strictEqual(result.metrics.precision, 0.5);
  }
});

// 4. Hallucinated candidate metriği ve quality gate false
test('evaluator: hallucinated candidate metric and quality gate false', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  // Eşleşmeyen bir valid candidate
  const hallucinatedCand = {
    ...defaultCandidate,
    candidateId: 'cand-2',
    discipline: 'Mechanical' // Eşleşmeyi bozacak farklı alan
  };
  const provider = createMockProvider('success', [defaultCandidate, hallucinatedCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.qualityGatePassed, false);
    assert.strictEqual(result.metrics.hallucinationCount, 1);
    assert.strictEqual(result.metrics.falsePositive, 1);
    assert.ok(result.metrics.precision < 1.0);
  }
});

// 5. Missing rule metriği ve quality gate false
test('evaluator: missing rule metric and quality gate false', async () => {
  const rule2 = { ...defaultExpectedRule, id: 'rule-2', discipline: 'Structure' }; // unique fingerprint
  const fixture = createMockFixture({ outcome: 'rules_found', expectedRules: [defaultExpectedRule, rule2] });
  const provider = createMockProvider('success', [defaultCandidate]); // rule-2 eksik
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.qualityGatePassed, false);
    assert.strictEqual(result.metrics.falseNegative, 1);
    assert.strictEqual(result.metrics.recall, 0.5);
  }
});

// 6. Invalid candidate diagnostic
test('evaluator: invalid candidate diagnostic', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const invalidCand = { candidateId: 'cand-bad', title: '' }; // missing other fields
  const provider = createMockProvider('success', [defaultCandidate, invalidCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.schemaInvalidCandidateCount, 1);
    assert.strictEqual(result.invalidCandidates.length, 1);
    assert.strictEqual(result.invalidCandidates[0].candidateId, 'cand-bad');
    assert.ok(result.invalidCandidates[0].issues.includes('title:too_small'));
  }
});

// 7. Invalid candidate TP/FP'ye dahil edilmez
test('evaluator: invalid candidate excluded from TP and FP', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const invalidCand = { candidateId: 'cand-bad', title: '' };
  const provider = createMockProvider('success', [invalidCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.truePositive, 0);
    assert.strictEqual(result.metrics.falsePositive, 0);
    assert.strictEqual(result.metrics.schemaInvalidCandidateCount, 1);
    assert.strictEqual(result.metrics.precision, 1.0); // 0 / 0 limits to 1.0
  }
});

// 8. Schema validity rate doğru hesaplanır
test('evaluator: schema validity rate calculation', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const invalidCand = { candidateId: 'cand-bad', title: '' };
  const provider = createMockProvider('success', [defaultCandidate, invalidCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.schemaValidityRate, 0.5);
  }
});

// 9. Tam evidence match -> rate 1
test('evaluator: full evidence match yields rate 1', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const provider = createMockProvider('success', [defaultCandidate]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.evidenceExactMatchRate, 1.0);
  }
});

// 10. Evidence mismatch -> rate 0
test('evaluator: evidence mismatch yields rate 0', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const candWithBadEvidence = {
    ...defaultCandidate,
    sourceEvidence: [
      {
        ...defaultCandidate.sourceEvidence[0],
        pageNumber: 999 // Farklı lokasyon
      }
    ]
  };
  const provider = createMockProvider('success', [candWithBadEvidence]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.evidenceExactMatchRate, 0.0);
  }
});

// 11. Match yok -> evidence rate null
test('evaluator: no match yields evidence rate null', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const provider = createMockProvider('success', []); // matched candidates = 0
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.evidenceExactMatchRate, null);
  }
});

// 12. Robustness expected/status match
test('evaluator: robustness outcome matched', async () => {
  const fixture = createMockFixture({ outcome: 'corrupt' });
  const provider = createMockProvider('corrupt');
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'outcome_evaluation');
  if (result.resultType === 'outcome_evaluation') {
    assert.strictEqual(result.outcomeMatched, true);
    assert.strictEqual(result.qualityGatePassed, true);
  }
});

// 13. Robustness expected/status mismatch
test('evaluator: robustness outcome mismatched', async () => {
  const fixture = createMockFixture({ outcome: 'corrupt' });
  const provider = createMockProvider('unsupported');
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'outcome_evaluation');
  if (result.resultType === 'outcome_evaluation') {
    assert.strictEqual(result.outcomeMatched, false);
    assert.strictEqual(result.qualityGatePassed, false);
  }
});

// 14. Rule extraction beklenirken provider failure
test('evaluator: rule extraction expected but provider failure returned', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const provider = createMockProvider('parse_failure');
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'unexpected_provider_failure');
  if (result.resultType === 'unexpected_provider_failure') {
    assert.strictEqual(result.actualOutcome, 'parse_failure');
    assert.strictEqual(result.outcomeMatched, false);
    assert.strictEqual(result.qualityGatePassed, false);
  }
});

// 15. Duplicate valid candidate ID technical error
test('evaluator: duplicate valid candidate ID throws EvaluationError', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  // İki farklı valid candidate ama aynı candidateId ile
  const cand2 = { ...defaultCandidate, title: 'Another title but same ID' };
  const provider = createMockProvider('success', [defaultCandidate, cand2]);

  await assert.rejects(
    evaluateFixture({ fixture, provider }),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_DUPLICATE_CANDIDATE_ID'
  );
});

// 16. Provider exception propagate edilir
test('evaluator: provider exception propagates without interception', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const provider = createMockProvider(new Error('CRITICAL_PROVIDER_FATAL'));

  await assert.rejects(
    evaluateFixture({ fixture, provider }),
    /CRITICAL_PROVIDER_FATAL/
  );
});

// 17. Candidate array sırası sonucu değiştirmez
test('evaluator: candidate array order variance does not change evaluation outcome and details', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found', expectedRules: [defaultExpectedRule] });
  const cand1 = { ...defaultCandidate, candidateId: 'cand-a' };
  const cand2 = { ...defaultCandidate, candidateId: 'cand-b', discipline: 'Mechanical' }; // unmatched/hallucinated

  const provider1 = createMockProvider('success', [cand1, cand2]);
  const provider2 = createMockProvider('success', [cand2, cand1]);

  const res1 = await evaluateFixture({ fixture, provider: provider1 });
  const res2 = await evaluateFixture({ fixture, provider: provider2 });

  assert.deepStrictEqual(res1, res2);
});

// 18. Invalid candidate sırası sonucu değiştirmez
test('evaluator: invalid candidate array order variance does not change evaluation diagnostics order', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const invalidCand1 = { candidateId: 'cand-bad-1', title: '' };
  const invalidCand2 = { candidateId: 'cand-bad-2', title: '' };

  const provider1 = createMockProvider('success', [invalidCand1, invalidCand2]);
  const provider2 = createMockProvider('success', [invalidCand2, invalidCand1]);

  const res1 = await evaluateFixture({ fixture, provider: provider1 });
  const res2 = await evaluateFixture({ fixture, provider: provider2 });

  assert.deepStrictEqual(res1, res2);
});

// 19. Dört metric invariant korunur
test('evaluator: four metric invariants validation', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const provider = createMockProvider('success', [defaultCandidate]);
  const res = await evaluateFixture({ fixture, provider });

  assert.strictEqual(res.resultType, 'rule_evaluation');
  if (res.resultType === 'rule_evaluation') {
    const m = res.metrics;
    assert.strictEqual(m.candidateRuleCount, m.schemaValidCandidateCount + m.schemaInvalidCandidateCount);
    assert.strictEqual(m.schemaValidCandidateCount, m.truePositive + m.falsePositive);
    assert.strictEqual(fixture.manifest.expectation.expectedRuleCount, m.truePositive + m.falseNegative);
    assert.strictEqual(m.falsePositive, m.duplicateCount + m.hallucinationCount);
  }
});

// 20. Fixture caseId ve dataset sonuçta doğru korunur
test('evaluator: caseId and dataset preserved in result', async () => {
  const fixture = createMockFixture({ caseId: 'case-999', dataset: 'blind-evaluation' });
  const provider = createMockProvider('success', [defaultCandidate]);
  const res = await evaluateFixture({ fixture, provider });

  assert.strictEqual(res.caseId, 'case-999');
  assert.strictEqual(res.dataset, 'blind-evaluation');
});

// 21. Non-JSON compatible candidate technical error (BigInt, function vb.)
test('evaluator: non-JSON compatible candidates throw EvaluationError', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });

  // BigInt
  const providerBigInt = createMockProvider('success', [{ ...defaultCandidate, dummy: 123n }]);
  await assert.rejects(
    evaluateFixture({ fixture, provider: providerBigInt }),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );

  // function
  const providerFunc = createMockProvider('success', [{ ...defaultCandidate, dummy: () => {} }]);
  await assert.rejects(
    evaluateFixture({ fixture, provider: providerFunc }),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );
});

// 22. Circular reference candidate technical error (depth-first cycle detection)
test('evaluator: circular reference candidate throws EvaluationError', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });

  const circularObj: any = { a: 1 };
  circularObj.self = circularObj;

  const provider = createMockProvider('success', [circularObj]);
  await assert.rejects(
    evaluateFixture({ fixture, provider }),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );
});

// 23. Aynı invalid object farklı key sırasıyla aynı rawPayloadHash üretir
test('evaluator: identical object with different key orders yields same rawPayloadHash', () => {
  const obj1 = { a: 1, b: 2 };
  const obj2 = { b: 2, a: 1 };

  const hash1 = calculateRawPayloadHash(obj1);
  const hash2 = calculateRawPayloadHash(obj2);

  assert.strictEqual(hash1, hash2);
});

// 24. İki farklı invalid payload farklı hash üretir
test('evaluator: different invalid payloads yield different hashes', () => {
  const obj1 = { a: 1, b: 2 };
  const obj2 = { a: 1, b: 3 };

  const hash1 = calculateRawPayloadHash(obj1);
  const hash2 = calculateRawPayloadHash(obj2);

  assert.notStrictEqual(hash1, hash2);
});

// 25. Zod diagnostic yalnız <path>:<code> formatındadır
test('evaluator: zod diagnostic formatted as path:code', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const badCand = {
    candidateId: 'bad-cand',
    title: '', // too_small
    operator: 'invalid_operator' // invalid_enum_value
  };
  const provider = createMockProvider('success', [badCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.deepStrictEqual(result.invalidCandidates[0].issues.filter(i => i.startsWith('title:') || i.startsWith('operator:')), [
      'operator:invalid_enum_value',
      'title:too_small'
    ]);
  }
});

// 26. Zod diagnostic listesi alfabetik ve duplicate’sizdir
test('evaluator: zod diagnostic sorted and unique', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const badCand = {
    candidateId: 'bad-cand',
    title: '',
    discipline: 12345 // invalid_type
  };
  const provider = createMockProvider('success', [badCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    const issues = result.invalidCandidates[0].issues.filter(i => i.startsWith('title:') || i.startsWith('discipline:'));
    assert.deepStrictEqual(issues, [
      'discipline:invalid_type',
      'title:too_small'
    ]);
  }
});

// 27. candidateId = "" schema-invalid diagnostic olur
test('evaluator: empty candidateId results in diagnostic', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const badCand = {
    ...defaultCandidate,
    candidateId: '' // too_small
  };
  const provider = createMockProvider('success', [badCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.schemaInvalidCandidateCount, 1);
    assert.strictEqual(result.invalidCandidates[0].candidateId, '');
  }
});

// 28. Duplicate ID kontrolü yalnız schema-valid candidate'larda çalışır
test('evaluator: duplicate ID check ignores invalid candidates', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });

  // İki tane invalid candidate aynı candidateId ile
  const invalid1 = { candidateId: 'dup-bad-id', title: '' };
  const invalid2 = { candidateId: 'dup-bad-id', title: '' };

  const provider = createMockProvider('success', [invalid1, invalid2]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.schemaInvalidCandidateCount, 2);
  }
});

// 29. Robustness expectation + provider success candidate validation çalıştırmaz
test('evaluator: robustness expected + provider success bypasses candidate validation', async () => {
  const fixture = createMockFixture({ outcome: 'corrupt' });

  // Non-JSON compatible candidate (Zod/serialization crash nedeni)
  const badPayload = { invalid: () => {} };
  const provider = createMockProvider('success', [badPayload]);

  const result = await evaluateFixture({ fixture, provider });
  assert.strictEqual(result.resultType, 'outcome_evaluation');
  assert.strictEqual(result.outcomeMatched, false);
});

// 30. rules_found + evidence rate null quality gate false olur
test('evaluator: rules_found with matches but evidence mismatch yields quality gate false', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const candWithBadEvidence = {
    ...defaultCandidate,
    sourceEvidence: [
      {
        ...defaultCandidate.sourceEvidence[0],
        pageNumber: 999
      }
    ]
  };
  const provider = createMockProvider('success', [candWithBadEvidence]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.metrics.evidenceExactMatchRate, 0.0);
    assert.strictEqual(result.qualityGatePassed, false);
  }
});

// 31. Invalid candidate'lar unmatchedCandidates içinde bulunmaz
test('evaluator: invalid candidates do not appear in unmatchedCandidates', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const invalidCand = { candidateId: 'cand-bad', title: '' };
  const provider = createMockProvider('success', [invalidCand]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    assert.strictEqual(result.unmatchedCandidates.length, 0);
  }
});

// 32. Shared object reference circular olarak reddedilmez
test('evaluator: shared reference is not circular', () => {
  const shared = { value: 1 };
  const candidate = {
    first: shared,
    second: shared
  };

  const canonicalStr = canonicalJsonStringify(candidate);
  assert.ok(canonicalStr.includes('"first":{"value":1}'));
  assert.ok(canonicalStr.includes('"second":{"value":1}'));
});

// 33. Gerçek circular reference teknik hata üretir
test('evaluator: actual circular reference throws EvaluationError', () => {
  const obj: any = {};
  obj.self = obj;

  assert.throws(
    () => canonicalJsonStringify(obj),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );
});

// 34. Sparse array teknik hata üretir
test('evaluator: sparse array throws EvaluationError', () => {
  const arr = new Array(5); // empty slots
  assert.throws(
    () => canonicalJsonStringify(arr),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );
});

// 35. Object property içindeki undefined teknik hata üretir
test('evaluator: object property with undefined throws EvaluationError', () => {
  const obj = { val: undefined };
  assert.throws(
    () => canonicalJsonStringify(obj),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );
});

// 36. Class instance teknik hata üretir
test('evaluator: class instance throws EvaluationError', () => {
  class CustomClass {
    constructor(public name = 'test') {}
  }
  const instance = new CustomClass();
  assert.throws(
    () => canonicalJsonStringify(instance),
    (err: any) => err instanceof EvaluationError && err.code === 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE'
  );
});

// 37. Result dizileri stabil sıralanır
test('evaluator: result arrays are sorted stably', async () => {
  const fixture = createMockFixture({
    outcome: 'rules_found',
    expectedRules: [
      { ...defaultExpectedRule, id: 'rule-b', discipline: 'Structure' },
      { ...defaultExpectedRule, id: 'rule-a', discipline: 'Architecture' }
    ]
  });

  const candA = { ...defaultCandidate, candidateId: 'cand-a', title: 'Rule A', discipline: 'Architecture' };
  const candB = { ...defaultCandidate, candidateId: 'cand-b', title: 'Rule B', discipline: 'Structure' };

  const provider = createMockProvider('success', [candB, candA]);
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'rule_evaluation');
  if (result.resultType === 'rule_evaluation') {
    // unmatchedExpected sorted
    assert.deepStrictEqual(result.unmatchedExpected, []);
    assert.deepStrictEqual(result.matches.map(m => m.expectedRuleId), ['rule-a', 'rule-b']);
  }
});

// 38. Candidate array sırası değiştiğinde serialized result birebir aynıdır
test('evaluator: serialized result remains identical regardless of candidate order', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const cand1 = { ...defaultCandidate, candidateId: 'cand-a' };
  const cand2 = { ...defaultCandidate, candidateId: 'cand-b' };

  const provider1 = createMockProvider('success', [cand1, cand2]);
  const provider2 = createMockProvider('success', [cand2, cand1]);

  const res1 = await evaluateFixture({ fixture, provider: provider1 });
  const res2 = await evaluateFixture({ fixture, provider: provider2 });

  assert.strictEqual(JSON.stringify(res1), JSON.stringify(res2));
});

// 39. Invalid candidate array sırası değiştiğinde serialized result birebir aynıdır
test('evaluator: serialized result remains identical regardless of invalid candidates order', async () => {
  const fixture = createMockFixture({ outcome: 'rules_found' });
  const invalid1 = { candidateId: 'cand-bad-1', title: '' };
  const invalid2 = { candidateId: 'cand-bad-2', title: '' };

  const provider1 = createMockProvider('success', [invalid1, invalid2]);
  const provider2 = createMockProvider('success', [invalid2, invalid1]);

  const res1 = await evaluateFixture({ fixture, provider: provider1 });
  const res2 = await evaluateFixture({ fixture, provider: provider2 });

  assert.strictEqual(JSON.stringify(res1), JSON.stringify(res2));
});

// 40. Robustness outcome mismatch quality gate false üretir
test('evaluator: robustness outcome mismatch yields quality gate false', async () => {
  const fixture = createMockFixture({ outcome: 'corrupt' });
  const provider = createMockProvider('success', []); // actual success, expected corrupt
  const result = await evaluateFixture({ fixture, provider });

  assert.strictEqual(result.resultType, 'outcome_evaluation');
  assert.strictEqual(result.outcomeMatched, false);
  assert.strictEqual(result.qualityGatePassed, false);
});
