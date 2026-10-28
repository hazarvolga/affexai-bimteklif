import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPdfPriceSourcesCertain, PdfPriceSourceUncertainError } from './price-guard';

test('PDF rejects historically ambiguous imported zero without treating explicit manual/source zero as absent', () => {
  const sourceItem = { id: 'item', unitPrice: '0.00', priceSource: 'document', priceSnapshotId: null, sourceQuantityRowId: 'row' };
  const check = (items: typeof sourceItem[], rows: Array<{ id: string; rawPrice: string | null; normalizedPrice: string | null }>, evidence: Array<{ itemId: string; source: unknown; zeroPriceReason?: unknown; price?: unknown; createdByUserId?: string | null }> = []) => assertPdfPriceSourcesCertain(items, rows, evidence);
  assert.throws(() => check([sourceItem], [{ id: 'row', rawPrice: null, normalizedPrice: null }]), PdfPriceSourceUncertainError);
  // A historical explicit zero override produces this same state: it needs confirmation, not silent reclassification.
  assert.throws(() => check([sourceItem], [{ id: 'row', rawPrice: '', normalizedPrice: null }]), PdfPriceSourceUncertainError);
  assert.throws(() => check([sourceItem], []), PdfPriceSourceUncertainError);
  assert.throws(() => check([{ ...sourceItem, sourceQuantityRowId: null }], []), PdfPriceSourceUncertainError);
  assert.throws(() => check([sourceItem], [{ id: 'row', rawPrice: '0', normalizedPrice: '0.00' }]), PdfPriceSourceUncertainError);
  assert.throws(() => check([sourceItem], [{ id: 'row', rawPrice: '0', normalizedPrice: '0.00' }], [{ itemId: 'item', source: null }]), PdfPriceSourceUncertainError);
  assert.doesNotThrow(() => check([sourceItem], [{ id: 'row', rawPrice: '0', normalizedPrice: '0.00' }], [{ itemId: 'item', source: '0' }]));
  assert.doesNotThrow(() => check([{ ...sourceItem, sourceQuantityRowId: null, priceSource: 'manual' }], []));
  assert.doesNotThrow(() => check([{ ...sourceItem, priceSource: 'snapshot', priceSnapshotId: 'snapshot' }], []));
  assert.doesNotThrow(() => check([{ ...sourceItem, unitPrice: '10.00' }], []));
  const explicit = { ...sourceItem, priceSource: 'manual' };
  assert.throws(() => check([explicit], []), PdfPriceSourceUncertainError);
  assert.throws(() => check([explicit], [], [{ itemId: 'item', source: 'manual_zero_override', zeroPriceReason: ' ', price: '0', createdByUserId: 'reviewer' }]), PdfPriceSourceUncertainError);
  assert.throws(() => check([explicit], [], [{ itemId: 'other', source: 'manual_zero_override', zeroPriceReason: 'Bedelsiz', price: '0', createdByUserId: 'reviewer' }]), PdfPriceSourceUncertainError);
  assert.doesNotThrow(() => check([explicit], [], [{ itemId: 'item', source: 'manual_zero_override', zeroPriceReason: 'Bedelsiz', price: '0', createdByUserId: 'reviewer' }]));
});
