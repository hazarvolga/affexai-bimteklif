export const DATABASE_ROLE_CONTRACT = "bimmetraj.database-roles.v1" as const;

export type DatabaseRoleName =
  | "bimmetraj_owner"
  | "bimmetraj_migrator"
  | "bimmetraj_app"
  | "bimmetraj_control"
  | "bimmetraj_worker"
  | "bimmetraj_backup";

export type DatabaseRoleSpec = Readonly<{
  name: DatabaseRoleName;
  canLogin: boolean;
  ownsSchema: boolean;
  canMigrate: boolean;
  canRead: boolean;
  canWrite: boolean;
  canCreateSchema: boolean;
  canCreateTable: boolean;
  attributes: Readonly<{
    superuser: false;
    bypassRls: false;
    createDb: false;
    createRole: false;
    inherit: false;
    replication: false;
  }>;
}>;

const restrictedAttributes = Object.freeze({
  superuser: false,
  bypassRls: false,
  createDb: false,
  createRole: false,
  inherit: false,
  replication: false,
} as const);

export const DATABASE_ROLE_MEMBERSHIPS = Object.freeze([
  Object.freeze({
    role: "bimmetraj_owner" as const,
    member: "bimmetraj_migrator" as const,
    adminOption: false,
    inheritOption: false,
    setOption: true,
  }),
]);

export type DatabaseAccessMode = "none" | "read" | "write" | "execute";
export const DATABASE_SCHEMA_SPECS = Object.freeze([
  Object.freeze({ name: "public", required: true, access: Object.freeze({ bimmetraj_migrator: "none", bimmetraj_app: "write", bimmetraj_control: "write", bimmetraj_worker: "write", bimmetraj_backup: "read" }) }),
  Object.freeze({ name: "teklifpro_release", required: true, access: Object.freeze({ bimmetraj_migrator: "none", bimmetraj_app: "none", bimmetraj_control: "none", bimmetraj_worker: "none", bimmetraj_backup: "read" }) }),
  Object.freeze({ name: "teklifpro_queue", required: false, access: Object.freeze({ bimmetraj_migrator: "none", bimmetraj_app: "execute", bimmetraj_control: "none", bimmetraj_worker: "write", bimmetraj_backup: "read" }) }),
] as const satisfies readonly Readonly<{
  name: string;
  required: boolean;
  access: Readonly<Record<Exclude<DatabaseRoleName, "bimmetraj_owner">, DatabaseAccessMode>>;
}>[]);

export const DATABASE_FUNCTION_EXECUTE_SPECS = Object.freeze([
  Object.freeze({ schema: "teklifpro_queue", name: "add_job", arguments: "text, json, text, timestamp with time zone, integer, text, integer, text[], text", fullArguments: "identifier text, payload json DEFAULT NULL::json, queue_name text DEFAULT NULL::text, run_at timestamp with time zone DEFAULT NULL::timestamp with time zone, max_attempts integer DEFAULT NULL::integer, job_key text DEFAULT NULL::text, priority integer DEFAULT NULL::integer, flags text[] DEFAULT NULL::text[], job_key_mode text DEFAULT 'replace'::text", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: false, strict: false, result: "teklifpro_queue._private_jobs" }),
  Object.freeze({ schema: "teklifpro_queue", name: "add_jobs", arguments: "teklifpro_queue.job_spec[], boolean", fullArguments: "specs teklifpro_queue.job_spec[], job_key_preserve_run_at boolean DEFAULT false", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: false, strict: false, result: "SETOF teklifpro_queue._private_jobs" }),
  Object.freeze({ schema: "teklifpro_queue", name: "remove_job", arguments: "text", fullArguments: "job_key text", roles: Object.freeze([] as const), securityDefiner: false, strict: true, result: "teklifpro_queue._private_jobs" }),
  Object.freeze({ schema: "teklifpro_queue", name: "bimmetraj_enqueue_smartcheck", arguments: "text, json, text, integer, integer", fullArguments: "p_identifier text, p_payload json, p_job_key text, p_max_attempts integer, p_priority integer", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "void" }),
  Object.freeze({ schema: "teklifpro_queue", name: "bimmetraj_remove_smartcheck_job", arguments: "text", fullArguments: "p_job_key text", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "TABLE(locked_at timestamp with time zone)" }),
]);

export const DATABASE_QUEUE_RLS_TABLES = Object.freeze(["_private_job_queues", "_private_jobs", "_private_known_crontabs", "_private_tasks"] as const);
export const DATABASE_CDE_RLS_TABLES = Object.freeze(["cde_projects", "cde_project_members", "cde_containers", "cde_revisions", "cde_transition_events"] as const);
export const DATABASE_PROGRESS_PAYMENT_RLS_TABLES = Object.freeze([
  "construction_contracts",
  "construction_contract_items",
  "progress_payment_periods",
  "progress_payment_lines",
  "progress_measurements",
  "progress_measurement_review_events",
  "progress_payment_adjustments",
  "progress_payment_events",
  "contract_variations",
  "final_accounts",
] as const);
export const DATABASE_SMARTCHECK_PILOT_RLS_TABLES = Object.freeze([
  "smartcheck_pilot_cases",
  "smartcheck_pilot_measurements",
] as const);
export const DATABASE_COMPANY_INDUSTRY_RLS_TABLES = Object.freeze([
  "industries",
  "company_industry_settings",
] as const);
export const DATABASE_CRM_LEAD_RLS_TABLES = Object.freeze(["companies", "leads", "subscriptions", "usage_logs"] as const);
export const DATABASE_PUBLIC_RESTRICTED_TABLE_ACL = Object.freeze({
  companies: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  subscriptions: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  plans: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze(["INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  usage_logs: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT"]), bimmetraj_worker: Object.freeze([]) }),
  leads: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
} as const);

export const DATABASE_CONTROL_TABLE_ACL = Object.freeze({
  users: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
  memberships: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
  auth_action_tokens: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]),
  invitations: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
  admin_audit_logs: Object.freeze(["INSERT", "SELECT"]),
  academy_enrollment_audit_logs: Object.freeze(["INSERT", "SELECT"]),
  academy_enrollments: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
  academy_learner_profiles: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
  academy_activation_events: Object.freeze(["INSERT", "SELECT"]),
  academy_acquisition_events: Object.freeze(["INSERT", "SELECT", "UPDATE"]),
  academy_products: Object.freeze(["SELECT"]),
  academy_editions: Object.freeze(["SELECT"]),
  academy_payment_events: Object.freeze(["INSERT", "SELECT"]),
} as const);
export const DATABASE_CONTROL_APP_TABLE_ACL = Object.freeze({
  users: Object.freeze(["SELECT"]),
  memberships: Object.freeze(["SELECT"]),
  auth_action_tokens: Object.freeze(["SELECT"]),
  invitations: Object.freeze(["SELECT"]),
  admin_audit_logs: Object.freeze(["INSERT", "SELECT"]),
  academy_enrollment_audit_logs: Object.freeze(["SELECT"]),
  academy_enrollments: Object.freeze(["SELECT"]),
  academy_learner_profiles: Object.freeze(["SELECT"]),
  academy_activation_events: Object.freeze(["SELECT"]),
  academy_acquisition_events: Object.freeze(["SELECT"]),
  academy_products: Object.freeze(["SELECT"]),
  academy_editions: Object.freeze(["SELECT"]),
  academy_payment_events: Object.freeze(["SELECT"]),
} as const);
export const DATABASE_QUEUE_MIGRATION_REVISION = 18;
export const DATABASE_QUEUE_STRUCTURE_FINGERPRINT = "fecec79451c22e2ae6ad1a040c7eb88c0a4b4c94467f30555d9d003ec088e57e";

export const DATABASE_SECURITY_DEFINER_WRAPPERS = Object.freeze({
  bimmetraj_enqueue_smartcheck: `
      begin
        if p_identifier is null or p_identifier not in ('process_smartcheck_document','process_smartcheck_ifc_document') then raise exception 'Unsupported SmartCheck task identifier' using errcode='22023'; end if;
        if p_job_key is null or p_job_key !~ '^smartcheck:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid SmartCheck job key' using errcode='22023'; end if;
        if p_payload is null or octet_length(p_payload::text)>65536 or p_max_attempts is null or p_max_attempts not between 1 and 5 or p_priority is null or p_priority not between 0 and 10 then raise exception 'SmartCheck job boundary rejected' using errcode='22023'; end if;
        perform teklifpro_queue.add_job(p_identifier,p_payload,job_key=>p_job_key,max_attempts=>p_max_attempts,priority=>p_priority);
      end `,
  bimmetraj_remove_smartcheck_job: `
      begin
        if p_job_key is null or p_job_key !~ '^smartcheck:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid SmartCheck job key' using errcode='22023'; end if;
        return query select removed.locked_at from teklifpro_queue.remove_job(p_job_key) removed;
      end `,
} as const);

export const DATABASE_VENDOR_FUNCTION_PROVENANCE = Object.freeze({
  add_job: "7846bd1a8c043c6ceea0f39f09fd8997d1621e98c81910be52ad0173d79e610e",
  add_jobs: "dc749ac5494dde51c864b4637bd563eca14c2c0ab2817ef15fcf40782d87381d",
  remove_job: "6092a4dca21faf3074ef8944893729f44b50c85007877fea19494ac4b5c8d54c",
} as const);

export const DATABASE_ROLE_SPECS: readonly DatabaseRoleSpec[] = Object.freeze([
  {
    name: "bimmetraj_owner",
    canLogin: false,
    ownsSchema: true,
    canMigrate: false,
    canRead: true,
    canWrite: true,
    canCreateSchema: true,
    canCreateTable: true,
    attributes: restrictedAttributes,
  },
  {
    name: "bimmetraj_migrator",
    canLogin: true,
    ownsSchema: false,
    canMigrate: true,
    canRead: false,
    canWrite: false,
    canCreateSchema: false,
    canCreateTable: false,
    attributes: restrictedAttributes,
  },
  {
    name: "bimmetraj_app",
    canLogin: true,
    ownsSchema: false,
    canMigrate: false,
    canRead: true,
    canWrite: true,
    canCreateSchema: false,
    canCreateTable: false,
    attributes: restrictedAttributes,
  },
  {
    name: "bimmetraj_control",
    canLogin: true,
    ownsSchema: false,
    canMigrate: false,
    canRead: true,
    canWrite: true,
    canCreateSchema: false,
    canCreateTable: false,
    attributes: restrictedAttributes,
  },
  {
    name: "bimmetraj_worker",
    canLogin: true,
    ownsSchema: false,
    canMigrate: false,
    canRead: true,
    canWrite: true,
    canCreateSchema: false,
    canCreateTable: false,
    attributes: restrictedAttributes,
  },
  {
    name: "bimmetraj_backup",
    canLogin: true,
    ownsSchema: false,
    canMigrate: false,
    canRead: true,
    canWrite: false,
    canCreateSchema: false,
    canCreateTable: false,
    attributes: restrictedAttributes,
  },
]);
