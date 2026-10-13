import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadQuotaLimits, checkUploadCapacity, resolveUploadLimits } from './upload-quota';
test('upload quota validates config and counts pending reservations', () => {
  assert.deepEqual(uploadQuotaLimits({}), { maxBytes: 2147483648, maxDocuments: 1000 });
  for (const raw of ['0', '-1', 'NaN', '1.5', 'Infinity']) assert.throws(() => uploadQuotaLimits({ SMARTCHECK_TENANT_STORAGE_MAX_BYTES: raw }));
  assert.throws(() => checkUploadCapacity({ bytes: 99n, count: 1n }, 2, { maxBytes: 100, maxDocuments: 10 }), /STORAGE_QUOTA_EXCEEDED/);
  assert.throws(() => checkUploadCapacity({ bytes: 0n, count: 10n }, 1, { maxBytes: 100, maxDocuments: 10 }), /DOCUMENT_QUOTA_EXCEEDED/);
  assert.doesNotThrow(() => checkUploadCapacity({ bytes: 99n, count: 9n }, 1, { maxBytes: 100, maxDocuments: 10 }));
});
test('package storage limits override the platform default; unset columns keep it', () => {
  const fallback = { maxBytes: 2147483648, maxDocuments: 1000 };
  assert.deepEqual(resolveUploadLimits({ storageMaxBytes: 50 * 1024 ** 3, maxDocuments: 20000 }, fallback), { maxBytes: 50 * 1024 ** 3, maxDocuments: 20000 });
  assert.deepEqual(resolveUploadLimits({ storageMaxBytes: null, maxDocuments: 100 }, fallback), { maxBytes: 2147483648, maxDocuments: 100 });
  assert.deepEqual(resolveUploadLimits(undefined, fallback), fallback);
  for (const bad of [0, -1, 1.5, Number.NaN]) assert.throws(() => resolveUploadLimits({ storageMaxBytes: bad, maxDocuments: null }, fallback), /UPLOAD_QUOTA_CONFIG_INVALID/);
});
