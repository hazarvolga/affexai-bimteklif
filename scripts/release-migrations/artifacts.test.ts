import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadMigrations } from './runner';
import { baselineSource, drizzleApi, releaseDirectory } from './config';
import * as schema from '../../src/db/schema';
import { pinnedSignature } from './stage-signatures';

test('release stage pins reject unreviewed or changed artifacts', async () => {
  const migrations = await loadMigrations();
  for (const migration of migrations) {
    assert.match(pinnedSignature(migration), /^[a-f0-9]{64}$/);
    for (const change of [{ idx: 999 }, { tag: 'unknown' }, { sha256: '0'.repeat(64) }, { snapshotSha256: '0'.repeat(64) }]) {
      assert.throws(() => pinnedSignature({ ...migration, ...change }), /no pinned release signature/);
    }
  }
});

test('quota schema declares the database uniqueness and nonnegative guards', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  assert.deepEqual(tables['public.usage_records'].uniqueConstraints.usage_records_company_id_period_key.columns, ['company_id', 'period']);
  for (const [table, constraint] of [
    ['usage_records', 'usage_records_quote_count_nonnegative'],
    ['plans', 'plans_monthly_quote_limit_nonnegative'],
    ['plans', 'plans_monthly_price_nonnegative'],
    ['subscriptions', 'subscriptions_bonus_quote_limit_nonnegative'],
  ]) assert.ok(tables[`public.${table}`].checkConstraints[constraint], constraint);
});

test('release artifacts preserve baseline63/admin66 and append the structured quota diff', async () => {
  const migrations = await loadMigrations();
  const baseline = JSON.parse(await readFile(baselineSource, 'utf8'));
  const current = drizzleApi.generateDrizzleJson(schema);
  assert.equal(Object.keys(baseline.tables).length, 63);
  assert.equal(Object.keys(current.tables).length, 66);
  assert.deepEqual(migrations[0].statements, (await drizzleApi.generateMigration(drizzleApi.generateDrizzleJson({}), baseline)).map((s) => s.trim()));
  assert.equal(migrations.length, 3);
  assert.equal(migrations[0].sha256, '32765484c0e9ed02676301fca55a1930c21cb287cdbdd1c7e533a223fc48263d');
  assert.equal(migrations[1].sha256, 'be59a2fc754c26a894adfbe1ac9f72913c3ae15777c4bdaba3dba3b68d858d38');
  assert.equal(migrations[0].snapshotSha256, '6e273fb83c2810206e4d006c31912a46343bacffa99b347e579d3a324500fe29');
  assert.equal(migrations[1].snapshotSha256, '05ded3b2cd5c1d32c530a6ec7572226d19a2292d932eb3d7590e5ef715fe8534');
  const admin = JSON.parse(await readFile(`${releaseDirectory}/meta/0001_snapshot.json`, 'utf8'));
  assert.deepEqual(migrations[1].statements, (await drizzleApi.generateMigration(baseline, admin)).map((s) => s.trim()));
  assert.deepEqual(migrations[2].statements, (await drizzleApi.generateMigration(admin, current)).map((s) => s.trim()));
  assert.equal(migrations[2].statements.length, 5);
  const committed = JSON.parse(await readFile(`${releaseDirectory}/meta/0002_snapshot.json`, 'utf8'));
  assert.equal(committed.prevId, admin.id);
  const { id, prevId, ...expected } = current;
  const { id: otherId, prevId: otherPrevId, ...actual } = committed;
  assert.deepEqual(actual, JSON.parse(JSON.stringify(expected)));
});
