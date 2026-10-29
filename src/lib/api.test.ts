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

test('an aborted stale 401 cannot expire the current session, while an active 401 does', async t => {
  const storage = new Map([['bm_authed', '1']]);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let destination = '';
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: '/app/crm', search: '', assign: (url: string) => { destination = url; } } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null, removeItem: (key: string) => storage.delete(key) } });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete (globalThis as { window?: unknown }).window;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage); else delete (globalThis as { localStorage?: unknown }).localStorage;
  });
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 401 }));
  const controller = new AbortController(); controller.abort();
  assert.equal((await fetchWithAuth('/api/crm/leads', { signal: controller.signal })).status, 401);
  assert.equal(storage.get('bm_authed'), '1');
  assert.equal(destination, '');
  assert.equal((await fetchWithAuth('/api/crm/leads')).status, 401);
  assert.equal(storage.has('bm_authed'), false);
  assert.match(destination, /^\/login\?next=/);
});
