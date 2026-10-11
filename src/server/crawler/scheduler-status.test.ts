import test from 'node:test';
import assert from 'node:assert/strict';
import { PriceSchedulerService } from './priceSchedulerService';

test('scheduler status reports actual lifecycle and survives a service restart', async () => {
  const completed = { createdAt: new Date('2026-10-11T00:02:00Z'), action: 'nightly_batch_crawl_completed', details: { totalSources: 3, successfulSources: 2, failedSources: 1, totalItemsStaged: 4, durationMs: 20, startedAt: '2026-10-11T00:01:00Z', completedAt: '2026-10-11T00:02:00Z' } };
  const first = new PriceSchedulerService(async () => completed);
  assert.equal((await first.getStatus()).isSchedulerActive, false);
  first.start();
  try { assert.equal((await first.getStatus()).isSchedulerActive, true); }
  finally { first.stop(); }
  assert.equal((await first.getStatus()).isSchedulerActive, false);
  const restarted = new PriceSchedulerService(async () => completed);
  const status = await restarted.getStatus();
  assert.equal(status.lastRunAt, completed.createdAt.toISOString());
  assert.equal(status.lastSummary?.failedSources, 1);
  assert.equal(status.lastSummary?.totalItemsStaged, 4);
  assert.equal(status.lastRunOutcome, 'completed');
});
test('persisted fatal batch failure is visible without treating it as successful completion', async () => {
  const service = new PriceSchedulerService(async () => ({ createdAt: new Date('2026-10-11T00:02:00Z'), action: 'nightly_batch_crawl_failed', details: { totalSources: 2, failedSources: 1 } }));
  assert.equal((await service.getStatus()).lastRunOutcome, 'failed');
});
test('status fails instead of reporting empty history when durable history is unavailable', async () => {
  const service = new PriceSchedulerService(async () => { throw new Error('database unavailable'); });
  await assert.rejects(service.getStatus(), /database unavailable/);
});
