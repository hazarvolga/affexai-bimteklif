import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCrawlSourceProof, CrawlSourceProofError, hasIndependentSourceAuthorization } from './source-proof';

const hash = 'a'.repeat(64);
test('valid current and changed content hashes may be staged; invalid hashes fail closed', () => {
  assert.doesNotThrow(() => assertCrawlSourceProof({dataHash:hash,crawlHash:'b'.repeat(64),hasActiveRows:true}));
  for (const crawlHash of ['', 'invalid']) assert.throws(() => assertCrawlSourceProof({dataHash:null,hasActiveRows:false,crawlHash}), (error: unknown) => error instanceof CrawlSourceProofError && error.code === 'PRICING_SOURCE_EVIDENCE_REQUIRED');
});
test('legacy authorized hash never proves independent usage review', () => {
  const legacy = { authorizationStatus:'authorized', authorizationEvidenceHash:hash, authorizedAt:new Date(), reviewStatus:'legacy_unverified',reviewEvidenceReference:null,reviewScope:null,reviewAllowsQuotations:false,reviewedByUserId:null,reviewedAt:null };
  assert.equal(hasIndependentSourceAuthorization(legacy),false);
  assert.equal(hasIndependentSourceAuthorization({...legacy,reviewStatus:'verified',reviewEvidenceReference:'https://example.com/permission',reviewScope:'Teklif hazırlama',reviewAllowsQuotations:true,reviewedByUserId:'c4d72105-c2e5-4f66-868f-60992a0841d6',reviewedAt:new Date()}),true);
});

test('price observation identity cannot be reattributed to a changed source or accept missing hash', async () => {
  const {priceSourceIdentity,priceObservationMatchesSource}=await import('./source-identity');
  const source={code:'A',name:'Acme',authority:'Acme',sourceUrl:'https://example.com',category:'market_commodity',versionTag:'1',currency:'TRY',countryCode:'TR'};
  const row={contentHash:hash,sourceIdentity:priceSourceIdentity(source)};
  assert.equal(priceObservationMatchesSource(row,source),true);
  for(const changed of [{...source,versionTag:'2'},{...source,name:'Other'},{...source,authority:'Other'}]) assert.equal(priceObservationMatchesSource(row,changed),false);
  assert.equal(priceObservationMatchesSource({...row,contentHash:null},source),false);
  assert.equal(priceObservationMatchesSource({...row,sourceIdentity:null},source),false);
});
