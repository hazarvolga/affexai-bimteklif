import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithAuth } from './api';

test('fetchWithAuth drains the network body so an unread response never keeps the request open', async t => {
  const original = new Response('{"plan":"Pro"}', { status: 200, headers: { 'Content-Type': 'application/json', 'X-Test': '1' } });
  t.mock.method(globalThis, 'fetch', async () => original);
  const response = await fetchWithAuth('/api/billing/usage-stats');
  assert.equal(original.bodyUsed, true);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Test'), '1');
  assert.deepEqual(await response.json(), { plan: 'Pro' });
});

test('fetchWithAuth keeps null-body statuses and error bodies intact', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  const empty = await fetchWithAuth('/api/auth/logout', { method: 'POST' });
  assert.equal(empty.status, 204);
  assert.equal(empty.body, null);

  t.mock.method(globalThis, 'fetch', async () => new Response('{"code":"X"}', { status: 403, statusText: 'Forbidden' }));
  const denied = await fetchWithAuth('/api/ifc/browser-analyses', { method: 'POST' });
  assert.equal(denied.ok, false);
  assert.equal(denied.statusText, 'Forbidden');
  assert.deepEqual(await denied.json(), { code: 'X' });
});
