import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { connect, connectDeployment, parseTarget, requireMigrationTarget, requireDisposable } from './safety';

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

test('production target requires exact opt-in tuple and is never a disposable target', async (t) => {
  const url = 'postgres://bimmetraj_migrator@postgres:5432/bimmetraj_production';
  assert.throws(() => parseTarget(url, 'deployment'));
  const before = { ...process.env };
  Object.assign(process.env, { RELEASE_ALLOW_PRODUCTION: 'true', RELEASE_EXPECTED_HOST: 'postgres', RELEASE_EXPECTED_DATABASE: 'bimmetraj_production', RELEASE_EXPECTED_USER: 'bimmetraj_migrator' });
  try {
    assert.equal(parseTarget(url, 'deployment').host, 'postgres');
    t.mock.method(pg.Client.prototype, 'connect', async () => {});
    t.mock.method(pg.Client.prototype, 'query', async () => ({ rows: [{ database: 'bimmetraj_production', username: 'bimmetraj_migrator', name: 'bimmetraj_production' }] }));
    t.mock.method(pg.Client.prototype, 'end', async () => {});
    const approved = await connectDeployment(url);
    await requireMigrationTarget(approved);
    await assert.rejects(requireDisposable(approved), /refuse shared/);
    await assert.rejects(requireMigrationTarget(new pg.Client()), /refuse shared/);
    assert.throws(() => parseTarget(url, 'target'));
    assert.throws(() => parseTarget(url, 'control'));
    process.env.RELEASE_EXPECTED_USER = 'bimmetraj_app';
    assert.throws(() => parseTarget(url.replace('bimmetraj_migrator', 'bimmetraj_app'), 'deployment'));
    process.env.RELEASE_EXPECTED_USER = 'bimmetraj_migrator';
    for (const invalid of [url.replace('@postgres', '@other'), url.replace('bimmetraj_migrator@', 'other@'), url.replace('bimmetraj_production', 'postgres'), `${url}?host=other`, url.replace(':5432', ':5433')]) {
      assert.throws(() => parseTarget(invalid, 'deployment'));
    }
  } finally {
    for (const key of ['RELEASE_ALLOW_PRODUCTION', 'RELEASE_EXPECTED_HOST', 'RELEASE_EXPECTED_DATABASE', 'RELEASE_EXPECTED_USER']) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
  }
});
