import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotIsEligible, buildPricePermissionEvidence, buildCalmTransferScopeHash } from './calm-transfer';
import { computePricingLockHash } from '../../smartcheck/pricing/snapshots';
const now = new Date('2026-10-29T00:00:00Z');
const snapshot = {reviewStatus:'approved',reviewedAt:now,reviewedByUserId:'reviewer',validFrom:null,validUntil:null} as Parameters<typeof snapshotIsEligible>[0];
const base = {sourceType:'company_actual',licenseStatus:'not_applicable',authorizationStatus:'authorized',authorizationScope:'{"version":1,"capabilities":["commercial_quotation"]}',authorizedAt:now,authorizedByUserId:'reviewer',authorizationEvidenceHash:'a'.repeat(64),reviewStatus:'legacy_unverified',reviewEvidenceReference:null,reviewScope:null,reviewAllowsQuotations:false,reviewedByUserId:null,reviewedAt:null} as Parameters<typeof snapshotIsEligible>[1];
test('legacy authorized hash cannot authorize selecting a price',()=>assert.equal(snapshotIsEligible(snapshot,base,now),false));
test('independent documented permission enables quotation selection without legacy fake hash',()=>{
  assert.equal(snapshotIsEligible(snapshot,{...base!, authorizationStatus:'pending',authorizationEvidenceHash:null,reviewStatus:'verified',reviewEvidenceReference:'https://example.org/license',reviewScope:'Ticari teklifler',reviewAllowsQuotations:true,reviewedByUserId:'reviewer',reviewedAt:now},now),true);
});

test('scope hash includes independent permission evidence and changes when reviewed again',()=>{
  const source={...base!,reviewStatus:'verified',reviewEvidenceReference:'https://example.org/license',reviewScope:'Commercial quotations',reviewAllowsQuotations:true,reviewedByUserId:'reviewer',reviewedAt:now};
  const first=buildPricePermissionEvidence(source); const second=buildPricePermissionEvidence({...source,reviewScope:'New scope',reviewedAt:new Date(now.getTime()+1000)});
  assert.notEqual(buildCalmTransferScopeHash({permissionReview:first}),buildCalmTransferScopeHash({permissionReview:second}));
  assert.notEqual(first.referenceHash,source.reviewEvidenceReference);
});

test('quotation price lock hash changes when permission is re-reviewed',()=>{
  const source={...base!,reviewStatus:'verified',reviewEvidenceReference:'https://example.org/license',reviewScope:'Commercial quotations',reviewAllowsQuotations:true,reviewedByUserId:'reviewer',reviewedAt:now};
  const item={quotationItemId:'item',priceSnapshotId:'snapshot',priceSnapshotStatus:'locked',amount:100,currency:'TRY',unit:'m3'};
  const oldHash=computePricingLockHash([{...item,permissionReview:buildPricePermissionEvidence(source)}]);
  const newHash=computePricingLockHash([{...item,permissionReview:buildPricePermissionEvidence({...source,reviewScope:'Changed scope',reviewedAt:new Date(now.getTime()+1000)})}]);
  assert.notEqual(oldHash,newHash);
});
