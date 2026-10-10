import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { connect, parseTarget } from './safety';

test('release targets reject remote, shared, maintenance and query overrides', () => {
  for (const url of [
    'postgres://u@remote.example:5432/teklifpro_bootstrap_test',
    'postgres://u@localhost:5432/postgres',
    'postgres://u@localhost:5432/teklifpro_local',
    'postgres://u@localhost:5432/teklifpro_bootstrap_test?host=remote.example',
    'postgres://u@localhost:5432/teklifpro_bootstrap_test?database=postgres',
    'postgres://u@localhost:5432/teklifpro_bootstrap_test?options=-csearch_path=public',
    'postgres://localhost:5432/teklifpro_bootstrap_test',
  ]) assert.throws(() => parseTarget(url, 'target'));
  assert.throws(() => parseTarget('postgres://u@localhost:5432/teklifpro_upgrade_test', 'control'));
  assert.equal(parseTarget('postgres://u@localhost:5432/teklifpro_bootstrap_test', 'target').database, 'teklifpro_bootstrap_test');
  assert.equal(parseTarget('postgres://u@localhost:5432/teklifpro_local', 'control').database, 'teklifpro_local');
});

test('effective current_database mismatch closes the connection before mutations', async (t) => {
  t.mock.method(pg.Client.prototype, 'connect', async () => {});
  const query = t.mock.method(pg.Client.prototype, 'query', async () => ({ rows: [{ database: 'postgres', username: 'u' }] }));
  const end = t.mock.method(pg.Client.prototype, 'end', async () => {});
  await assert.rejects(connect(parseTarget('postgres://u@localhost:5432/teklifpro_bootstrap_test', 'target')), /Effective database/);
  assert.equal(query.mock.callCount(), 1);
  assert.equal(end.mock.callCount(), 1);
});
