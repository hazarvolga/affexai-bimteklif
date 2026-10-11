import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlanInput, updatePlanInput, updateSubscriptionInput } from './input';

test('admin plan boundary accepts zero limits but rejects unsafe fields and values', () => {
  assert.deepEqual(createPlanInput.parse({ name: 'Free', monthlyQuoteLimit: 0, monthlyPrice: 0 }), {
    name: 'Free', monthlyQuoteLimit: 0, monthlyPrice: 0, isActive: true, ifcMaxFileMb: 50, ifcMaxConcurrent: 1,
  });
  for (const input of [
    { name: '', monthlyQuoteLimit: 1, monthlyPrice: 0 },
    { name: 'X', monthlyQuoteLimit: -1, monthlyPrice: 0 },
    { name: 'X', monthlyQuoteLimit: 1.2, monthlyPrice: 0 },
    { name: 'X', monthlyQuoteLimit: 1, monthlyPrice: 2147483648 },
    { name: 'X', monthlyQuoteLimit: 1, monthlyPrice: 0, id: 'override' },
  ]) assert.equal(createPlanInput.safeParse(input).success, false);
  assert.equal(updatePlanInput.safeParse({}).success, false);
  assert.deepEqual(updatePlanInput.parse({ isActive: false }), { isActive: false });
});

test('subscription patch preserves omitted fields and accepts only persisted statuses', () => {
  assert.deepEqual(updateSubscriptionInput.parse({ bonusQuoteLimit: 0 }), { bonusQuoteLimit: 0 });
  assert.deepEqual(updateSubscriptionInput.parse({ planId: null }), { planId: null });
  for (const status of ['active', 'past_due', 'canceled']) assert.equal(updateSubscriptionInput.safeParse({ status }).success, true);
  for (const value of [{}, { status: 'suspended' }, { status: 'trial' }, { bonusQuoteLimit: -1 }, { companyId: 'override' }, { planId: 'bad' }]) {
    assert.equal(updateSubscriptionInput.safeParse(value).success, false);
  }
});
