import test from 'node:test';
import assert from 'node:assert/strict';
import { endBrowserSession } from './logout-session';

test('server acknowledgement is required before clearing local session', async () => {
  let cleared = 0;
  assert.equal(await endBrowserSession(async () => ({ ok: false }), () => { cleared++; }), false);
  assert.equal(await endBrowserSession(async () => { throw new Error('offline'); }, () => { cleared++; }), false);
  assert.equal(cleared, 0);
  assert.equal(await endBrowserSession(async () => ({ ok: true }), () => { cleared++; }), true);
  assert.equal(cleared, 1);
});
