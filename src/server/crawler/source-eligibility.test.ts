import assert from 'node:assert/strict';
import test from 'node:test';
import { isAutomaticPricingSource } from './source-eligibility';

test('manual and automatic pricing crawl eligibility admits only active sources', () => {
  assert.equal(isAutomaticPricingSource('active'), true);
  for (const status of ['stale', 'error', 'syncing', 'disabled', '', null]) assert.equal(isAutomaticPricingSource(status), false);
});
