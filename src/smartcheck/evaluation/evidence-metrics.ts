import { ExpectedRule, RuleCandidateEvaluationInput, MatchRecord } from './types';
import { normalizeText } from './normalize';

/**
 * Bir kanıt kaydı için benzersiz lokasyon anahtarı üretir.
 */
export function getEvidenceLocationKey(evidence: {
  sourceType: 'pdf' | 'docx' | 'xlsx';
  documentId: string;
  pageNumber?: number;
  paragraphIndex?: number;
  sheetName?: string;
  cellRange?: string;
}): string {
  const sourceType = evidence.sourceType;
  const documentId = evidence.documentId.toLowerCase();

  if (sourceType === 'pdf') {
    return `${sourceType}|${documentId}|${evidence.pageNumber || 0}`;
  } else if (sourceType === 'docx') {
    return `${sourceType}|${documentId}|${evidence.paragraphIndex ?? 0}`;
  } else if (sourceType === 'xlsx') {
    const sheetName = evidence.sheetName ? normalizeText(evidence.sheetName) : '<null>';
    const cellRange = evidence.cellRange ? normalizeText(evidence.cellRange) : '<null>';
    return `${sourceType}|${documentId}|${sheetName}|${cellRange}`;
  }

  return `${sourceType}|${documentId}`;
}

export interface EvidenceMetricsResult {
  evidenceExactMatchRate: number | null;
  extraCandidateEvidenceCount: number;
  totalExpectedEvidenceCount: number;
  exactMatchedExpectedEvidenceCount: number;
}

/**
 * Matched rule çiftleri için kanıt lokasyon eşleşme oranlarını hesaplar.
 */
export function computeEvidenceMetrics(
  matches: MatchRecord[],
  expectedRules: ExpectedRule[],
  candidates: RuleCandidateEvaluationInput[]
): EvidenceMetricsResult {
  // Matched rule yoksa rate = null dönülür
  if (matches.length === 0) {
    return {
      evidenceExactMatchRate: null,
      extraCandidateEvidenceCount: 0,
      totalExpectedEvidenceCount: 0,
      exactMatchedExpectedEvidenceCount: 0
    };
  }

  let totalExpectedEvidenceCount = 0;
  let exactMatchedExpectedEvidenceCount = 0;
  let extraCandidateEvidenceCount = 0;

  const expectedMap = new Map<string, ExpectedRule>(expectedRules.map(r => [r.id, r]));
  const candidateMap = new Map<string, RuleCandidateEvaluationInput>(candidates.map(c => [c.candidateId, c]));

  for (const match of matches) {
    const expRule = expectedMap.get(match.expectedRuleId);
    const candRule = candidateMap.get(match.candidateId);

    if (!expRule || !candRule) continue;

    const expEvidences = expRule.sourceEvidence || [];
    const candEvidences = candRule.sourceEvidence || [];

    if (expEvidences.length === 0) continue;

    totalExpectedEvidenceCount += expEvidences.length;

    // Lokasyon anahtarlarını üret ve one-to-one match için hazırlan
    const expKeys = expEvidences.map(e => getEvidenceLocationKey(e as any));
    const candKeys = candEvidences.map(c => getEvidenceLocationKey(c as any));

    // One-to-one matching
    const matchedCandIndices = new Set<number>();

    for (const expKey of expKeys) {
      const matchIndex = candKeys.findIndex((candKey, idx) => candKey === expKey && !matchedCandIndices.has(idx));
      if (matchIndex !== -1) {
        exactMatchedExpectedEvidenceCount++;
        matchedCandIndices.add(matchIndex);
      }
    }

    // Fazladan üretilen candidate evidence sayısı
    if (candEvidences.length > expEvidences.length) {
      extraCandidateEvidenceCount += candEvidences.length - expEvidences.length;
    }
  }

  // Denominator is guaranteed to be >= 1 for schema-valid expected rules, fallback to 0 if zero
  const evidenceExactMatchRate = totalExpectedEvidenceCount === 0
    ? 0
    : exactMatchedExpectedEvidenceCount / totalExpectedEvidenceCount;

  return {
    evidenceExactMatchRate,
    extraCandidateEvidenceCount,
    totalExpectedEvidenceCount,
    exactMatchedExpectedEvidenceCount
  };
}
