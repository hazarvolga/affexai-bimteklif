import { sourceReviewEligible, type SourceReviewState } from '../pricing/source-review-policy';

export class CrawlSourceProofError extends Error {
  readonly code = 'PRICING_SOURCE_EVIDENCE_REQUIRED';
  constructor() { super('Tarama sonucu geçerli kaynak kanıtı içermiyor; fiyatlar güncellenmedi.'); }
}

/** Each observation stores its own hash; a changed source is a new observation. */
export function assertCrawlSourceProof(input: { dataHash: string | null; crawlHash: string; hasActiveRows: boolean }) {
  if (!/^[a-f0-9]{64}$/.test(input.crawlHash)) throw new CrawlSourceProofError();
}

export function hasIndependentSourceAuthorization(source: SourceReviewState) {
  return sourceReviewEligible(source);
}

export class SourceAuthorizationRequiredError extends Error {
  readonly code = 'PRICE_SOURCE_AUTHORIZATION_REQUIRED';
  constructor() { super('Fiyatı onaylamak için kaynağın bağımsız kullanım izni ve geçerli izin kanıtı gereklidir.'); }
}
