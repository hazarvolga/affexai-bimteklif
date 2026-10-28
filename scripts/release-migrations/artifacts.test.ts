import { drizzleApi } from './generation-api';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadMigrations } from './runner';
import { baselineSource, releaseDirectory } from './config';
import * as schema from '../../src/db/schema';
import { INITIAL_PLUGINS } from '../../src/lib/plugins/definitions';
import { pinnedSignature } from './stage-signatures';
import { injectDataTransitions } from './data-transitions';
import {
  DATABASE_ACADEMY_CONTROL_RLS_TABLES,
  DATABASE_ALLPLAN_LEARNER_RLS_TABLES,
  DATABASE_PRICING_REGULATIONS_RLS_TABLES,
  DATABASE_QUOTATION_CORE_RLS_TABLES,
  DATABASE_SMARTCHECK_PIPELINE_RLS_TABLES,
  DATABASE_TENANT_BUSINESS_RLS_TABLES,
} from '../database-roles/contract';

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

test('progress payment schema binds tenant aggregate and injects immutable approval guards', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  const periods = tables['public.progress_payment_periods'];
  const lines = tables['public.progress_payment_lines'];
  const measurements = tables['public.progress_measurements'];
  assert.deepEqual(periods.uniqueConstraints.progress_payment_periods_revision_key.columns, ['company_id', 'contract_id', 'payment_number', 'revision_number']);
  assert.deepEqual(lines.foreignKeys.progress_payment_lines_period_id_contract_id_company_id_progress_payment_periods_id_contract_id_company_id_fk.columnsFrom, ['period_id', 'contract_id', 'company_id']);
  assert.deepEqual(measurements.foreignKeys.progress_measurements_contract_item_id_contract_id_company_id_construction_contract_items_id_contract_id_company_id_fk.columnsFrom, ['contract_item_id', 'contract_id', 'company_id']);
  assert.deepEqual(measurements.uniqueConstraints.progress_measurements_review_scope_key.columns, ['id', 'contract_id', 'period_id', 'company_id']);
  assert.deepEqual(measurements.uniqueConstraints.progress_measurements_parent_scope_key.columns, ['id', 'contract_item_id', 'contract_id', 'company_id']);
  const statements = injectDataTransitions('0012_progress_payment_evidence', []);
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER progress_payment_period_transition_guard')));
  assert.ok(statements.some((statement) => statement.includes('CREATE CONSTRAINT TRIGGER progress_correction_child_binding')));
  assert.ok(statements.some((statement) => statement.includes('approved progress payment requires maker-checker evidence')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER progress_payment_lines_append_only')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER progress_measurements_state_guard')));
  assert.ok(statements.some((statement) => statement.includes('BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_periods')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER progress_measurement_review_events_append_only')));
  assert.ok(statements.some((statement) => statement.includes('CREATE CONSTRAINT TRIGGER progress_measurement_review_binding')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER progress_payment_adjustments_state_guard')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER construction_contracts_period_lock')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER progress_payment_event_guard')));
  assert.ok(statements.some((statement) => statement.includes('CREATE CONSTRAINT TRIGGER progress_payment_event_binding')));
  assert.ok(statements.some((statement) => statement.includes('cumulative quantity exceeds contract quantity')));
  assert.ok(statements.some((statement) => statement.includes('materialized progress amount mismatch')));
  assert.ok(statements.some((statement) => statement.includes('UPDATE OF sheet_name, source_row_number')));
  assert.ok(statements.some((statement) => statement.includes('SELECT contract_item_id,current_quantity FROM progress_payment_lines')
    && statement.includes('WHERE period_id=NEW.id AND company_id=NEW.company_id')));
});

test('CDE tables declare the exact tenant and backup RLS policy surface', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const tableName of ['cde_projects', 'cde_project_members', 'cde_containers', 'cde_revisions', 'cde_transition_events']) {
    const table = tables[`public.${tableName}`];
    assert.equal(table.isRLSEnabled, true, `${tableName}: RLS must be enabled`);
    assert.deepEqual(Object.keys(table.policies).sort(), [`${tableName}_app_tenant`, `${tableName}_backup_read`, `${tableName}_owner_migration`]);
    const appPolicy = table.policies[`${tableName}_app_tenant`];
    assert.deepEqual({ as: appPolicy.as, for: appPolicy.for, to: appPolicy.to }, { as: 'PERMISSIVE', for: 'ALL', to: ['public'] });
    assert.equal(appPolicy.using, `current_user = 'bimmetraj_app' AND "${tableName}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`);
    assert.equal(appPolicy.withCheck, appPolicy.using);
    const backupPolicy = table.policies[`${tableName}_backup_read`];
    assert.deepEqual({ as: backupPolicy.as, for: backupPolicy.for, to: backupPolicy.to, using: backupPolicy.using }, {
      as: 'PERMISSIVE', for: 'SELECT', to: ['public'], using: "current_user = 'bimmetraj_backup'",
    });
    assert.equal(backupPolicy.withCheck, undefined);
    const ownerPolicy = table.policies[`${tableName}_owner_migration`];
    assert.deepEqual({ as: ownerPolicy.as, for: ownerPolicy.for, to: ownerPolicy.to }, { as: 'PERMISSIVE', for: 'ALL', to: ['public'] });
    assert.equal(ownerPolicy.using, "session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner'");
    assert.equal(ownerPolicy.withCheck, ownerPolicy.using);
  }
});

test('progress-payment tables declare the exact tenant, backup, and migration RLS surface', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  const tableNames = [
    'construction_contracts', 'construction_contract_items', 'progress_payment_periods', 'progress_payment_lines',
    'progress_measurements', 'progress_measurement_review_events', 'progress_payment_adjustments',
    'progress_payment_events', 'contract_variations', 'final_accounts',
  ];
  for (const tableName of tableNames) {
    const table = tables[`public.${tableName}`];
    assert.equal(table.isRLSEnabled, true, `${tableName}: RLS must be enabled`);
    assert.deepEqual(Object.keys(table.policies).sort(), [`${tableName}_app_tenant`, `${tableName}_backup_read`, `${tableName}_owner_migration`]);
    const app = table.policies[`${tableName}_app_tenant`];
    assert.equal(app.for, 'ALL');
    assert.equal(app.using, `current_user = 'bimmetraj_app' AND "${tableName}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`);
    assert.equal(app.withCheck, app.using);
    const backup = table.policies[`${tableName}_backup_read`];
    assert.deepEqual({ for: backup.for, using: backup.using, withCheck: backup.withCheck }, { for: 'SELECT', using: "current_user = 'bimmetraj_backup'", withCheck: undefined });
    const owner = table.policies[`${tableName}_owner_migration`];
    assert.deepEqual({ for: owner.for, using: owner.using, withCheck: owner.withCheck }, { for: 'ALL', using: "session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner'", withCheck: "session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner'" });
  }
  const forced = injectDataTransitions('0015_progress_payment_tenant_rls', []);
  assert.deepEqual(forced, tableNames.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('company industry settings and catalog declare exact FORCE-RLS policy inputs', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  const settings = tables['public.company_industry_settings'];
  const industries = tables['public.industries'];
  assert.equal(settings.isRLSEnabled, true);
  assert.deepEqual(Object.keys(settings.policies).sort(), [
    'company_industry_settings_app_tenant_insert',
    'company_industry_settings_app_tenant_read',
    'company_industry_settings_app_tenant_update',
    'company_industry_settings_backup_read',
    'company_industry_settings_owner_migration',
  ]);
  const tenant = "current_user = 'bimmetraj_app' AND \"company_industry_settings\".\"company_id\" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid";
  assert.equal(settings.policies.company_industry_settings_app_tenant_read.using, tenant);
  assert.equal(settings.policies.company_industry_settings_app_tenant_read.withCheck, undefined);
  assert.equal(settings.policies.company_industry_settings_app_tenant_insert.using, undefined);
  assert.equal(settings.policies.company_industry_settings_app_tenant_insert.withCheck, tenant);
  assert.equal(settings.policies.company_industry_settings_app_tenant_update.using, tenant);
  assert.equal(settings.policies.company_industry_settings_app_tenant_update.withCheck, tenant);
  assert.equal(industries.isRLSEnabled, true);
  assert.deepEqual(Object.keys(industries.policies).sort(), ['industries_app_read', 'industries_backup_read', 'industries_owner_migration']);
  assert.deepEqual({ for: industries.policies.industries_app_read.for, to: industries.policies.industries_app_read.to, using: industries.policies.industries_app_read.using }, {
    for: 'SELECT', to: ['public'], using: "current_user = 'bimmetraj_app'",
  });
  const statements = injectDataTransitions('0017_company_industry_settings_tenant_rls', []);
  const bootstrap = statements.find((statement) => statement.startsWith('INSERT INTO industries'));
  assert.ok(bootstrap?.includes('ON CONFLICT (id) DO NOTHING'));
  for (const plugin of INITIAL_PLUGINS) {
    const metadata = JSON.stringify({ source: 'INITIAL_PLUGINS', calculationModel: plugin.quotationRules.calculationModel, pdfTemplateId: plugin.pdfTemplateId });
    assert.ok(bootstrap?.includes(`('${plugin.id}','${plugin.name}','${plugin.description}','${metadata}',${plugin.enabled})`), plugin.id);
  }
  assert.deepEqual(statements.slice(-2), ['ALTER TABLE "industries" FORCE ROW LEVEL SECURITY;', 'ALTER TABLE "company_industry_settings" FORCE ROW LEVEL SECURITY;']);
});

test('CRM leads and quota dependencies declare bounded tenant policy matrices', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  const lead = tables['public.leads'];
  assert.equal(lead.isRLSEnabled, true);
  assert.deepEqual(Object.keys(lead.policies).sort(), [
    'leads_app_tenant_insert', 'leads_app_tenant_read', 'leads_backup_read', 'leads_owner_migration',
  ]);
  assert.ok(lead.indexes.idx_leads_tenant_created_id);
  assert.deepEqual(Object.keys(tables['public.companies'].policies).sort(), [
    'companies_app_tenant_read', 'companies_backup_read', 'companies_control_access', 'companies_owner_migration', 'companies_worker_capability_read',
  ]);
  assert.deepEqual(Object.keys(tables['public.subscriptions'].policies).sort(), [
    'subscriptions_app_tenant_read', 'subscriptions_backup_read', 'subscriptions_control_access', 'subscriptions_owner_migration', 'subscriptions_worker_capability_read',
  ]);
  assert.deepEqual(Object.keys(tables['public.usage_logs'].policies).sort(), [
    'usage_logs_app_tenant_insert', 'usage_logs_app_tenant_read', 'usage_logs_backup_read', 'usage_logs_control_access',
    'usage_logs_control_delete', 'usage_logs_control_insert', 'usage_logs_owner_migration',
  ]);
  assert.ok(tables['public.usage_logs'].checkConstraints.usage_logs_count_nonnegative);
  const statements = injectDataTransitions('0018_crm_leads_tenant_rls', []);
  assert.deepEqual(statements, [
    'ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;',
    'ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;',
    'ALTER TABLE "usage_logs" FORCE ROW LEVEL SECURITY;',
    'ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;',
  ]);
});

test('SmartCheck pilot evidence declares asymmetric tenant RLS and hardened append-only measurements', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  const cases = tables['public.smartcheck_pilot_cases'];
  const measurements = tables['public.smartcheck_pilot_measurements'];
  const audits = tables['public.smartcheck_audit_logs'];
  assert.equal(cases.isRLSEnabled, true);
  assert.deepEqual(Object.keys(cases.policies).sort(), [
    'smartcheck_pilot_cases_app_tenant', 'smartcheck_pilot_cases_backup_read', 'smartcheck_pilot_cases_owner_migration',
  ]);
  assert.equal(measurements.isRLSEnabled, true);
  assert.deepEqual(Object.keys(measurements.policies).sort(), [
    'smartcheck_pilot_measurements_app_tenant_insert', 'smartcheck_pilot_measurements_app_tenant_read',
    'smartcheck_pilot_measurements_backup_read', 'smartcheck_pilot_measurements_owner_migration',
  ]);
  assert.equal(measurements.policies.smartcheck_pilot_measurements_app_tenant_read.for, 'SELECT');
  assert.equal(measurements.policies.smartcheck_pilot_measurements_app_tenant_insert.for, 'INSERT');
  assert.equal(measurements.policies.smartcheck_pilot_measurements_app_tenant_insert.using, undefined);
  assert.equal(measurements.columns.request_hash.notNull, false);
  assert.equal(measurements.columns.case_revision.notNull, false);
  assert.ok(measurements.checkConstraints.smartcheck_pilot_measurements_request_hash_check);
  assert.ok(measurements.checkConstraints.smartcheck_pilot_measurements_case_revision_check);
  assert.deepEqual(measurements.uniqueConstraints.smartcheck_pilot_measurements_case_revision_key.columns, ['company_id', 'pilot_case_id', 'case_revision']);
  assert.equal(audits.isRLSEnabled, true);
  assert.deepEqual(Object.keys(audits.policies).sort(), [
    'smartcheck_audit_logs_app_insert', 'smartcheck_audit_logs_app_read',
    'smartcheck_audit_logs_backup_read', 'smartcheck_audit_logs_owner_migration',
  ]);
  assert.match(audits.policies.smartcheck_audit_logs_app_read.using ?? '', /bimmetraj\.company_id/);
  assert.match(audits.policies.smartcheck_audit_logs_app_insert.withCheck ?? '', /bimmetraj\.company_id/);
  const statements = injectDataTransitions('0016_smartcheck_pilot_evidence_tenant_rls', []);
  assert.ok(statements.includes('ALTER TABLE "smartcheck_pilot_cases" FORCE ROW LEVEL SECURITY;'));
  assert.ok(statements.includes('ALTER TABLE "smartcheck_pilot_measurements" FORCE ROW LEVEL SECURITY;'));
  assert.ok(statements.includes('ALTER TABLE "smartcheck_audit_logs" FORCE ROW LEVEL SECURITY;'));
  assert.ok(statements.some((statement) => statement.includes('SECURITY INVOKER') && statement.includes('SET search_path = pg_catalog, public')));
  assert.ok(statements.includes('ALTER FUNCTION prevent_smartcheck_pilot_measurement_mutation() OWNER TO CURRENT_USER'));
  assert.ok(statements.includes('REVOKE ALL ON FUNCTION prevent_smartcheck_pilot_measurement_mutation() FROM PUBLIC'));
  assert.ok(statements.some((statement) => statement.includes('BEFORE UPDATE OR DELETE ON smartcheck_pilot_measurements')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER smartcheck_pilot_cases_mutation_guard')));
  assert.ok(statements.some((statement) => statement.includes('CREATE TRIGGER smartcheck_pilot_audit_append_only')));
});

test('tenant business tables declare the exact CDE tenant, backup, and migration RLS matrix', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const table of DATABASE_TENANT_BUSINESS_RLS_TABLES) {
    const definition = tables[`public.${table}`];
    assert.equal(definition.isRLSEnabled, true, table);
    assert.deepEqual(Object.keys(definition.policies).sort(), [`${table}_app_tenant`, `${table}_backup_read`, `${table}_owner_migration`]);
    const tenant = `current_user = 'bimmetraj_app' AND "${table}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
    const app = definition.policies[`${table}_app_tenant`];
    assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'ALL', to: ['public'], using: tenant, withCheck: tenant });
  }
  const forced = injectDataTransitions('0022_tenant_business_rls', []);
  assert.deepEqual(forced, DATABASE_TENANT_BUSINESS_RLS_TABLES.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('quotation core tables declare the exact CDE tenant, backup, and migration RLS matrix', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const table of DATABASE_QUOTATION_CORE_RLS_TABLES) {
    const definition = tables[`public.${table}`];
    assert.equal(definition.isRLSEnabled, true, table);
    assert.deepEqual(Object.keys(definition.policies).sort(), [`${table}_app_tenant`, `${table}_backup_read`, `${table}_owner_migration`]);
    const tenant = `current_user = 'bimmetraj_app' AND "${table}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
    const app = definition.policies[`${table}_app_tenant`];
    assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'ALL', to: ['public'], using: tenant, withCheck: tenant });
  }
  const forced = injectDataTransitions('0023_quotation_core_rls', []);
  assert.deepEqual(forced, DATABASE_QUOTATION_CORE_RLS_TABLES.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('pricing and regulation tables declare the exact CDE tenant, backup, and migration RLS matrix', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const table of DATABASE_PRICING_REGULATIONS_RLS_TABLES) {
    const definition = tables[`public.${table}`];
    assert.equal(definition.isRLSEnabled, true, table);
    assert.deepEqual(Object.keys(definition.policies).sort(), [`${table}_app_tenant`, `${table}_backup_read`, `${table}_owner_migration`]);
    const tenant = `current_user = 'bimmetraj_app' AND "${table}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
    const app = definition.policies[`${table}_app_tenant`];
    assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'ALL', to: ['public'], using: tenant, withCheck: tenant });
  }
  const forced = injectDataTransitions('0024_pricing_regulations_rls', []);
  assert.deepEqual(forced, DATABASE_PRICING_REGULATIONS_RLS_TABLES.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('allplan learner tables declare the exact CDE tenant, backup, and migration RLS matrix', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const table of DATABASE_ALLPLAN_LEARNER_RLS_TABLES) {
    const definition = tables[`public.${table}`];
    assert.equal(definition.isRLSEnabled, true, table);
    assert.deepEqual(Object.keys(definition.policies).sort(), [`${table}_app_tenant`, `${table}_backup_read`, `${table}_owner_migration`]);
    const tenant = `current_user = 'bimmetraj_app' AND "${table}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
    const app = definition.policies[`${table}_app_tenant`];
    assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'ALL', to: ['public'], using: tenant, withCheck: tenant });
  }
  const forced = injectDataTransitions('0025_allplan_learner_rls', []);
  assert.deepEqual(forced, DATABASE_ALLPLAN_LEARNER_RLS_TABLES.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('academy control and certificate tables declare the exact FORCE RLS matrix', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const table of DATABASE_ACADEMY_CONTROL_RLS_TABLES) {
    const definition = tables[`public.${table}`];
    assert.equal(definition.isRLSEnabled, true, table);
    const tenant = `current_user = 'bimmetraj_app' AND "${table}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
    if (table === 'allplan_certificates') {
      assert.deepEqual(Object.keys(definition.policies).sort(), [
        'allplan_certificates_app_tenant',
        'allplan_certificates_app_verify_read',
        'allplan_certificates_backup_read',
        'allplan_certificates_owner_migration',
      ]);
      const app = definition.policies.allplan_certificates_app_tenant;
      assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'ALL', to: ['public'], using: tenant, withCheck: tenant });
    } else {
      assert.deepEqual(Object.keys(definition.policies).sort(), [
        `${table}_app_tenant_read`,
        `${table}_backup_read`,
        `${table}_control_access`,
        `${table}_owner_migration`,
      ]);
      const app = definition.policies[`${table}_app_tenant_read`];
      assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'SELECT', to: ['public'], using: tenant, withCheck: undefined });
    }
  }
  const forced = injectDataTransitions('0026_academy_control_rls', []);
  assert.deepEqual(forced, DATABASE_ACADEMY_CONTROL_RLS_TABLES.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('smartcheck pipeline tables declare the exact tenant, worker, super-admin read, backup, and migration RLS matrix', () => {
  const { tables } = drizzleApi.generateDrizzleJson(schema);
  for (const table of DATABASE_SMARTCHECK_PIPELINE_RLS_TABLES) {
    const definition = tables[`public.${table}`];
    assert.equal(definition.isRLSEnabled, true, table);
    const tenant = `current_user = 'bimmetraj_app' AND "${table}"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid`;
    const app = definition.policies[`${table}_app_tenant`];
    assert.deepEqual({ for: app.for, to: app.to, using: app.using, withCheck: app.withCheck }, { for: 'ALL', to: ['public'], using: tenant, withCheck: tenant });
    const worker = definition.policies[`${table}_worker_access`];
    assert.deepEqual({ for: worker.for, to: worker.to, using: worker.using, withCheck: worker.withCheck }, { for: 'ALL', to: ['public'], using: `current_user = 'bimmetraj_worker'`, withCheck: `current_user = 'bimmetraj_worker'` });
    if (table === 'documents' || table === 'document_processing_runs') {
      assert.deepEqual(Object.keys(definition.policies).sort(), [
        `${table}_app_super_admin_read`,
        `${table}_app_tenant`,
        `${table}_backup_read`,
        `${table}_owner_migration`,
        `${table}_worker_access`,
      ]);
      const superAdmin = definition.policies[`${table}_app_super_admin_read`];
      assert.equal(superAdmin.for, 'SELECT');
      assert.equal(superAdmin.withCheck, undefined);
    } else {
      assert.deepEqual(Object.keys(definition.policies).sort(), [
        `${table}_app_tenant`,
        `${table}_backup_read`,
        `${table}_owner_migration`,
        `${table}_worker_access`,
      ]);
    }
  }
  const forced = injectDataTransitions('0027_smartcheck_pipeline_rls', []);
  assert.deepEqual(forced, DATABASE_SMARTCHECK_PIPELINE_RLS_TABLES.map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`));
});

test('release artifacts form an append-only chain matching current schema', async () => {
  const migrations = await loadMigrations();
  const baseline = JSON.parse(await readFile(baselineSource, 'utf8'));
  assert.equal(Object.keys(baseline.tables).length, 63);
  assert.equal(migrations.length, 33);
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
