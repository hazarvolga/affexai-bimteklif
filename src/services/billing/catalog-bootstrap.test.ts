import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPlans, planCatalogChanges } from './plan-catalog';
import { catalogTarget } from './catalog-target';

test('canonical catalog has five precise allowances within supported IFC limits', () => {
  assert.equal(canonicalPlans.length, 5);
  assert.deepEqual(canonicalPlans.map(p => p.monthlyPrice), [0, 390, 1450, 3950, 8900]);
  assert.deepEqual(canonicalPlans.map(p => p.monthlyQuoteLimit), [5, 0, 30, 150, 99999]);
  assert.deepEqual(canonicalPlans.map(p => p.monthlyIfcLimit), [1, 50, 2, 25, 100]);
  assert.ok(canonicalPlans.every(p => p.ifcMaxFileMb <= 100));
  assert.equal(new Set(canonicalPlans.map(p => p.id)).size, 5);
});

test('bootstrap adopts exact existing names, backfills public metadata, but refuses drift and duplicate identities', () => {
  const existing = { ...canonicalPlans[0], id: '22222222-2222-4222-8222-222222222222', isPublished: false, displayOrder: 0, marketingBadge: null, marketingDescription: null };
  const preview = planCatalogChanges([existing]);
  assert.equal(preview.insert.length, 4);
  assert.deepEqual(preview.existing, [existing.id]);
  assert.deepEqual(preview.presentationUpdates, [{ ...canonicalPlans[0], id: existing.id }]);
  assert.equal(planCatalogChanges(canonicalPlans).insert.length, 0);
  assert.equal(planCatalogChanges(canonicalPlans).presentationUpdates.length, 0);
  assert.throws(() => planCatalogChanges([{ ...existing, monthlyQuoteLimit: 99 }]), /CATALOG_CONFLICT/);
  assert.throws(() => planCatalogChanges([existing, canonicalPlans[0]]), /CATALOG_CONFLICT/);
});

test('catalog target requires explicit identity and production opt-in without URL overrides', () => {
  const env = { CATALOG_EXPECTED_HOST: 'postgres', CATALOG_EXPECTED_DATABASE: 'bimmetraj_production', CATALOG_EXPECTED_USER: 'bimmetraj' };
  const url = 'postgresql://bimmetraj@postgres:5432/bimmetraj_production';
  assert.throws(() => catalogTarget(url, env));
  assert.equal(catalogTarget(url, { ...env, CATALOG_ALLOW_PRODUCTION: 'true' }).database, 'bimmetraj_production');
  for (const target of [url + '?host=other', url.replace('@postgres', '@other'), url.replace('5432', '5433'), url.replace('bimmetraj_production', 'postgres')]) {
    assert.throws(() => catalogTarget(target, { ...env, CATALOG_ALLOW_PRODUCTION: 'true' }));
  }
  assert.throws(() => catalogTarget('postgresql://user@127.0.0.1/other', {}));
});
