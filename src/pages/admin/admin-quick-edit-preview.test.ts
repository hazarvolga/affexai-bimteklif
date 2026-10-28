import test from 'node:test';
import assert from 'node:assert/strict';
import { quickEditPreview } from './admin-quick-edit-preview';

test('quick edit preview compares plan identity, subscription status and bonus, and discloses stale data', () => {
  const text = quickEditPreview(
    { name: 'Firma', plan_id: 'old-id', plan_name: 'Aynı', subscription_status: 'active', bonus_quote_limit: 0 },
    { planId: 'new-id', status: 'past_due', bonusQuoteLimit: 5 },
    [{ id: 'old-id', name: 'Aynı' }, { id: 'new-id', name: 'Aynı' }],
  );
  assert.match(text, /Aynı \(old-id\) → Aynı \(new-id\)/);
  assert.match(text, /active → past_due/);
  assert.match(text, /0 → 5/);
  assert.match(text, /başka bir yönetici değişiklik yapmış olabilir/i);
});

test('missing prior values remain unknown; absent or missing plan name is explicit', () => {
  const text = quickEditPreview({ name: 'Firma' }, { planId: 'missing', status: 'active', bonusQuoteLimit: 0 }, []);
  assert.match(text, /Bilinmiyor/);
  assert.match(text, /Bilinmeyen paket \(missing\)/);
});

test('legacy plan and no subscription are distinguished without inventing current values', () => {
  const legacy = quickEditPreview({ name: 'Firma', plan_id: null, plan_name: 'starter', subscription_status: 'active', bonus_quote_limit: 0 }, { planId: null, status: 'active', bonusQuoteLimit: 4 }, []);
  assert.match(legacy, /Eski plan: starter/);
  assert.match(legacy, /eski plan korunur/i);
  assert.match(legacy, /Ek teklif kotası \(toplam\): 0 → 4/);
  const withoutSubscription = quickEditPreview({ name: 'Firma', plan_id: null, plan_name: null, subscription_status: null, bonus_quote_limit: null }, { planId: null, status: 'active', bonusQuoteLimit: 0 }, []);
  assert.match(withoutSubscription, /Abonelik yok/);
  assert.match(withoutSubscription, /Yeni abonelik oluşturulacak/);
  assert.doesNotMatch(withoutSubscription, /Eski plan: starter/);
  const unknownLegacy = quickEditPreview({ name: 'Firma', plan_id: 'p1', plan_name: 'Paket', subscription_status: 'active', bonus_quote_limit: 0 }, { planId: null, status: 'active', bonusQuoteLimit: 0 }, [{ id: 'p1', name: 'Paket' }]);
  assert.match(unknownLegacy, /katalog paketi kaldırılacak/i);
  assert.match(unknownLegacy, /eski plan.*bilinmiyor/i);
});
