import assert from 'node:assert/strict';
import test from 'node:test';
import { publicAiEvidence } from './quotation-ai-evidence';

test('AI evidence exposes only bounded proposal and change fields', () => {
  const evidence = { kind: 'ai_estimate', suggestionId: 'secret-id', original: { description: 'Beton', unit: 'm3', quantity: 2, unitPrice: 100, secret: 'hidden' }, changedFields: ['quantity', 'unitPrice'], final: { secret: 'hidden' }, authority: 'non_authoritative', secret: 'hidden' };
  assert.deepEqual(publicAiEvidence(evidence), { original: { description: 'Beton', unit: 'm3', quantity: 2, unitPrice: 100 }, changedFields: ['quantity', 'unitPrice'] });
  assert.equal(publicAiEvidence({ ...evidence, kind: 'other' }), null);
  assert.equal(publicAiEvidence({ ...evidence, original: { ...evidence.original, unitPrice: null } }), null);
  assert.equal(publicAiEvidence({ ...evidence, changedFields: ['secret'] }), null);
});
