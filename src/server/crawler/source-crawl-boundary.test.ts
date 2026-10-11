import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('manual and scheduled crawler entry points enforce active-source eligibility', async () => {
  const [adminRoutes, scheduler] = await Promise.all([
    readFile(new URL('../routes/admin.ts', import.meta.url), 'utf8'),
    readFile(new URL('./priceSchedulerService.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(adminRoutes, /isAutomaticPricingSource\(source\.status\)/);
  assert.match(adminRoutes, /PRICING_SOURCE_REVIEW_REQUIRED/);
  assert.match(scheduler, /eq\(pricingDataSources\.status,\s*['"]active['"]\)/);
});
