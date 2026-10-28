import test from 'node:test';
import assert from 'node:assert/strict';
import { publicQuotationSourceEvidence } from './quotation-source-evidence';

test('source evidence exposes only allowlisted captured values and review status', () => {
  const data = publicQuotationSourceEvidence([{ evidenceType: 'quantity', sourceCellRange: 'IFC#32', capturedValueJson: { quantity: 3.5, unit: 'm3', review: { status: 'accepted_exception', notes: 'private', reviewerUserId: 'private' }, secret: 'private' } }, { evidenceType: 'price', sourceCellRange: null, capturedValueJson: { amount: '25', currency: 'TRY', unit: 'm3', snapshotKey: 'private' } }]);
  assert.deepEqual(data, { quantity: [{ quantity: '3.5', unit: 'm3', sourceCellRange: 'IFC#32', reviewStatus: 'accepted_exception' }], price: [{ amount: '25', currency: 'TRY', unit: 'm3', zeroPriceReason: null }] });
  assert.doesNotMatch(JSON.stringify(data), /private/);
});

test('unknown and malformed evidence stays unknown and source metadata cannot leak', () => {
  const data = publicQuotationSourceEvidence([{ evidenceType: 'quantity', sourceCellRange: null, capturedValueJson: { quantity: null, unit: null, review: { status: 'invalid' } } }, { evidenceType: 'price', sourceCellRange: null, capturedValueJson: { amount: null, sourceAmount: 'secret' } }, { evidenceType: 'source', sourceCellRange: null, capturedValueJson: { token: 'secret' } }]);
  assert.deepEqual(data, { quantity: [{ quantity: null, unit: null, sourceCellRange: null, reviewStatus: null }], price: [{ amount: null, currency: null, unit: null, zeroPriceReason: null }] });
});

test('explicit zero reason is included only for a zero override', () => {
  const record = (payload: unknown) => ({ evidenceType: 'price', sourceCellRange: null, capturedValueJson: payload });
  const result = publicQuotationSourceEvidence([record({ price: '0.00', source: 'manual_zero_override', zeroPriceReason: 'Bedelsiz' }), record({ price: '2', source: 'manual_zero_override', zeroPriceReason: 'Gizli' })]);
  assert.equal(result.price[0].zeroPriceReason, 'Bedelsiz');
  assert.equal(result.price[1].zeroPriceReason, null);
});
