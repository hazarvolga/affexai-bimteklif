import { drizzleApi } from './generation-api';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadMigrations } from './runner';
import { baselineSource, releaseDirectory } from './config';
import * as schema from '../../src/db/schema';
import { pinnedSignature } from './stage-signatures';
import { injectDataTransitions } from './data-transitions';

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
    ['plans', 'plans_feature_limits_nonnegative'],
    ['subscriptions', 'subscriptions_bonus_quote_limit_nonnegative'],
  ]) assert.ok(tables[`public.${table}`].checkConstraints[constraint], constraint);
});

test('calm transfer schema binds every junction to one ledger source and target scope', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  const ledgers = tables['public.quotation_transfer_ledgers'];
  const rows = tables['public.quotation_transfer_source_rows'];
  const normalizedRows = tables['public.normalized_quantity_rows'];

  assert.ok(rows.columns.source_document_id?.notNull);
  assert.ok(rows.columns.source_processing_run_id?.notNull);
  assert.ok(ledgers.columns.scope_snapshot_json?.notNull);
  assert.deepEqual(
    ledgers.uniqueConstraints.quotation_transfer_ledgers_scope_key.columns,
    ['id', 'company_id', 'source_document_id', 'source_processing_run_id', 'target_quotation_id'],
  );
  assert.deepEqual(
    normalizedRows.uniqueConstraints.normalized_quantity_rows_transfer_scope_key.columns,
    ['id', 'company_id', 'document_id', 'processing_run_id'],
  );
  assert.deepEqual(
    rows.uniqueConstraints.quotation_transfer_source_rows_ledger_row_item_key.columns,
    ['transfer_ledger_id', 'source_quantity_row_id', 'target_quotation_item_id'],
  );
  assert.deepEqual(
    rows.foreignKeys.quotation_transfer_source_rows_ledger_scope_fk.columnsFrom,
    ['transfer_ledger_id', 'company_id', 'source_document_id', 'source_processing_run_id', 'target_quotation_id'],
  );
  assert.deepEqual(
    rows.foreignKeys.quotation_transfer_source_rows_source_scope_fk.columnsFrom,
    ['source_quantity_row_id', 'company_id', 'source_document_id', 'source_processing_run_id'],
  );
});

test('calm transfer migration injects deferred revision binding and immutable quotation identity guards', async () => {
  const statements = injectDataTransitions('0011_quotation_transfer_ledger', []);
  assert.ok(statements.some((statement) => statement.includes('CREATE CONSTRAINT TRIGGER quotation_transfer_revision_binding')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER quotation_transfer_quotation_identity_immutable')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER quotation_transfer_source_rows_sealed')));
  assert.ok(statements.some((statement) => statement.includes('CREATE CONSTRAINT TRIGGER quotation_transfer_ledger_must_be_sealed')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER quotation_transfer_target_items_immutable')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER quotation_transfer_target_evidence_immutable')));
  assert.ok(statements.some((statement) => statement.includes('UPDATE OF raw_description, raw_position_code, raw_unit, raw_quantity, source_cell_range')));
  assert.equal(statements.filter((statement) => statement.includes('EXECUTE FUNCTION prevent_transfer_bound_source_mutation()')).length, 4);
});

test('release artifacts form an append-only chain matching current schema', async () => {
  const migrations = await loadMigrations();
  const baseline = JSON.parse(await readFile(baselineSource, 'utf8'));
  assert.equal(Object.keys(baseline.tables).length, 63);
  assert.equal(migrations.length, 12);
  let previous = drizzleApi.generateDrizzleJson({});
  for (const migration of migrations) {
    const snapshot = JSON.parse(await readFile(`${releaseDirectory}/meta/${String(migration.idx).padStart(4, '0')}_snapshot.json`, 'utf8'));
    assert.deepEqual(migration.statements, injectDataTransitions(migration.tag, await drizzleApi.generateMigration(previous, snapshot)).map(s => s.trim()));
    previous = snapshot;
  }
  const current = drizzleApi.generateDrizzleJson(schema);
  const { id, prevId, ...expected } = current;
  const { id: otherId, prevId: otherPrevId, ...actual } = previous;
  assert.deepEqual(actual, JSON.parse(JSON.stringify(expected)));
});
