import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPricingSources, pricingSourceCatalogChanges } from './source-catalog';

test('pricing source catalog contains five metadata-only stale sources', () => {
  assert.equal(canonicalPricingSources.length, 5);
  assert.equal(new Set(canonicalPricingSources.map(source => source.code)).size, 5);
  assert.ok(canonicalPricingSources.every(source => source.status === 'stale' && source.itemCount === 0));
});

test('pricing source catalog inserts missing rows, adopts exact rows and rejects drift', () => {
  const existing = { ...canonicalPricingSources[0], id: '11111111-1111-4111-8111-111111111111' };
  const preview = pricingSourceCatalogChanges([existing]);
  assert.equal(preview.insert.length, 4);
  assert.deepEqual(preview.existing, [existing.id]);
  assert.equal(pricingSourceCatalogChanges([{ ...existing, status: 'active', itemCount: 12, versionTag: 'reviewed-v1' }]).insert.length, 4);
  assert.throws(() => pricingSourceCatalogChanges([{ ...existing, sourceUrl: 'https://example.com' }]), /SOURCE_CATALOG_CONFLICT/);
  const idCollision = { ...canonicalPricingSources[0], code: 'another_source' };
  const codeCollision = { ...canonicalPricingSources[0], id: '22222222-2222-4222-8222-222222222222' };
  assert.throws(() => pricingSourceCatalogChanges([idCollision, codeCollision]), /SOURCE_CATALOG_CONFLICT/);
});
