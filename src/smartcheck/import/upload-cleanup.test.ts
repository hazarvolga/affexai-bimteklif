import assert from 'node:assert/strict';
import test from 'node:test';
import { startPendingUploadCleanup } from './upload-cleanup';
import { uploadUrlExpirySeconds } from './storage';
test('cleanup startup is bounded, can stop, and reports errors', async () => {
  let runs=0;
  const errors:unknown[]=[];
  const handle=startPendingUploadCleanup(async()=>{runs++;throw new Error('fail')}, e=>errors.push(e));
  await new Promise(resolve=>setImmediate(resolve));
  handle.stop();
  assert.equal(runs,1);
  assert.equal(errors.length,1);
  assert.throws(()=>startPendingUploadCleanup(async()=>{},()=>{},1),/INTERVAL_INVALID/);
});
test('upload URL expiry cannot outlive cleanup assumptions',()=>{
  assert.equal(uploadUrlExpirySeconds({}),86400);
  assert.equal(uploadUrlExpirySeconds({IFC_UPLOAD_URL_EXPIRY_SECONDS:'60'}),60);
  for(const raw of ['86401','0','1.5','NaN']) assert.throws(()=>uploadUrlExpirySeconds({IFC_UPLOAD_URL_EXPIRY_SECONDS:raw}), /EXPIRY_INVALID/);
});
