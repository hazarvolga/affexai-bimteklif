ALTER TABLE "document_processing_artifacts" ADD CONSTRAINT "document_processing_artifacts_id_company_run_document_key" UNIQUE("id","company_id","processing_run_id","document_id");
--> statement-breakpoint
CREATE TABLE "cde_containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"container_code" text NOT NULL,
	"title" text NOT NULL,
	"current_state" text DEFAULT 'WIP' NOT NULL,
	"current_revision_id" uuid,
	"current_scope_hash" text,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cde_containers_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "cde_containers_id_company_project_key" UNIQUE("id","company_id","project_id"),
	CONSTRAINT "cde_containers_project_code_key" UNIQUE("company_id","project_id","container_code"),
	CONSTRAINT "cde_containers_state_check" CHECK ("cde_containers"."current_state" in ('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED')),
	CONSTRAINT "cde_containers_lock_version_check" CHECK ("cde_containers"."lock_version" >= 0),
	CONSTRAINT "cde_containers_scope_hash_check" CHECK ("cde_containers"."current_scope_hash" IS NULL OR "cde_containers"."current_scope_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "cde_project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_role" text NOT NULL,
	"discipline" text NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cde_project_members_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "cde_project_members_project_user_key" UNIQUE("company_id","project_id","user_id"),
	CONSTRAINT "cde_project_members_role_check" CHECK ("cde_project_members"."project_role" in ('coordinator', 'approver', 'contributor', 'viewer')),
	CONSTRAINT "cde_project_members_discipline_check" CHECK ("cde_project_members"."discipline" in ('ARC', 'STR', 'MEP', 'COST', 'QA', 'BIM'))
);

--> statement-breakpoint
CREATE TABLE "cde_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cde_projects_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "cde_projects_id_company_document_key" UNIQUE("id","company_id","document_id"),
	CONSTRAINT "cde_projects_company_document_key" UNIQUE("company_id","document_id")
);

--> statement-breakpoint
CREATE TABLE "cde_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"container_id" uuid NOT NULL,
	"supersedes_revision_id" uuid,
	"document_id" uuid NOT NULL,
	"processing_run_id" uuid NOT NULL,
	"result_artifact_id" uuid NOT NULL,
	"revision_code" text NOT NULL,
	"document_checksum_sha256" text NOT NULL,
	"source_hash" text NOT NULL,
	"rule_hash" text NOT NULL,
	"result_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"scope_hash" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cde_revisions_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "cde_revisions_id_company_container_key" UNIQUE("id","company_id","container_id"),
	CONSTRAINT "cde_revisions_container_scope_key" UNIQUE("company_id","container_id","scope_hash"),
	CONSTRAINT "cde_revisions_hashes_check" CHECK ("cde_revisions"."document_checksum_sha256" ~ '^[0-9a-f]{64}$' AND "cde_revisions"."source_hash" ~ '^[0-9a-f]{64}$' AND "cde_revisions"."rule_hash" ~ '^[0-9a-f]{64}$' AND "cde_revisions"."result_hash" ~ '^[0-9a-f]{64}$' AND "cde_revisions"."code_hash" ~ '^[0-9a-f]{64}$' AND "cde_revisions"."scope_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "cde_transition_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"container_id" uuid NOT NULL,
	"revision_id" uuid,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"action" text NOT NULL,
	"decision" text NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text,
	"suitability_code" text,
	"revision_code" text,
	"scope_hash" text,
	"expected_version" integer NOT NULL,
	"resulting_version" integer NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_project_role" text NOT NULL,
	"actor_discipline" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cde_transition_events_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "cde_transition_events_idempotency_key" UNIQUE("company_id","container_id","idempotency_key"),
	CONSTRAINT "cde_transition_events_action_check" CHECK ("cde_transition_events"."action" in ('scope_created', 'approve', 'reject', 'withdraw')),
	CONSTRAINT "cde_transition_events_decision_check" CHECK ("cde_transition_events"."decision" in ('accepted', 'rejected', 'invalidated')),
	CONSTRAINT "cde_transition_events_discipline_check" CHECK ("cde_transition_events"."actor_discipline" in ('ARC', 'STR', 'MEP', 'COST', 'QA', 'BIM')),
	CONSTRAINT "cde_transition_events_role_check" CHECK ("cde_transition_events"."actor_project_role" in ('coordinator', 'approver', 'contributor', 'viewer')),
	CONSTRAINT "cde_transition_events_states_check" CHECK ("cde_transition_events"."from_state" in ('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED') AND ("cde_transition_events"."to_state" IS NULL OR "cde_transition_events"."to_state" in ('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED'))),
	CONSTRAINT "cde_transition_events_request_hash_check" CHECK ("cde_transition_events"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "cde_transition_events_versions_check" CHECK ("cde_transition_events"."expected_version" >= 0 AND "cde_transition_events"."resulting_version" >= "cde_transition_events"."expected_version")
);

--> statement-breakpoint
ALTER TABLE "cde_containers" ADD CONSTRAINT "cde_containers_project_id_company_id_cde_projects_id_company_id_fk" FOREIGN KEY ("project_id","company_id") REFERENCES "public"."cde_projects"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_containers" ADD CONSTRAINT "cde_containers_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_project_members" ADD CONSTRAINT "cde_project_members_project_id_company_id_cde_projects_id_company_id_fk" FOREIGN KEY ("project_id","company_id") REFERENCES "public"."cde_projects"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_project_members" ADD CONSTRAINT "cde_project_members_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_project_members" ADD CONSTRAINT "cde_project_members_assigned_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("assigned_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_projects" ADD CONSTRAINT "cde_projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_projects" ADD CONSTRAINT "cde_projects_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_projects" ADD CONSTRAINT "cde_projects_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ADD CONSTRAINT "cde_revisions_project_id_company_id_document_id_cde_projects_id_company_id_document_id_fk" FOREIGN KEY ("project_id","company_id","document_id") REFERENCES "public"."cde_projects"("id","company_id","document_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ADD CONSTRAINT "cde_revisions_container_id_company_id_project_id_cde_containers_id_company_id_project_id_fk" FOREIGN KEY ("container_id","company_id","project_id") REFERENCES "public"."cde_containers"("id","company_id","project_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ADD CONSTRAINT "cde_revisions_supersedes_revision_id_company_id_container_id_cde_revisions_id_company_id_container_id_fk" FOREIGN KEY ("supersedes_revision_id","company_id","container_id") REFERENCES "public"."cde_revisions"("id","company_id","container_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ADD CONSTRAINT "cde_revisions_processing_run_id_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("processing_run_id","document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ADD CONSTRAINT "cde_revisions_result_artifact_id_company_id_processing_run_id_document_id_document_processing_artifacts_id_company_id_processing_run_id_document_id_fk" FOREIGN KEY ("result_artifact_id","company_id","processing_run_id","document_id") REFERENCES "public"."document_processing_artifacts"("id","company_id","processing_run_id","document_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ADD CONSTRAINT "cde_revisions_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_transition_events" ADD CONSTRAINT "cde_transition_events_project_id_company_id_cde_projects_id_company_id_fk" FOREIGN KEY ("project_id","company_id") REFERENCES "public"."cde_projects"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_transition_events" ADD CONSTRAINT "cde_transition_events_container_id_company_id_project_id_cde_containers_id_company_id_project_id_fk" FOREIGN KEY ("container_id","company_id","project_id") REFERENCES "public"."cde_containers"("id","company_id","project_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_transition_events" ADD CONSTRAINT "cde_transition_events_revision_id_company_id_container_id_cde_revisions_id_company_id_container_id_fk" FOREIGN KEY ("revision_id","company_id","container_id") REFERENCES "public"."cde_revisions"("id","company_id","container_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cde_transition_events" ADD CONSTRAINT "cde_transition_events_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_cde_containers_project" ON "cde_containers" USING btree ("company_id","project_id");
--> statement-breakpoint
CREATE INDEX "idx_cde_projects_document" ON "cde_projects" USING btree ("company_id","document_id");
--> statement-breakpoint
CREATE INDEX "idx_cde_revisions_container" ON "cde_revisions" USING btree ("company_id","container_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_cde_transition_events_history" ON "cde_transition_events" USING btree ("company_id","container_id","created_at");
--> statement-breakpoint
ALTER TABLE "cde_containers"
ADD CONSTRAINT "cde_containers_current_revision_company_fk"
FOREIGN KEY ("current_revision_id", "company_id", "id")
REFERENCES "public"."cde_revisions"("id", "company_id", "container_id")
ON DELETE RESTRICT ON UPDATE NO ACTION
--> statement-breakpoint
CREATE FUNCTION prevent_cde_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$
--> statement-breakpoint
CREATE TRIGGER cde_transition_events_append_only
BEFORE UPDATE OR DELETE ON cde_transition_events
FOR EACH ROW EXECUTE FUNCTION prevent_cde_ledger_mutation()
--> statement-breakpoint
CREATE TRIGGER cde_revisions_append_only
BEFORE UPDATE OR DELETE ON cde_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_cde_ledger_mutation()
--> statement-breakpoint
CREATE FUNCTION prevent_cde_bound_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'document_processing_artifacts' AND EXISTS (
    SELECT 1 FROM cde_revisions WHERE result_artifact_id = OLD.id AND company_id = OLD.company_id
  ) THEN RAISE EXCEPTION 'CDE-bound evidence artifact is immutable';
  ELSIF TG_TABLE_NAME = 'document_processing_runs' AND EXISTS (
    SELECT 1 FROM cde_revisions WHERE processing_run_id = OLD.id AND company_id = OLD.company_id
  ) THEN RAISE EXCEPTION 'CDE-bound processing run is immutable';
  ELSIF TG_TABLE_NAME = 'documents' AND EXISTS (
    SELECT 1 FROM cde_revisions WHERE document_id = OLD.id AND company_id = OLD.company_id
  ) THEN RAISE EXCEPTION 'CDE-bound document identity is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER cde_bound_artifact_immutable BEFORE UPDATE OR DELETE ON document_processing_artifacts FOR EACH ROW EXECUTE FUNCTION prevent_cde_bound_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER cde_bound_run_immutable BEFORE UPDATE OF idempotency_key, pipeline_version, provider, model, status OR DELETE ON document_processing_runs FOR EACH ROW EXECUTE FUNCTION prevent_cde_bound_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER cde_bound_document_immutable BEFORE UPDATE OF checksum_sha256, storage_key OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_cde_bound_evidence_mutation()
