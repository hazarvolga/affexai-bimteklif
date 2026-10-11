import assert from 'node:assert/strict';
import test from 'node:test';
import { readAdminResponse, adminPlansSchema, adminDashboardSchema } from './admin-data';

test('admin reads reject HTTP and malformed bodies instead of displaying zero metrics', async () => {
  await assert.rejects(readAdminResponse(new Response('{"error":"private"}', { status: 503 }), adminPlansSchema), /HTTP 503/);
  await assert.rejects(readAdminResponse(new Response('not json'), adminPlansSchema), /ADMIN_RESPONSE_INVALID/);
  await assert.rejects(readAdminResponse(new Response('{"error":"failure"}'), adminDashboardSchema), /ADMIN_RESPONSE_INVALID/);
  assert.deepEqual(await readAdminResponse(new Response('[]'), adminPlansSchema), []);
});

test('dashboard reads actual queueStats without treating failed runs as stalled jobs', async () => {
  const value = { totalTenants: 0, statusCounts: {}, totalMRR: 0, totalQuotesThisMonth: 0, totalIfcThisMonth: 0,
    planDistribution: [], queueStats: { queued: 2, running: 1, failed24h: 3, succeeded24h: 4 } };
  assert.deepEqual(await readAdminResponse(new Response(JSON.stringify(value)), adminDashboardSchema), value);
});
