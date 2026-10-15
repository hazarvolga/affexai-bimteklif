import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlanInput, updatePlanInput, updateSubscriptionInput } from './input';

test('admin plan boundary accepts zero limits but rejects unsafe fields and values', () => {
  assert.deepEqual(createPlanInput.parse({ name: 'Free', monthlyQuoteLimit: 0, monthlyPrice: 0 }), {
    name: 'Free', monthlyQuoteLimit: 0, monthlyPrice: 0, isActive: true, isPublished: false,
    isFeatured: false, displayOrder: 0, ifcMaxFileMb: 50, ifcMaxConcurrent: 1,
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

test('new or updated plans cannot advertise an IFC size above the supported ceiling', () => {
  assert.equal(createPlanInput.safeParse({ name: 'Too large', monthlyQuoteLimit: 1, monthlyPrice: 1, ifcMaxFileMb: 250 }).success, false);
  assert.equal(updatePlanInput.safeParse({ ifcMaxFileMb: 101 }).success, false);
  assert.equal(updatePlanInput.safeParse({ ifcMaxFileMb: 100 }).success, true);
});

test('admins can set per-package feature and storage limits within safe bounds', () => {
  const limits = { monthlyAiLimit: 0, monthlyPdfLimit: 50, monthlyCrmLimit: null, monthlyRegulationLimit: 10, monthlyProfitAnalysisLimit: 10, storageMaxBytes: 1024 ** 3, maxDocuments: 500, isTrial: false };
  assert.deepEqual(updatePlanInput.parse(limits), limits);
  assert.deepEqual(
    updatePlanInput.parse({ isActive: false, replacementPlanId: '00000000-0000-4000-8000-000000000001' }),
    { isActive: false, replacementPlanId: '00000000-0000-4000-8000-000000000001' },
  );
  for (const value of [{ monthlyAiLimit: -1 }, { monthlyPdfLimit: 1.5 }, { storageMaxBytes: 0 }, { storageMaxBytes: Number.MAX_SAFE_INTEGER + 1 }, { maxDocuments: 0 }, { replacementPlanId: 'not-a-uuid' }]) {
    assert.equal(updatePlanInput.safeParse(value).success, false, JSON.stringify(value));
  }
});
