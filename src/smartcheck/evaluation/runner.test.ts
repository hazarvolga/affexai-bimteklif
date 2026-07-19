import { test } from 'node:test';
import assert from 'node:assert';
import { runEvaluationSuite } from './runner';
import {
  EvaluationFixture,
  CandidateProvider,
  EvaluationSuiteError,
  ExpectedRule,
  RuleCandidateEvaluationInput
} from './types';

// Helper: UUID içeren varsayılan expected rule
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

// Helper: UUID içeren varsayılan candidate
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
function createMockFixture(
  caseId: string,
  dataset: 'development' | 'blind-evaluation' | 'robustness',
  outcome: any
): EvaluationFixture {
  return {
    manifest: {
      schemaVersion: 1,
      caseId,
      dataset,
      input: { file: 'test.pdf', mimeType: 'application/pdf', language: ['tr'] },
      expectation: {
        outcome,
        expectedRuleCount: outcome === 'no_rules' ? 0 : 1
      },
      tags: ['test']
    },
    expectedRules: outcome === 'no_rules' ? [] : [defaultExpectedRule],
    fixtureRoot: '/mock',
    caseDirectory: `/mock/${caseId}`,
    manifestPath: `/mock/${caseId}/manifest.json`,
    inputPath: `/mock/${caseId}/test.pdf`,
    expectedRulesPath: `/mock/${caseId}/expected-rules.json`,
    candidateOutputPath: `/mock/${caseId}/candidate-output.json`
  };
}

// 1. Tek başarılı extraction case
test('runner: single successful extraction case', async () => {
  const fixtures = [createMockFixture('case-001', 'development', 'rules_found')];
  const provider: CandidateProvider = {
    async evaluate() {
      return {
        status: 'success',
        candidates: [defaultCandidate],
        usage: { durationMs: 10 }
      };
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.summary.totalCases, 1);
  assert.strictEqual(result.summary.passedCases, 1);
  assert.strictEqual(result.summary.failedCases, 0);
  assert.strictEqual(result.summary.allQualityGatesPassed, true);
  assert.strictEqual(result.summary.ruleExtractionCases, 1);
  assert.strictEqual(result.cases[0].resultType, 'rule_evaluation');
});

// 2. Tek başarılı robustness case
test('runner: single successful robustness case', async () => {
  const fixtures = [createMockFixture('case-002', 'robustness', 'corrupt')];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'corrupt' };
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.summary.totalCases, 1);
  assert.strictEqual(result.summary.passedCases, 1);
  assert.strictEqual(result.summary.allQualityGatesPassed, true);
  assert.strictEqual(result.summary.robustnessCases, 1);
});

// 3. Mixed suite summary & 4. Passed/failed count & 5. Pass rate
test('runner: mixed suite summary metrics and pass rate calculation', async () => {
  const fixtures = [
    createMockFixture('case-001', 'development', 'rules_found'),
    createMockFixture('case-002', 'development', 'rules_found'),
    createMockFixture('case-003', 'robustness', 'corrupt')
  ];

  const provider: CandidateProvider = {
    async evaluate(fixture) {
      if (fixture.manifest.caseId === 'case-001') {
        // Success pass
        return { status: 'success', candidates: [defaultCandidate] };
      } else if (fixture.manifest.caseId === 'case-002') {
        // Success but failed quality gate (unmatched / hallucinated)
        const badCand = { ...defaultCandidate, discipline: 'Mechanical' };
        return { status: 'success', candidates: [badCand] };
      } else {
        // Robustness pass
        return { status: 'corrupt' };
      }
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.summary.totalCases, 3);
  assert.strictEqual(result.summary.passedCases, 2); // case-001 (pass) and case-003 (pass)
  assert.strictEqual(result.summary.failedCases, 1); // case-002 (failed QG)
  assert.strictEqual(result.summary.passRate, 2 / 3);
  assert.strictEqual(result.summary.allQualityGatesPassed, false);
});

// 6. Bütün case’ler başarılıysa allQualityGatesPassed = true
test('runner: allQualityGatesPassed is true when all pass', async () => {
  const fixtures = [
    createMockFixture('case-001', 'development', 'no_rules'),
    createMockFixture('case-002', 'development', 'no_rules')
  ];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [] };
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.summary.allQualityGatesPassed, true);
});

// 7. Bir case başarısızsa allQualityGatesPassed = false
test('runner: allQualityGatesPassed is false when at least one fails', async () => {
  const fixtures = [
    createMockFixture('case-001', 'development', 'rules_found'),
    createMockFixture('case-002', 'development', 'rules_found')
  ];
  const provider: CandidateProvider = {
    async evaluate(fixture) {
      if (fixture.manifest.caseId === 'case-001') {
        return { status: 'success', candidates: [defaultCandidate] };
      }
      return { status: 'parse_failure' }; // Unexpected failure (fails QG)
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.summary.allQualityGatesPassed, false);
});

// 8. Empty fixture list → EVALUATION_SUITE_EMPTY
test('runner: empty fixture list throws EVALUATION_SUITE_EMPTY', async () => {
  const fixtures: EvaluationFixture[] = [];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [] };
    }
  };

  await assert.rejects(
    runEvaluationSuite({ fixtures, provider }),
    (err: any) => err instanceof EvaluationSuiteError && err.code === 'EVALUATION_SUITE_EMPTY'
  );
});

// 9. Duplicate case ID → EVALUATION_SUITE_DUPLICATE_CASE_ID
test('runner: duplicate case ID throws EVALUATION_SUITE_DUPLICATE_CASE_ID', async () => {
  const fixtures = [
    createMockFixture('dup-case', 'development', 'rules_found'),
    createMockFixture('dup-case', 'development', 'no_rules')
  ];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [] };
    }
  };

  await assert.rejects(
    runEvaluationSuite({ fixtures, provider }),
    (err: any) => err instanceof EvaluationSuiteError && err.code === 'EVALUATION_SUITE_DUPLICATE_CASE_ID'
  );
});

// 10. Farklı dataset’lerde duplicate case ID reddedilir
test('runner: duplicate case ID across different datasets is rejected', async () => {
  const fixtures = [
    createMockFixture('dup-case', 'development', 'rules_found'),
    createMockFixture('dup-case', 'robustness', 'corrupt')
  ];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [] };
    }
  };

  await assert.rejects(
    runEvaluationSuite({ fixtures, provider }),
    (err: any) => err instanceof EvaluationSuiteError && err.code === 'EVALUATION_SUITE_DUPLICATE_CASE_ID'
  );
});

// 11. Duplicate kontrolü provider çağrısından önce yapılır
test('runner: duplicate check is run before any provider invocation', async () => {
  const fixtures = [
    createMockFixture('dup-case', 'development', 'rules_found'),
    createMockFixture('dup-case', 'development', 'no_rules')
  ];
  let providerCalled = false;
  const provider: CandidateProvider = {
    async evaluate() {
      providerCalled = true;
      return { status: 'success', candidates: [] };
    }
  };

  await assert.rejects(
    runEvaluationSuite({ fixtures, provider }),
    EvaluationSuiteError
  );
  assert.strictEqual(providerCalled, false);
});

// 12. Fixture’lar dataset/caseId sırasıyla değerlendirilir
test('runner: fixtures are sorted by dataset, then caseId deterministically', async () => {
  // Input karışık sırada veriliyor
  const fixtures = [
    createMockFixture('case-b', 'robustness', 'corrupt'),
    createMockFixture('case-a', 'robustness', 'corrupt'),
    createMockFixture('case-d', 'development', 'rules_found'),
    createMockFixture('case-c', 'development', 'rules_found')
  ];

  const evalOrder: string[] = [];
  const provider: CandidateProvider = {
    async evaluate(fixture) {
      evalOrder.push(fixture.manifest.caseId);
      if (fixture.manifest.expectation.outcome === 'corrupt') {
        return { status: 'corrupt' };
      }
      return { status: 'success', candidates: [] };
    }
  };

  await runEvaluationSuite({ fixtures, provider });

  // Beklenen sıralama:
  // 1. development -> case-c, case-d
  // 2. robustness -> case-a, case-b
  assert.deepStrictEqual(evalOrder, ['case-c', 'case-d', 'case-a', 'case-b']);
});

// 13. Input fixture array sırası değiştirilmez
test('runner: original input fixtures array is not mutated', async () => {
  const fixtures = [
    createMockFixture('case-b', 'robustness', 'corrupt'),
    createMockFixture('case-a', 'development', 'rules_found')
  ];
  const fixturesCopy = [...fixtures];
  const provider: CandidateProvider = {
    async evaluate(fixture) {
      return fixture.manifest.expectation.outcome === 'corrupt'
        ? { status: 'corrupt' }
        : { status: 'success', candidates: [] };
    }
  };

  await runEvaluationSuite({ fixtures, provider });
  assert.deepStrictEqual(fixtures, fixturesCopy);
});

// 14. Fixture object’leri mutate edilmez
test('runner: fixture objects are not mutated', async () => {
  const fixtures = [createMockFixture('case-a', 'development', 'rules_found')];
  const originalJson = JSON.stringify(fixtures[0]);
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [] };
    }
  };

  await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(JSON.stringify(fixtures[0]), originalJson);
});

// 15. Provider exception propagate edilir
test('runner: provider exception is propagated immediately without recovery', async () => {
  const fixtures = [
    createMockFixture('case-a', 'development', 'rules_found'),
    createMockFixture('case-b', 'development', 'rules_found')
  ];
  const provider: CandidateProvider = {
    async evaluate(fixture) {
      if (fixture.manifest.caseId === 'case-a') {
        throw new Error('FATAL_PROVIDER_ERROR');
      }
      return { status: 'success', candidates: [] };
    }
  };

  await assert.rejects(
    runEvaluationSuite({ fixtures, provider }),
    /FATAL_PROVIDER_ERROR/
  );
});

// 16. Evaluator teknik hatası propagate edilir & 17. Teknik hata durumunda partial result dönmez
test('runner: evaluator technical error propagates immediately and yields no partial suite result', async () => {
  const fixtures = [
    createMockFixture('case-a', 'development', 'rules_found'),
    createMockFixture('case-b', 'development', 'rules_found')
  ];
  const provider: CandidateProvider = {
    async evaluate(fixture) {
      if (fixture.manifest.caseId === 'case-a') {
        // duplicate ID error tetikleyecek valid candidates
        const cand = { ...defaultCandidate, candidateId: 'dup-cand-id' };
        const cand2 = { ...defaultCandidate, candidateId: 'dup-cand-id', title: 'another' };
        return { status: 'success', candidates: [cand, cand2] };
      }
      return { status: 'success', candidates: [] };
    }
  };

  await assert.rejects(
    runEvaluationSuite({ fixtures, provider }),
    (err: any) => err.name === 'EvaluationError' && err.code === 'EVALUATION_DUPLICATE_CANDIDATE_ID'
  );
});

// 18. Input fixture sırası değişse de serialized result aynıdır
test('runner: serialized result remains identical regardless of input fixtures array ordering', async () => {
  const fix1 = createMockFixture('case-1', 'development', 'rules_found');
  const fix2 = createMockFixture('case-2', 'robustness', 'corrupt');

  const provider: CandidateProvider = {
    async evaluate(fixture) {
      if (fixture.manifest.caseId === 'case-1') {
        return { status: 'success', candidates: [defaultCandidate] };
      }
      return { status: 'corrupt' };
    }
  };

  const resA = await runEvaluationSuite({ fixtures: [fix1, fix2], provider });
  const resB = await runEvaluationSuite({ fixtures: [fix2, fix1], provider });

  assert.strictEqual(JSON.stringify(resA), JSON.stringify(resB));
});

// 19. Rule extraction/robustness/unexpected failure breakdown doğru & 20. Breakdown toplamı totalCases
test('runner: rule type breakdowns and breakdown sum match totalCases', async () => {
  const fixtures = [
    createMockFixture('case-1', 'development', 'rules_found'),
    createMockFixture('case-2', 'robustness', 'corrupt'),
    createMockFixture('case-3', 'development', 'rules_found')
  ];

  const provider: CandidateProvider = {
    async evaluate(fixture) {
      if (fixture.manifest.caseId === 'case-1') {
        return { status: 'success', candidates: [defaultCandidate] };
      } else if (fixture.manifest.caseId === 'case-2') {
        return { status: 'corrupt' };
      } else {
        return { status: 'parse_failure' }; // unexpected failure
      }
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.summary.totalCases, 3);
  assert.strictEqual(result.summary.ruleExtractionCases, 1);
  assert.strictEqual(result.summary.robustnessCases, 1);
  assert.strictEqual(result.summary.unexpectedProviderFailureCases, 1);

  assert.strictEqual(
    result.summary.ruleExtractionCases +
    result.summary.robustnessCases +
    result.summary.unexpectedProviderFailureCases,
    result.summary.totalCases
  );
});

// 21. Summary invariant'ları korunur
test('runner: summary invariants validation', async () => {
  const fixtures = [createMockFixture('case-1', 'development', 'rules_found')];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [defaultCandidate] };
    }
  };

  const res = await runEvaluationSuite({ fixtures, provider });
  const m = res.summary;
  assert.strictEqual(m.totalCases, m.passedCases + m.failedCases);
  assert.ok(Number.isFinite(m.passRate));
  assert.ok(m.passRate >= 0 && m.passRate <= 1);
  assert.strictEqual(m.allQualityGatesPassed, m.failedCases === 0);
});

// 22. Provider çağrıları sequential olur
test('runner: provider evaluation calls are strictly sequential', async () => {
  const fixtures = [
    createMockFixture('case-1', 'development', 'rules_found'),
    createMockFixture('case-2', 'development', 'rules_found')
  ];

  let activeCalls = 0;
  let maxConcurrentCalls = 0;

  const provider: CandidateProvider = {
    async evaluate() {
      activeCalls++;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCalls);
      // simulate latency
      await new Promise(resolve => setTimeout(resolve, 10));
      activeCalls--;
      return { status: 'success', candidates: [] };
    }
  };

  await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(maxConcurrentCalls, 1);
});

// 23. Aynı provider instance bütün fixture'larda kullanılır
test('runner: single provider instance is reused for all fixtures', async () => {
  const fixtures = [
    createMockFixture('case-1', 'development', 'rules_found'),
    createMockFixture('case-2', 'development', 'rules_found')
  ];

  let evalCount = 0;
  const provider: CandidateProvider = {
    async evaluate() {
      evalCount++;
      return { status: 'success', candidates: [] };
    }
  };

  await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(evalCount, 2);
});

// 24. Case results evaluator çıktısını korur
test('runner: case results match evaluator outputs directly', async () => {
  const fixtures = [createMockFixture('case-1', 'development', 'rules_found')];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [defaultCandidate] };
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual(result.cases[0].resultType, 'rule_evaluation');
  if (result.cases[0].resultType === 'rule_evaluation') {
    assert.strictEqual(result.cases[0].caseId, 'case-1');
    assert.strictEqual(result.cases[0].qualityGatePassed, true);
  }
});

// 25. Suite sonucu timestamp veya run ID içermez
test('runner: suite result does not contain transient metadata like runId or timestamp', async () => {
  const fixtures = [createMockFixture('case-1', 'development', 'rules_found')];
  const provider: CandidateProvider = {
    async evaluate() {
      return { status: 'success', candidates: [defaultCandidate] };
    }
  };

  const result = await runEvaluationSuite({ fixtures, provider });
  assert.strictEqual('timestamp' in result, false);
  assert.strictEqual('runId' in result, false);
  assert.strictEqual('duration' in result, false);
});
