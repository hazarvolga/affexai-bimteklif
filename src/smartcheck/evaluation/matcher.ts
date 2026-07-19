import { createHash } from 'crypto';
import { ExpectedRule, RuleCandidateEvaluationInput, RuleMismatchReport, MatchRecord } from './types';
import { normalizeText, normalizeNumeric, normalizeUnit } from './normalize';


/**
 * Bir kural için deterministik Fingerprint (SHA-256 hash) üretir.
 */
export function createFingerprint(rule: {
  discipline?: string | null;
  objectType?: string | null;
  parameter?: string | null;
  operator?: string | null;
  expectedValue?: string | null;
  scopeType?: string | null;
  errorCategory?: string | null;
  canonicalStatement?: string | null;
}): string {
  const normalizedDiscipline = rule.discipline !== null && rule.discipline !== undefined ? normalizeText(rule.discipline) : null;
  const normalizedObjectType = rule.objectType !== null && rule.objectType !== undefined ? normalizeText(rule.objectType) : null;
  const normalizedParameter = rule.parameter !== null && rule.parameter !== undefined ? normalizeText(rule.parameter) : null;
  const normalizedOperator = rule.operator !== null && rule.operator !== undefined ? normalizeText(rule.operator) : null;

  // expectedValue sayısal veya birimsel olabileceğinden, duruma göre normalize edilir.
  let normalizedExpectedValue = rule.expectedValue !== null && rule.expectedValue !== undefined ? normalizeText(rule.expectedValue) : null;
  if (rule.expectedValue !== null && rule.expectedValue !== undefined && rule.parameter !== null && rule.parameter !== undefined) {
    const paramNormalized = normalizeText(rule.parameter);
    if (paramNormalized === 'unit') {
      normalizedExpectedValue = normalizeUnit(rule.expectedValue);
    } else if (paramNormalized === 'quantity' || paramNormalized.includes('price') || paramNormalized.includes('total') || paramNormalized.includes('code')) {
      normalizedExpectedValue = normalizeNumeric(rule.expectedValue);
    }
  }

  const normalizedScopeType = rule.scopeType !== null && rule.scopeType !== undefined ? normalizeText(rule.scopeType) : null;
  const normalizedErrorCategory = rule.errorCategory !== null && rule.errorCategory !== undefined ? normalizeText(rule.errorCategory) : null;
  const normalizedCanonicalStatement = rule.canonicalStatement !== null && rule.canonicalStatement !== undefined ? normalizeText(rule.canonicalStatement) : null;

  const fingerprintPayload = [
    normalizedDiscipline,
    normalizedObjectType,
    normalizedParameter,
    normalizedOperator,
    normalizedExpectedValue,
    normalizedScopeType,
    normalizedErrorCategory,
    normalizedCanonicalStatement
  ] as const;

  const fingerprintPreimage = JSON.stringify(fingerprintPayload);

  return createHash('sha256').update(fingerprintPreimage).digest('hex');
}

export interface MatchResult {
  matches: MatchRecord[];
  unmatchedExpected: ExpectedRule[];
  unmatchedCandidates: RuleCandidateEvaluationInput[];
  duplicateCandidates: RuleCandidateEvaluationInput[];
  mismatches: RuleMismatchReport[];
}

/**
 * Expected ve Candidate kurallarını deterministik olarak eşleştirir.
 */
export function matchRules(
  expectedRules: ExpectedRule[],
  candidates: RuleCandidateEvaluationInput[]
): MatchResult {
  // 1. Fixture Ambiguity Kontrolü (Expected set unique fingerprint ve unique ID doğrulaması)
  const expectedFingerprints = new Map<string, ExpectedRule>();
  const expectedIds = new Set<string>();

  for (const exp of expectedRules) {
    if (expectedIds.has(exp.id)) {
      throw new Error(`Fixture definition ambiguity: Duplicate expected rule ID '${exp.id}' detected.`);
    }
    expectedIds.add(exp.id);

    const fp = createFingerprint(exp);
    if (expectedFingerprints.has(fp)) {
      throw new Error(`Fixture definition ambiguity: Duplicate expected fingerprint '${fp}' detected for rule '${exp.id}'.`);
    }
    expectedFingerprints.set(fp, exp);
  }

  // 2. Candidate Listesini Stabil Sıralama
  // Candidate'leri geliş sırası (originalIndex) ve fingerprint/candidateId'ye göre stabil sıralamak için zenginleştiriyoruz
  const sortedCandidates = candidates
    .map((c, index) => ({
      candidate: c,
      fingerprint: createFingerprint(c),
      originalIndex: index
    }))
    .sort((a, b) => {
      // 1. fingerprint (artan)
      if (a.fingerprint !== b.fingerprint) {
        return a.fingerprint.localeCompare(b.fingerprint);
      }
      // 2. candidateId (artan)
      if (a.candidate.candidateId !== b.candidate.candidateId) {
        return a.candidate.candidateId.localeCompare(b.candidate.candidateId);
      }
      // 3. originalIndex (artan)
      return a.originalIndex - b.originalIndex;
    });

  const matches: MatchRecord[] = [];
  const matchedExpectedFps = new Set<string>();
  const unmatchedExpectedRules = new Set<ExpectedRule>(expectedRules);
  const unmatchedCandidateRules: RuleCandidateEvaluationInput[] = [];
  const duplicateCandidates: RuleCandidateEvaluationInput[] = [];

  // 3. Exact Matching Döngüsü
  for (const item of sortedCandidates) {
    const fp = item.fingerprint;
    const expRule = expectedFingerprints.get(fp);

    if (expRule) {
      if (!matchedExpectedFps.has(fp)) {
        // True Positive: İlk kez eşleşen expected fingerprint
        matches.push({
          expectedRuleId: expRule.id,
          candidateId: item.candidate.candidateId,
          fingerprint: fp
        });
        matchedExpectedFps.add(fp);
        unmatchedExpectedRules.delete(expRule);
      } else {
        // Duplicate: expected fingerprint ile eşleşmiş bir fingerprint'in fazladan tekrarları
        duplicateCandidates.push(item.candidate);
      }
    } else {
      // expected ile uyuşmuyor -> ya hallucination ya da mismatch diagnostic
      unmatchedCandidateRules.push(item.candidate);
    }
  }

  // 4. Tanısal Field-Level Mismatch Raporlama
  // Birebir exact match olamamış ancak yakınlığı olan (discipline|objectType|parameter|errorCategory birebir uyuşan) expected/candidate çiftlerini raporlar.
  const mismatches: RuleMismatchReport[] = [];

  for (const exp of unmatchedExpectedRules) {
    const expFp = createFingerprint(exp);
    const expDiagKey = [
      normalizeText(exp.discipline),
      exp.objectType ? normalizeText(exp.objectType) : '<null>',
      exp.parameter ? normalizeText(exp.parameter) : '<null>',
      normalizeText(exp.errorCategory)
    ].join('|');

    // Bu expected ile tanısal olarak eşleşen unmatched candidate'ı bulalım
    const matchedCand = unmatchedCandidateRules.find(c => {
      const cDiagKey = [
        normalizeText(c.discipline),
        c.objectType ? normalizeText(c.objectType) : '<null>',
        c.parameter ? normalizeText(c.parameter) : '<null>',
        normalizeText(c.errorCategory)
      ].join('|');
      return expDiagKey === cDiagKey;
    });

    if (matchedCand) {
      const mismatchFields: RuleMismatchReport['mismatchFields'] = [];

      if (exp.operator !== matchedCand.operator) {
        mismatchFields.push({
          field: 'operator',
          expected: String(exp.operator),
          candidate: String(matchedCand.operator)
        });
      }
      if (exp.expectedValue !== matchedCand.expectedValue) {
        mismatchFields.push({
          field: 'expectedValue',
          expected: String(exp.expectedValue),
          candidate: String(matchedCand.expectedValue)
        });
      }
      if (exp.canonicalStatement !== matchedCand.canonicalStatement) {
        mismatchFields.push({
          field: 'canonicalStatement',
          expected: exp.canonicalStatement,
          candidate: matchedCand.canonicalStatement
        });
      }
      if (exp.severity !== matchedCand.severity) {
        mismatchFields.push({
          field: 'severity',
          expected: exp.severity,
          candidate: matchedCand.severity
        });
      }
      if (exp.scopeType !== matchedCand.scopeType) {
        mismatchFields.push({
          field: 'scopeType',
          expected: exp.scopeType,
          candidate: matchedCand.scopeType
        });
      }

      if (mismatchFields.length > 0) {
        mismatches.push({
          expectedRuleId: exp.id,
          matchedCandidateFingerprint: createFingerprint(matchedCand),
          mismatchFields
        });
      }
    }
  }

  return {
    matches,
    unmatchedExpected: Array.from(unmatchedExpectedRules),
    unmatchedCandidates: unmatchedCandidateRules,
    duplicateCandidates,
    mismatches
  };
}
