import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadQuotaLimits, checkUploadCapacity } from './upload-quota';
test('upload quota validates config and counts pending reservations', () => {
  assert.deepEqual(uploadQuotaLimits({}), { maxBytes: 2147483648, maxDocuments: 1000 });
  for (const raw of ['0', '-1', 'NaN', '1.5', 'Infinity']) assert.throws(() => uploadQuotaLimits({ SMARTCHECK_TENANT_STORAGE_MAX_BYTES: raw }));
  assert.throws(() => checkUploadCapacity({ bytes: 99n, count: 1n }, 2, { maxBytes: 100, maxDocuments: 10 }), /STORAGE_QUOTA_EXCEEDED/);
  assert.throws(() => checkUploadCapacity({ bytes: 0n, count: 10n }, 1, { maxBytes: 100, maxDocuments: 10 }), /DOCUMENT_QUOTA_EXCEEDED/);
  assert.doesNotThrow(() => checkUploadCapacity({ bytes: 99n, count: 9n }, 1, { maxBytes: 100, maxDocuments: 10 }));
});
