import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeApprovedTransfers } from './admin-dashboard-metrics';

test('approved bank transfer aggregation deduplicates IDs, never counts malformed entries as zero', () => {
  const valid = [{ details: { requestId: 'a', amountTry: 1000 } }, { details: { requestId: 'a', amountTry: 1000 } }, { details: { requestId: 'b', amountTry: 2000 } }];
  assert.deepEqual(summarizeApprovedTransfers(valid), { amountTry: 3000, count: 2, complete: true });
  assert.deepEqual(summarizeApprovedTransfers([]), { amountTry: 0, count: 0, complete: true });
  assert.deepEqual(summarizeApprovedTransfers([...valid, { details: { requestId: 'c' } }]), { amountTry: null, count: null, complete: false });
  assert.deepEqual(summarizeApprovedTransfers([...valid, { details: { requestId: 'a', amountTry: 2000 } }]), { amountTry: null, count: null, complete: false });
  assert.deepEqual(summarizeApprovedTransfers(Array.from({ length: 5001 }, (_, i) => ({ details: { requestId: String(i), amountTry: 1 } }))), { amountTry: null, count: null, complete: false });
});
