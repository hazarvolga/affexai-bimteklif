import assert from 'node:assert/strict';
import test from 'node:test';
import { benchmarkEligible, benchmarkQuoteItem } from './benchmark-policy';
const now = new Date('2026-06-01T00:00:00Z');
const valid = { id: 'approved-id', status: 'approved', sourceStatus: 'active', authorizationStatus: 'authorized', authorizationEvidenceHash: 'a'.repeat(64), authorizedAt: now, reviewedAt: now, reviewedByUserId: 'reviewer', validityStart: new Date('2026-01-01'), validityEnd: new Date('2026-12-31'), crawledPrice: '100', itemCode: 'A', itemName: 'Item', unit: 'm3' };
test('benchmark transfer requires row approval, reviewer, active source and known current validity', () => {
 assert.equal(benchmarkEligible(valid, now), true);
 for (const fields of [{ status:'pending' },{ status:'rejected' },{sourceStatus:'stale'},{sourceStatus:'error'},{sourceStatus:'syncing'},{authorizationStatus:'restricted'},{reviewedAt:null},{reviewedByUserId:null},{validityStart:null},{validityEnd:null},{validityEnd:new Date('2025-01-01')},{validityStart:new Date('2027-01-01')},{crawledPrice:'NaN'},{crawledPrice:'-1'}]) assert.equal(benchmarkEligible({...valid,...fields},now), false,JSON.stringify(fields));
});
test('UI transfer preserves source identity without inventing cost or waste', () => {
 const item=benchmarkQuoteItem(valid);
 assert.equal(item.benchmarkStagingId,valid.id);assert.equal(item.unitPrice,100);
 assert.equal(item.costUnitPrice,null);assert.equal(item.wastePercent,0);
});
