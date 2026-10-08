import assert from 'node:assert/strict';
import test from 'node:test';
import { db } from '../../db';
import { usageTracker } from './usage';

for (const failure of ['update', 'insert', 'log'] as const) {
  test(`usage finish handles ${failure} rejection without rejecting the listener`, async t => {
    let calls = 0;
    const errors: unknown[][] = [];
    t.mock.method(console, 'error', (...args: unknown[]) => { errors.push(args); });
    t.mock.method(db, 'execute', (async () => {
      calls++;
      if (calls === 1) return { rows: [{ monthly_quote_limit: 15, bonus_quote_limit: 0 }] };
      if (calls === 2) return { rows: [{ quote_count: 0 }] };
      if ((failure === 'update' && calls === 3) || (failure === 'insert' && calls === 4)) {
        throw new Error('storage unavailable');
      }
      return { rows: [] };
    }) as any);
    t.mock.method(db, 'insert', (() => ({ values: async () => {
      if (failure === 'log') throw new Error('log unavailable');
    } })) as any);
    const listeners: Array<() => Promise<void>> = [];
    let allowed = false;
    await usageTracker('QUOTATION_CREATED')(
      { user: { companyId: 'company', userId: 'user' } },
      { statusCode: 200, on: (_: string, fn: () => Promise<void>) => listeners.push(fn) },
      () => { allowed = true; },
    );
    assert.equal(allowed, true);
    assert.equal(listeners.length, 2);
    const settled = await Promise.allSettled(listeners.map(fn => fn()));
    assert.ok(settled.every(result => result.status === 'fulfilled'));
    assert.equal(errors.length, 1);
  });
}
