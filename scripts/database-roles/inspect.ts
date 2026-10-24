import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  DATABASE_ROLE_CONTRACT,
  DATABASE_FUNCTION_EXECUTE_SPECS,
  DATABASE_CDE_RLS_TABLES,
  DATABASE_PROGRESS_PAYMENT_RLS_TABLES,
  DATABASE_SMARTCHECK_PILOT_RLS_TABLES,
  DATABASE_QUEUE_MIGRATION_REVISION,
  DATABASE_QUEUE_RLS_TABLES,
  DATABASE_QUEUE_STRUCTURE_FINGERPRINT,
  DATABASE_ROLE_MEMBERSHIPS,
  DATABASE_ROLE_SPECS,
  DATABASE_SCHEMA_SPECS,
  DATABASE_SECURITY_DEFINER_WRAPPERS,
  DATABASE_VENDOR_FUNCTION_PROVENANCE,
  type DatabaseRoleName,
} from "./contract";
import {
  smartcheckPilotAuditMutationFunction,
  smartcheckPilotCaseEvidenceFunction,
  smartcheckPilotCaseMutationFunction,
  smartcheckPilotMeasurementAppendOnlyFunction,
  smartcheckPilotMeasurementEvidenceFunction,
  smartcheckPilotMeasurementInsertFunction,
} from "../release-migrations/data-transitions";

type Queryable = Pick<pg.Client, "query">;
const functionSource = (definition: string) => definition.match(/AS \$\$\n([\s\S]*?)\n\$\$/)?.[1]?.trim() ?? "";

export type InspectedDatabaseRole = {
  name: DatabaseRoleName;
  exists: boolean;
  canLogin: boolean;
  attributes: {
    superuser: boolean;
    bypassRls: boolean;
    createDb: boolean;
    createRole: boolean;
    inherit: boolean;
    replication: boolean;
  };
  ownsDatabase: boolean;
  ownsPublicSchema: boolean;
  privileges: {
    connect: boolean;
    createSchema: boolean;
    createTable: boolean;
    temporary: boolean;
    read: boolean;
    write: boolean;
    anyWrite: boolean;
    truncate: boolean;
    references: boolean;
    trigger: boolean;
  };
};

export type InspectedRoleMembership = {
  role: DatabaseRoleName;
  member: DatabaseRoleName;
  adminOption: boolean;
  inheritOption: boolean;
  setOption: boolean;
};

export type DatabaseRoleBoundaryReport = {
  contract: typeof DATABASE_ROLE_CONTRACT;
  database: string;
  inspectedAt: string;
  roles: InspectedDatabaseRole[];
  memberships: InspectedRoleMembership[];
  publicPrivileges: {
    databaseCreate: boolean;
    databaseTemporary: boolean;
    schemaCreate: boolean;
  };
  managedSchemaViolations: string[];
  defaultAclViolations: string[];
  provenanceViolations: string[];
};

const sensitiveKey = /(?:password|passwd|secret|token|authorization|cookie|databaseurl|connectionstring|dsn)/i;
const connectionUrl = /(?:postgres(?:ql)?:\/\/)[^\s]+/i;
const managedSchemas = DATABASE_SCHEMA_SPECS.map(({ name }) => name);

type ProtectedTenantRlsTable = typeof DATABASE_CDE_RLS_TABLES[number] | typeof DATABASE_PROGRESS_PAYMENT_RLS_TABLES[number];

async function inspectProtectedTenantRlsViolations(
  client: Queryable,
  tables: readonly ProtectedTenantRlsTable[],
  migrationTag: string,
  label: string,
): Promise<string[]> {
  const states = await client.query<{ table_name: string; enabled: boolean; forced: boolean }>(`select c.relname as table_name,c.relrowsecurity as enabled,c.relforcerowsecurity as forced
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) and c.relkind in ('r','p') order by c.relname`, [tables]);
  const releaseState = await client.query<{ ledger: string | null; has_tag: boolean }>(`select to_regclass('teklifpro_release.migrations')::text as ledger,
    exists(select 1 from information_schema.columns where table_schema='teklifpro_release' and table_name='migrations' and column_name='tag') as has_tag`);
  const ledger = releaseState.rows[0];
  const applied = ledger?.ledger && ledger.has_tag
    ? (await client.query<{ applied: boolean }>("select exists(select 1 from teklifpro_release.migrations where tag=$1) as applied", [migrationTag])).rows[0]?.applied === true
    : false;
  if (states.rowCount === 0 && !applied) return [];

  const violations: string[] = [];
  if (states.rowCount !== tables.length) violations.push(`public ${label}: complete RLS table set is required`);
  if (!ledger?.ledger || !ledger.has_tag) {
    violations.push(`public ${label}: release ledger with migration tag ${migrationTag} is required`);
  } else if (!applied) {
    violations.push(`public ${label}: applied migration tag ${migrationTag} is required`);
  }
  if (states.rowCount === 0) return violations;

  const policies = await client.query<{ table_name: string; policy_name: string; command: string; role_oids: number[]; permissive: boolean; using_expression: string | null; check_expression: string | null }>(`select c.relname as table_name,p.polname as policy_name,p.polcmd as command,p.polroles::oid[] as role_oids,p.polpermissive as permissive,
      pg_get_expr(p.polqual,p.polrelid) as using_expression,pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,p.polname`, [tables]);
  const appExpression = "((CURRENT_USER = 'bimmetraj_app'::name) AND (company_id = (NULLIF(current_setting('bimmetraj.company_id'::text, true), ''::text))::uuid))";
  const backupExpression = "(CURRENT_USER = 'bimmetraj_backup'::name)";
  const ownerExpression = "((SESSION_USER = 'bimmetraj_migrator'::name) AND (CURRENT_USER = 'bimmetraj_owner'::name))";
  for (const table of tables) {
    const state = states.rows.find((candidate) => candidate.table_name === table);
    const actual = policies.rows.filter((policy) => policy.table_name === table);
    const app = actual.find((policy) => policy.policy_name === `${table}_app_tenant`);
    const backup = actual.find((policy) => policy.policy_name === `${table}_backup_read`);
    const owner = actual.find((policy) => policy.policy_name === `${table}_owner_migration`);
    const publicPolicy = (policy: typeof app) => policy?.permissive && JSON.stringify(policy.role_oids) === JSON.stringify([0]);
    if (!state?.enabled || !state.forced || actual.length !== 3
      || !publicPolicy(app) || app?.command !== "*" || app.using_expression !== appExpression || app.check_expression !== appExpression
      || !publicPolicy(backup) || backup?.command !== "r" || backup.using_expression !== backupExpression || backup.check_expression !== null
      || !publicPolicy(owner) || owner?.command !== "*" || owner.using_expression !== ownerExpression || owner.check_expression !== ownerExpression) {
      violations.push(`public.${table}: ${label} FORCE-RLS policy matrix drift`);
    }
  }
  return violations;
}

const inspectCdeRlsViolations = (client: Queryable) => inspectProtectedTenantRlsViolations(
  client, DATABASE_CDE_RLS_TABLES, "0013_cde_tenant_rls", "CDE",
);

const inspectProgressPaymentRlsViolations = (client: Queryable) => inspectProtectedTenantRlsViolations(
  client, DATABASE_PROGRESS_PAYMENT_RLS_TABLES, "0015_progress_payment_tenant_rls", "progress-payment",
);

export async function inspectSmartcheckPilotRlsViolations(client: Queryable): Promise<string[]> {
  const tables = DATABASE_SMARTCHECK_PILOT_RLS_TABLES;
  const states = await client.query<{ table_name: string; enabled: boolean; forced: boolean }>(`select c.relname table_name,c.relrowsecurity enabled,c.relforcerowsecurity forced
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) and c.relkind in ('r','p') order by c.relname`, [tables]);
  const releaseState = await client.query<{ ledger: string | null; has_tag: boolean }>(`select to_regclass('teklifpro_release.migrations')::text ledger,
    exists(select 1 from information_schema.columns where table_schema='teklifpro_release' and table_name='migrations' and column_name='tag') has_tag`);
  const ledger = releaseState.rows[0];
  const applied = ledger?.ledger && ledger.has_tag
    ? (await client.query<{ applied: boolean }>("select exists(select 1 from teklifpro_release.migrations where tag='0016_smartcheck_pilot_evidence_tenant_rls') applied")).rows[0]?.applied === true
    : false;
  if (states.rowCount === 0 && !applied) return [];
  const violations: string[] = [];
  if (states.rowCount !== tables.length) violations.push("public smartcheck-pilot: complete RLS table set is required");
  if (!ledger?.ledger || !ledger.has_tag || !applied) violations.push("public smartcheck-pilot: applied migration tag 0016_smartcheck_pilot_evidence_tenant_rls is required");
  if (states.rowCount === 0) return violations;
  const policies = await client.query<{ table_name: string; policy_name: string; command: string; role_oids: number[]; permissive: boolean; using_expression: string | null; check_expression: string | null }>(`select c.relname table_name,p.polname policy_name,p.polcmd command,p.polroles::oid[] role_oids,p.polpermissive permissive,
      pg_get_expr(p.polqual,p.polrelid) using_expression,pg_get_expr(p.polwithcheck,p.polrelid) check_expression
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,p.polname`, [tables]);
  const tenant = "((CURRENT_USER = 'bimmetraj_app'::name) AND (company_id = (NULLIF(current_setting('bimmetraj.company_id'::text, true), ''::text))::uuid))";
  const backup = "(CURRENT_USER = 'bimmetraj_backup'::name)";
  const owner = "((SESSION_USER = 'bimmetraj_migrator'::name) AND (CURRENT_USER = 'bimmetraj_owner'::name))";
  const isPublic = (policy: typeof policies.rows[number] | undefined) => policy?.permissive && JSON.stringify(policy.role_oids) === JSON.stringify([0]);
  const expected = {
    smartcheck_pilot_cases: [
      ["smartcheck_pilot_cases_app_tenant", "*", tenant, tenant],
      ["smartcheck_pilot_cases_backup_read", "r", backup, null],
      ["smartcheck_pilot_cases_owner_migration", "*", owner, owner],
    ],
    smartcheck_pilot_measurements: [
      ["smartcheck_pilot_measurements_app_tenant_read", "r", tenant, null],
      ["smartcheck_pilot_measurements_app_tenant_insert", "a", null, tenant],
      ["smartcheck_pilot_measurements_backup_read", "r", backup, null],
      ["smartcheck_pilot_measurements_owner_migration", "*", owner, owner],
    ],
  } as const;
  for (const table of tables) {
    const state = states.rows.find((row) => row.table_name === table);
    const actual = policies.rows.filter((row) => row.table_name === table);
    const matrix = expected[table];
    const matches = state?.enabled && state.forced && actual.length === matrix.length && matrix.every(([name, command, using, check]) => {
      const policy = actual.find((row) => row.policy_name === name);
      return isPublic(policy) && policy?.command === command && policy.using_expression === using && policy.check_expression === check;
    });
    if (!matches) violations.push(`public.${table}: smartcheck-pilot FORCE-RLS policy matrix drift`);
  }
  const auditState = await client.query<{ enabled: boolean; forced: boolean }>(`select c.relrowsecurity enabled,c.relforcerowsecurity forced from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='smartcheck_audit_logs' and c.relkind='r'`);
  const auditPolicies = await client.query<{ name: string; command: string; role_oids: number[]; permissive: boolean; using_expression: string | null; check_expression: string | null }>(`select polname name,polcmd command,p.polroles::oid[] role_oids,p.polpermissive permissive,
    pg_get_expr(p.polqual,p.polrelid) using_expression,pg_get_expr(p.polwithcheck,p.polrelid) check_expression
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='smartcheck_audit_logs' order by polname`);
  const appNonPilot = "((CURRENT_USER = 'bimmetraj_app'::name) AND (entity_type <> 'smartcheck_pilot_case'::text))";
  const workerNonPilot = "((CURRENT_USER = 'bimmetraj_worker'::name) AND (entity_type <> 'smartcheck_pilot_case'::text))";
  const appAuditRead = "((CURRENT_USER = 'bimmetraj_app'::name) AND ((entity_type <> 'smartcheck_pilot_case'::text) OR (company_id = (NULLIF(current_setting('bimmetraj.company_id'::text, true), ''::text))::uuid)))";
  const auditOwner = "(CURRENT_USER = 'bimmetraj_owner'::name)";
  const expectedAuditPolicies = [
    ["smartcheck_audit_logs_app_insert", "a", null, appNonPilot],
    ["smartcheck_audit_logs_app_non_pilot_mutation", "*", appNonPilot, appNonPilot],
    ["smartcheck_audit_logs_app_read", "r", appAuditRead, null],
    ["smartcheck_audit_logs_backup_read", "r", backup, null],
    ["smartcheck_audit_logs_owner_migration", "*", auditOwner, auditOwner],
    ["smartcheck_audit_logs_worker_non_pilot", "*", workerNonPilot, workerNonPilot],
  ] as const;
  const auditMatches = auditPolicies.rowCount === expectedAuditPolicies.length && expectedAuditPolicies.every(([name, command, using, check]) => {
    const policy = auditPolicies.rows.find((row) => row.name === name);
    return policy?.permissive && JSON.stringify(policy.role_oids) === JSON.stringify([0]) && policy.command === command
      && policy.using_expression === using && policy.check_expression === check;
  });
  if (auditState.rowCount !== 1 || !auditState.rows[0]?.enabled || !auditState.rows[0]?.forced
    || !auditMatches) {
    violations.push("public.smartcheck_audit_logs: smartcheck-pilot scoped RLS policy matrix drift");
  }
  const functionState = await client.query<{ owner: string; security_definer: boolean; config: string[] | null; public_execute: boolean; definition: string; source: string }>(`select pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,p.proconfig config,pg_get_functiondef(p.oid) definition,p.prosrc source,
      exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl where acl.grantee=0 and acl.privilege_type='EXECUTE') public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='prevent_smartcheck_pilot_measurement_mutation' and pg_get_function_identity_arguments(p.oid)=''`);
  const triggerState = await client.query<{ count: number; exact_shape: boolean }>(`select count(*)::int count,
      coalesce(bool_and(t.tgenabled='O' and (t.tgtype & 2)=2 and (t.tgtype & 1)=1 and (t.tgtype & 16)=16 and (t.tgtype & 8)=8
        and p.proname='prevent_smartcheck_pilot_measurement_mutation' and pn.nspname='public'),false) exact_shape
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace
    where n.nspname='public' and c.relname='smartcheck_pilot_measurements' and t.tgname='smartcheck_pilot_measurements_append_only' and not t.tgisinternal`);
  const fn = functionState.rows[0];
  if (functionState.rowCount !== 1 || fn?.owner !== "bimmetraj_owner" || fn.security_definer || JSON.stringify(fn.config) !== JSON.stringify(["search_path=pg_catalog, public"]) || fn.public_execute
    || fn.source.trim() !== functionSource(smartcheckPilotMeasurementAppendOnlyFunction)) {
    violations.push("public.prevent_smartcheck_pilot_measurement_mutation: append-only function provenance drift");
  }
  const trigger = triggerState.rows[0];
  if (trigger?.count !== 1 || !trigger.exact_shape) {
    violations.push("public.smartcheck_pilot_measurements: append-only trigger provenance drift");
  }
  const guardFunctions = await client.query<{ name: string; owner: string; security_definer: boolean; config: string[] | null; public_execute: boolean; definition: string; source: string }>(`select p.proname name,pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,p.proconfig config,pg_get_functiondef(p.oid) definition,p.prosrc source,
      exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl where acl.grantee=0 and acl.privilege_type='EXECUTE') public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and p.proname=any($1::text[]) and pg_get_function_identity_arguments(p.oid)='' order by p.proname`, [["enforce_smartcheck_pilot_case_mutation", "prevent_smartcheck_pilot_audit_mutation", "record_smartcheck_pilot_case_evidence", "record_smartcheck_pilot_measurement_evidence", "validate_smartcheck_pilot_measurement_insert"]]);
  const requiredSource = new Map([
    ["enforce_smartcheck_pilot_case_mutation", functionSource(smartcheckPilotCaseMutationFunction)],
    ["prevent_smartcheck_pilot_audit_mutation", functionSource(smartcheckPilotAuditMutationFunction)],
    ["record_smartcheck_pilot_case_evidence", functionSource(smartcheckPilotCaseEvidenceFunction)],
    ["record_smartcheck_pilot_measurement_evidence", functionSource(smartcheckPilotMeasurementEvidenceFunction)],
    ["validate_smartcheck_pilot_measurement_insert", functionSource(smartcheckPilotMeasurementInsertFunction)],
  ]);
  const securityDefinerFunctions = new Set(["record_smartcheck_pilot_case_evidence", "record_smartcheck_pilot_measurement_evidence"]);
  if (guardFunctions.rowCount !== 5 || guardFunctions.rows.some((row) => row.owner !== "bimmetraj_owner" || row.security_definer !== securityDefinerFunctions.has(row.name)
    || JSON.stringify(row.config) !== JSON.stringify(["search_path=pg_catalog, public"]) || row.public_execute || row.source.trim() !== requiredSource.get(row.name))) {
    violations.push("public smartcheck-pilot: case/audit guard function provenance drift");
  }
  const guardTriggers = await client.query<{ name: string; enabled: string; function_name: string; table_name: string; trigger_type: number }>(`select t.tgname name,t.tgenabled enabled,p.proname function_name,c.relname table_name,t.tgtype::int trigger_type
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
    where n.nspname='public' and t.tgname=any($1::text[]) and not t.tgisinternal order by t.tgname`, [["smartcheck_pilot_audit_append_only", "smartcheck_pilot_cases_mutation_guard", "smartcheck_pilot_cases_record_evidence", "smartcheck_pilot_measurements_insert_guard", "smartcheck_pilot_measurements_record_evidence"]]);
  const expectedGuards = new Map([
    ["smartcheck_pilot_audit_append_only", ["prevent_smartcheck_pilot_audit_mutation", "smartcheck_audit_logs", 31]],
    ["smartcheck_pilot_cases_mutation_guard", ["enforce_smartcheck_pilot_case_mutation", "smartcheck_pilot_cases", 27]],
    ["smartcheck_pilot_cases_record_evidence", ["record_smartcheck_pilot_case_evidence", "smartcheck_pilot_cases", 21]],
    ["smartcheck_pilot_measurements_insert_guard", ["validate_smartcheck_pilot_measurement_insert", "smartcheck_pilot_measurements", 7]],
    ["smartcheck_pilot_measurements_record_evidence", ["record_smartcheck_pilot_measurement_evidence", "smartcheck_pilot_measurements", 5]],
  ]);
  if (guardTriggers.rowCount !== 5 || guardTriggers.rows.some((row) => {
    const expected = expectedGuards.get(row.name);
    return row.enabled !== "O" || !expected || expected[0] !== row.function_name || expected[1] !== row.table_name || expected[2] !== row.trigger_type;
  })) {
    violations.push("public smartcheck-pilot: case/audit guard trigger provenance drift");
  }
  return violations;
}

async function inspectQueueStructureViolations(client: Queryable): Promise<string[]> {
  const present = await client.query<{ present: boolean }>("select exists(select 1 from pg_namespace where nspname='teklifpro_queue') as present");
  if (!present.rows[0]?.present) return [];
  const result = await client.query<{ migration_ids: number[] | null; fingerprint: string }>(`with entries(entry) as (
      select concat_ws('|','relation',c.relname,c.relkind::text,c.relpersistence,coalesce(am.amname,'<null>'),coalesce(array_to_string(c.reloptions,','),'<null>'),coalesce(t.spcname,'<default>')) from pg_class c join pg_namespace n on n.oid=c.relnamespace left join pg_am am on am.oid=c.relam left join pg_tablespace t on t.oid=c.reltablespace where n.nspname='teklifpro_queue' and c.relkind in ('r','p','S','v','m','f')
      union all select concat_ws('|','sequence',c.relname,s.seqstart::text,s.seqincrement::text,s.seqmax::text,s.seqmin::text,s.seqcache::text,s.seqcycle::text) from pg_sequence s join pg_class c on c.oid=s.seqrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='teklifpro_queue'
      union all select concat_ws('|','column',c.relname,a.attnum::text,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull::text,a.attidentity,a.attgenerated,coalesce(pg_get_expr(d.adbin,d.adrelid),'<null>')) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='teklifpro_queue' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
      union all select concat_ws('|','constraint',c.relname,k.conname,k.contype::text,pg_get_constraintdef(k.oid,true)) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='teklifpro_queue'
      union all select concat_ws('|','index',c.relname,i.relname,pg_get_indexdef(i.oid)) from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='teklifpro_queue'
      union all select concat_ws('|','trigger',c.relname,t.tgname,pg_get_triggerdef(t.oid,true)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='teklifpro_queue' and not t.tgisinternal
      union all select concat_ws('|','rule',c.relname,r.rulename,pg_get_ruledef(r.oid,true)) from pg_rewrite r join pg_class c on c.oid=r.ev_class join pg_namespace n on n.oid=c.relnamespace where n.nspname='teklifpro_queue' and r.rulename<>'_RETURN'
    ), manifest as (select encode(sha256(convert_to(coalesce(string_agg(entry,E'\\n' order by entry),''),'UTF8')),'hex') as fingerprint from entries), migrations as (select array_agg(id::int order by id) as migration_ids from teklifpro_queue.migrations)
    select migrations.migration_ids,manifest.fingerprint from migrations cross join manifest`);
  const state = result.rows[0];
  const violations: string[] = [];
  const expectedMigrationIds = Array.from({ length: DATABASE_QUEUE_MIGRATION_REVISION }, (_, index) => index + 1);
  if (!state || JSON.stringify(state.migration_ids) !== JSON.stringify(expectedMigrationIds)) violations.push(`teklifpro_queue: exact Graphile Worker migration ${DATABASE_QUEUE_MIGRATION_REVISION} ledger is required`);
  if (!state || state.fingerprint !== DATABASE_QUEUE_STRUCTURE_FINGERPRINT) violations.push("teklifpro_queue: canonical Graphile Worker structure fingerprint mismatch");
  return violations;
}

export async function inspectRoleProvenanceViolations(client: Queryable, expectedSystemIdentifier?: string): Promise<string[]> {
  const systemIdentifier = expectedSystemIdentifier ?? (await client.query<{ value: string }>("select system_identifier::text as value from pg_control_system()")).rows[0]?.value;
  if (!systemIdentifier) return ["Database cluster system identifier is unavailable"];
  const expected = `bimmetraj.database-roles.v1:${systemIdentifier}`;
  const roles = await client.query<{ name: string; provenance: string | null }>(`select rolname as name,shobj_description(oid,'pg_authid') as provenance
    from pg_roles where rolname=any($1::text[])`, [DATABASE_ROLE_SPECS.map(({ name }) => name)]);
  const violations = roles.rows.filter(({ provenance }) => provenance !== expected).map(({ name }) => `${name}: canonical role provenance mismatch`);
  const dependencies = await client.query<{ name: string; cross_database: boolean; unexpected_shared: boolean }>(`select role.rolname as name,
      bool_or((dependency.dbid<>0 and dependency.dbid<>(select oid from pg_database where datname=current_database()))
        or (dependency.dbid=0 and dependency.classid='pg_database'::regclass and dependency.objid<>(select oid from pg_database where datname=current_database()))) as cross_database,
      bool_or(dependency.dbid=0 and not (dependency.classid='pg_database'::regclass and dependency.objid=(select oid from pg_database where datname=current_database()))) as unexpected_shared
    from pg_shdepend dependency join pg_roles role on role.oid=dependency.refobjid
    where dependency.refclassid='pg_authid'::regclass and role.rolname=any($1::text[])
    group by role.rolname`, [DATABASE_ROLE_SPECS.map(({ name }) => name)]);
  for (const dependency of dependencies.rows) {
    if (dependency.cross_database) violations.push(`${dependency.name}: canonical role has ownership or ACL dependencies in another database`);
    if (dependency.unexpected_shared) violations.push(`${dependency.name}: canonical role has an unexpected cluster-shared dependency`);
  }
  violations.push(...await inspectQueueStructureViolations(client));
  return violations.sort();
}

async function inspectManagedSchemaViolations(client: Queryable): Promise<string[]> {
  const violations: string[] = [];
  violations.push(...await inspectCdeRlsViolations(client));
  violations.push(...await inspectProgressPaymentRlsViolations(client));
  violations.push(...await inspectSmartcheckPilotRlsViolations(client));
  const present = new Set((await client.query<{ name: string }>("select nspname as name from pg_namespace where nspname=any($1::text[])", [managedSchemas])).rows.map(({ name }) => name));
  for (const spec of DATABASE_SCHEMA_SPECS) if (spec.required && !present.has(spec.name)) violations.push(`${spec.name}: required managed schema is missing`);
  const roles = ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_worker", "bimmetraj_backup"] as const;
  for (const schema of present) {
    const owner = await client.query<{ owner: string }>("select pg_get_userbyid(nspowner) as owner from pg_namespace where nspname=$1", [schema]);
    if (owner.rows[0]?.owner !== "bimmetraj_owner") violations.push(`${schema}: schema owner must be bimmetraj_owner`);
    for (const role of roles) {
      const grants = await client.query<{ create_schema: boolean; usage: boolean; table_count: number; read_all: boolean; any_read: boolean; write_all: boolean; any_write: boolean; forbidden: boolean; execute_table_exact: boolean; sequence_count: number; sequence_all: boolean; sequence_read_all: boolean; sequence_any_privilege: boolean; sequence_any_mutation: boolean; type_count: number; type_usage_all: boolean; type_any_usage: boolean }>(`select
          has_schema_privilege($1,$2,'CREATE') as create_schema, has_schema_privilege($1,$2,'USAGE') as usage,
          (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')) as table_count,
          coalesce((select bool_and(has_table_privilege($1,c.oid,'SELECT')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')),false) as read_all,
          coalesce((select bool_or(has_table_privilege($1,c.oid,'SELECT')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')),false) as any_read,
          coalesce((select bool_and(has_table_privilege($1,c.oid,'INSERT') and has_table_privilege($1,c.oid,'UPDATE') and has_table_privilege($1,c.oid,'DELETE')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')),false) as write_all,
          coalesce((select bool_or(has_table_privilege($1,c.oid,'INSERT') or has_table_privilege($1,c.oid,'UPDATE') or has_table_privilege($1,c.oid,'DELETE')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')),false) as any_write,
          coalesce((select bool_or(has_table_privilege($1,c.oid,'TRUNCATE') or has_table_privilege($1,c.oid,'REFERENCES') or has_table_privilege($1,c.oid,'TRIGGER')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')),false) as forbidden,
          case when $2='teklifpro_queue' and $1='bimmetraj_app' then
            coalesce((select bool_and(case when c.relname='migrations' then has_table_privilege($1,c.oid,'SELECT') and not (has_table_privilege($1,c.oid,'INSERT') or has_table_privilege($1,c.oid,'UPDATE') or has_table_privilege($1,c.oid,'DELETE'))
              else not (has_table_privilege($1,c.oid,'SELECT') or has_table_privilege($1,c.oid,'INSERT') or has_table_privilege($1,c.oid,'UPDATE') or has_table_privilege($1,c.oid,'DELETE')) end)
              from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind in ('r','p','v','m','f')),false)
            else false end as execute_table_exact,
          (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind='S') as sequence_count,
          coalesce((select bool_and(has_sequence_privilege($1,c.oid,'USAGE') and has_sequence_privilege($1,c.oid,'SELECT') and has_sequence_privilege($1,c.oid,'UPDATE')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind='S'),false) as sequence_all,
          coalesce((select bool_and(has_sequence_privilege($1,c.oid,'SELECT')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind='S'),false) as sequence_read_all,
          coalesce((select bool_or(has_sequence_privilege($1,c.oid,'USAGE') or has_sequence_privilege($1,c.oid,'SELECT') or has_sequence_privilege($1,c.oid,'UPDATE')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind='S'),false) as sequence_any_privilege,
          coalesce((select bool_or(has_sequence_privilege($1,c.oid,'USAGE') or has_sequence_privilege($1,c.oid,'UPDATE')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$2 and c.relkind='S'),false) as sequence_any_mutation,
          (select count(*)::int from pg_type t join pg_namespace n on n.oid=t.typnamespace left join pg_class c on c.oid=t.typrelid where n.nspname=$2 and (t.typtype in ('e','d','r','m') or c.relkind='c')) as type_count,
          coalesce((select bool_and(has_type_privilege($1,t.oid,'USAGE')) from pg_type t join pg_namespace n on n.oid=t.typnamespace left join pg_class c on c.oid=t.typrelid where n.nspname=$2 and (t.typtype in ('e','d','r','m') or c.relkind='c')),false) as type_usage_all,
          coalesce((select bool_or(has_type_privilege($1,t.oid,'USAGE')) from pg_type t join pg_namespace n on n.oid=t.typnamespace left join pg_class c on c.oid=t.typrelid where n.nspname=$2 and (t.typtype in ('e','d','r','m') or c.relkind='c')),false) as type_any_usage`, [role, schema]);
      const value = grants.rows[0];
      if (!value) continue;
      const schemaSpec = DATABASE_SCHEMA_SPECS.find((candidate) => candidate.name === schema)!;
      const mode = schemaSpec.access[role];
      const needsUsage = mode !== "none";
      if (value.create_schema || value.usage !== needsUsage) violations.push(`${schema}/${role}: schema privilege drift`);
      if (value.table_count && ((mode === "write" && (!value.read_all || !value.write_all || value.forbidden))
        || (mode === "read" && (!value.read_all || value.any_write || value.forbidden))
        || (mode === "execute" && (!value.execute_table_exact || value.forbidden))
        || (mode === "none" && (value.any_read || value.any_write || value.forbidden)))) violations.push(`${schema}/${role}: table privilege drift`);
      if (value.sequence_count && ((mode === "write" && !value.sequence_all)
        || (mode === "read" && (!value.sequence_read_all || value.sequence_any_mutation))
        || ((mode === "none" || mode === "execute") && value.sequence_any_privilege))) violations.push(`${schema}/${role}: sequence privilege drift`);
      if (value.type_count && ((needsUsage && !value.type_usage_all) || (!needsUsage && value.type_any_usage))) violations.push(`${schema}/${role}: type privilege drift`);
    }
  }
  const ownership = await client.query<{ object: string }>(`select format('%s.%s',n.nspname,c.relname) as object from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=any($1::text[]) and c.relkind in ('r','p','S','v','m','f','c') and pg_get_userbyid(c.relowner)<>'bimmetraj_owner'
    union all select format('%s.%s',n.nspname,p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname=any($1::text[]) and pg_get_userbyid(p.proowner)<>'bimmetraj_owner'
    union all select format('%s.%s',n.nspname,t.typname) from pg_type t join pg_namespace n on n.oid=t.typnamespace left join pg_class c on c.oid=t.typrelid
      where n.nspname=any($1::text[]) and (t.typtype in ('e','d','r','m') or c.relkind='c') and pg_get_userbyid(t.typowner)<>'bimmetraj_owner'`, [managedSchemas]);
  violations.push(...ownership.rows.map(({ object }) => `${object}: object owner must be bimmetraj_owner`));
  if (present.has("teklifpro_queue")) {
    const policies = await client.query<{ table_name: string; policy_name: string; command: string; roles: string[]; using_expression: string | null; check_expression: string | null }>(`select c.relname as table_name,p.polname as policy_name,p.polcmd as command,
        array(select r.rolname::text from unnest(p.polroles) role_oid join pg_roles r on r.oid=role_oid order by r.rolname)::text[] as roles,
        pg_get_expr(p.polqual,p.polrelid) as using_expression,pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
      from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='teklifpro_queue' order by c.relname,p.polname`);
    const canonicalPolicyTables = new Set<string>(DATABASE_QUEUE_RLS_TABLES);
    if (policies.rows.length !== DATABASE_QUEUE_RLS_TABLES.length * 2 || policies.rows.some((policy) => !canonicalPolicyTables.has(policy.table_name))) {
      violations.push("teklifpro_queue: unexpected RLS policy outside the canonical matrix");
    }
    const migrationsRls = await client.query<{ enabled: boolean; forced: boolean }>(`select c.relrowsecurity as enabled,c.relforcerowsecurity as forced from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='teklifpro_queue' and c.relname='migrations' and c.relkind in ('r','p')`);
    if (migrationsRls.rowCount !== 1 || migrationsRls.rows[0]?.enabled || migrationsRls.rows[0]?.forced) violations.push("teklifpro_queue.migrations: RLS must be disabled and not forced");
    for (const table of DATABASE_QUEUE_RLS_TABLES) {
      const rlsState = await client.query<{ enabled: boolean; forced: boolean }>(`select c.relrowsecurity as enabled,c.relforcerowsecurity as forced from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='teklifpro_queue' and c.relname=$1 and c.relkind in ('r','p')`, [table]);
      const actual = policies.rows.filter((policy) => policy.table_name === table);
      const worker = actual.find((policy) => policy.policy_name === "bimmetraj_worker_access");
      const backup = actual.find((policy) => policy.policy_name === "bimmetraj_backup_read");
      if (rlsState.rowCount !== 1 || !rlsState.rows[0]?.enabled || rlsState.rows[0]?.forced || actual.length !== 2 || worker?.command !== "*" || JSON.stringify(worker.roles) !== JSON.stringify(["bimmetraj_worker"])
        || worker.using_expression !== "true" || worker.check_expression !== "true"
        || backup?.command !== "r" || JSON.stringify(backup.roles) !== JSON.stringify(["bimmetraj_backup"])
        || backup.using_expression !== "true" || backup.check_expression !== null) violations.push(`teklifpro_queue.${table}: RLS policy matrix drift`);
    }
  }
  for (const spec of DATABASE_FUNCTION_EXECUTE_SPECS) {
    const functionState = await client.query<{ oid: number; owner: string; security_definer: boolean; strict: boolean; full_arguments: string; result: string; leakproof: boolean; parallel: string; settings: string[] | null; language: string; source: string; source_sha256: string; volatility: string; kind: string; binary: string | null }>(`select p.oid,pg_get_userbyid(p.proowner) as owner,p.prosecdef as security_definer,p.proisstrict as strict,pg_get_function_arguments(p.oid) as full_arguments,pg_get_function_result(p.oid) as result,p.proleakproof as leakproof,p.proparallel as parallel,p.proconfig as settings,l.lanname as language,p.prosrc as source,encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') as source_sha256,p.provolatile as volatility,p.prokind as kind,p.probin as binary
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname=$1 and p.proname=$2 and oidvectortypes(p.proargtypes)=$3`, [spec.schema, spec.name, spec.arguments]);
    const state = functionState.rows[0];
    const wrapperSource = spec.name in DATABASE_SECURITY_DEFINER_WRAPPERS ? DATABASE_SECURITY_DEFINER_WRAPPERS[spec.name as keyof typeof DATABASE_SECURITY_DEFINER_WRAPPERS] : undefined;
    const vendorHash = spec.name in DATABASE_VENDOR_FUNCTION_PROVENANCE ? DATABASE_VENDOR_FUNCTION_PROVENANCE[spec.name as keyof typeof DATABASE_VENDOR_FUNCTION_PROVENANCE] : undefined;
    if (functionState.rowCount !== 1 || state?.owner !== "bimmetraj_owner" || state.security_definer !== spec.securityDefiner || state.strict !== spec.strict || state.full_arguments !== spec.fullArguments || state.result !== spec.result || state.leakproof || state.parallel !== "u"
      || JSON.stringify(state.settings) !== JSON.stringify([`search_path=pg_catalog, ${spec.schema}`]) || state.language !== "plpgsql"
      || state.volatility !== "v" || state.kind !== "f" || state.binary !== null
      || (wrapperSource !== undefined && state.source !== wrapperSource) || (vendorHash !== undefined && state.source_sha256 !== vendorHash)) {
      violations.push(`${spec.schema}.${spec.name}(${spec.arguments}): runtime function hardening or provenance drift`);
    }
    if (state) {
      const acl = await client.query<{ grantee: string; privilege: string; grantable: boolean }>(`select coalesce(role.rolname,'PUBLIC') as grantee,a.privilege_type as privilege,a.is_grantable as grantable
        from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f'::"char",p.proowner))) a left join pg_roles role on role.oid=a.grantee
        where p.oid=$1 and a.grantee<>p.proowner order by grantee,privilege,grantable`, [state.oid]);
      const actualAcl = acl.rows.map((entry) => `${entry.grantee}|${entry.privilege}|${entry.grantable}`);
      const expectedAcl = spec.roles.map((role) => `${role}|EXECUTE|false`).sort();
      if (JSON.stringify(actualAcl) !== JSON.stringify(expectedAcl)) violations.push(`${spec.schema}.${spec.name}(${spec.arguments}): function EXECUTE ACL matrix drift`);
    }
  }
  return violations.sort();
}

async function inspectDefaultAclViolations(client: Queryable): Promise<string[]> {
  const presentSchemas = (await client.query<{ name: string }>("select nspname as name from pg_namespace where nspname=any($1::text[])", [managedSchemas])).rows.map(({ name }) => name);
  const actual = (await client.query<{ schema: string; object_type: string; grantee: string; privilege: string; grantable: boolean }>(`select n.nspname as schema,d.defaclobjtype as object_type,coalesce(r.rolname,'PUBLIC') as grantee,a.privilege_type as privilege,a.is_grantable as grantable
    from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole left join pg_namespace n on n.oid=d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a left join pg_roles r on r.oid=a.grantee
    where owner.rolname='bimmetraj_owner' and n.nspname=any($1::text[])
      and coalesce(r.rolname,'PUBLIC')<>'bimmetraj_owner'
    order by n.nspname,d.defaclobjtype,grantee,privilege`, [managedSchemas])).rows
    .map((row) => `${row.schema}|${row.object_type}|${row.grantee}|${row.privilege}|${row.grantable}`).sort();
  const expected: string[] = [];
  const add = (schema: string, objectType: string, grantee: string, privileges: string[]) => privileges.forEach((privilege) => expected.push(`${schema}|${objectType}|${grantee}|${privilege}|false`));
  for (const schema of presentSchemas) {
    add(schema, "r", "bimmetraj_backup", ["SELECT"]);
    add(schema, "S", "bimmetraj_backup", ["SELECT"]);
    if (schema === "public") {
      for (const role of ["bimmetraj_app", "bimmetraj_worker"]) {
        add(schema, "r", role, ["DELETE", "INSERT", "SELECT", "UPDATE"]);
        add(schema, "S", role, ["SELECT", "UPDATE", "USAGE"]);
      }
    } else if (schema === "teklifpro_queue") {
      add(schema, "r", "bimmetraj_worker", ["DELETE", "INSERT", "SELECT", "UPDATE"]);
      add(schema, "S", "bimmetraj_worker", ["SELECT", "UPDATE", "USAGE"]);
    }
    const schemaSpec = DATABASE_SCHEMA_SPECS.find((candidate) => candidate.name === schema)!;
    for (const [role, mode] of Object.entries(schemaSpec.access)) if (mode !== "none") add(schema, "T", role, ["USAGE"]);
  }
  const expectedSorted = expected.sort();
  return actual.length === expectedSorted.length && actual.every((value, index) => value === expectedSorted[index])
    ? [] : ["bimmetraj_owner default ACLs differ from the canonical per-schema matrix"];
}

async function inspectExactAclViolations(client: Queryable): Promise<string[]> {
  const rows = (await client.query<{ scope: string; schema: string; object_type: string; object_name: string; grantee: string; privilege: string; grantable: boolean }>(`with entries as (
      select 'database'::text scope,''::text schema,'d'::text object_type,d.datname::text object_name,d.datdba owner,a.* from pg_database d cross join lateral aclexplode(coalesce(d.datacl,acldefault('d'::"char",d.datdba))) a where d.datname=current_database()
      union all select 'schema',n.nspname,'n',n.nspname,n.nspowner,a.* from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n'::"char",n.nspowner))) a where n.nspname=any($1::text[])
      union all select 'relation',n.nspname,case when c.relkind='S' then 'S' else 'r' end,c.relname,c.relowner,a.* from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a where n.nspname=any($1::text[]) and c.relkind in ('r','p','v','m','f','S')
      union all select 'function',n.nspname,'f',format('%s(%s)',p.proname,oidvectortypes(p.proargtypes)),p.proowner,a.* from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f'::"char",p.proowner))) a where n.nspname=any($1::text[])
      union all select 'type',n.nspname,'T',t.typname,t.typowner,a.* from pg_type t join pg_namespace n on n.oid=t.typnamespace cross join lateral aclexplode(coalesce(t.typacl,acldefault('T'::"char",t.typowner))) a where n.nspname=any($1::text[]) and (t.typtype in ('e','d','r','m') or exists(select 1 from pg_class c where c.oid=t.typrelid and c.relkind='c'))
      union all select 'column',n.nspname,'a',format('%s.%s',c.relname,attribute.attname),c.relowner,a.* from pg_attribute attribute join pg_class c on c.oid=attribute.attrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(attribute.attacl) a where n.nspname=any($1::text[]) and attribute.attnum>0 and not attribute.attisdropped and attribute.attacl is not null
    ) select scope,schema,object_type,object_name,coalesce(role.rolname,'PUBLIC') as grantee,entries.privilege_type as privilege,entries.is_grantable as grantable
      from entries left join pg_roles role on role.oid=entries.grantee where entries.grantee<>entries.owner
      order by scope,schema,object_type,object_name,grantee,privilege`, [managedSchemas])).rows;
  const violations: string[] = [];
  for (const row of rows) {
    let allowed: readonly string[] = [];
    if (row.scope === "database") allowed = row.grantee !== "PUBLIC" && canonicalLoginRole(row.grantee) ? ["CONNECT"] : [];
    else {
      const schemaSpec = DATABASE_SCHEMA_SPECS.find(({ name }) => name === row.schema);
      const mode = schemaSpec && canonicalLoginRole(row.grantee) ? schemaSpec.access[row.grantee] : "none";
      if (row.scope === "schema") allowed = mode !== "none" ? ["USAGE"] : [];
      else if (row.object_type === "r") allowed = row.schema === "teklifpro_queue" && row.object_name === "migrations" && row.grantee === "bimmetraj_app"
        ? ["SELECT"] : mode === "write" ? ["DELETE", "INSERT", "SELECT", "UPDATE"] : mode === "read" ? ["SELECT"] : [];
      else if (row.object_type === "S") allowed = mode === "write" ? ["SELECT", "UPDATE", "USAGE"] : mode === "read" ? ["SELECT"] : [];
      else if (row.object_type === "T") allowed = mode !== "none" ? ["USAGE"] : [];
      else if (row.object_type === "f") {
        const matches = DATABASE_FUNCTION_EXECUTE_SPECS.some((spec) => spec.schema === row.schema && `${spec.name}(${spec.arguments})` === row.object_name && spec.roles.some((role) => role === row.grantee));
        allowed = matches ? ["EXECUTE"] : [];
      }
    }
    if (!allowed.includes(row.privilege) || row.grantable) violations.push(`${row.scope}/${row.schema}/${row.object_name}/${row.grantee}: unexpected ${row.privilege}${row.grantable ? " WITH GRANT OPTION" : ""}`);
  }
  return violations;
}

function canonicalLoginRole(value: string): value is Exclude<DatabaseRoleName, "bimmetraj_owner"> {
  return value === "bimmetraj_migrator" || value === "bimmetraj_app" || value === "bimmetraj_worker" || value === "bimmetraj_backup";
}

export function sanitizeRoleReport<T>(value: T): T {
  const sanitize = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(sanitize);
    if (candidate && typeof candidate === "object") {
      return Object.fromEntries(
        Object.entries(candidate)
          .filter(([key]) => !sensitiveKey.test(key))
          .map(([key, nested]) => [key, sanitize(nested)]),
      );
    }
    if (typeof candidate === "string" && connectionUrl.test(candidate)) return "[REDACTED]";
    return candidate;
  };
  return sanitize(value) as T;
}

export async function inspectRoleBoundaries(
  client: Queryable,
  roleNames: readonly DatabaseRoleName[] = DATABASE_ROLE_SPECS.map(({ name }) => name),
): Promise<DatabaseRoleBoundaryReport> {
  const databaseResult = await client.query<{ database: string }>("select current_database() as database");
  const database = databaseResult.rows[0]?.database;
  if (!database) throw new Error("Database role inspection could not resolve current_database()");

  const rolesResult = await client.query<{
    name: DatabaseRoleName;
    can_login: boolean;
    superuser: boolean;
    bypass_rls: boolean;
    create_db: boolean;
    create_role: boolean;
    inherit: boolean;
    replication: boolean;
    owns_database: boolean;
    owns_public_schema: boolean;
    connect: boolean;
    create_schema: boolean;
    create_table: boolean;
    temporary: boolean;
    read: boolean;
    write: boolean;
    any_write: boolean;
    truncate: boolean;
    references: boolean;
    trigger: boolean;
  }>(`select r.rolname as name,
      r.rolcanlogin as can_login,
      r.rolsuper as superuser,
      r.rolbypassrls as bypass_rls,
      r.rolcreatedb as create_db,
      r.rolcreaterole as create_role,
      r.rolinherit as inherit,
      r.rolreplication as replication,
      pg_get_userbyid(d.datdba)=r.rolname as owns_database,
      pg_get_userbyid(n.nspowner)=r.rolname as owns_public_schema,
      has_database_privilege(r.rolname, current_database(), 'CONNECT') as connect,
      has_database_privilege(r.rolname, current_database(), 'CREATE') as create_schema,
      has_schema_privilege(r.rolname, 'public', 'CREATE') as create_table,
      has_database_privilege(r.rolname, current_database(), 'TEMPORARY') as temporary,
      coalesce((select bool_and(has_table_privilege(r.rolname, c.oid, 'SELECT'))
        from pg_class c join pg_namespace cn on cn.oid=c.relnamespace
        where cn.nspname='public' and c.relkind in ('r','p')), false) as read,
      coalesce((select bool_and(has_table_privilege(r.rolname, c.oid, 'INSERT')
        and has_table_privilege(r.rolname, c.oid, 'UPDATE')
        and has_table_privilege(r.rolname, c.oid, 'DELETE'))
        from pg_class c join pg_namespace cn on cn.oid=c.relnamespace
        where cn.nspname='public' and c.relkind in ('r','p')), false) as write,
      coalesce((select bool_or(has_table_privilege(r.rolname, c.oid, 'INSERT')
        or has_table_privilege(r.rolname, c.oid, 'UPDATE')
        or has_table_privilege(r.rolname, c.oid, 'DELETE'))
        from pg_class c join pg_namespace cn on cn.oid=c.relnamespace
        where cn.nspname='public' and c.relkind in ('r','p')), false) as any_write,
      coalesce((select bool_or(has_table_privilege(r.rolname, c.oid, 'TRUNCATE'))
        from pg_class c join pg_namespace cn on cn.oid=c.relnamespace
        where cn.nspname='public' and c.relkind in ('r','p')), false) as truncate,
      coalesce((select bool_or(has_table_privilege(r.rolname, c.oid, 'REFERENCES'))
        from pg_class c join pg_namespace cn on cn.oid=c.relnamespace
        where cn.nspname='public' and c.relkind in ('r','p')), false) as references,
      coalesce((select bool_or(has_table_privilege(r.rolname, c.oid, 'TRIGGER'))
        from pg_class c join pg_namespace cn on cn.oid=c.relnamespace
        where cn.nspname='public' and c.relkind in ('r','p')), false) as trigger
    from pg_roles r
    join pg_database d on d.datname=current_database()
    join pg_namespace n on n.nspname='public'
    where r.rolname = any($1::text[])
    order by array_position($1::text[], r.rolname)`, [roleNames]);

  const byName = new Map(rolesResult.rows.map((row) => [row.name, row]));
  const membershipsResult = await client.query<InspectedRoleMembership>(`select parent.rolname as role, child.rolname as member,
      membership.admin_option as "adminOption", membership.inherit_option as "inheritOption", membership.set_option as "setOption"
    from pg_auth_members membership
    join pg_roles parent on parent.oid=membership.roleid
    join pg_roles child on child.oid=membership.member
    where parent.rolname=any($1::text[]) or child.rolname=any($1::text[])
    order by parent.rolname, child.rolname`, [roleNames]);
  const publicResult = await client.query<DatabaseRoleBoundaryReport["publicPrivileges"]>(`select
      exists(select 1 from aclexplode(coalesce(d.datacl, acldefault('d'::"char",d.datdba))) a where a.grantee=0 and a.privilege_type='CREATE') as "databaseCreate",
      exists(select 1 from aclexplode(coalesce(d.datacl, acldefault('d'::"char",d.datdba))) a where a.grantee=0 and a.privilege_type='TEMPORARY') as "databaseTemporary",
      exists(select 1 from aclexplode(coalesce(n.nspacl, acldefault('n'::"char",n.nspowner))) a where a.grantee=0 and a.privilege_type='CREATE') as "schemaCreate"
    from pg_database d cross join pg_namespace n
    where d.datname=current_database() and n.nspname='public'`);
  const managedSchemaViolations = await inspectManagedSchemaViolations(client);
  const defaultAclViolations = await inspectDefaultAclViolations(client);
  const exactAclViolations = await inspectExactAclViolations(client);
  const provenanceViolations = await inspectRoleProvenanceViolations(client);

  return {
    contract: DATABASE_ROLE_CONTRACT,
    database,
    inspectedAt: new Date().toISOString(),
    memberships: membershipsResult.rows,
    publicPrivileges: publicResult.rows[0] ?? { databaseCreate: false, databaseTemporary: false, schemaCreate: false },
    managedSchemaViolations: [...managedSchemaViolations, ...exactAclViolations].sort(),
    defaultAclViolations,
    provenanceViolations,
    roles: roleNames.map((name) => {
      const row = byName.get(name);
      return {
        name,
        exists: Boolean(row),
        canLogin: row?.can_login ?? false,
        attributes: {
          superuser: row?.superuser ?? false,
          bypassRls: row?.bypass_rls ?? false,
          createDb: row?.create_db ?? false,
          createRole: row?.create_role ?? false,
          inherit: row?.inherit ?? false,
          replication: row?.replication ?? false,
        },
        ownsDatabase: row?.owns_database ?? false,
        ownsPublicSchema: row?.owns_public_schema ?? false,
        privileges: {
          connect: row?.connect ?? false,
          createSchema: row?.create_schema ?? false,
          createTable: row?.create_table ?? false,
          temporary: row?.temporary ?? false,
          read: row?.read ?? false,
          write: row?.write ?? false,
          anyWrite: row?.any_write ?? false,
          truncate: row?.truncate ?? false,
          references: row?.references ?? false,
          trigger: row?.trigger ?? false,
        },
      };
    }),
  };
}

export function assertRoleBoundaries(report: DatabaseRoleBoundaryReport): void {
  const inspected = new Map(report.roles.map((role) => [role.name, role]));
  const violations: string[] = [];
  for (const spec of DATABASE_ROLE_SPECS) {
    const role = inspected.get(spec.name);
    if (!role?.exists) {
      violations.push(`${spec.name}: role must exist`);
      continue;
    }
    if (role.canLogin !== spec.canLogin) violations.push(`${spec.name}: canLogin=${spec.canLogin} required`);
    if (role.attributes.superuser !== spec.attributes.superuser) violations.push(`${spec.name}: NOSUPERUSER (superuser=false) required`);
    if (role.attributes.bypassRls !== spec.attributes.bypassRls) violations.push(`${spec.name}: NOBYPASSRLS (bypassRls=false) required`);
    if (role.attributes.createDb !== spec.attributes.createDb) violations.push(`${spec.name}: NOCREATEDB (createDb=false) required`);
    if (role.attributes.createRole !== spec.attributes.createRole) violations.push(`${spec.name}: NOCREATEROLE (createRole=false) required`);
    if (role.attributes.inherit !== spec.attributes.inherit) violations.push(`${spec.name}: NOINHERIT (inherit=false) required`);
    if (role.attributes.replication !== spec.attributes.replication) violations.push(`${spec.name}: NOREPLICATION (replication=false) required`);
    if (role.ownsDatabase !== spec.ownsSchema) violations.push(`${spec.name}: ownsDatabase=${spec.ownsSchema} required`);
    if (role.ownsPublicSchema !== spec.ownsSchema) violations.push(`${spec.name}: ownsPublicSchema=${spec.ownsSchema} required`);
    if (!role.privileges.connect) violations.push(`${spec.name}: CONNECT required`);
    if (role.privileges.createSchema !== spec.canCreateSchema) violations.push(`${spec.name}: createSchema=${spec.canCreateSchema} required`);
    if (role.privileges.createTable !== spec.canCreateTable) violations.push(`${spec.name}: createTable=${spec.canCreateTable} required`);
    if (spec.name !== "bimmetraj_owner" && role.privileges.temporary) violations.push(`${spec.name}: TEMPORARY=false required`);
    if (role.privileges.read !== spec.canRead) violations.push(`${spec.name}: read=${spec.canRead} required`);
    if (spec.canWrite && !role.privileges.write) violations.push(`${spec.name}: write=true on every public table required`);
    if (!spec.canWrite && role.privileges.anyWrite) violations.push(`${spec.name}: read-only boundary requires write=false`);
    if (spec.name !== "bimmetraj_owner" && (role.privileges.truncate || role.privileges.references || role.privileges.trigger)) violations.push(`${spec.name}: TRUNCATE/REFERENCES/TRIGGER must remain false`);
  }
  if (JSON.stringify(report.memberships) !== JSON.stringify(DATABASE_ROLE_MEMBERSHIPS)) violations.push("role membership graph differs from the canonical owner-to-migrator SET-only edge");
  if (report.publicPrivileges.databaseCreate || report.publicPrivileges.databaseTemporary || report.publicPrivileges.schemaCreate) violations.push("PUBLIC database/schema creation privileges must be revoked");
  violations.push(...report.managedSchemaViolations, ...report.defaultAclViolations, ...report.provenanceViolations);
  if (report.roles.length !== DATABASE_ROLE_SPECS.length) violations.push("role set must contain exactly the canonical roles");
  if (violations.length) throw new Error(`Database role boundary violations:\n${violations.join("\n")}`);
}

async function main() {
  const connectionString = process.env.DATABASE_ROLE_INSPECT_URL;
  if (!connectionString) throw new Error("DATABASE_ROLE_INSPECT_URL is required");
  const client = new pg.Client({ connectionString, application_name: "bimmetraj-role-inspector" });
  try {
    await client.connect();
    const report = await inspectRoleBoundaries(client);
    assertRoleBoundaries(report);
    process.stdout.write(`${JSON.stringify(sanitizeRoleReport(report), null, 2)}\n`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Database role inspection failed"}\n`);
    process.exitCode = 1;
  });
}
