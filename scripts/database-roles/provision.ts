import type pg from "pg";
import { DATABASE_CONTROL_APP_TABLE_ACL, DATABASE_CONTROL_TABLE_ACL, DATABASE_FUNCTION_EXECUTE_SPECS, DATABASE_PUBLIC_RESTRICTED_TABLE_ACL, DATABASE_QUEUE_RLS_TABLES, DATABASE_ROLE_SPECS, DATABASE_SCHEMA_SPECS, DATABASE_SECURITY_DEFINER_WRAPPERS, type DatabaseRoleName } from "./contract";
import { assertRoleBoundaries, inspectRoleBoundaries, inspectRoleProvenanceViolations } from "./inspect";
import { catalog } from "../release-migrations/catalog";
import { loadMigrations } from "../release-migrations/runner";
import { pinnedSignature } from "../release-migrations/stage-signatures";

export type DatabaseRoleCredentials = Record<Exclude<DatabaseRoleName, "bimmetraj_owner">, string>;
export type DatabaseRoleProvisionTarget = Readonly<{
  expectedDatabase: string;
  expectedSystemIdentifier: string;
  requiredMarkerRegclass: string;
  inspectionMode?: "canonical" | "pre_schema_role_contract";
}>;

type Queryable = Pick<pg.Client, "query">;
const canonicalRoleNames = DATABASE_ROLE_SPECS.map(({ name }) => name);
const runtimeRoleNames = DATABASE_ROLE_SPECS.filter(({ canLogin }) => canLogin).map(({ name }) => name);
const runtimeRoleList = runtimeRoleNames.join(",");
const managedSchemas = DATABASE_SCHEMA_SPECS.map(({ name }) => name);
const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;

function validateCredentials(credentials: DatabaseRoleCredentials, administratorCredential: string): void {
  if (!administratorCredential) throw new Error("The authenticated bootstrap administrator credential is required for separation validation");
  const seen = new Set<string>();
  for (const spec of DATABASE_ROLE_SPECS) {
    if (!spec.canLogin) continue;
    const credential = credentials[spec.name as keyof DatabaseRoleCredentials];
    if (typeof credential !== "string" || credential.length < 32 || new Set(credential).size < 12 || !/^[A-Za-z0-9_-]+$/.test(credential)) {
      throw new Error(`${spec.name} requires a URL-safe high-entropy generated credential of at least 32 characters`);
    }
    if (seen.has(credential) || credential === administratorCredential) throw new Error("Every canonical login and bootstrap role requires a distinct generated credential");
    seen.add(credential);
  }
}

async function assertProvisionTarget(client: Queryable, target: DatabaseRoleProvisionTarget): Promise<void> {
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(target.expectedDatabase)
    || !/^\d{10,30}$/.test(target.expectedSystemIdentifier)
    || !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(target.requiredMarkerRegclass)) {
    throw new Error("Database role provisioning requires an exact database, system identifier and schema-qualified marker");
  }
  const result = await client.query<{ database: string; system_identifier: string; marker: string | null; version_major: number; superuser: boolean; create_role: boolean }>(`select current_database() as database,
      control.system_identifier::text as system_identifier, to_regclass($1)::text as marker,
      current_setting('server_version_num')::int / 10000 as version_major,
      role.rolsuper as superuser, role.rolcreaterole as create_role
    from pg_control_system() control join pg_roles role on role.rolname=current_user`, [target.requiredMarkerRegclass]);
  const actual = result.rows[0];
  if (!actual || actual.database !== target.expectedDatabase || actual.system_identifier !== target.expectedSystemIdentifier
    || actual.marker !== target.requiredMarkerRegclass || actual.version_major !== 16 || !actual.superuser || !actual.create_role
    || ["postgres", "template0", "template1"].includes(actual.database)) {
    throw new Error("Database role provisioning target fingerprint or administrator authority mismatch");
  }
  if (target.inspectionMode === "pre_schema_role_contract") {
    const fixture = await client.query<{ exact_columns: boolean; empty: boolean; leads_absent: boolean }>(`select
      coalesce((select array_agg(column_name::text order by ordinal_position)=array['idx']::text[]
        from information_schema.columns where table_schema='teklifpro_release' and table_name='migrations'),false) exact_columns,
      not exists(select 1 from teklifpro_release.migrations) empty,
      to_regclass('public.leads') is null leads_absent`);
    if (!fixture.rows[0]?.exact_columns || !fixture.rows[0]?.empty || !fixture.rows[0]?.leads_absent) {
      throw new Error("Pre-schema role-contract inspection mode requires the exact empty idx-only test marker and no public.leads table");
    }
  } else if (target.inspectionMode !== undefined && target.inspectionMode !== "canonical") {
    throw new Error("Unknown database role inspection mode");
  }
}

async function assertExistingMembershipGraph(client: Queryable): Promise<void> {
  const memberships = await client.query<{ role: string; member: string; admin: boolean; inherit: boolean; set: boolean }>(`select parent.rolname as role, child.rolname as member,
      membership.admin_option as admin, membership.inherit_option as inherit, membership.set_option as set
    from pg_auth_members membership join pg_roles parent on parent.oid=membership.roleid join pg_roles child on child.oid=membership.member
    where parent.rolname=any($1::text[]) or child.rolname=any($1::text[]) order by parent.rolname,child.rolname`, [canonicalRoleNames]);
  const unexpected = memberships.rows.filter((edge) => !(edge.role === "bimmetraj_owner" && edge.member === "bimmetraj_migrator" && !edge.admin && !edge.inherit && edge.set));
  if (unexpected.length) throw new Error("Canonical database roles have an unexpected membership edge; manual review is required");
}

async function assertNoUnexpectedAclGrantees(client: Queryable): Promise<void> {
  const result = await client.query<{ grantee: string }>(`with acl_grantees as (
      select d.datdba owner,a.grantee from pg_database d cross join lateral aclexplode(coalesce(d.datacl,acldefault('d'::"char",d.datdba))) a where d.datname=current_database()
      union select n.nspowner,a.grantee from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n'::"char",n.nspowner))) a where n.nspname=any($1::text[])
      union select c.relowner,a.grantee from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a where n.nspname=any($1::text[])
      union select p.proowner,a.grantee from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f'::"char",p.proowner))) a where n.nspname=any($1::text[])
      union select t.typowner,a.grantee from pg_type t join pg_namespace n on n.oid=t.typnamespace cross join lateral aclexplode(coalesce(t.typacl,acldefault('T'::"char",t.typowner))) a where n.nspname=any($1::text[])
      union select c.relowner,a.grantee from pg_attribute attribute join pg_class c on c.oid=attribute.attrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(attribute.attacl) a where n.nspname=any($1::text[]) and attribute.attnum>0 and not attribute.attisdropped and attribute.attacl is not null
      union select d.defaclrole,a.grantee from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a left join pg_namespace n on n.oid=d.defaclnamespace where n.nspname=any($1::text[])
    ) select distinct coalesce(role.rolname,'PUBLIC') as grantee from acl_grantees acl left join pg_roles role on role.oid=acl.grantee
      where acl.grantee<>0 and acl.grantee<>acl.owner and not (coalesce(role.rolname,'')=any($2::text[]))`, [managedSchemas, canonicalRoleNames]);
  if (result.rowCount) throw new Error("Managed database objects contain an ACL grantee outside the canonical allowlist");
}

async function setRolePassword(client: Queryable, role: Exclude<DatabaseRoleName, "bimmetraj_owner">, password: string): Promise<void> {
  await client.query("select set_config('bimmetraj.provision_role_password',$1,true)", [password]);
  await client.query(`do $password$ begin execute format('alter role ${identifier(role)} password %L', current_setting('bimmetraj.provision_role_password')); end $password$`);
  await client.query("select set_config('bimmetraj.provision_role_password','',true)");
}

async function createCanonicalRoles(client: Queryable, credentials: DatabaseRoleCredentials, systemIdentifier: string): Promise<void> {
  for (const spec of DATABASE_ROLE_SPECS) {
    await client.query(`do $$ begin if not exists (select 1 from pg_roles where rolname='${spec.name}') then create role ${identifier(spec.name)}; end if; end $$`);
    await client.query(`alter role ${identifier(spec.name)} with ${spec.canLogin ? "login" : "nologin"} noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication`);
    await client.query(`comment on role ${identifier(spec.name)} is 'bimmetraj.database-roles.v1:${systemIdentifier}'`);
    if (spec.canLogin) await setRolePassword(client, spec.name as Exclude<DatabaseRoleName, "bimmetraj_owner">, credentials[spec.name as keyof DatabaseRoleCredentials]);
  }
  await client.query("grant bimmetraj_owner to bimmetraj_migrator with admin false, inherit false, set true");
}

async function assertLegacyIdx8Catalog(client: Queryable): Promise<void> {
  const migrations = await loadMigrations();
  const baseline = migrations[8];
  if (!baseline || baseline.idx !== 8 || baseline.tag !== "0008_pilot_exception_rows") {
    throw new Error("Legacy bootstrap requires the pinned idx8 release artifact");
  }
  const ledger = await client.query<{ idx: number; tag: string; hash: string; catalog_hash: string }>(
    "select idx,tag,hash,catalog_hash from teklifpro_release.migrations order by idx",
  );
  if (ledger.rows.length !== 9 || ledger.rows.some((row, index) =>
    row.idx !== index || row.tag !== migrations[index]?.tag || row.hash !== migrations[index]?.sha256
    || row.catalog_hash !== pinnedSignature(migrations[index]))) {
    throw new Error("Legacy bootstrap requires the exact pinned idx8 release ledger");
  }
  if ((await catalog(client as pg.Client)).signature !== pinnedSignature(baseline)) {
    throw new Error("Legacy bootstrap catalog differs from the pinned idx8 signature");
  }
}

async function assertExistingLegacyRoleAttributes(client: Queryable): Promise<void> {
  const roles = await client.query<{
    name: string; login: boolean; inherit: boolean; superuser: boolean; bypassrls: boolean;
    createdb: boolean; createrole: boolean; replication: boolean;
  }>(`select rolname as name,rolcanlogin as login,rolinherit as inherit,rolsuper as superuser,
      rolbypassrls as bypassrls,rolcreatedb as createdb,rolcreaterole as createrole,rolreplication as replication
    from pg_roles where rolname=any($1::text[])`, [canonicalRoleNames]);
  if (roles.rows.length !== 0 && roles.rows.length !== DATABASE_ROLE_SPECS.length) {
    throw new Error("Legacy bootstrap refuses a partial canonical role set");
  }
  for (const role of roles.rows) {
    const spec = DATABASE_ROLE_SPECS.find(({ name }) => name === role.name);
    if (!spec || role.login !== spec.canLogin || role.inherit || role.superuser || role.bypassrls
      || role.createdb || role.createrole || role.replication) {
      throw new Error("Legacy bootstrap refuses canonical role attribute drift");
    }
  }
  if (roles.rows.length === DATABASE_ROLE_SPECS.length) {
    const membership = await client.query<{ complete: boolean }>(`select exists(
      select 1 from pg_auth_members edge
      join pg_roles parent on parent.oid=edge.roleid join pg_roles child on child.oid=edge.member
      where parent.rolname='bimmetraj_owner' and child.rolname='bimmetraj_migrator'
        and not edge.admin_option and not edge.inherit_option and edge.set_option
    ) as complete`);
    if (!membership.rows[0]?.complete) throw new Error("Legacy bootstrap refuses missing canonical SET membership");
  }
}

/** Stage one of the legacy idx8 cutover. Full ACL/RLS convergence still requires provisionDatabaseRoles after migrations. */
export async function bootstrapLegacyDatabaseRoles(
  client: Queryable,
  credentials: DatabaseRoleCredentials,
  target: DatabaseRoleProvisionTarget,
  administratorCredential: string,
): Promise<void> {
  validateCredentials(credentials, administratorCredential);
  if (target.inspectionMode !== undefined && target.inspectionMode !== "canonical") {
    throw new Error("Legacy bootstrap requires the canonical production inspection mode");
  }
  if (target.requiredMarkerRegclass !== "teklifpro_release.migrations") {
    throw new Error("Legacy bootstrap requires the exact release ledger marker");
  }
  await client.query("begin");
  try {
    const lock = await client.query<{ acquired: boolean }>("select pg_try_advisory_xact_lock(hashtext('bimmetraj.database-roles.v1')) as acquired");
    if (!lock.rows[0]?.acquired) throw new Error("Another database role provisioning operation is already active");
    await assertProvisionTarget(client, target);
    const provenanceViolations = await inspectRoleProvenanceViolations(client, target.expectedSystemIdentifier);
    if (provenanceViolations.length) throw new Error(provenanceViolations.join("; "));
    await assertNoUnexpectedAclGrantees(client);
    await assertExistingMembershipGraph(client);
    await assertExistingLegacyRoleAttributes(client);
    await assertLegacyIdx8Catalog(client);
    await createCanonicalRoles(client, credentials, target.expectedSystemIdentifier);
    await client.query(`alter database ${identifier(target.expectedDatabase)} owner to bimmetraj_owner`);
    await transferManagedObjects(client);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function transferManagedObjects(client: Queryable): Promise<void> {
  const schemas = await client.query<{ name: string }>("select nspname as name from pg_namespace where nspname=any($1::text[])", [managedSchemas]);
  for (const schema of schemas.rows) await client.query(`alter schema ${identifier(schema.name)} owner to bimmetraj_owner`);
  const relations = await client.query<{ schema: string; kind: string; name: string }>(`select n.nspname as schema,c.relkind as kind,c.relname as name
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname=any($1::text[]) and c.relkind in ('r','p','S','v','m','f','c')
      and (c.relkind<>'S' or not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.refclassid='pg_class'::regclass and d.deptype in ('a','i')))
    order by n.nspname,case when c.relkind in ('r','p') then 0 when c.relkind='S' then 1 else 2 end,c.relname`, [managedSchemas]);
  const commands: Record<string, string> = { r: "TABLE", p: "TABLE", S: "SEQUENCE", v: "VIEW", m: "MATERIALIZED VIEW", f: "FOREIGN TABLE", c: "TYPE" };
  for (const relation of relations.rows) await client.query(`alter ${commands[relation.kind]} ${identifier(relation.schema)}.${identifier(relation.name)} owner to bimmetraj_owner`);
  const routines = await client.query<{ schema: string; name: string; kind: string; args: string }>(`select n.nspname as schema,p.proname as name,p.prokind as kind,pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=any($1::text[]) order by n.nspname,p.proname,p.oid`, [managedSchemas]);
  for (const routine of routines.rows) {
    const kind = routine.kind === "p" ? "PROCEDURE" : routine.kind === "a" ? "AGGREGATE" : "FUNCTION";
    await client.query(`alter ${kind} ${identifier(routine.schema)}.${identifier(routine.name)}(${routine.args}) owner to bimmetraj_owner`);
  }
  const types = await client.query<{ schema: string; name: string; kind: string }>(`select n.nspname as schema,t.typname as name,t.typtype as kind
    from pg_type t join pg_namespace n on n.oid=t.typnamespace left join pg_class c on c.oid=t.typrelid
    where n.nspname=any($1::text[]) and t.typtype in ('e','d','r','m') and c.oid is null order by n.nspname,t.typname`, [managedSchemas]);
  for (const type of types.rows) await client.query(`alter ${type.kind === "d" ? "DOMAIN" : "TYPE"} ${identifier(type.schema)}.${identifier(type.name)} owner to bimmetraj_owner`);
}

async function convergePrivileges(client: Queryable, database: string, allowMissingRestrictedTables = false): Promise<void> {
  await client.query(`revoke all privileges on database ${identifier(database)} from public`);
  await client.query(`revoke all privileges on database ${identifier(database)} from ${runtimeRoleList}`);
  await client.query(`grant connect on database ${identifier(database)} to ${runtimeRoleList}`);
  for (const schema of managedSchemas) {
    const exists = await client.query<{ present: boolean }>("select exists(select 1 from pg_namespace where nspname=$1) as present", [schema]);
    if (!exists.rows[0]?.present) continue;
    const qualified = identifier(schema);
    const schemaSpec = DATABASE_SCHEMA_SPECS.find((candidate) => candidate.name === schema)!;
    const usageRoles = Object.entries(schemaSpec.access).filter(([, mode]) => mode !== "none").map(([role]) => role);
    await client.query(`revoke all privileges on schema ${qualified} from public,${runtimeRoleList}`);
    if (usageRoles.length) await client.query(`grant usage on schema ${qualified} to ${usageRoles.join(",")}`);
    await client.query(`revoke all privileges on all tables in schema ${qualified} from public,${runtimeRoleList}`);
    const columns = await client.query<{ relation: string; column: string }>(`select c.relname as relation,a.attname as column from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=$1 and c.relkind in ('r','p','v','m','f') and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum`, [schema]);
    for (const column of columns.rows) await client.query(`revoke select (${identifier(column.column)}),insert (${identifier(column.column)}),update (${identifier(column.column)}),references (${identifier(column.column)}) on ${qualified}.${identifier(column.relation)} from public,${runtimeRoleList}`);
    await client.query(`grant select on all tables in schema ${qualified} to bimmetraj_backup`);
    await client.query(`revoke all privileges on all sequences in schema ${qualified} from public,${runtimeRoleList}`);
    await client.query(`grant select on all sequences in schema ${qualified} to bimmetraj_backup`);
    await client.query(`revoke all privileges on all functions in schema ${qualified} from public,${runtimeRoleList}`);
    const types = await client.query<{ name: string }>(`select t.typname as name from pg_type t join pg_namespace n on n.oid=t.typnamespace
      where n.nspname=$1 and (t.typtype in ('e','d','r','m') or exists(select 1 from pg_class c where c.oid=t.typrelid and c.relkind='c'))`, [schema]);
    for (const type of types.rows) {
      await client.query(`revoke all privileges on type ${qualified}.${identifier(type.name)} from public,${runtimeRoleList}`);
      if (usageRoles.length) await client.query(`grant usage on type ${qualified}.${identifier(type.name)} to ${usageRoles.join(",")}`);
    }
    if (schema === "public") {
      await client.query(`grant select,insert,update,delete on all tables in schema ${qualified} to bimmetraj_app,bimmetraj_worker`);
      await client.query(`grant usage,select,update on all sequences in schema ${qualified} to bimmetraj_app,bimmetraj_worker`);
      for (const [table, access] of Object.entries(DATABASE_PUBLIC_RESTRICTED_TABLE_ACL)) {
        const present = await client.query<{ present: boolean }>("select to_regclass($1) is not null as present", [`public.${table}`]);
        if (!present.rows[0]?.present) {
          if (allowMissingRestrictedTables) continue;
          throw new Error(`Required CRM leads or quota dependency table is missing: ${table}`);
        }
        await client.query(`revoke all privileges on table ${qualified}.${identifier(table)} from bimmetraj_app,bimmetraj_control,bimmetraj_worker`);
        if (access.bimmetraj_app.length) await client.query(`grant ${access.bimmetraj_app.join(",")} on table ${qualified}.${identifier(table)} to bimmetraj_app`);
        if (access.bimmetraj_control.length) await client.query(`grant ${access.bimmetraj_control.join(",")} on table ${qualified}.${identifier(table)} to bimmetraj_control`);
        if (access.bimmetraj_worker.length) await client.query(`grant ${access.bimmetraj_worker.join(",")} on table ${qualified}.${identifier(table)} to bimmetraj_worker`);
      }
      for (const [table, access] of Object.entries(DATABASE_CONTROL_TABLE_ACL)) {
        const present = await client.query<{ present: boolean }>("select to_regclass($1) is not null as present", [`public.${table}`]);
        if (!present.rows[0]?.present) {
          if (allowMissingRestrictedTables) continue;
          throw new Error(`Required control-plane table is missing: ${table}`);
        }
        await client.query(`revoke all privileges on table ${qualified}.${identifier(table)} from bimmetraj_app,bimmetraj_control,bimmetraj_worker`);
        const appAccess = DATABASE_CONTROL_APP_TABLE_ACL[table as keyof typeof DATABASE_CONTROL_APP_TABLE_ACL] ?? [];
        if (appAccess.length) await client.query(`grant ${appAccess.join(",")} on table ${qualified}.${identifier(table)} to bimmetraj_app`);
        await client.query(`grant ${access.join(",")} on table ${qualified}.${identifier(table)} to bimmetraj_control`);
      }
      for (const table of ["companies", "subscriptions", "usage_logs"] as const) {
        const present = await client.query<{ present: boolean }>("select to_regclass($1) is not null as present", [`public.${table}`]);
        if (!present.rows[0]?.present && allowMissingRestrictedTables) continue;
        const command = table === "usage_logs" ? "for select using (current_user='bimmetraj_control')" : "for all using (current_user='bimmetraj_control') with check (current_user='bimmetraj_control')";
        await client.query(`drop policy if exists ${identifier(`${table}_control_access`)} on ${qualified}.${identifier(table)}`);
        await client.query(`create policy ${identifier(`${table}_control_access`)} on ${qualified}.${identifier(table)} ${command}`);
        if (table === "usage_logs") {
          await client.query(`drop policy if exists ${identifier(`${table}_control_insert`)} on ${qualified}.${identifier(table)}`);
          await client.query(`drop policy if exists ${identifier(`${table}_control_delete`)} on ${qualified}.${identifier(table)}`);
          await client.query(`create policy ${identifier(`${table}_control_insert`)} on ${qualified}.${identifier(table)} for insert with check (current_user='bimmetraj_control')`);
          await client.query(`create policy ${identifier(`${table}_control_delete`)} on ${qualified}.${identifier(table)} for delete using (current_user='bimmetraj_control')`);
        }
      }
    } else if (schema === "teklifpro_queue") {
      await client.query(`grant select,insert,update,delete on all tables in schema ${qualified} to bimmetraj_worker`);
      await client.query(`grant usage,select,update on all sequences in schema ${qualified} to bimmetraj_worker`);
      await client.query(`grant select on ${qualified}.migrations to bimmetraj_app`);
      const policies = await client.query<{ table_name: string; policy_name: string }>(`select c.relname as table_name,p.polname as policy_name from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='teklifpro_queue'`);
      for (const policy of policies.rows) await client.query(`drop policy ${identifier(policy.policy_name)} on ${qualified}.${identifier(policy.table_name)}`);
      await client.query(`alter table ${qualified}.migrations disable row level security`);
      await client.query(`alter table ${qualified}.migrations no force row level security`);
      for (const table of DATABASE_QUEUE_RLS_TABLES) {
        const exists = await client.query<{ present: boolean }>("select to_regclass($1) is not null as present", [`teklifpro_queue.${table}`]);
        if (!exists.rows[0]?.present) throw new Error(`Required Graphile Worker RLS table is missing: ${table}`);
        await client.query(`alter table ${qualified}.${identifier(table)} enable row level security`);
        await client.query(`alter table ${qualified}.${identifier(table)} no force row level security`);
        await client.query(`create policy bimmetraj_worker_access on ${qualified}.${identifier(table)} for all to bimmetraj_worker using (true) with check (true)`);
        await client.query(`create policy bimmetraj_backup_read on ${qualified}.${identifier(table)} for select to bimmetraj_backup using (true)`);
      }
    }
    await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} revoke all on tables from public,${runtimeRoleList}`);
    await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} grant select on tables to bimmetraj_backup`);
    await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} revoke all on sequences from public,${runtimeRoleList}`);
    await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} grant select on sequences to bimmetraj_backup`);
    await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} revoke execute on functions from public,${runtimeRoleList}`);
    await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} revoke all on types from public,${runtimeRoleList}`);
    if (usageRoles.length) await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} grant usage on types to ${usageRoles.join(",")}`);
    if (schema === "teklifpro_queue") {
      await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} grant select,insert,update,delete on tables to bimmetraj_worker`);
      await client.query(`alter default privileges for role bimmetraj_owner in schema ${qualified} grant usage,select,update on sequences to bimmetraj_worker`);
    }
  }
  const queuePresent = await client.query<{ present: boolean }>("select exists(select 1 from pg_namespace where nspname='teklifpro_queue') as present");
  if (queuePresent.rows[0]?.present) {
    await client.query(`create or replace function teklifpro_queue.bimmetraj_enqueue_smartcheck(p_identifier text,p_payload json,p_job_key text,p_max_attempts integer,p_priority integer) returns void
      language plpgsql security definer set search_path to pg_catalog,teklifpro_queue as $wrapper$${DATABASE_SECURITY_DEFINER_WRAPPERS.bimmetraj_enqueue_smartcheck}$wrapper$`);
    await client.query(`create or replace function teklifpro_queue.bimmetraj_remove_smartcheck_job(p_job_key text) returns table(locked_at timestamptz)
      language plpgsql security definer set search_path to pg_catalog,teklifpro_queue as $wrapper$${DATABASE_SECURITY_DEFINER_WRAPPERS.bimmetraj_remove_smartcheck_job}$wrapper$`);
  }
  for (const functionSpec of DATABASE_FUNCTION_EXECUTE_SPECS) {
    const present = await client.query<{ count: number }>(`select count(*)::int as count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname=$1 and p.proname=$2 and oidvectortypes(p.proargtypes)=$3`, [functionSpec.schema, functionSpec.name, functionSpec.arguments]);
    if (present.rows[0]?.count !== 1) throw new Error(`Required runtime function signature is missing or ambiguous: ${functionSpec.schema}.${functionSpec.name}`);
    await client.query(`alter function ${identifier(functionSpec.schema)}.${identifier(functionSpec.name)}(${functionSpec.arguments}) owner to bimmetraj_owner`);
    await client.query(`alter function ${identifier(functionSpec.schema)}.${identifier(functionSpec.name)}(${functionSpec.arguments}) ${functionSpec.securityDefiner ? "security definer" : "security invoker"} set search_path to pg_catalog,${identifier(functionSpec.schema)}`);
    await client.query(`alter function ${identifier(functionSpec.schema)}.${identifier(functionSpec.name)}(${functionSpec.arguments}) ${functionSpec.strict ? "strict" : "called on null input"}`);
    await client.query(`alter function ${identifier(functionSpec.schema)}.${identifier(functionSpec.name)}(${functionSpec.arguments}) not leakproof parallel unsafe`);
    await client.query(`revoke all privileges on function ${identifier(functionSpec.schema)}.${identifier(functionSpec.name)}(${functionSpec.arguments}) from public,${runtimeRoleList}`);
    if (functionSpec.roles.length) await client.query(`grant execute on function ${identifier(functionSpec.schema)}.${identifier(functionSpec.name)}(${functionSpec.arguments}) to ${functionSpec.roles.join(",")}`);
  }
}

export async function provisionDatabaseRoles(
  client: Queryable,
  credentials: DatabaseRoleCredentials,
  target: DatabaseRoleProvisionTarget,
  administratorCredential: string,
): Promise<void> {
  validateCredentials(credentials, administratorCredential);
  await client.query("begin");
  try {
    const lock = await client.query<{ acquired: boolean }>("select pg_try_advisory_xact_lock(hashtext('bimmetraj.database-roles.v1')) as acquired");
    if (!lock.rows[0]?.acquired) throw new Error("Another database role provisioning operation is already active");
    await assertProvisionTarget(client, target);
    const provenanceViolations = await inspectRoleProvenanceViolations(client, target.expectedSystemIdentifier);
    if (provenanceViolations.length) throw new Error(provenanceViolations.join("; "));
    await assertNoUnexpectedAclGrantees(client);
    await assertExistingMembershipGraph(client);
    await createCanonicalRoles(client, credentials, target.expectedSystemIdentifier);
    await client.query(`alter database ${identifier(target.expectedDatabase)} owner to bimmetraj_owner`);
    await transferManagedObjects(client);
    await convergePrivileges(client, target.expectedDatabase, target.inspectionMode === "pre_schema_role_contract");
    assertRoleBoundaries(await inspectRoleBoundaries(client, undefined, {
      allowPreSchemaRoleContract: target.inspectionMode === "pre_schema_role_contract",
    }));
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
