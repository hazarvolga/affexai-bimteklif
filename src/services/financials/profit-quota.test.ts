import assert from 'node:assert/strict';
import test from 'node:test';
import { ProfitService } from './profitService';
const items = [{ quantity: 1, unitPrice: 100, costUnitPrice: 50 }];

test('profit paid insights reserve before provider and quota rejection cannot be swallowed', async () => {
  const events: string[] = [];
  const service = new ProfitService('');
  (service as any).genAI = { getGenerativeModel: () => ({ generateContent: async () => { events.push('provider'); return { response: { text: () => 'Insight' } }; } }) };
  const analyze = (...args: any[]) => (service.analyzeProfitability as any)(...args);
  await analyze(items, 'residential', 'TRY', {}, async () => { events.push('reserve'); });
  assert.deepEqual(events, ['reserve', 'provider']);
  await assert.rejects(analyze(items, 'residential', 'TRY', {}, async () => { throw new Error('AI_QUOTA_EXCEEDED'); }), /AI_QUOTA_EXCEEDED/);
  assert.equal(events.length, 2);
});

test('deterministic profit analysis does not reserve AI quota', async () => {
  const service = new ProfitService('');
  const deny = async () => assert.fail('no provider means no AI spending');
  await (service.analyzeProfitability as any)(items, 'residential', 'TRY', {}, deny);
  (service as any).genAI = { getGenerativeModel: () => assert.fail('missing cost cannot call AI') };
  await (service.analyzeProfitability as any)([{ ...items[0], costUnitPrice: null }], 'residential', 'TRY', {}, deny);
});
