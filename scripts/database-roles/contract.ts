import { priceReviewProtection } from "../release-migrations/data-transitions";

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
  Object.freeze({ schema: "public", name: "bimmetraj_lock_tenant_member", arguments: "uuid, uuid", fullArguments: "p_user_id uuid, p_company_id uuid", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "text" }),
  Object.freeze({ schema: "public", name: "bimmetraj_invalidate_price_review", arguments: "", fullArguments: "", roles: Object.freeze([] as const), securityDefiner: true, strict: false, result: "trigger" }),
  Object.freeze({ schema: "public", name: "bimmetraj_lock_price_reviewer", arguments: "uuid, uuid", fullArguments: "p_user_id uuid, p_company_id uuid", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "boolean" }),
  Object.freeze({ schema: "public", name: "bimmetraj_lock_global_price_reviewer", arguments: "uuid", fullArguments: "p_user_id uuid", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "boolean" }),
  Object.freeze({ schema: "public", name: "bimmetraj_revoke_session", arguments: "text, uuid, timestamp with time zone", fullArguments: "p_token_hash text, p_user_id uuid, p_expires_at timestamp with time zone", roles: Object.freeze(["bimmetraj_control"] as const), securityDefiner: true, strict: false, result: "void" }),
  Object.freeze({ schema: "public", name: "bimmetraj_cleanup_revoked_sessions", arguments: "", fullArguments: "", roles: Object.freeze(["bimmetraj_control"] as const), securityDefiner: true, strict: false, result: "void" }),
  Object.freeze({ schema: "public", name: "bimmetraj_worker_heartbeat", arguments: "uuid, text, text, text", fullArguments: "p_id uuid, p_kind text, p_revision text, p_revision_source text", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: true, strict: false, result: "void" }),
  Object.freeze({ schema: "public", name: "bimmetraj_worker_heartbeat_summary", arguments: "", fullArguments: "", roles: Object.freeze(["bimmetraj_control"] as const), securityDefiner: true, strict: false, result: "TABLE(kind text, last_seen timestamp with time zone, active_instances bigint, revision text, revision_source text)" }),
  Object.freeze({ schema: "teklifpro_queue", name: "add_job", arguments: "text, json, text, timestamp with time zone, integer, text, integer, text[], text", fullArguments: "identifier text, payload json DEFAULT NULL::json, queue_name text DEFAULT NULL::text, run_at timestamp with time zone DEFAULT NULL::timestamp with time zone, max_attempts integer DEFAULT NULL::integer, job_key text DEFAULT NULL::text, priority integer DEFAULT NULL::integer, flags text[] DEFAULT NULL::text[], job_key_mode text DEFAULT 'replace'::text", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: false, strict: false, result: "teklifpro_queue._private_jobs" }),
  Object.freeze({ schema: "teklifpro_queue", name: "add_jobs", arguments: "teklifpro_queue.job_spec[], boolean", fullArguments: "specs teklifpro_queue.job_spec[], job_key_preserve_run_at boolean DEFAULT false", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: false, strict: false, result: "SETOF teklifpro_queue._private_jobs" }),
  Object.freeze({ schema: "teklifpro_queue", name: "remove_job", arguments: "text", fullArguments: "job_key text", roles: Object.freeze([] as const), securityDefiner: false, strict: true, result: "teklifpro_queue._private_jobs" }),
  Object.freeze({ schema: "teklifpro_queue", name: "bimmetraj_enqueue_smartcheck", arguments: "text, json, text, integer, integer", fullArguments: "p_identifier text, p_payload json, p_job_key text, p_max_attempts integer, p_priority integer", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "void" }),
  Object.freeze({ schema: "teklifpro_queue", name: "bimmetraj_remove_smartcheck_job", arguments: "text", fullArguments: "p_job_key text", roles: Object.freeze(["bimmetraj_app"] as const), securityDefiner: true, strict: false, result: "TABLE(locked_at timestamp with time zone)" }),
  Object.freeze({ schema: "public", name: "bimmetraj_worker_get_entitlement", arguments: "uuid", fullArguments: "p_company_id uuid", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: true, strict: false, result: "TABLE(company_exists boolean, subscription_status text, current_period_end timestamp with time zone, plan_id uuid, plan_is_active boolean, monthly_ifc_limit integer, ifc_max_file_mb integer, ifc_max_concurrent integer)" }),
  Object.freeze({ schema: "public", name: "bimmetraj_worker_get_company_context", arguments: "uuid", fullArguments: "p_company_id uuid", roles: Object.freeze(["bimmetraj_worker"] as const), securityDefiner: true, strict: false, result: "TABLE(company_exists boolean, active_standard text, smartcheck_max_waste_percent numeric)" }),
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
/** Tenant business tables without worker or control-plane access, migrated in 0022 with the CDE policy matrix. */
export const DATABASE_TENANT_BUSINESS_RLS_TABLES = Object.freeze([
  "usage_alerts",
  "deals",
  "activities",
  "supplier_quote_submissions",
  "supplier_quote_entries",
  "rule_candidates",
  "rule_registry",
  "rule_versions",
  "review_sessions",
  "review_findings",
  "competency_signals",
  "competency_signal_evidence",
  "assistance_resources",
  "rule_assistance_resources",
] as const);
/** Quotation core tables without worker or control-plane access, migrated in 0023 with the CDE policy matrix. */
export const DATABASE_QUOTATION_CORE_RLS_TABLES = Object.freeze([
  "clients",
  "quotations",
  "quotation_items",
  "quotation_item_evidence",
  "quotation_transfer_ledgers",
  "quotation_transfer_source_rows",
] as const);
/** Finance rows inherit their tenant scope from the parent quotation. */
export const DATABASE_FINANCE_QUOTATION_RLS_TABLES = Object.freeze(['cost_components', 'quotation_financials'] as const);
/** Pricing, source intelligence, and regulation tables without worker or control-plane access, migrated in 0024 with the CDE policy matrix. */
export const DATABASE_PRICING_REGULATIONS_RLS_TABLES = Object.freeze([
  "price_sources",
  "price_snapshots",
  "source_intelligence_adapters",
  "source_ingestion_runs",
  "source_ingestion_artifacts",
  "source_review_items",
  "regulation_versions",
  "regulation_alerts",
] as const);
/** Allplan learner tables without worker or control-plane access, migrated in 0025 with the CDE policy matrix. */
export const DATABASE_ALLPLAN_LEARNER_RLS_TABLES = Object.freeze([
  "allplan_lesson_progress",
  "allplan_lesson_activity",
  "allplan_lesson_notes",
  "allplan_lesson_bookmarks",
  "allplan_checkpoint_attempts",
  "allplan_exam_attempts",
  "allplan_certificate_audit_logs",
] as const);
/** Academy control-plane and certificate tables migrated in 0026 with FORCE RLS. */
export const DATABASE_ACADEMY_CONTROL_RLS_TABLES = Object.freeze([
  "allplan_certificates",
  "academy_enrollments",
  "academy_learner_profiles",
  "academy_activation_events",
  "academy_enrollment_audit_logs",
  "academy_payment_events",
] as const);
/** SmartCheck document and worker pipeline tables migrated in 0027 with FORCE RLS. */
export const DATABASE_SMARTCHECK_PIPELINE_RLS_TABLES = Object.freeze([
  "documents",
  "document_processing_runs",
  "document_processing_artifacts",
  "normalized_quantity_rows",
] as const);
/** Authority, audit, and quota counter tables with company_id/target_company_id/provisioned_company_id governed by exact role ACLs (S5). */
export const DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES = Object.freeze([
  "memberships",
  "invitations",
  "pilot_applications",
  "admin_audit_logs",
  "usage_records",
] as const);
export const DATABASE_PUBLIC_RESTRICTED_TABLE_ACL = Object.freeze({
  tenant_price_source_review_invalidations: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  global_price_source_review_events: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  admin_mfa_accounts: Object.freeze({ bimmetraj_app: Object.freeze([]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  admin_mfa_challenges: Object.freeze({ bimmetraj_app: Object.freeze([]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  revoked_sessions: Object.freeze({ bimmetraj_app: Object.freeze([]), bimmetraj_control: Object.freeze(["SELECT"]), bimmetraj_worker: Object.freeze([]) }),
  worker_process_heartbeats: Object.freeze({ bimmetraj_app: Object.freeze([]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  companies: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  subscriptions: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  plans: Object.freeze({ bimmetraj_app: Object.freeze(["SELECT"]), bimmetraj_control: Object.freeze(["INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  usage_logs: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT"]), bimmetraj_worker: Object.freeze([]) }),
  leads: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  pilot_applications: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_worker: Object.freeze([]) }),
  usage_records: Object.freeze({ bimmetraj_app: Object.freeze(["INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze(["SELECT"]), bimmetraj_worker: Object.freeze(["INSERT", "SELECT", "UPDATE"]) }),
  rate_limit_buckets: Object.freeze({ bimmetraj_app: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  cost_components: Object.freeze({ bimmetraj_app: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  quotation_financials: Object.freeze({ bimmetraj_app: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze([]) }),
  pricing_data_sources: Object.freeze({ bimmetraj_app: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze(["SELECT", "UPDATE"]) }),
  price_feed_staging: Object.freeze({ bimmetraj_app: Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]), bimmetraj_control: Object.freeze([]), bimmetraj_worker: Object.freeze(["INSERT", "SELECT", "UPDATE"]) }),
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
  bimmetraj_lock_tenant_member: priceReviewProtection.find((sql) => sql.startsWith("CREATE FUNCTION public.bimmetraj_lock_tenant_member("))!.split("$function$")[1],
  bimmetraj_invalidate_price_review: priceReviewProtection.find((sql) => sql.startsWith("CREATE FUNCTION public.bimmetraj_invalidate_price_review()"))!.split("$function$")[1],
  bimmetraj_lock_price_reviewer: `
DECLARE permitted boolean;
BEGIN
  IF session_user <> 'bimmetraj_app' OR current_setting('bimmetraj.user_id', true) IS DISTINCT FROM p_user_id::text OR current_setting('bimmetraj.company_id', true) IS DISTINCT FROM p_company_id::text THEN RAISE EXCEPTION 'tenant context required' USING ERRCODE = '42501'; END IF;
  SELECT u.email_verified IS NOT NULL AND m.role IN ('owner', 'admin') INTO permitted FROM public.memberships m JOIN public.users u ON u.id=m.user_id WHERE m.user_id=p_user_id AND m.company_id=p_company_id FOR SHARE OF m,u;
  RETURN coalesce(permitted, false);
END `,
  bimmetraj_lock_global_price_reviewer: `
DECLARE permitted boolean;
BEGIN
  IF session_user <> 'bimmetraj_app' THEN RAISE EXCEPTION 'application role required' USING ERRCODE = '42501'; END IF;
  SELECT u.is_super_admin AND u.email_verified IS NOT NULL INTO permitted FROM public.users u WHERE u.id=p_user_id FOR SHARE OF u;
  RETURN coalesce(permitted, false);
END `,
  bimmetraj_revoke_session: `
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' OR p_user_id IS NULL OR p_expires_at IS NULL THEN RAISE EXCEPTION 'invalid session revocation' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.revoked_sessions(token_hash,user_id,expires_at) VALUES (p_token_hash,p_user_id,p_expires_at)
    ON CONFLICT (token_hash) DO UPDATE SET expires_at = GREATEST(public.revoked_sessions.expires_at, EXCLUDED.expires_at);
END `,
  bimmetraj_cleanup_revoked_sessions: `
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.revoked_sessions WHERE token_hash IN (SELECT token_hash FROM public.revoked_sessions WHERE expires_at < clock_timestamp() - interval '7 days' ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED);
END `,
  bimmetraj_worker_heartbeat: `
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN RAISE EXCEPTION 'worker role required' USING ERRCODE = '42501'; END IF;
  -- Serialize quota checks across processes using the shared worker identity.
  PERFORM pg_advisory_xact_lock(hashtext('bimmetraj.worker_heartbeat.quota'));
  DELETE FROM public.worker_process_heartbeats WHERE seen_at < clock_timestamp() - interval '1 day';
  IF EXISTS (SELECT 1 FROM public.worker_process_heartbeats WHERE instance_id = p_id AND kind <> p_kind) THEN
    RAISE EXCEPTION 'heartbeat kind mismatch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.worker_process_heartbeats WHERE instance_id = p_id AND seen_at > clock_timestamp() - interval '10 seconds') THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.worker_process_heartbeats WHERE instance_id = p_id) THEN
    IF (SELECT count(*) FROM public.worker_process_heartbeats WHERE kind = p_kind) >= 32 THEN
      DELETE FROM public.worker_process_heartbeats WHERE instance_id = (
        SELECT instance_id FROM public.worker_process_heartbeats WHERE kind = p_kind AND seen_at < clock_timestamp() - interval '90 seconds' ORDER BY seen_at LIMIT 1
      );
    END IF;
    IF (SELECT count(*) FROM public.worker_process_heartbeats WHERE kind = p_kind) >= 32 THEN
      RAISE EXCEPTION 'heartbeat instance quota reached' USING ERRCODE = '54000';
    END IF;
  END IF;
  INSERT INTO public.worker_process_heartbeats(instance_id, kind, revision, revision_source, seen_at)
    VALUES (p_id, p_kind, p_revision, p_revision_source, clock_timestamp())
    ON CONFLICT (instance_id) DO UPDATE SET revision = EXCLUDED.revision, revision_source = EXCLUDED.revision_source, seen_at = clock_timestamp();
END `,
  bimmetraj_worker_heartbeat_summary: `
BEGIN
  IF session_user <> 'bimmetraj_control' THEN RAISE EXCEPTION 'control role required' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT kinds.kind, latest.seen_at, (SELECT count(*) FROM public.worker_process_heartbeats h WHERE h.kind = kinds.kind AND h.seen_at >= clock_timestamp() - interval '90 seconds'), latest.revision, latest.revision_source
    FROM (VALUES ('worker'::text), ('ifc-worker'::text)) kinds(kind)
    LEFT JOIN LATERAL (SELECT h.seen_at, h.revision, h.revision_source FROM public.worker_process_heartbeats h WHERE h.kind = kinds.kind ORDER BY h.seen_at DESC LIMIT 1) latest ON true;
END `,
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
  bimmetraj_worker_get_entitlement: `
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN
    RAISE EXCEPTION 'Worker entitlement function requires the worker session role' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_company_id),
      subscription.status::text,
      subscription.current_period_end,
      subscription.plan_id,
      plan.is_active,
      plan.monthly_ifc_limit,
      plan.ifc_max_file_mb,
      plan.ifc_max_concurrent
    FROM (SELECT 1) anchor
    LEFT JOIN public.subscriptions subscription ON subscription.company_id = p_company_id
    LEFT JOIN public.plans plan ON plan.id = subscription.plan_id;
END;
`,
  bimmetraj_worker_get_company_context: `
BEGIN
  IF session_user <> 'bimmetraj_worker' THEN
    RAISE EXCEPTION 'Worker company context function requires the worker session role' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_company_id),
      company.active_standard,
      company.smartcheck_max_waste_percent
    FROM public.companies company
    WHERE company.id = p_company_id;
END;
`,
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
