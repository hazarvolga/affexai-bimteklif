import { createHash } from 'node:crypto';
import {
  EvaluationFixture,
  CandidateProvider,
  CaseEvaluationResult,
  RuleCandidateEvaluationInput,
  RuleCandidateEvaluationInputSchema,
  InvalidCandidateDiagnostic,
  EvaluationError
} from './types';
import { matchRules } from './matcher';
import { computeMetrics } from './metrics';
import { computeEvidenceMetrics } from './evidence-metrics';

export interface EvaluateFixtureOptions {
  fixture: EvaluationFixture;
  provider: CandidateProvider;
}

/**
 * Bir değerin plain object olup olmadığını doğrular.
 */
function isPlainObject(val: unknown): boolean {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Deterministik Canonical JSON String üretir.
 */
export function canonicalJsonStringify(val: unknown, activeSet = new Set<unknown>()): string {
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return JSON.stringify(val);

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'Non-finite numbers are not JSON compatible');
    }
    // -0 normalizasyonu
    if (Object.is(val, -0)) return '0';
    return JSON.stringify(val);
  }

  if (typeof val === 'bigint') {
    throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'BigInt values are not JSON compatible');
  }

  if (typeof val === 'function' || typeof val === 'symbol' || val === undefined) {
    throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'Unsupported primitive types are not JSON compatible');
  }

  // Object / Array circular check
  if (activeSet.has(val)) {
    throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'Circular reference detected');
  }

  activeSet.add(val);

  if (Array.isArray(val)) {
    const parts: string[] = [];
    // Sparse array kontrolü
    for (let i = 0; i < val.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(val, i)) {
        throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'Sparse arrays are not JSON compatible');
      }
      parts.push(canonicalJsonStringify(val[i], activeSet));
    }
    activeSet.delete(val);
    return `[${parts.join(',')}]`;
  }

  if (isPlainObject(val)) {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = obj[key];
      // Object properties check
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') {
        throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'Object property value is not JSON compatible');
      }
      const valStr = canonicalJsonStringify(v, activeSet);
      parts.push(`${JSON.stringify(key)}:${valStr}`);
    }
    activeSet.delete(val);
    return `{${parts.join(',')}}`;
  }

  // Class instance'ları veya Date, Map, Set gibi nesneler reddedilir
  throw new EvaluationError('EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE', 'Class instances or built-in objects are not JSON compatible');
}

/**
 * Canonical payload hash üretir (SHA-256).
 */
export function calculateRawPayloadHash(val: unknown): string {
  const canonicalStr = canonicalJsonStringify(val);
  return createHash('sha256').update(canonicalStr).digest('hex');
}

/**
 * Zod Hata Tanısını Stabil Hale Getirir
 */
function getZodIssues(error: { issues: Array<{ path: PropertyKey[]; code: string }> }): string[] {
  const list = error.issues.map(issue => {
    const pathStr = issue.path.length > 0 ? issue.path.map(String).join('.') : '<root>';
    // Preserve the diagnostic code exposed by the Zod 3 evaluator contract.
    const code = issue.code === 'invalid_value' ? 'invalid_enum_value' : issue.code;
    return `${pathStr}:${code}`;
  });
  // Duplicate'leri temizle ve alfabetik sırala
  return Array.from(new Set(list)).sort();
}

/**
 * Ana Değerlendirme Fonksiyonu
 */
export async function evaluateFixture(
  options: EvaluateFixtureOptions
): Promise<CaseEvaluationResult> {
  const { fixture, provider } = options;
  const expectedOutcome = fixture.manifest.expectation.outcome;

  // Provider exception caller'a propagate edilir
  const providerResult = await provider.evaluate(fixture);

  // Robustness beklentisi var mı?
  const robustnessOutcomes = ['unsupported', 'corrupt', 'password_protected', 'parse_failure'];
  const isRobustnessExpected = robustnessOutcomes.includes(expectedOutcome);

  if (isRobustnessExpected) {
    const actualOutcome = providerResult.status;
    const outcomeMatched = expectedOutcome === actualOutcome;
    return {
      resultType: 'outcome_evaluation',
      caseId: fixture.manifest.caseId,
      dataset: fixture.manifest.dataset,
      expectedOutcome: expectedOutcome as any,
      actualOutcome,
      outcomeMatched,
      qualityGatePassed: outcomeMatched
    };
  }

  // Rule extraction bekleniyor ama provider failure döndü
  if (providerResult.status !== 'success') {
    return {
      resultType: 'unexpected_provider_failure',
      caseId: fixture.manifest.caseId,
      dataset: fixture.manifest.dataset,
      expectedOutcome: expectedOutcome as any,
      actualOutcome: providerResult.status,
      outcomeMatched: false,
      qualityGatePassed: false,
      errorCode: 'errorCode' in providerResult ? providerResult.errorCode : undefined,
      safeMessage: 'safeMessage' in providerResult ? providerResult.safeMessage : undefined
    };
  }

  // Provider success döndü, adayları doğrula
  const rawCandidates = providerResult.candidates;
  const validCandidates: RuleCandidateEvaluationInput[] = [];
  const invalidDiagnostics: InvalidCandidateDiagnostic[] = [];
  const seenCandidateIds = new Set<string>();

  for (const raw of rawCandidates) {
    // 1. JSON uyumluluk kontrolü ve hash üretimi
    const rawPayloadHash = calculateRawPayloadHash(raw);

    // 2. Candidate ID tespiti (Zod parse öncesi raw payload içinde string candidateId var mı?)
    let candidateId: string | null = null;
    if (raw && typeof raw === 'object' && 'candidateId' in raw && typeof (raw as any).candidateId === 'string') {
      candidateId = (raw as any).candidateId;
    }

    // 3. Schema validation
    const parsed = RuleCandidateEvaluationInputSchema.safeParse(raw);
    if (!parsed.success) {
      invalidDiagnostics.push({
        candidateId,
        rawPayloadHash,
        issues: getZodIssues(parsed.error)
      });
    } else {
      // Schema-valid candidate
      const validCand = parsed.data;

      // Valid candidateId benzersizlik kontrolü
      if (seenCandidateIds.has(validCand.candidateId)) {
        throw new EvaluationError('EVALUATION_DUPLICATE_CANDIDATE_ID', `Duplicate valid candidate ID detected: ${validCand.candidateId}`);
      }
      seenCandidateIds.add(validCand.candidateId);
      validCandidates.push(validCand);
    }
  }

  // Matcher çalıştır
  const matchResult = matchRules(fixture.expectedRules, validCandidates);

  // Evidence metrics hesapla
  const evidenceRes = computeEvidenceMetrics(matchResult.matches, fixture.expectedRules, validCandidates);

  // Metrics hesapla
  const metrics = computeMetrics({
    expectedCount: fixture.manifest.expectation.expectedRuleCount,
    validCandidates,
    invalidCandidatesCount: invalidDiagnostics.length,
    matchResult,
    evidenceExactMatchRate: evidenceRes.evidenceExactMatchRate
  });

  // Metrik invariant'larını kontrol et
  const {
    candidateRuleCount,
    schemaValidCandidateCount,
    schemaInvalidCandidateCount,
    truePositive,
    falsePositive,
    falseNegative,
    duplicateCount,
    hallucinationCount,
    precision,
    recall,
    f1Score,
    schemaValidityRate,
    evidenceExactMatchRate
  } = metrics;

  // 1. Eşitlik invariantları
  if (
    candidateRuleCount !== schemaValidCandidateCount + schemaInvalidCandidateCount ||
    schemaValidCandidateCount !== truePositive + falsePositive ||
    fixture.manifest.expectation.expectedRuleCount !== truePositive + falseNegative ||
    falsePositive !== duplicateCount + hallucinationCount
  ) {
    throw new EvaluationError('EVALUATION_METRIC_INVARIANT_FAILED', 'Metrics equality invariants violation');
  }

  // 2. Oran limitleri (ratio controls)
  const ratios = [
    { val: precision, name: 'precision' },
    { val: recall, name: 'recall' },
    { val: f1Score, name: 'f1Score' },
    { val: schemaValidityRate, name: 'schemaValidityRate' }
  ];
  if (evidenceExactMatchRate !== null) {
    ratios.push({ val: evidenceExactMatchRate, name: 'evidenceExactMatchRate' });
  }

  for (const ratio of ratios) {
    if (!Number.isFinite(ratio.val) || ratio.val < 0 || ratio.val > 1) {
      throw new EvaluationError('EVALUATION_METRIC_INVARIANT_FAILED', `Metric ratio ${ratio.name} is out of bounds [0, 1] or non-finite: ${ratio.val}`);
    }
  }

  // Result sıralamaları
  // 1. matches -> expectedRuleId, candidateId
  const sortedMatches = [...matchResult.matches].sort((a, b) => {
    const expComp = a.expectedRuleId.localeCompare(b.expectedRuleId);
    if (expComp !== 0) return expComp;
    return a.candidateId.localeCompare(b.candidateId);
  });

  // 2. unmatchedExpected -> ascending ID
  const sortedUnmatchedExpected = matchResult.unmatchedExpected
    .map(r => r.id)
    .sort((a, b) => a.localeCompare(b));

  // 3. unmatchedCandidates -> ascending ID (valid unmatched)
  const sortedUnmatchedCandidates = matchResult.unmatchedCandidates
    .map(c => c.candidateId)
    .sort((a, b) => a.localeCompare(b));

  // 4. invalidCandidates -> candidateId (null values at the end), rawPayloadHash, issues.join('|')
  const sortedInvalidCandidates = [...invalidDiagnostics].sort((a, b) => {
    if (a.candidateId !== b.candidateId) {
      if (a.candidateId === null) return 1;
      if (b.candidateId === null) return -1;
      return a.candidateId.localeCompare(b.candidateId);
    }
    if (a.rawPayloadHash !== b.rawPayloadHash) {
      return a.rawPayloadHash.localeCompare(b.rawPayloadHash);
    }
    return a.issues.join('|').localeCompare(b.issues.join('|'));
  });

  // 5. mismatches -> expectedRuleId, candidateId, candidateFingerprint
  const sortedMismatches = [...matchResult.mismatches].sort((a, b) => {
    const expComp = a.expectedRuleId.localeCompare(b.expectedRuleId);
    if (expComp !== 0) return expComp;

    // candidateId mismatch içindeki candidateId (eşleşen candidate'in Id'si)
    const matchedCandidateIdA = a.mismatchFields.length > 0 ? matchResult.matches.find(m => m.expectedRuleId === a.expectedRuleId)?.candidateId || '' : '';
    const matchedCandidateIdB = b.mismatchFields.length > 0 ? matchResult.matches.find(m => m.expectedRuleId === b.expectedRuleId)?.candidateId || '' : '';

    const candComp = matchedCandidateIdA.localeCompare(matchedCandidateIdB);
    if (candComp !== 0) return candComp;

    const fpA = a.matchedCandidateFingerprint || '';
    const fpB = b.matchedCandidateFingerprint || '';
    return fpA.localeCompare(fpB);
  });

  // Quality Gate Kuralları
  let qualityGatePassed = false;
  const outcomeMatched = true; // Success geldi ve rules_found/no_rules bekleniyordu

  if (
    schemaInvalidCandidateCount === 0 &&
    precision === 1 &&
    recall === 1 &&
    f1Score === 1
  ) {
    if (expectedOutcome === 'rules_found') {
      qualityGatePassed = evidenceExactMatchRate === 1;
    } else if (expectedOutcome === 'no_rules') {
      qualityGatePassed = evidenceExactMatchRate === null;
    }
  }

  return {
    resultType: 'rule_evaluation',
    caseId: fixture.manifest.caseId,
    dataset: fixture.manifest.dataset,
    expectedOutcome: expectedOutcome as any,
    actualOutcome: 'success',
    outcomeMatched,
    qualityGatePassed,
    metrics,
    matches: sortedMatches,
    unmatchedExpected: sortedUnmatchedExpected,
    unmatchedCandidates: sortedUnmatchedCandidates,
    invalidCandidates: sortedInvalidCandidates,
    mismatches: sortedMismatches
  };
}
