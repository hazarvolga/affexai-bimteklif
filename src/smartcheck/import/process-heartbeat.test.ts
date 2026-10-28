import test from 'node:test';
import assert from 'node:assert/strict';
import { startProcessHeartbeat } from './process-heartbeat';

test('idle heartbeat retries failures and stops with the runner', async () => {
  let tick: (() => void) | undefined;
  let calls = 0;
  let close = 0;
  let finish!: () => void;
  const runner = new Promise<void>(resolve => { finish = resolve; });
  const stop = startProcessHeartbeat({ runner, write: async () => { calls++; if (calls === 1) throw Error('unavailable'); }, close: async () => { close++; }, schedule: cb => { tick = cb; return () => { tick = undefined; }; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  tick?.();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(close, 1);
  assert.equal(tick, undefined);
  stop();
  assert.equal(close, 1);
});
