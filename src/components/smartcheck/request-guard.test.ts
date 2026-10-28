import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createDocumentRequestGuard, readPollingStatus } from './request-guard';

test('late document A response cannot replace selected B; refreshes also use newest result', async () => {
 const guard=createDocumentRequestGuard(); guard.select('A'); const a=guard.request('A'); guard.select('B'); const b=guard.request('B'); assert.equal(a(),false); assert.equal(b(),true);
 const older=guard.request('B'), newer=guard.request('B'); assert.equal(older(),false); assert.equal(newer(),true); guard.select(null); assert.equal(newer(),false);
});

test('polling rejects non-success and network errors, preserving retry capability', async () => {
 await assert.rejects(readPollingStatus(async()=>({ok:false}) as Response));
 await assert.rejects(readPollingStatus(async()=>{throw new Error('network')}));
 assert.deepEqual(await readPollingStatus(async()=>({ok:true,json:async()=>({run:{status:'running'},document:{status:'processing'}})}) as Response), {run:{status:'running'},document:{status:'processing'}});
});

test('a delayed sample cannot replace a document selected after it started', () => {
 const guard = createDocumentRequestGuard();
 const sampleStillCurrent = guard.captureSelection();
 guard.select('another-document');
 assert.equal(sampleStillCurrent(), false);
 const sameSelection = guard.captureSelection();
 assert.equal(sameSelection(), true);
 guard.select('another-document');
 assert.equal(sameSelection(), false);
});

test('delayed file validation cannot override a newer file or selected queue document', () => {
 const guard = createDocumentRequestGuard();
 const first = guard.beginFileSelection();
 const second = guard.beginFileSelection();
 assert.equal(first(), false); assert.equal(second(), true);
 guard.select('queue-document');
 assert.equal(second(), false);
});

test('file selection intent immediately invalidates an earlier sample while file header is pending', () => {
 const guard = createDocumentRequestGuard();
 const sampleStillCurrent = guard.captureSelection();
 const pendingFile = guard.beginFileSelection();
 assert.equal(sampleStillCurrent(), false);
 assert.equal(pendingFile(), true);
 guard.select('another-document');
 assert.equal(pendingFile(), false);
});

test('new sample intent invalidates an earlier pending file header and earlier sample', () => {
 const guard = createDocumentRequestGuard();
 const fileStillCurrent = guard.beginFileSelection();
 const sampleStillCurrent = guard.beginSampleSelection();
 assert.equal(fileStillCurrent(), false);
 assert.equal(sampleStillCurrent(), true);
 const newerSample = guard.beginSampleSelection();
 assert.equal(sampleStillCurrent(), false);
 assert.equal(newerSample(), true);
});

test('failed sample or file selection resets only its own current selection', () => {
 const guard = createDocumentRequestGuard();
 guard.select('A'); const failedSample = guard.beginSampleSelection();
 assert.equal(guard.failSelection(failedSample), true); assert.equal(guard.isSelected('A'), false);
 guard.select('B'); const failedFile = guard.beginFileSelection(); guard.select('C');
 assert.equal(guard.failSelection(failedFile), false); assert.equal(guard.isSelected('C'), true);
 const legacyFile = guard.beginFileSelection();
 assert.equal(guard.failSelection(legacyFile), true); assert.equal(guard.isSelected('C'), false);
});
