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
import { injectDataTransitions } from './data-transitions';

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
          for (const statement of injectDataTransitions(migration.tag, await drizzleApi.generateMigration(drizzleApi.generateDrizzleJson({}), snapshot))) await restore.query(statement);
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
    await check('additive migration reaches 73 tables and matches current Drizzle schema', async () => {
      assert.deepEqual(await applyMigrations(fresh, migrations, 8), migrations.slice(1, 9).map(m => m.tag));
      const fixture = {
        company: '33333333-3333-4333-8333-333333333333', user: '44444444-4444-4444-8444-444444444444',
        client: '55555555-5555-4555-8555-555555555555', source: '66666666-6666-4666-8666-666666666666',
        matchingSnapshot: '77777777-7777-4777-8777-777777777777', newerSnapshot: '88888888-8888-4888-8888-888888888888',
        quote: '99999999-9999-4999-8999-999999999999', item: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        matchingEvidence: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', newerEvidence: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      };
      await fresh.query(`insert into companies(id,name) values ($1,'Legacy evidence fixture')`, [fixture.company]);
      await fresh.query(`insert into users(id,email,full_name) values ($1,'legacy-evidence@example.test','Legacy Reviewer')`, [fixture.user]);
      await fresh.query(`insert into memberships(user_id,company_id,role) values ($1,$2,'owner')`, [fixture.user, fixture.company]);
      await fresh.query(`insert into clients(id,company_id,name,type) values ($1,$2,'Legacy Client','company')`, [fixture.client, fixture.company]);
      await fresh.query(`insert into price_sources(id,company_id,source_type,name,source_document_hash,created_by_user_id) values ($1,$2,'supplier_quote','Legacy source',$3,$4)`, [fixture.source, fixture.company, 'a'.repeat(64), fixture.user]);
      for (const [id, key] of [[fixture.matchingSnapshot, 'matching'], [fixture.newerSnapshot, 'newer']]) {
        await fresh.query(`insert into price_snapshots(id,company_id,price_source_id,snapshot_key,description,unit,amount,source_document_hash) values ($1,$2,$3,$4,'Legacy price','adet',100,$5)`, [id, fixture.company, fixture.source, key, 'a'.repeat(64)]);
      }
      await fresh.query(`insert into quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total) values ($1,$2,$3,'LEGACY-1','Legacy quote',now() + interval '1 day',100,0,20,120)`, [fixture.quote, fixture.company, fixture.client]);
      await fresh.query(`insert into quotation_items(id,company_id,quotation_id,description,unit,quantity,unit_price,total,price_snapshot_id) values ($1,$2,$3,'Legacy item','adet',1,100,100,$4)`, [fixture.item, fixture.company, fixture.quote, fixture.matchingSnapshot]);
      await fresh.query(`insert into quotation_item_evidence(id,company_id,quotation_id,quotation_item_id,evidence_type,evidence_key,price_snapshot_id,status,created_by_user_id,created_at) values ($1,$2,$3,$4,'price','matching',$5,'current',$6,'2025-01-01'),($7,$2,$3,$4,'price','newer',$8,'current',$6,'2026-01-01')`, [fixture.matchingEvidence, fixture.company, fixture.quote, fixture.item, fixture.matchingSnapshot, fixture.user, fixture.newerEvidence, fixture.newerSnapshot]);
      assert.deepEqual(await applyMigrations(fresh, migrations), migrations.slice(9).map(migration => migration.tag));
      const evidenceRows = (await fresh.query(`select id,status from quotation_item_evidence where quotation_item_id=$1 order by id`, [fixture.item])).rows;
      assert.deepEqual(evidenceRows, [
        { id: fixture.matchingEvidence, status: 'current' },
        { id: fixture.newerEvidence, status: 'superseded' },
      ]);
      const state = await catalog(fresh);
      assert.equal(state.objects.relations.filter((r: any) => r.relkind === 'r').length, 73);
      // Independently materialize the current structured Drizzle schema, not a dump
      // of the baseline-derived database, then compare complete logical catalogs.
      await restore.query('begin');
      try {
        const statements = injectDataTransitions(migrations.at(-1)!.tag, await drizzleApi.generateMigration(drizzleApi.generateDrizzleJson({}), drizzleApi.generateDrizzleJson(schema)));
        for (const statement of statements) await restore.query(statement);
        assert.deepEqual((await catalog(restore)).objects, state.objects);
      } finally { await restore.query('rollback'); }
      await fresh.query('begin');
      try {
        const cde = {
          document: 'd1111111-1111-4111-8111-111111111111', project: 'd2222222-2222-4222-8222-222222222222',
          container: 'd3333333-3333-4333-8333-333333333333', revision: 'd4444444-4444-4444-8444-444444444444',
          event: 'd5555555-5555-4555-8555-555555555555', run: 'd6666666-6666-4666-8666-666666666666',
          artifact: 'd7777777-7777-4777-8777-777777777777', otherContainer: 'd8888888-8888-4888-8888-888888888888',
          otherRevision: 'd9999999-9999-4999-8999-999999999999',
          mismatchDocument: 'da111111-1111-4111-8111-111111111111', mismatchRun: 'da222222-2222-4222-8222-222222222222',
          mismatchArtifact: 'da333333-3333-4333-8333-333333333333', mismatchRevision: 'da444444-4444-4444-8444-444444444444',
        };
        await fresh.query(`insert into documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256)
          values ($1,$2,$3,'phase4.ifc','Phase 4','application/x-step',1,'phase4/test.ifc',$4)`, [cde.document, fixture.company, fixture.user, 'a'.repeat(64)]);
        await fresh.query(`insert into cde_projects(id,company_id,document_id,name,created_by_user_id) values ($1,$2,$3,'Phase 4 CDE',$4)`, [cde.project, fixture.company, cde.document, fixture.user]);
        await fresh.query(`insert into cde_project_members(company_id,project_id,user_id,project_role,discipline,assigned_by_user_id) values ($1,$2,$3,'coordinator','BIM',$3)`, [fixture.company, cde.project, fixture.user]);
        await fresh.query(`insert into document_processing_runs(id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,progress_percent) values ($1,$2,$3,'succeeded','completed','phase4-cde-run',4,100)`, [cde.run, fixture.company, cde.document]);
        await fresh.query(`insert into document_processing_artifacts(id,company_id,document_id,processing_run_id,artifact_type,storage_key,checksum_sha256,content_type,size_bytes,metadata_json) values ($1,$2,$3,$4,'ifc_evidence','phase4/evidence.json',$5,'application/json',1,$6::jsonb)`, [cde.artifact, fixture.company, cde.document, cde.run, 'd'.repeat(64), JSON.stringify({ ruleEvaluations: { test: { version: 1 } } })]);
        await fresh.query(`insert into cde_containers(id,company_id,project_id,container_code,title,created_by_user_id) values ($1,$2,$3,'PHASE4-CDE','Phase 4',$4)`, [cde.container, fixture.company, cde.project, fixture.user]);
        await fresh.query(`insert into cde_revisions(id,company_id,project_id,container_id,document_id,processing_run_id,result_artifact_id,revision_code,document_checksum_sha256,source_hash,rule_hash,result_hash,code_hash,scope_hash,created_by_user_id)
          values ($1,$2,$3,$4,$5,$6,$7,'P01.01',$8,$9,$10,$11,$12,$13,$14)`, [cde.revision, fixture.company, cde.project, cde.container, cde.document, cde.run, cde.artifact, ...['a','b','c','d','e','f'].map(value => value.repeat(64)), fixture.user]);
        await fresh.query(`update cde_containers set current_revision_id=$1,current_scope_hash=$2 where id=$3`, [cde.revision, 'f'.repeat(64), cde.container]);
        await fresh.query(`insert into cde_transition_events(id,company_id,project_id,container_id,revision_id,idempotency_key,request_hash,action,decision,from_state,to_state,suitability_code,revision_code,scope_hash,expected_version,resulting_version,actor_user_id,actor_project_role,actor_discipline,reason)
          values ($1,$2,$3,$4,$5,'phase4-ledger',$6,'scope_created','accepted','WIP','WIP','S0','P01.01',$7,0,1,$8,'coordinator','BIM','scope created')`, [cde.event, fixture.company, cde.project, cde.container, cde.revision, '9'.repeat(64), 'f'.repeat(64), fixture.user]);
        await fresh.query(`insert into documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256)
          values ($1,$2,$3,'mismatch.ifc','Mismatch','application/x-step',1,'phase4/mismatch.ifc',$4)`, [cde.mismatchDocument, fixture.company, fixture.user, '1'.repeat(64)]);
        await fresh.query(`insert into document_processing_runs(id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,progress_percent) values ($1,$2,$3,'succeeded','completed','phase4-mismatch-run',4,100)`, [cde.mismatchRun, fixture.company, cde.mismatchDocument]);
        await fresh.query(`insert into document_processing_artifacts(id,company_id,document_id,processing_run_id,artifact_type,storage_key,checksum_sha256,content_type,size_bytes,metadata_json) values ($1,$2,$3,$4,'ifc_evidence','phase4/mismatch-evidence.json',$5,'application/json',1,$6::jsonb)`, [cde.mismatchArtifact, fixture.company, cde.mismatchDocument, cde.mismatchRun, '2'.repeat(64), JSON.stringify({ ruleEvaluations: { test: { version: 2 } } })]);
        await fresh.query('savepoint cde_project_document_guard');
        await assert.rejects(fresh.query('update cde_projects set document_id=$1 where id=$2', [cde.mismatchDocument, cde.project]), /cde_revisions_project_id_company_id_document_id/);
        await fresh.query('rollback to savepoint cde_project_document_guard');
        await fresh.query('savepoint cde_cross_document_revision_guard');
        await assert.rejects(fresh.query(`insert into cde_revisions(id,company_id,project_id,container_id,document_id,processing_run_id,result_artifact_id,revision_code,document_checksum_sha256,source_hash,rule_hash,result_hash,code_hash,scope_hash,created_by_user_id)
          values ($1,$2,$3,$4,$5,$6,$7,'P09.01',$8,$9,$10,$11,$12,$13,$14)`, [cde.mismatchRevision, fixture.company, cde.project, cde.container, cde.mismatchDocument, cde.mismatchRun, cde.mismatchArtifact, ...['1','2','3','4','5','6'].map(value => value.repeat(64)), fixture.user]), /cde_revisions_project_id_company_id_document_id/);
        await fresh.query('rollback to savepoint cde_cross_document_revision_guard');
        await fresh.query('savepoint cde_update_guard');
        await assert.rejects(fresh.query(`update cde_transition_events set reason='tampered' where id=$1`, [cde.event]), /append-only/);
        await fresh.query('rollback to savepoint cde_update_guard');
        await fresh.query('savepoint cde_delete_guard');
        await assert.rejects(fresh.query('delete from cde_transition_events where id=$1', [cde.event]), /append-only/);
        await fresh.query('rollback to savepoint cde_delete_guard');
        await fresh.query('savepoint cde_revision_update_guard');
        await assert.rejects(fresh.query(`update cde_revisions set revision_code='P99.99' where id=$1`, [cde.revision]), /append-only/);
        await fresh.query('rollback to savepoint cde_revision_update_guard');
        await fresh.query('savepoint cde_revision_delete_guard');
        await assert.rejects(fresh.query('delete from cde_revisions where id=$1', [cde.revision]), /append-only/);
        await fresh.query('rollback to savepoint cde_revision_delete_guard');
        for (const [savepoint, statement, params] of [
          ['cde_artifact_guard', `update document_processing_artifacts set checksum_sha256=$1 where id=$2`, ['0'.repeat(64), cde.artifact]],
          ['cde_run_guard', `update document_processing_runs set provider='tampered' where id=$1`, [cde.run]],
          ['cde_document_guard', `update documents set checksum_sha256=$1 where id=$2`, ['0'.repeat(64), cde.document]],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(statement, [...params]), /CDE-bound/);
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query(`insert into cde_containers(id,company_id,project_id,container_code,title,created_by_user_id) values ($1,$2,$3,'PHASE4-OTHER','Other',$4)`, [cde.otherContainer, fixture.company, cde.project, fixture.user]);
        await fresh.query(`insert into cde_revisions(id,company_id,project_id,container_id,document_id,processing_run_id,result_artifact_id,revision_code,document_checksum_sha256,source_hash,rule_hash,result_hash,code_hash,scope_hash,created_by_user_id)
          values ($1,$2,$3,$4,$5,$6,$7,'P02.01',$8,$9,$10,$11,$12,$13,$14)`, [cde.otherRevision, fixture.company, cde.project, cde.otherContainer, cde.document, cde.run, cde.artifact, ...['a','b','c','d','e','7'].map(value => value.repeat(64)), fixture.user]);
        await fresh.query('savepoint cde_cross_container_guard');
        await assert.rejects(fresh.query('update cde_containers set current_revision_id=$1 where id=$2', [cde.otherRevision, cde.container]), /cde_containers_current_revision_company_fk/);
        await fresh.query('rollback to savepoint cde_cross_container_guard');
      } finally { await fresh.query('rollback'); }
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
    await check('head73 cannot be adopted as baseline63 using either candidate or baseline signatures', async () => {
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
