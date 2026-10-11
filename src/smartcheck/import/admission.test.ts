import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdmission } from './admission';
test('admission rejects excess work and release is idempotent', () => {
  const acquire = createAdmission(1);
  const release = acquire();
  assert.throws(acquire, /DOCUMENT_IO_BUSY/);
  release(); release();
  const next = acquire();
  assert.throws(acquire, /DOCUMENT_IO_BUSY/);
  next();
});
