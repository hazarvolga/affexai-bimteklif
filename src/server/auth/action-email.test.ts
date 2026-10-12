import assert from 'node:assert/strict';
import test from 'node:test';
import { stageAndDeliverAuthAction } from './action-email';

test('keeps the previous action usable when a replacement email cannot be delivered', async () => {
  const calls: string[] = [];
  await assert.rejects(stageAndDeliverAuthAction({
    stage: async () => { calls.push('stage'); return { id: 'new-action', raw: 'raw-token' }; },
    deliver: async () => { calls.push('deliver'); throw new Error('smtp unavailable'); },
    finalize: async () => { calls.push('finalize'); },
    discard: async (id) => { calls.push(`discard:${id}`); },
  }), /smtp unavailable/);
  assert.deepEqual(calls, ['stage', 'deliver', 'discard:new-action']);
});

test('retires older actions only after SMTP accepts the replacement', async () => {
  const calls: string[] = [];
  const value = await stageAndDeliverAuthAction({
    stage: async () => { calls.push('stage'); return { id: 'new-action', raw: 'raw-token' }; },
    deliver: async raw => { calls.push(`deliver:${raw}`); },
    finalize: async id => { calls.push(`finalize:${id}`); },
    discard: async () => { calls.push('discard'); },
  });
  assert.equal(value, 'raw-token');
  assert.deepEqual(calls, ['stage', 'deliver:raw-token', 'finalize:new-action']);
});

test('preserves the delivery error if discarding a staged token also fails', async () => {
  const deliveryFailure = new Error('smtp unavailable');
  await assert.rejects(stageAndDeliverAuthAction({
    stage: async () => ({ id: 'new-action', raw: 'raw-token' }),
    deliver: async () => { throw deliveryFailure; },
    finalize: async () => {},
    discard: async () => { throw new Error('database unavailable'); },
  }), error => error === deliveryFailure);
});
