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

test('every package carries explicit feature and storage limits; only the free plan is the trial', () => {
  const GB = 1024 ** 3;
  assert.deepEqual(canonicalPlans.map(p => [p.monthlyAiLimit, p.monthlyPdfLimit, p.monthlyCrmLimit, p.monthlyRegulationLimit, p.monthlyProfitAnalysisLimit]), [
    [5, 10, 50, 10, 10],
    [0, 50, 0, 50, 0],
    [30, 100, 500, 50, 50],
    [150, 500, 2000, 300, 300],
    [1000, 99999, 99999, 2000, 2000],
  ]);
  assert.deepEqual(canonicalPlans.map(p => p.storageMaxBytes), [0.5 * GB, 1 * GB, 2 * GB, 10 * GB, 50 * GB]);
  assert.deepEqual(canonicalPlans.map(p => p.maxDocuments), [100, 500, 1000, 5000, 20000]);
  assert.deepEqual(canonicalPlans.map(p => p.isTrial), [true, false, false, false, false]);
});

test('bootstrap backfills unset limits once and never overwrites admin-set limits', () => {
  const unset = { ...canonicalPlans[2], monthlyAiLimit: null, monthlyPdfLimit: null, monthlyCrmLimit: null, monthlyRegulationLimit: null, monthlyProfitAnalysisLimit: null, storageMaxBytes: null, maxDocuments: null, isTrial: false };
  assert.deepEqual(planCatalogChanges([unset]).limitUpdates, [{ ...canonicalPlans[2] }]);
  const adminTuned = { ...canonicalPlans[2], monthlyAiLimit: 45 };
  const changes = planCatalogChanges([adminTuned]);
  assert.deepEqual(changes.limitUpdates, []);
  assert.deepEqual(changes.existing, [adminTuned.id]);
});

test('IFC auditor package is sold as a pilot until server SmartCheck is live', () => {
  const auditor = canonicalPlans.find(p => p.id.endsWith('000000000002'))!;
  assert.equal(auditor.marketingBadge, 'Pilot');
  assert.match(auditor.marketingDescription ?? '', /pilot/i);
  assert.match(auditor.marketingDescription ?? '', /henüz/i);
  assert.match(auditor.marketingDescription ?? '', /33331/);
  assert.match(auditor.marketingDescription ?? '', /resmî uygunluk kararı değildir/i);
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
