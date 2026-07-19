import { evaluateFixture } from './evaluator';
import {
  EvaluationFixture,
  CandidateProvider,
  EvaluationSuiteResult,
  EvaluationSuiteError,
  CaseEvaluationResult
} from './types';

export interface RunEvaluationSuiteOptions {
  fixtures: readonly EvaluationFixture[];
  provider: CandidateProvider;
}

/**
 * Deterministik basit string karşılaştırma helper'ı
 */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Önceden yüklenmiş fixture listesini sırayla ve deterministik olarak değerlendirir.
 */
export async function runEvaluationSuite(
  options: RunEvaluationSuiteOptions
): Promise<EvaluationSuiteResult> {
  const { fixtures, provider } = options;

  // 1. Boş suite kontrolü
  if (fixtures.length === 0) {
    throw new EvaluationSuiteError('EVALUATION_SUITE_EMPTY', 'Evaluation suite is empty');
  }

  // 2. Duplicate caseId kontrolü (provider çağrısı ve sıralama öncesi)
  const seenCaseIds = new Set<string>();
  for (const fixture of fixtures) {
    const caseId = fixture.manifest.caseId;
    if (seenCaseIds.has(caseId)) {
      throw new EvaluationSuiteError(
        'EVALUATION_SUITE_DUPLICATE_CASE_ID',
        `Duplicate case ID detected in suite: ${caseId}`
      );
    }
    seenCaseIds.add(caseId);
  }

  // 3. Fixture kopyası oluştur ve deterministik sırala (dataset -> caseId)
  const sortedFixtures = [...fixtures].sort((a, b) => {
    const datasetComp = compareStrings(a.manifest.dataset, b.manifest.dataset);
    if (datasetComp !== 0) return datasetComp;
    return compareStrings(a.manifest.caseId, b.manifest.caseId);
  });

  // 4. Sequential execution (paralel çalıştırma yok)
  const cases: CaseEvaluationResult[] = [];
  for (const fixture of sortedFixtures) {
    // evaluateFixture veya provider hata fırlatırsa runner bunu yutmaz, doğrudan fırlatır (fail immediately)
    const result = await evaluateFixture({
      fixture,
      provider
    });
    cases.push(result);
  }

  // 5. Summary ve breakdown hesapla
  const totalCases = cases.length;
  let passedCases = 0;
  let ruleExtractionCases = 0;
  let robustnessCases = 0;
  let unexpectedProviderFailureCases = 0;

  for (const result of cases) {
    if (result.qualityGatePassed) {
      passedCases++;
    }

    // Exhaustive switch kontrolü
    switch (result.resultType) {
      case 'rule_evaluation':
        ruleExtractionCases++;
        break;
      case 'outcome_evaluation':
        robustnessCases++;
        break;
      case 'unexpected_provider_failure':
        unexpectedProviderFailureCases++;
        break;
      default: {
        const exhaustiveCheck: never = result;
        throw new Error(`Unhandled result type: ${(exhaustiveCheck as any).resultType}`);
      }
    }
  }

  const failedCases = totalCases - passedCases;
  const passRate = passedCases / totalCases;
  const allQualityGatesPassed = failedCases === 0;

  // Invariant kontrolleri
  if (totalCases !== passedCases + failedCases) {
    throw new EvaluationSuiteError(
      'EVALUATION_SUITE_SUMMARY_INVARIANT_FAILED',
      'Summary invariant failed: totalCases !== passedCases + failedCases'
    );
  }

  if (!Number.isFinite(passRate) || passRate < 0 || passRate > 1) {
    throw new EvaluationSuiteError(
      'EVALUATION_SUITE_SUMMARY_INVARIANT_FAILED',
      `Summary invariant failed: passRate ${passRate} is out of bounds or non-finite`
    );
  }

  if (allQualityGatesPassed !== (failedCases === 0)) {
    throw new EvaluationSuiteError(
      'EVALUATION_SUITE_SUMMARY_INVARIANT_FAILED',
      'Summary invariant failed: allQualityGatesPassed !== (failedCases === 0)'
    );
  }

  if (ruleExtractionCases + robustnessCases + unexpectedProviderFailureCases !== totalCases) {
    throw new EvaluationSuiteError(
      'EVALUATION_SUITE_SUMMARY_INVARIANT_FAILED',
      'Summary invariant failed: breakdown sum !== totalCases'
    );
  }

  return {
    summary: {
      totalCases,
      passedCases,
      failedCases,
      passRate,
      allQualityGatesPassed,
      ruleExtractionCases,
      robustnessCases,
      unexpectedProviderFailureCases
    },
    cases
  };
}
