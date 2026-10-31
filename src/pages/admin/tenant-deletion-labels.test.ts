import assert from 'node:assert/strict';
import test from 'node:test';
import { blockerLabel } from './tenant-deletion-labels';

test('blocker labels explain known tables and keep unknown tables visible', () => {
  assert.equal(blockerLabel('documents'), 'SmartCheck belgeleri');
  assert.equal(blockerLabel('payment_orders'), 'payment_orders');
});
