import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSourceReviewEvidence, sourceReviewEligible } from './source-review-policy';

test('legacy authorization hashes cannot grant independent permission', () => {
  assert.equal(sourceReviewEligible({ reviewStatus: 'legacy_unverified', reviewEvidenceReference: null, reviewScope: null, reviewAllowsQuotations: false, reviewedByUserId: null, reviewedAt: null }), false);
  assert.equal(sourceReviewEligible({ reviewStatus: 'verified', reviewEvidenceReference: null, reviewScope: 'commercial', reviewAllowsQuotations: true, reviewedByUserId: 'reviewer', reviewedAt: new Date() }), false);
});

test('review requires a safe link and meaningful documented scope', () => {
  for (const reference of ['abc', 'a'.repeat(64), 'http://example.com', 'https://user:pass@example.com/doc', 'https://127.0.0.1/doc', 'https://localhost/doc', 'https://example.org/doc?token=secret']) {
    assert.throws(() => parseSourceReviewEvidence({ reference, scope: 'ticari teklifler', allowsQuotations: true }));
  }
  assert.throws(() => parseSourceReviewEvidence({ reference: 'https://example.org/license', scope: ' ', allowsQuotations: true }));
  const evidence = parseSourceReviewEvidence({ reference: 'https://example.org/license', scope: 'ticari teklifler', allowsQuotations: true });
  assert.equal(sourceReviewEligible({ reviewStatus: 'verified', reviewEvidenceReference: evidence.reference, reviewScope: evidence.scope, reviewAllowsQuotations: true, reviewedByUserId: 'reviewer', reviewedAt: new Date() }), true);
  assert.equal(sourceReviewEligible({ reviewStatus: 'revoked', reviewEvidenceReference: evidence.reference, reviewScope: evidence.scope, reviewAllowsQuotations: true, reviewedByUserId: 'reviewer', reviewedAt: new Date() }), false);
});

test('quotation use needs an explicit permission and is never inferred from free text', () => {
  assert.throws(() => parseSourceReviewEvidence({reference: 'https://example.org/license', scope: 'ticari teklif', allowsQuotations: false}));
  assert.equal(sourceReviewEligible({reviewStatus: 'verified', reviewEvidenceReference: 'https://example.org/license', reviewScope: 'ticari teklif', reviewAllowsQuotations: false, reviewedByUserId: 'reviewer', reviewedAt: new Date()}), false);
});
