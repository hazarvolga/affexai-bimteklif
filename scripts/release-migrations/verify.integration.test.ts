import { drizzleApi } from './generation-api';
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as schema from '../../src/db/schema';
import { connect, requireEmpty } from './safety';
import { provision } from './provision';
import { catalog } from './catalog';
import { adoptBaseline, applyMigrations, loadMigrations } from './runner';
import { root, releaseDirectory } from './config';
import { restoreSyntheticBackup } from './backup';
import { verifyQuotaMigration } from './quota-validation';
import { pinnedSignature } from './stage-signatures';

test('release migration lifecycle on three owned disposable databases', { timeout: 120_000 }, async (t) => {
  assert.ok(process.env.RELEASE_CONTROL_DATABASE_URL, 'Explicit RELEASE_CONTROL_DATABASE_URL is required');
  const migrations = await loadMigrations();
  const owned = await provision(process.env.RELEASE_CONTROL_DATABASE_URL);
  const clients: Awaited<ReturnType<typeof connect>>[] = [];
  const report: Record<string, unknown> = { contract: 'teklifpro-release-validation.v1', source: 'versioned release SQL only; no cloned schema' };
  const check = async (name: string, action: (context: TestContext) => Promise<void>) => {
    let completed = false;
    await t.test(name, async (context) => { await action(context); completed = true; });
    if (!completed) throw new Error(`Release validation stopped at: ${name}`);
  };
  try {
    for (const target of owned.targets) clients.push(await connect(target));
    const [fresh, upgrade, restore] = clients;
    await check('provision refuses pre-existing names and leaves them intact', async () => {
      await assert.rejects(provision(process.env.RELEASE_CONTROL_DATABASE_URL!), /pre-existing/);
      await requireEmpty(fresh);
    });
    await check('all release pins match independently materialized stage snapshots', async () => {
      const signatures: Record<string, string> = {};
      for (const migration of migrations) {
        const snapshot = JSON.parse(await readFile(`${releaseDirectory}/meta/${String(migration.idx).padStart(4, '0')}_snapshot.json`, 'utf8'));
        await restore.query('begin');
        try {
          for (const statement of await drizzleApi.generateMigration(drizzleApi.generateDrizzleJson({}), snapshot)) await restore.query(statement);
          const signature = (await catalog(restore)).signature;
          assert.equal(signature, pinnedSignature(migration));
          signatures[migration.tag] = signature;
        } finally { await restore.query('rollback'); }
      }
      await requireEmpty(restore);
      report.verifiedStageSignatures = signatures;
    });
    let baselineSignature = '';
    await check('baseline bootstraps 63 tables from an empty database', async () => {
      await requireEmpty(fresh);
      assert.deepEqual(await applyMigrations(fresh, migrations, 0), ['0000_baseline']);
      const state = await catalog(fresh);
      assert.equal(state.objects.relations.filter((r: any) => r.relkind === 'r').length, 63);
      baselineSignature = state.signature;
      report.baselineSignature = baselineSignature;
    });
    await check('additive migration reaches 68 tables and matches current Drizzle schema', async () => {
      assert.deepEqual(await applyMigrations(fresh, migrations), migrations.slice(1).map(m => m.tag));
      const state = await catalog(fresh);
      assert.equal(state.objects.relations.filter((r: any) => r.relkind === 'r').length, 68);
      // Independently materialize the current structured Drizzle schema, not a dump
      // of the baseline-derived database, then compare complete logical catalogs.
      await restore.query('begin');
      try {
        const statements = await drizzleApi.generateMigration(drizzleApi.generateDrizzleJson({}), drizzleApi.generateDrizzleJson(schema));
        for (const statement of statements) await restore.query(statement);
        assert.deepEqual((await catalog(restore)).objects, state.objects);
      } finally { await restore.query('rollback'); }
      report.headSignature = state.signature;
      report.schemaParity = 'pass';
    });
    await check('repeat application is a no-op and changed migration history is rejected', async () => {
      const before = await fresh.query('select * from teklifpro_release.migrations order by idx');
      assert.deepEqual(await applyMigrations(fresh, migrations), []);
      assert.deepEqual((await fresh.query('select * from teklifpro_release.migrations order by idx')).rows, before.rows);
      await assert.rejects(applyMigrations(fresh, migrations.map((m) => ({ ...m, sha256: 'invalid' }))), /modified migration history/);
    });
    await check('a forged complete ledger cannot endorse its own drifted catalog', async () => {
      const original = (await fresh.query('select idx,catalog_hash from teklifpro_release.migrations order by idx')).rows;
      await fresh.query('alter table companies add column forged_catalog text');
      const forged = (await catalog(fresh)).signature;
      await fresh.query('update teklifpro_release.migrations set catalog_hash=$1', [forged]);
      try {
        await assert.rejects(applyMigrations(fresh, migrations), /pinned release signature/);
        assert.equal((await catalog(fresh)).signature, forged);
        assert.ok((await fresh.query('select catalog_hash from teklifpro_release.migrations')).rows.every(row => row.catalog_hash === forged));
      } finally {
        await fresh.query('alter table companies drop column forged_catalog');
        for (const row of original) await fresh.query('update teklifpro_release.migrations set catalog_hash=$1 where idx=$2', [row.catalog_hash, row.idx]);
      }
    });
    await check('head68 cannot be adopted as baseline63 using either candidate or baseline signatures', async () => {
      await fresh.query('alter schema teklifpro_release rename to saved_release_test');
      try {
        const before = (await catalog(fresh)).signature;
        await assert.rejects(adoptBaseline(fresh, migrations, before), /signature mismatch/);
        await assert.rejects(adoptBaseline(fresh, migrations, baselineSignature), /signature mismatch/);
        assert.equal((await fresh.query("select to_regnamespace('teklifpro_release') as name")).rows[0].name, null);
        assert.equal((await catalog(fresh)).signature, before);
      } finally {
        // Only the owned test DB: remove metadata if a broken adoption created it.
        await fresh.query('drop schema if exists teklifpro_release cascade');
        await fresh.query('alter schema saved_release_test rename to teklifpro_release');
      }
      report.signatureAnchoring = 'pass: forged complete ledger and head-as-baseline rejected';
    });
    await check('CI test-isolation helper works against the freshly bootstrapped database', async () => {
      const target = owned.targets[0];
      const url = new URL(`postgresql://${target.host}:${target.port}/${target.database}`);
      url.username = target.user; url.password = target.password;
      const { NODE_TEST_CONTEXT, ...env } = process.env;
      const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', '--test', 'src/server/routes/test-isolation.test.ts'], {
        cwd: root, env: { ...env, DATABASE_URL: url.href }, timeout: 20_000,
      });
      assert.match(result.stdout, /pass 5/);
      assert.equal((await catalog(fresh)).signature, report.headSignature);
      report.ciIsolation = 'pass';
    });
    await check('explicit adoption requires a verified baseline signature; no automatic stamping', async () => {
      for (const statement of migrations[0].statements) await upgrade.query(statement);
      await assert.rejects(applyMigrations(upgrade, migrations), /empty database/);
      await assert.rejects(adoptBaseline(upgrade, migrations, '0'.repeat(64)), /signature mismatch/);
      assert.equal((await upgrade.query("select to_regnamespace('teklifpro_release') as name")).rows[0].name, null);
      await adoptBaseline(upgrade, migrations, baselineSignature);
      assert.equal((await upgrade.query('select mode from teklifpro_release.migrations')).rows[0].mode, 'adopted');
      report.adoption = 'pass';
    });
    await check('upgrade preserves synthetic tenant data and migration failure rolls back', async () => {
      await upgrade.query("insert into companies (id,name) values ('11111111-1111-4111-8111-111111111111','Synthetic release fixture')");
      const failing = [migrations[0], { ...migrations[1], statements: [...migrations[1].statements, 'select 1/0'] }];
      await assert.rejects(applyMigrations(upgrade, failing), /division by zero/);
      assert.equal((await catalog(upgrade)).signature, baselineSignature);
      assert.equal((await upgrade.query('select count(*)::int as count from teklifpro_release.migrations')).rows[0].count, 1);
      assert.deepEqual(await applyMigrations(upgrade, migrations, 1), ['0001_admin_billing']);
      assert.equal((await upgrade.query('select name from companies')).rows[0].name, 'Synthetic release fixture');
      report.upgrade = 'pass'; report.rollback = 'pass'; report.idempotency = 'pass';
    });
    await check('quota constraints reject invalid legacy data atomically and enforce new writes', async () => {
      await verifyQuotaMigration(upgrade, migrations);
      assert.equal((await catalog(upgrade)).signature, report.headSignature);
      report.quotaConstraints = 'pass: five invalid-data rollbacks, five write guards, zero and independent periods/tenants';
    });
    await check('drifted schemas fail closed without applying anything', async () => {
      await upgrade.query('begin');
      await upgrade.query('alter table companies add column unexpected text');
      // Inspect inside a transaction, then restore the fixture before runner execution.
      assert.notEqual((await catalog(upgrade)).signature, report.headSignature);
      await upgrade.query('rollback');
      await upgrade.query('alter table companies add column unexpected text');
      await assert.rejects(applyMigrations(upgrade, migrations), /Schema drift/);
      await upgrade.query('alter table companies drop column unexpected');
    });
    await check('failed initial bootstrap leaves no application objects or ledger', async () => {
      const failing = [{ ...migrations[0], statements: [...migrations[0].statements, 'select 1/0'] }];
      await assert.rejects(applyMigrations(restore, failing), /division by zero/);
      await requireEmpty(restore);
      const wrongCatalog = [{ ...migrations[0], statements: [...migrations[0].statements, 'create table unexpected_release_object(id integer)'] }];
      await assert.rejects(applyMigrations(restore, wrongCatalog), /Applied catalog differs from pinned release signature/);
      await requireEmpty(restore);
    });
    await check('synthetic full backup/restore parity when matching PostgreSQL tools exist', async (subtest) => {
      const major = Math.floor(Number((await fresh.query("show server_version_num")).rows[0].server_version_num) / 10000);
      await requireEmpty(restore);
      const backup = await restoreSyntheticBackup(owned.targets[1], owned.targets[2], major);
      report.backupRestore = backup;
      if (backup.status === 'unavailable') { subtest.skip(backup.reason); return; }
      assert.equal((await catalog(restore)).signature, report.headSignature);
      for (const table of ['companies', 'usage_records', 'plans', 'subscriptions']) {
        assert.deepEqual((await restore.query(`select * from ${table} order by id`)).rows, (await upgrade.query(`select * from ${table} order by id`)).rows);
      }
      assert.deepEqual(await applyMigrations(restore, migrations), []);
    });
  } finally {
    for (const client of clients) await client.end();
    await owned.cleanup();
  }
  report.disposableCleanup = 'completed';
  if (process.env.RELEASE_WRITE_REPORT === 'true') {
    const folder = `${root}/docs/architecture/generated`;
    await mkdir(folder, { recursive: true });
    await writeFile(`${folder}/release-migrations-validation.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
});
