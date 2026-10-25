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
import { bootstrapDisposableRoles } from '../ci/disposable-database-roles';
import { identifier, parseTarget } from './safety';

test('release migration lifecycle on three owned disposable databases', { timeout: 120_000 }, async (t) => {
  assert.ok(process.env.RELEASE_CONTROL_DATABASE_URL, 'Explicit RELEASE_CONTROL_DATABASE_URL is required');
  const migrations = await loadMigrations();
  const owned = await provision(process.env.RELEASE_CONTROL_DATABASE_URL);
  const clients: Awaited<ReturnType<typeof connect>>[] = [];
  let createdRoles: string[] = [];
  const report: Record<string, unknown> = { contract: 'teklifpro-release-validation.v1', source: 'versioned release SQL only; no cloned schema' };
  const check = async (name: string, action: (context: TestContext) => Promise<void>) => {
    let completed = false;
    await t.test(name, async (context) => { await action(context); completed = true; });
    if (!completed) throw new Error(`Release validation stopped at: ${name}`);
  };
  try {
    for (const target of owned.targets) clients.push(await connect(target));
    const [fresh, upgrade, restore] = clients;
    createdRoles = await bootstrapDisposableRoles(fresh);
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
    await check('additive migration reaches 85 tables and matches current Drizzle schema', async () => {
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
      assert.equal(state.objects.relations.filter((r: any) => r.relkind === 'r').length, 85);
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

        const transfer = {
          targetQuote: 'e1111111-1111-4111-8111-111111111111', item: 'e2222222-2222-4222-8222-222222222222',
          row: 'e3333333-3333-4333-8333-333333333333', ledger: 'e4444444-4444-4444-8444-444444444444',
          junction: 'e5555555-5555-4555-8555-555555555555', missingActor: 'e6666666-6666-4666-8666-666666666666',
          mismatchedRow: 'e7777777-7777-4777-8777-777777777777', unrelatedQuote: 'e8888888-8888-4888-8888-888888888888',
          unrelatedItem: 'e9999999-9999-4999-8999-999999999999', targetProbeRow: 'ea111111-1111-4111-8111-111111111111',
          layeredItem: 'ea222222-2222-4222-8222-222222222222', layeredJunction: 'ea333333-3333-4333-8333-333333333333',
          targetEvidence: 'ea444444-4444-4444-8444-444444444444', lateEvidence: 'ea555555-5555-4555-8555-555555555555',
          clonedItem: 'ea666666-6666-4666-8666-666666666666',
        };
        await fresh.query(`insert into quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total,parent_id,revision_version)
          values ($1,$2,$3,'LEGACY-2','Calm successor',now() + interval '1 day',100,0,20,120,$4,2)`, [transfer.targetQuote, fixture.company, fixture.client, fixture.quote]);
        await fresh.query(`insert into quotation_items(id,company_id,quotation_id,description,unit,quantity,unit_price,total,source_rule_version)
          values ($1,$2,$3,'Calm aggregate','m³',1,100,120,'calm-icmal.v1')`, [transfer.item, fixture.company, transfer.targetQuote]);
        await fresh.query(`insert into quotation_items(id,company_id,quotation_id,description,unit,quantity,unit_price,total,source_rule_version)
          values ($1,$2,$3,'Calm layered aggregate','m²',1,50,60,'calm-icmal.v1')`, [transfer.layeredItem, fixture.company, transfer.targetQuote]);
        await fresh.query(`insert into quotation_items(id,company_id,quotation_id,description,unit,quantity,unit_price,total)
          values ($1,$2,$3,'Cloned baseline item','adet',1,25,30)`, [transfer.clonedItem, fixture.company, transfer.targetQuote]);
        await fresh.query(`insert into quotation_item_evidence(id,company_id,quotation_id,quotation_item_id,evidence_type,evidence_key,captured_value_json,status,created_by_user_id)
          values ($1,$2,$3,$4,'quantity','phase5-target-evidence',$5::jsonb,'current',$6)`, [transfer.targetEvidence, fixture.company, transfer.targetQuote, transfer.item, JSON.stringify({ quantity: 1 }), fixture.user]);
        await fresh.query(`insert into normalized_quantity_rows(id,company_id,document_id,processing_run_id,sheet_name,source_row_number,source_cell_range,normalized_description,normalized_position_code,normalized_unit,normalized_quantity,review_status,reviewer_user_id,reviewed_at)
          values ($1,$2,$3,$4,'IFC',1,'IfcWall#1','Calm aggregate','15.150.1006','m³',1,'approved',$5,now())`, [transfer.row, fixture.company, cde.document, cde.run, fixture.user]);
        await fresh.query(`insert into normalized_quantity_rows(id,company_id,document_id,processing_run_id,sheet_name,source_row_number,source_cell_range,normalized_description,normalized_position_code,normalized_unit,normalized_quantity,review_status,reviewer_user_id,reviewed_at)
          values ($1,$2,$3,$4,'IFC',1,'IfcWall#other','Other run row','15.150.1006','m³',1,'approved',$5,now())`, [transfer.mismatchedRow, fixture.company, cde.mismatchDocument, cde.mismatchRun, fixture.user]);
        await fresh.query(`insert into normalized_quantity_rows(id,company_id,document_id,processing_run_id,sheet_name,source_row_number,source_cell_range,normalized_description,normalized_position_code,normalized_unit,normalized_quantity,review_status,reviewer_user_id,reviewed_at)
          values ($1,$2,$3,$4,'IFC',2,'IfcWall#2','Target probe row','15.150.1006','m³',1,'approved',$5,now())`, [transfer.targetProbeRow, fixture.company, cde.document, cde.run, fixture.user]);
        await fresh.query(`insert into quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total,revision_version)
          values ($1,$2,$3,'UNRELATED-1','Unrelated quotation',now() + interval '1 day',100,0,20,120,1)`, [transfer.unrelatedQuote, fixture.company, fixture.client]);
        await fresh.query(`insert into quotation_items(id,company_id,quotation_id,description,unit,quantity,unit_price,total,source_rule_version)
          values ($1,$2,$3,'Unrelated item','m³',1,100,120,'calm-icmal.v1')`, [transfer.unrelatedItem, fixture.company, transfer.unrelatedQuote]);
        await fresh.query(`insert into quotation_transfer_ledgers(id,company_id,actor_user_id,source_document_id,source_processing_run_id,source_artifact_id,source_quotation_id,target_quotation_id,idempotency_key,request_payload_hash,request_hash,scope_snapshot_json,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,$8,'phase5-transfer',$9,$10,'{"test":true}'::jsonb,'calm-icmal.v1')`, [transfer.ledger, fixture.company, fixture.user, cde.document, cde.run, cde.artifact, fixture.quote, transfer.targetQuote, '8'.repeat(64), '9'.repeat(64)]);
        await fresh.query(`insert into quotation_transfer_source_rows(id,company_id,transfer_ledger_id,source_quantity_row_id,source_document_id,source_processing_run_id,target_quotation_id,target_quotation_item_id,contributed_quantity,source_cell_range,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,$8,1,'IfcWall#1','calm-icmal.v1')`, [transfer.junction, fixture.company, transfer.ledger, transfer.row, cde.document, cde.run, transfer.targetQuote, transfer.item]);
        await fresh.query(`insert into quotation_transfer_source_rows(id,company_id,transfer_ledger_id,source_quantity_row_id,source_document_id,source_processing_run_id,target_quotation_id,target_quotation_item_id,contributed_quantity,source_cell_range,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,$8,1,'IfcWall#1','calm-icmal.v1')`, [transfer.layeredJunction, fixture.company, transfer.ledger, transfer.row, cde.document, cde.run, transfer.targetQuote, transfer.layeredItem]);
        assert.equal((await fresh.query(`select count(*)::int AS count from quotation_transfer_source_rows where transfer_ledger_id=$1 and source_quantity_row_id=$2`, [transfer.ledger, transfer.row])).rows[0].count, 2);
        for (const [savepoint, statement, params] of [
          ['transfer_ledger_update_guard', `update quotation_transfer_ledgers set request_hash=$1 where id=$2`, ['0'.repeat(64), transfer.ledger]],
          ['transfer_ledger_delete_guard', `delete from quotation_transfer_ledgers where id=$1`, [transfer.ledger]],
          ['transfer_row_update_guard', `update quotation_transfer_source_rows set contributed_quantity=2 where id=$1`, [transfer.junction]],
          ['transfer_row_delete_guard', `delete from quotation_transfer_source_rows where id=$1`, [transfer.junction]],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(statement, [...params]), /append-only/);
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query('savepoint transfer_actor_fk_guard');
        await assert.rejects(fresh.query(`insert into quotation_transfer_ledgers(company_id,actor_user_id,source_document_id,source_processing_run_id,source_artifact_id,source_quotation_id,target_quotation_id,idempotency_key,request_payload_hash,request_hash,scope_snapshot_json,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,'missing-actor',$8,$9,'{"test":true}'::jsonb,'calm-icmal.v1')`, [fixture.company, transfer.missingActor, cde.document, cde.run, cde.artifact, fixture.quote, transfer.targetQuote, '8'.repeat(64), '9'.repeat(64)]), /quotation_transfer_ledgers_actor_user_id_company_id_memberships/);
        await fresh.query('rollback to savepoint transfer_actor_fk_guard');
        await fresh.query('savepoint transfer_run_fk_guard');
        await assert.rejects(fresh.query(`insert into quotation_transfer_ledgers(company_id,actor_user_id,source_document_id,source_processing_run_id,source_artifact_id,source_quotation_id,target_quotation_id,idempotency_key,request_payload_hash,request_hash,scope_snapshot_json,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,'mismatched-run',$8,$9,'{"test":true}'::jsonb,'calm-icmal.v1')`, [fixture.company, fixture.user, cde.document, cde.mismatchRun, cde.mismatchArtifact, fixture.quote, transfer.targetQuote, '8'.repeat(64), '9'.repeat(64)]), /quotation_transfer_ledgers_source_processing_run_id_source_docu/);
        await fresh.query('rollback to savepoint transfer_run_fk_guard');
        for (const [savepoint, sourceRow, sourceDocument, sourceRun, targetQuote, targetItem, constraint] of [
          ['transfer_cross_document_guard', transfer.mismatchedRow, cde.mismatchDocument, cde.mismatchRun, transfer.targetQuote, transfer.item, 'quotation_transfer_source_rows_ledger_scope_fk'],
          ['transfer_cross_run_guard', transfer.mismatchedRow, cde.document, cde.run, transfer.targetQuote, transfer.item, 'quotation_transfer_source_rows_source_scope_fk'],
          ['transfer_cross_target_guard', transfer.targetProbeRow, cde.document, cde.run, transfer.unrelatedQuote, transfer.unrelatedItem, 'quotation_transfer_source_rows_ledger_scope_fk'],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(`insert into quotation_transfer_source_rows(company_id,transfer_ledger_id,source_quantity_row_id,source_document_id,source_processing_run_id,target_quotation_id,target_quotation_item_id,contributed_quantity,source_cell_range,source_rule_version)
            values ($1,$2,$3,$4,$5,$6,$7,1,'forged','calm-icmal.v1')`, [fixture.company, transfer.ledger, sourceRow, sourceDocument, sourceRun, targetQuote, targetItem]), new RegExp(constraint));
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query('savepoint transfer_cross_item_guard');
        await assert.rejects(fresh.query(`insert into quotation_transfer_source_rows(company_id,transfer_ledger_id,source_quantity_row_id,source_document_id,source_processing_run_id,target_quotation_id,target_quotation_item_id,contributed_quantity,source_cell_range,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,1,'forged-item','calm-icmal.v1')`, [fixture.company, transfer.ledger, transfer.targetProbeRow, cde.document, cde.run, transfer.targetQuote, transfer.unrelatedItem]), /quotation_transfer_source_rows_target_quotation_item_id_target_/);
        await fresh.query('rollback to savepoint transfer_cross_item_guard');
        await fresh.query('savepoint transfer_unrelated_successor_guard');
        await assert.rejects(fresh.query(`insert into quotation_transfer_ledgers(company_id,actor_user_id,source_document_id,source_processing_run_id,source_artifact_id,source_quotation_id,target_quotation_id,idempotency_key,request_payload_hash,request_hash,scope_snapshot_json,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,'unrelated-successor',$8,$9,'{"test":true}'::jsonb,'calm-icmal.v1')`, [fixture.company, fixture.user, cde.document, cde.run, cde.artifact, fixture.quote, transfer.unrelatedQuote, '8'.repeat(64), '9'.repeat(64)]), /target quotation must be the immediate successor/);
        await fresh.query('rollback to savepoint transfer_unrelated_successor_guard');
        await fresh.query('savepoint transfer_target_identity_guard');
        await assert.rejects(fresh.query(`update quotations set revision_version=9 where id=$1`, [transfer.targetQuote]), /transfer-bound quotation revision identity is immutable/);
        await fresh.query('rollback to savepoint transfer_target_identity_guard');
        for (const [savepoint, statement, params] of [
          ['transfer_source_row_guard', `update normalized_quantity_rows set normalized_quantity=99 where id=$1`, [transfer.row]],
          ['transfer_source_raw_row_guard', `update normalized_quantity_rows set raw_quantity='99' where id=$1`, [transfer.row]],
          ['transfer_source_artifact_guard', `update document_processing_artifacts set checksum_sha256=$1 where id=$2`, ['0'.repeat(64), cde.artifact]],
          ['transfer_source_run_guard', `update document_processing_runs set provider='tampered' where id=$1`, [cde.run]],
          ['transfer_source_document_guard', `update documents set checksum_sha256=$1 where id=$2`, ['0'.repeat(64), cde.document]],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(statement, [...params]), /bound .*immutable/);
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query(`update quotation_transfer_ledgers set sealed_at=now() where id=$1`, [transfer.ledger]);

        const progress = {
          reviewer: 'fb111111-1111-4111-8111-111111111111', contract: 'fb222222-2222-4222-8222-222222222222',
          item: 'fb333333-3333-4333-8333-333333333333', period: 'fb444444-4444-4444-8444-444444444444',
          measurement: 'fb555555-5555-4555-8555-555555555555', reviewEvent: 'fb666666-6666-4666-8666-666666666666',
          adjustment: 'fb777777-7777-4777-8777-777777777777', line: 'fb888888-8888-4888-8888-888888888888',
          forgedPeriod: 'fb999999-9999-4999-8999-999999999999', forgedEvent: 'fba11111-1111-4111-8111-111111111111',
          submitEvent: 'fba22222-2222-4222-8222-222222222222', approveEvent: 'fba33333-3333-4333-8333-333333333333',
          laterPeriod: 'fba44444-4444-4444-8444-444444444444', correctEvent: 'fba55555-5555-4555-8555-555555555555',
          laterMeasurement: 'fba66666-6666-4666-8666-666666666666', laterReviewEvent: 'fba77777-7777-4777-8777-777777777777',
          laterSubmitEvent: 'fba88888-8888-4888-8888-888888888888', laterLine: 'fba99999-9999-4999-8999-999999999999',
          laterApproveEvent: 'fbb11111-1111-4111-8111-111111111111',
          sourceDocument: 'fbb22222-2222-4222-8222-222222222222', sourceRun: 'fbb33333-3333-4333-8333-333333333333',
          sourceRow: 'fbb44444-4444-4444-8444-444444444444',
        };
        await fresh.query(`insert into users(id,email,full_name) values ($1,'progress-reviewer@example.test','Progress Reviewer')`, [progress.reviewer]);
        await fresh.query(`insert into memberships(user_id,company_id,role) values ($1,$2,'admin')`, [progress.reviewer, fixture.company]);
        await fresh.query(`insert into construction_contracts(id,company_id,contract_number,project_name,currency,regime,initial_amount,source_document_hash,status,created_by_user_id)
          values ($1,$2,'PP-001','Progress invariants','TRY','test',1000,$3,'active',$4)`, [progress.contract, fixture.company, 'a'.repeat(64), fixture.user]);
        await fresh.query(`insert into construction_contract_items(id,company_id,contract_id,item_code,description,unit,contract_quantity,unit_price,source_hash)
          values ($1,$2,$3,'ITEM-1','Invariant item','m2',10,100,$4)`, [progress.item, fixture.company, progress.contract, 'b'.repeat(64)]);
        await fresh.query(`insert into documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256,status)
          values ($1,$2,$3,'progress.xlsx','Progress source','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',1,'progress/source.xlsx',$4,'completed')`, [progress.sourceDocument, fixture.company, fixture.user, 'c'.repeat(64)]);
        await fresh.query(`insert into document_processing_runs(id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,provider,model,progress_percent)
          values ($1,$2,$3,'succeeded','completed','progress-source-run',6,'xlsx-parser','canonical-v1',100)`, [progress.sourceRun, fixture.company, progress.sourceDocument]);
        await fresh.query(`insert into normalized_quantity_rows(id,company_id,document_id,processing_run_id,sheet_name,source_row_number,source_cell_range,normalized_description,normalized_unit,normalized_quantity,review_status,reviewer_user_id,reviewed_at,reviewer_notes)
          values ($1,$2,$3,$4,'Metraj',7,'A7:D7','Invariant item','m2',5,'approved',$5,now(),'checked source')`, [progress.sourceRow, fixture.company, progress.sourceDocument, progress.sourceRun, progress.reviewer]);
        await fresh.query('savepoint progress_direct_variation_approval');
        await assert.rejects(fresh.query(`insert into contract_variations(company_id,contract_id,variation_number,kind,amount,decision_document_hash,status,created_by_user_id)
          values ($1,$2,1,'addition',1,$3,'approved',$4)`, [fixture.company, progress.contract, '8'.repeat(64), fixture.user]), /must start in manual_review/);
        await fresh.query('rollback to savepoint progress_direct_variation_approval');
        await fresh.query('savepoint progress_direct_final_seal');
        await assert.rejects(fresh.query(`insert into final_accounts(company_id,contract_id,revision_number,status,result_json,source_aggregate_hash,sealed_at,created_by_user_id)
          values ($1,$2,1,'sealed','{}'::jsonb,$3,now(),$4)`, [fixture.company, progress.contract, '7'.repeat(64), fixture.user]), /must start as unsealed draft/);
        await fresh.query('rollback to savepoint progress_direct_final_seal');
        await fresh.query('savepoint progress_contract_amount_reconcile');
        await fresh.query(`update construction_contracts set initial_amount=999 where id=$1`, [progress.contract]);
        await assert.rejects(fresh.query(`insert into progress_payment_periods(company_id,contract_id,payment_number,revision_number,period_start,period_end,status,is_current,version,created_by_user_id)
          values ($1,$2,98,0,now(),now(),'draft',true,0,$3)`, [fixture.company, progress.contract, fixture.user]), /requires reconciled item scope/);
        await fresh.query('rollback to savepoint progress_contract_amount_reconcile');
        await fresh.query('savepoint progress_direct_approved_insert');
        await assert.rejects(fresh.query(`insert into progress_payment_periods(id,company_id,contract_id,payment_number,revision_number,period_start,period_end,status,is_current,version,scope_hash,submitted_by_user_id,approved_by_user_id,submitted_at,approved_at,sealed_at,created_by_user_id)
          values ($1,$2,$3,99,0,now(),now(),'approved',true,0,$4,$5,$6,now(),now(),now(),$5)`, [progress.forgedPeriod, fixture.company, progress.contract, 'c'.repeat(64), fixture.user, progress.reviewer]), /must start as unsealed draft version zero/);
        await fresh.query('rollback to savepoint progress_direct_approved_insert');
        await fresh.query(`insert into progress_payment_periods(id,company_id,contract_id,payment_number,revision_number,period_start,period_end,status,is_current,version,created_by_user_id)
          values ($1,$2,$3,1,0,'2026-10-01','2026-10-31','draft',true,0,$4)`, [progress.period, fixture.company, progress.contract, fixture.user]);
        await fresh.query('savepoint progress_prior_readiness_guard');
        await assert.rejects(fresh.query(`insert into progress_payment_periods(company_id,contract_id,payment_number,revision_number,period_start,period_end,status,is_current,version,created_by_user_id)
          values ($1,$2,2,0,'2026-11-01','2026-11-30','draft',true,0,$3)`, [fixture.company, progress.contract, fixture.user]), /requires next number and sealed prior current period/);
        await fresh.query('rollback to savepoint progress_prior_readiness_guard');
        await fresh.query('savepoint progress_late_item_guard');
        await assert.rejects(fresh.query(`insert into construction_contract_items(company_id,contract_id,item_code,description,unit,contract_quantity,unit_price,source_hash)
          values ($1,$2,'LATE','Late item','m2',1,1,$3)`, [fixture.company, progress.contract, 'c'.repeat(64)]), /cannot be inserted after first progress period/);
        await fresh.query('rollback to savepoint progress_late_item_guard');
        await fresh.query('savepoint progress_partial_source_guard');
        await assert.rejects(fresh.query(`insert into progress_measurements(company_id,contract_id,period_id,contract_item_id,location,source_type,quantity,unit,source_cell_range,source_identity,created_by_user_id)
          values ($1,$2,$3,$4,'A','manual',1,'m2','forged-cell','partial-source',$5)`, [fixture.company, progress.contract, progress.period, progress.item, fixture.user]), /progress_measurements_source_binding_check/);
        await fresh.query('rollback to savepoint progress_partial_source_guard');
        await fresh.query('savepoint progress_source_value_guard');
        await assert.rejects(fresh.query(`insert into progress_measurements(company_id,contract_id,period_id,contract_item_id,location,source_type,quantity,unit,source_document_id,source_processing_run_id,source_quantity_row_id,source_cell_range,source_identity,created_by_user_id)
          values ($1,$2,$3,$4,'A','xlsx',6,'m2',$5,$6,$7,'A7:D7','xlsx:bad',$8)`, [fixture.company, progress.contract, progress.period, progress.item, progress.sourceDocument, progress.sourceRun, progress.sourceRow, fixture.user]), /exact approved canonical source row binding/);
        await fresh.query('rollback to savepoint progress_source_value_guard');
        await fresh.query(`insert into progress_measurements(id,company_id,contract_id,period_id,contract_item_id,location,source_type,quantity,unit,source_document_id,source_processing_run_id,source_quantity_row_id,source_cell_range,source_identity,created_by_user_id)
          values ($1,$2,$3,$4,$5,'A','xlsx',5,'m2',$6,$7,$8,'A7:D7','xlsx:Metraj:7',$9)`, [progress.measurement, fixture.company, progress.contract, progress.period, progress.item, progress.sourceDocument, progress.sourceRun, progress.sourceRow, fixture.user]);
        for (const [savepoint, statement, params] of [
          ['progress_source_row_drift_guard', `update normalized_quantity_rows set normalized_quantity=6 where id=$1`, [progress.sourceRow]],
          ['progress_source_sheet_drift_guard', `update normalized_quantity_rows set sheet_name='Tampered' where id=$1`, [progress.sourceRow]],
          ['progress_source_ordinal_drift_guard', `update normalized_quantity_rows set source_row_number=8 where id=$1`, [progress.sourceRow]],
          ['progress_source_review_drift_guard', `update normalized_quantity_rows set reviewer_notes='tampered' where id=$1`, [progress.sourceRow]],
          ['progress_source_run_drift_guard', `update document_processing_runs set pipeline_version=7 where id=$1`, [progress.sourceRun]],
          ['progress_source_document_drift_guard', `update documents set checksum_sha256=$1 where id=$2`, ['0'.repeat(64), progress.sourceDocument]],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(statement, [...params]), /progress-bound source evidence is immutable/);
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query('savepoint progress_forged_review_event');
        await assert.rejects(fresh.query(`insert into progress_measurement_review_events(id,company_id,contract_id,period_id,measurement_id,decision,reason,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,$5,'approved','forged',0,1,'forged-review',$6,$7)`, [progress.forgedEvent, fixture.company, progress.contract, progress.period, progress.measurement, 'd'.repeat(64), progress.reviewer]), /review event does not match reviewed measurement/);
        await fresh.query('rollback to savepoint progress_forged_review_event');
        await fresh.query('savepoint progress_forged_measurement_update');
        await fresh.query(`update progress_measurements set review_status='approved',reviewed_by_user_id=$1,reviewed_at=now(),review_reason='no event' where id=$2`, [progress.reviewer, progress.measurement]);
        await assert.rejects(fresh.query('set constraints progress_measurement_review_binding immediate'), /requires append-only review event/);
        await fresh.query('rollback to savepoint progress_forged_measurement_update');
        await fresh.query('savepoint progress_review_rewrite_guard');
        await assert.rejects(fresh.query(`update progress_measurements set quantity=9,review_status='approved',reviewed_by_user_id=$1,reviewed_at=now(),review_reason='rewritten' where id=$2`, [progress.reviewer, progress.measurement]), /measurement evidence is immutable during review/);
        await fresh.query('rollback to savepoint progress_review_rewrite_guard');
        await fresh.query(`update progress_measurements set review_status='approved',reviewed_by_user_id=$1,reviewed_at=now(),review_reason='checked' where id=$2`, [progress.reviewer, progress.measurement]);
        await fresh.query(`insert into progress_measurement_review_events(id,company_id,contract_id,period_id,measurement_id,decision,reason,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,$5,'approved','checked',0,1,'review-ok',$6,$7)`, [progress.reviewEvent, fixture.company, progress.contract, progress.period, progress.measurement, 'e'.repeat(64), progress.reviewer]);
        await fresh.query(`update progress_payment_periods set version=1,updated_at=now() where id=$1`, [progress.period]);
        await fresh.query(`insert into progress_payment_adjustments(id,company_id,contract_id,period_id,adjustment_type,amount,evidence_hash,review_status,created_by_user_id)
          values ($1,$2,$3,$4,'retention',10,$5,'manual_review',$6)`, [progress.adjustment, fixture.company, progress.contract, progress.period, 'f'.repeat(64), fixture.user]);
        await fresh.query('savepoint progress_adjustment_self_approval');
        await assert.rejects(fresh.query(`update progress_payment_adjustments set review_status='approved' where id=$1`, [progress.adjustment]), /requires append-only decision workflow/);
        await fresh.query('rollback to savepoint progress_adjustment_self_approval');
        await fresh.query(`delete from progress_payment_adjustments where id=$1`, [progress.adjustment]);
        await fresh.query('savepoint progress_forged_event_guard');
        await assert.rejects(fresh.query(`insert into progress_payment_events(company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,'submit','draft','submitted',1,2,'forged-state',$4,$5)`, [fixture.company, progress.contract, progress.period, '7'.repeat(64), fixture.user]), /does not match current period state and version/);
        await fresh.query('rollback to savepoint progress_forged_event_guard');
        await fresh.query('savepoint progress_direct_state_guard');
        await fresh.query(`update progress_payment_periods set status='submitted',version=2,scope_hash=$1,submitted_by_user_id=$2,submitted_at=now(),updated_at=now() where id=$3`, ['1'.repeat(64), fixture.user, progress.period]);
        await assert.rejects(fresh.query('set constraints progress_payment_event_binding immediate'), /requires matching append-only event/);
        await fresh.query('rollback to savepoint progress_direct_state_guard');
        await fresh.query(`update progress_payment_periods set status='submitted',version=2,scope_hash=$1,submitted_by_user_id=$2,submitted_at=now(),updated_at=now() where id=$3`, ['1'.repeat(64), fixture.user, progress.period]);
        await fresh.query(`insert into progress_payment_events(id,company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,'submit','draft','submitted',1,2,'submit-ok',$5,$6)`, [progress.submitEvent, fixture.company, progress.contract, progress.period, '6'.repeat(64), fixture.user]);
        await fresh.query('savepoint progress_duplicate_version_event');
        await assert.rejects(fresh.query(`insert into progress_payment_events(company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,'submit','draft','submitted',1,2,'submit-duplicate',$4,$5)`, [fixture.company, progress.contract, progress.period, '5'.repeat(64), fixture.user]), /progress_payment_events_resulting_version_key/);
        await fresh.query('rollback to savepoint progress_duplicate_version_event');
        await fresh.query('savepoint progress_empty_approval_guard');
        await assert.rejects(fresh.query(`update progress_payment_periods set status='approved',version=3,approved_by_user_id=$1,approved_at=now(),sealed_at=now(),updated_at=now() where id=$2`, [progress.reviewer, progress.period]), /reconciled materialized lines/);
        await fresh.query('rollback to savepoint progress_empty_approval_guard');
        for (const [savepoint, previous, current, cumulative, currentAmount, cumulativeAmount, expected] of [
          ['progress_line_cap_guard', '0', '10.0001', '10.0001', '1000.01', '1000.01', /cumulative quantity exceeds contract quantity/],
          ['progress_line_amount_guard', '0', '10', '10', '1000.01', '1000', /progress_payment_lines_amount_check|materialized progress amount mismatch/],
          ['progress_line_previous_guard', '1', '9', '10', '900', '1000', /materialized progress quantity chain mismatch/],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(`insert into progress_payment_lines(company_id,contract_id,period_id,contract_item_id,previous_quantity,current_quantity,cumulative_quantity,unit_price_snapshot,current_amount,cumulative_amount)
            values ($1,$2,$3,$4,$5,$6,$7,100,$8,$9)`, [fixture.company, progress.contract, progress.period, progress.item, previous, current, cumulative, currentAmount, cumulativeAmount]), expected);
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query(`insert into progress_payment_lines(id,company_id,contract_id,period_id,contract_item_id,previous_quantity,current_quantity,cumulative_quantity,unit_price_snapshot,current_amount,cumulative_amount)
          values ($1,$2,$3,$4,$5,0,5,5,100,500,500)`, [progress.line, fixture.company, progress.contract, progress.period, progress.item]);
        await fresh.query('savepoint progress_approved_scope_guard');
        await assert.rejects(fresh.query(`update progress_payment_periods set status='approved',version=3,scope_hash=null,approved_by_user_id=$1,approved_at=now(),sealed_at=now(),updated_at=now() where id=$2`, [progress.reviewer, progress.period]), /maker-checker evidence|progress_payment_periods_scope_hash_check/);
        await fresh.query('rollback to savepoint progress_approved_scope_guard');
        await fresh.query(`update progress_payment_periods set status='approved',version=3,approved_by_user_id=$1,approved_at=now(),sealed_at=now(),updated_at=now() where id=$2`, [progress.reviewer, progress.period]);
        await fresh.query(`insert into progress_payment_events(id,company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,'approve','submitted','approved',2,3,'approve-ok',$5,$6)`, [progress.approveEvent, fixture.company, progress.contract, progress.period, '4'.repeat(64), progress.reviewer]);
        for (const [savepoint, statement, params, expected] of [
          ['progress_review_event_update_guard', `update progress_measurement_review_events set reason='tampered' where id=$1`, [progress.reviewEvent], /append-only/],
          ['progress_review_event_delete_guard', `delete from progress_measurement_review_events where id=$1`, [progress.reviewEvent], /append-only/],
          ['progress_contract_header_guard', `update construction_contracts set initial_amount=999 where id=$1`, [progress.contract], /header identity amount and source are immutable/],
          ['progress_line_update_guard', `update progress_payment_lines set current_amount=999 where id=$1`, [progress.line], /append-only/],
          ['progress_sealed_mutation_guard', `update progress_payment_periods set status='superseded',is_current=false,version=4,scope_hash=$1,updated_at=now() where id=$2`, ['2'.repeat(64), progress.period], /sealed fields are immutable/],
        ] as const) {
          await fresh.query(`savepoint ${savepoint}`);
          await assert.rejects(fresh.query(statement, [...params]), expected);
          await fresh.query(`rollback to savepoint ${savepoint}`);
        }
        await fresh.query('savepoint progress_adjustment_late_insert_guard');
        await assert.rejects(fresh.query(`insert into progress_payment_adjustments(company_id,contract_id,period_id,adjustment_type,amount,evidence_hash,review_status,created_by_user_id)
          values ($1,$2,$3,'retention',1,$4,'manual_review',$5)`, [fixture.company, progress.contract, progress.period, '9'.repeat(64), fixture.user]), /immutable outside draft/);
        await fresh.query('rollback to savepoint progress_adjustment_late_insert_guard');
        await fresh.query('savepoint progress_correction_parent_guard');
        await assert.rejects(fresh.query(`insert into progress_payment_periods(company_id,contract_id,payment_number,revision_number,parent_period_id,period_start,period_end,status,is_current,version,correction_reason,created_by_user_id)
          values ($1,$2,1,1,$3,'2026-10-01','2026-10-31','draft',true,0,'forged correction',$4)`, [fixture.company, progress.contract, progress.period, fixture.user]), /exact superseded parent revision/);
        await fresh.query('rollback to savepoint progress_correction_parent_guard');
        await fresh.query('savepoint progress_orphan_supersede_guard');
        await fresh.query(`update progress_payment_periods set status='superseded',is_current=false,version=4,updated_at=now() where id=$1`, [progress.period]);
        await fresh.query(`insert into progress_payment_events(id,company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,reason,actor_user_id)
          values ($1,$2,$3,$4,'correct','approved','superseded',3,4,'correct-orphan-guard',$5,'correction test',$6)`, [progress.correctEvent, fixture.company, progress.contract, progress.period, '3'.repeat(64), fixture.user]);
        await assert.rejects(fresh.query('set constraints all immediate'), /requires exact current draft correction child/);
        await fresh.query('rollback to savepoint progress_orphan_supersede_guard');
        await fresh.query('set constraints all deferred');
        assert.deepEqual((await fresh.query(`select status,is_current,version from progress_payment_periods where id=$1`, [progress.period])).rows[0], {
          status: 'approved', is_current: true, version: 3,
        });
        await fresh.query(`insert into progress_payment_periods(id,company_id,contract_id,payment_number,revision_number,period_start,period_end,status,is_current,version,created_by_user_id)
          values ($1,$2,$3,2,0,'2026-11-01','2026-11-30','draft',true,0,$4)`, [progress.laterPeriod, fixture.company, progress.contract, fixture.user]);
        await fresh.query(`insert into progress_measurements(id,company_id,contract_id,period_id,contract_item_id,location,source_type,quantity,unit,source_identity,created_by_user_id)
          values ($1,$2,$3,$4,$5,'B','manual',5,'m2','manual:B',$6)`, [progress.laterMeasurement, fixture.company, progress.contract, progress.laterPeriod, progress.item, fixture.user]);
        await fresh.query(`update progress_measurements set review_status='approved',reviewed_by_user_id=$1,reviewed_at=now(),review_reason='checked' where id=$2`, [progress.reviewer, progress.laterMeasurement]);
        await fresh.query(`insert into progress_measurement_review_events(id,company_id,contract_id,period_id,measurement_id,decision,reason,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,$5,'approved','checked',0,1,'review-period-2',$6,$7)`, [progress.laterReviewEvent, fixture.company, progress.contract, progress.laterPeriod, progress.laterMeasurement, '6'.repeat(64), progress.reviewer]);
        await fresh.query(`update progress_payment_periods set status='submitted',version=1,scope_hash=$1,submitted_by_user_id=$2,submitted_at=now(),updated_at=now() where id=$3`, ['7'.repeat(64), fixture.user, progress.laterPeriod]);
        await fresh.query(`insert into progress_payment_events(id,company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,'submit','draft','submitted',0,1,'submit-period-2',$5,$6)`, [progress.laterSubmitEvent, fixture.company, progress.contract, progress.laterPeriod, '7'.repeat(64), fixture.user]);
        await fresh.query(`insert into progress_payment_lines(id,company_id,contract_id,period_id,contract_item_id,previous_quantity,current_quantity,cumulative_quantity,unit_price_snapshot,current_amount,cumulative_amount)
          values ($1,$2,$3,$4,$5,5,5,10,100,500,1000)`, [progress.laterLine, fixture.company, progress.contract, progress.laterPeriod, progress.item]);
        await fresh.query(`update progress_payment_periods set status='approved',version=2,approved_by_user_id=$1,approved_at=now(),sealed_at=now(),updated_at=now() where id=$2`, [progress.reviewer, progress.laterPeriod]);
        await fresh.query(`insert into progress_payment_events(id,company_id,contract_id,period_id,action,from_status,to_status,expected_version,resulting_version,idempotency_key,request_hash,actor_user_id)
          values ($1,$2,$3,$4,'approve','submitted','approved',1,2,'approve-period-2',$5,$6)`, [progress.laterApproveEvent, fixture.company, progress.contract, progress.laterPeriod, '8'.repeat(64), progress.reviewer]);
        assert.equal((await fresh.query(`select count(*)::int count from progress_payment_periods where contract_id=$1 and status='approved'`, [progress.contract])).rows[0].count, 2);
        await fresh.query('savepoint progress_later_non_cancelled_guard');
        await assert.rejects(fresh.query(`update progress_payment_periods set status='superseded',is_current=false,version=4,updated_at=now() where id=$1`, [progress.period]), /followed by a later non-cancelled period/);
        await fresh.query('rollback to savepoint progress_later_non_cancelled_guard');
        assert.deepEqual((await fresh.query(`select status,is_current,version from progress_payment_periods where id=$1`, [progress.period])).rows[0], {
          status: 'approved', is_current: true, version: 3,
        });
        await fresh.query('commit');
        await assert.rejects(fresh.query(`insert into quotation_transfer_source_rows(company_id,transfer_ledger_id,source_quantity_row_id,source_document_id,source_processing_run_id,target_quotation_id,target_quotation_item_id,contributed_quantity,source_cell_range,source_rule_version)
          values ($1,$2,$3,$4,$5,$6,$7,1,'late-lineage','calm-icmal.v1')`, [fixture.company, transfer.ledger, transfer.targetProbeRow, cde.document, cde.run, transfer.targetQuote, transfer.item]), /quotation transfer junction is sealed/);
        await assert.rejects(fresh.query(`update quotation_items set quantity=99 where id=$1`, [transfer.item]), /transfer-bound target quotation items are immutable/);
        await assert.rejects(fresh.query(`insert into quotation_items(company_id,quotation_id,description,unit,quantity,unit_price,total) values ($1,$2,'late item','adet',1,1,1)`, [fixture.company, transfer.targetQuote]), /transfer-bound target quotation items are immutable/);
        await assert.rejects(fresh.query(`update quotation_items set quotation_id=$1 where id=$2`, [transfer.unrelatedQuote, transfer.clonedItem]), /transfer-bound target quotation items are immutable/);
        await assert.rejects(fresh.query(`update quotation_item_evidence set captured_value_json=$1::jsonb where id=$2`, [JSON.stringify({ quantity: 99 }), transfer.targetEvidence]), /transfer-bound target quotation evidence is immutable/);
        await assert.rejects(fresh.query(`delete from quotation_item_evidence where id=$1`, [transfer.targetEvidence]), /transfer-bound target quotation evidence is immutable/);
        await assert.rejects(fresh.query(`insert into quotation_item_evidence(id,company_id,quotation_id,quotation_item_id,evidence_type,evidence_key,status,created_by_user_id) values ($1,$2,$3,$4,'quantity','late-evidence','current',$5)`, [transfer.lateEvidence, fixture.company, transfer.targetQuote, transfer.item, fixture.user]), /transfer-bound target quotation evidence is immutable/);
        await assert.rejects(fresh.query(`update quotation_item_evidence set quotation_id=$1, quotation_item_id=$2 where id=$3`, [transfer.unrelatedQuote, transfer.unrelatedItem, transfer.targetEvidence]), /transfer-bound target quotation evidence is immutable/);
      } catch (error) {
        await fresh.query('rollback');
        throw error;
      }
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
      assert.match(result.stdout, /pass [67]\nℹ fail 0/);
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
    if (createdRoles.length && process.env.RELEASE_CONTROL_DATABASE_URL) {
      const control = await connect(parseTarget(process.env.RELEASE_CONTROL_DATABASE_URL, 'control'));
      try {
        for (const role of [...createdRoles].reverse()) {
          await control.query(`drop role if exists ${identifier(role)}`);
        }
      } finally {
        await control.end();
      }
    }
  }
  report.disposableCleanup = 'completed';
  if (process.env.RELEASE_WRITE_REPORT === 'true') {
    const folder = `${root}/docs/architecture/generated`;
    await mkdir(folder, { recursive: true });
    await writeFile(`${folder}/release-migrations-validation.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
});
