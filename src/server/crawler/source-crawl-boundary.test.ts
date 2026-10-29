import assert from 'node:assert/strict';
import test from 'node:test';
import { isAutomaticPricingSource } from './source-eligibility';

test('only active sources enter automatic crawling without lease recovery', () => {
  assert.equal(isAutomaticPricingSource('active'),true);
  for (const status of ['syncing','stale','error','unknown',null]) assert.equal(isAutomaticPricingSource(status),false);
});
