import { sha256Payload } from '../../smartcheck/pricing/snapshots';
import { isIP } from 'node:net';

export type SourceReviewEvidence = Readonly<{ reference: string; scope: string; allowsQuotations: true }>;
export type SourceReviewState = Readonly<{
  reviewStatus: string;
  reviewEvidenceReference: string | null;
  reviewScope: string | null;
  reviewAllowsQuotations: boolean;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
}>;

/** Stores a reference only; never fetches or treats URL/hash as proof of permission. */
export function parseSourceReviewEvidence(input: { reference: unknown; scope: unknown; allowsQuotations: unknown }): SourceReviewEvidence {
  if (typeof input.reference !== 'string' || typeof input.scope !== 'string' || input.allowsQuotations !== true) throw new Error('Belge bağlantısı ve kullanım kapsamı gerekli.');
  const reference = input.reference.trim();
  const scope = input.scope.trim();
  if (reference.length > 2048 || scope.length < 3 || scope.length > 2000) throw new Error('Geçerli belge bağlantısı ve kullanım kapsamı gerekli.');
  let url: URL;
  try { url = new URL(reference); } catch { throw new Error('Belge bağlantısı geçersiz.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || host === 'localhost' || host.endsWith('.localhost') || isIP(host.replace(/^\[|\]$/g, ''))) {
    throw new Error('Belge bağlantısı genel bir HTTPS adresi olmalı.');
  }
  return { reference: url.href, scope, allowsQuotations: true };
}

export function sourceReviewEligible(value: SourceReviewState): boolean {
  if (value.reviewStatus !== 'verified' || !value.reviewAllowsQuotations || !value.reviewedByUserId || !(value.reviewedAt instanceof Date) || Number.isNaN(value.reviewedAt.valueOf())) return false;
  try { parseSourceReviewEvidence({ reference: value.reviewEvidenceReference, scope: value.reviewScope, allowsQuotations: value.reviewAllowsQuotations }); return true; } catch { return false; }
}

/** Non-secret snapshot of the independently reviewed source permission. */
export function buildPricePermissionEvidence(source: SourceReviewState) {
  return {
    status: source.reviewStatus,
    referenceHash: source.reviewEvidenceReference ? sha256Payload({ reference: source.reviewEvidenceReference }) : null,
    scope: source.reviewScope,
    allowsQuotations: source.reviewAllowsQuotations,
    reviewedByUserId: source.reviewedByUserId,
    reviewedAt: source.reviewedAt?.toISOString() ?? null,
  };
}
