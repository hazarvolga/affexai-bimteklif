import assert from 'node:assert/strict';
import test from 'node:test';
import { publicPlansForDisplay, pricingLayout } from './presentation';

test('public pricing only exposes active, explicitly published plans in display order', () => {
  const plans = publicPlansForDisplay([
    { id: 'hidden', name: 'Taslak', isActive: true, isPublished: false, displayOrder: 1 },
    { id: 'inactive', name: 'Pasif', isActive: false, isPublished: true, displayOrder: 2 },
    { id: 'late', name: 'Geç', isActive: true, isPublished: true, displayOrder: 20 },
    { id: 'early', name: 'Erken', isActive: true, isPublished: true, displayOrder: 10 },
  ]);

  assert.deepEqual(plans.map((plan) => plan.id), ['early', 'late']);
});

test('pricing layout uses a normal grid through five cards and carousel after that', () => {
  assert.equal(pricingLayout(0), 'empty');
  assert.equal(pricingLayout(5), 'grid');
  assert.equal(pricingLayout(6), 'carousel');
});
