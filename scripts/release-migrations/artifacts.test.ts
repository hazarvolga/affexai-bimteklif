import { drizzleApi } from './generation-api';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadMigrations } from './runner';
import { baselineSource, releaseDirectory } from './config';
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

test('release artifacts form an append-only chain matching current schema', async () => {
  const migrations = await loadMigrations();
  const baseline = JSON.parse(await readFile(baselineSource, 'utf8'));
  assert.equal(Object.keys(baseline.tables).length, 63);
  assert.equal(migrations.length, 6);
  let previous = drizzleApi.generateDrizzleJson({});
  for (const migration of migrations) {
    const snapshot = JSON.parse(await readFile(`${releaseDirectory}/meta/${String(migration.idx).padStart(4, '0')}_snapshot.json`, 'utf8'));
    assert.deepEqual(migration.statements, (await drizzleApi.generateMigration(previous, snapshot)).map(s => s.trim()));
    previous = snapshot;
  }
  const current = drizzleApi.generateDrizzleJson(schema);
  const { id, prevId, ...expected } = current;
  const { id: otherId, prevId: otherPrevId, ...actual } = previous;
  assert.deepEqual(actual, JSON.parse(JSON.stringify(expected)));
});
