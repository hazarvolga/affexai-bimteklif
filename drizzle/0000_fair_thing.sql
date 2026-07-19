ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_company_id_key" UNIQUE("user_id", "company_id");
--> statement-breakpoint

ALTER TABLE "quotations" ADD CONSTRAINT "quotations_id_company_id_key" UNIQUE("id", "company_id");
--> statement-breakpoint

ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_id_company_id_key" UNIQUE("id", "company_id");
--> statement-breakpoint

ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_id_quotation_id_company_id_key" UNIQUE("id", "quotation_id", "company_id");
--> statement-breakpoint

ALTER TABLE "usage_logs" ADD COLUMN "document_processing_run_id" uuid;
--> statement-breakpoint

CREATE TYPE "public"."competency_signal_status" AS ENUM('observing', 'suggested', 'manager_confirmed', 'dismissed', 'resolved');
--> statement-breakpoint

CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'queued', 'processing', 'awaiting_review', 'completed', 'failed', 'cancelled', 'archived');
--> statement-breakpoint

CREATE TYPE "public"."error_category" AS ENUM('classification_code', 'quantity_unit', 'modeling_standard', 'missing_duplicate', 'pricing_margin');
--> statement-breakpoint

CREATE TYPE "public"."finding_status" AS ENUM('open', 'in_progress', 'resolved', 'disputed', 'accepted_exception', 'rejected');
--> statement-breakpoint

CREATE TYPE "public"."processing_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');
--> statement-breakpoint

CREATE TYPE "public"."processing_stage" AS ENUM('queued', 'parsing', 'extracting_rules', 'consolidating', 'preparing_review', 'completed', 'failed', 'cancelled');
--> statement-breakpoint

CREATE TYPE "public"."resource_type" AS ENUM('inline_guide', 'checklist', 'example', 'document', 'image', 'video', 'external_link');
--> statement-breakpoint

CREATE TYPE "public"."review_session_status" AS ENUM('draft', 'submitted', 'in_progress', 'completed', 'cancelled', 'reopened');
--> statement-breakpoint

CREATE TYPE "public"."rule_candidate_status" AS ENUM('draft', 'in_review', 'approved', 'rejected', 'deferred', 'merged');
--> statement-breakpoint

CREATE TYPE "public"."rule_scope_type" AS ENUM('company', 'quotation');
--> statement-breakpoint

CREATE TYPE "public"."rule_status" AS ENUM('draft', 'active', 'inactive', 'archived');
--> statement-breakpoint

CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');
--> statement-breakpoint

CREATE TABLE "assistance_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"estimated_duration_seconds" integer DEFAULT 180 NOT NULL,
	"error_category" "error_category" NOT NULL,
	"competency_area" text NOT NULL,
	"content_body" text,
	"external_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistance_resources_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "assistance_resources_estimated_duration_seconds_check" CHECK ("assistance_resources"."estimated_duration_seconds" >= 0),
	CONSTRAINT "assistance_resources_content_or_url_check" CHECK ("assistance_resources"."content_body" IS NOT NULL OR "assistance_resources"."external_url" IS NOT NULL)
);
--> statement-breakpoint

CREATE TABLE "competency_signal_evidence" (
	"company_id" uuid NOT NULL,
	"competency_signal_id" uuid NOT NULL,
	"review_finding_id" uuid NOT NULL,
	"observed_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competency_signal_evidence_company_id_competency_signal_id_review_finding_id_pk" PRIMARY KEY("company_id","competency_signal_id","review_finding_id")
);
--> statement-breakpoint

CREATE TABLE "competency_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_id" uuid,
	"error_category" "error_category" NOT NULL,
	"competency_area" text NOT NULL,
	"evidence_count" integer DEFAULT 1 NOT NULL,
	"distinct_quotation_count" integer DEFAULT 1 NOT NULL,
	"distinct_review_round_count" integer DEFAULT 1 NOT NULL,
	"signal_fingerprint" text NOT NULL,
	"first_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "competency_signal_status" DEFAULT 'observing' NOT NULL,
	"manager_reviewed_by_user_id" uuid,
	"manager_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competency_signals_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "competency_signals_id_user_id_company_id_key" UNIQUE("id","user_id","company_id"),
	CONSTRAINT "competency_signals_fingerprint_key" UNIQUE("company_id","user_id","signal_fingerprint"),
	CONSTRAINT "competency_signals_evidence_count_check" CHECK ("competency_signals"."evidence_count" >= 0),
	CONSTRAINT "competency_signals_distinct_quotation_count_check" CHECK ("competency_signals"."distinct_quotation_count" >= 0),
	CONSTRAINT "competency_signals_distinct_review_round_count_check" CHECK ("competency_signals"."distinct_review_round_count" >= 0)
);
--> statement-breakpoint

CREATE TABLE "document_processing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"status" "processing_run_status" DEFAULT 'queued' NOT NULL,
	"current_stage" "processing_stage" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"pipeline_version" integer DEFAULT 1 NOT NULL,
	"provider" text,
	"model" text,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"progress_message" text,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_processing_runs_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "document_processing_runs_id_document_id_company_id_key" UNIQUE("id","document_id","company_id"),
	CONSTRAINT "document_processing_runs_company_id_document_id_idem_key" UNIQUE("company_id","document_id","idempotency_key"),
	CONSTRAINT "document_processing_runs_pipeline_version_check" CHECK ("document_processing_runs"."pipeline_version" > 0),
	CONSTRAINT "document_processing_runs_progress_percent_check" CHECK ("document_processing_runs"."progress_percent" >= 0 AND "document_processing_runs"."progress_percent" <= 100)
);
--> statement-breakpoint

CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"original_file_name" text NOT NULL,
	"display_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "documents_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "documents_file_size_bytes_check" CHECK ("documents"."file_size_bytes" > 0),
	CONSTRAINT "documents_archive_consistency_check" CHECK (("documents"."status" = 'archived' AND "documents"."archived_at" IS NOT NULL) OR ("documents"."status" != 'archived' AND "documents"."archived_at" IS NULL))
);
--> statement-breakpoint

CREATE TABLE "review_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"review_session_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_item_id" uuid NOT NULL,
	"rule_id" uuid,
	"reported_by_user_id" uuid NOT NULL,
	"error_category" "error_category" NOT NULL,
	"severity" "severity" NOT NULL,
	"details" text NOT NULL,
	"original_value" text NOT NULL,
	"corrected_value" text,
	"status" "finding_status" DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_findings_id_company_id_key" UNIQUE("id","company_id")
);
--> statement-breakpoint

CREATE TABLE "review_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"status" "review_session_status" DEFAULT 'draft' NOT NULL,
	"assigned_to_user_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"total_findings_count" integer DEFAULT 0 NOT NULL,
	"open_findings_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_sessions_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "review_sessions_id_quotation_id_company_id_key" UNIQUE("id","quotation_id","company_id"),
	CONSTRAINT "review_sessions_total_findings_check" CHECK ("review_sessions"."total_findings_count" >= 0),
	CONSTRAINT "review_sessions_open_findings_check" CHECK ("review_sessions"."open_findings_count" >= 0)
);
--> statement-breakpoint

CREATE TABLE "rule_assistance_resources" (
	"rule_id" uuid NOT NULL,
	"assistance_resource_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	CONSTRAINT "rule_assistance_resources_rule_id_assistance_resource_id_company_id_pk" PRIMARY KEY("rule_id","assistance_resource_id","company_id")
);
--> statement-breakpoint

CREATE TABLE "rule_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"processing_run_id" uuid NOT NULL,
	"quotation_id" uuid,
	"rule_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"original_text_evidence" text NOT NULL,
	"severity" "severity" NOT NULL,
	"error_category" "error_category" NOT NULL,
	"competency_area" text NOT NULL,
	"suggested_action" text NOT NULL,
	"confidence_score" numeric(3, 2) NOT NULL,
	"source_evidence_json" jsonb NOT NULL,
	"status" "rule_candidate_status" DEFAULT 'draft' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"rejection_reason" text,
	"deferred_until" timestamp with time zone,
	"is_system_rule" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_candidates_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "rule_candidates_confidence_check" CHECK ("rule_candidates"."confidence_score" >= 0.00 AND "rule_candidates"."confidence_score" <= 1.00)
);
--> statement-breakpoint

CREATE TABLE "rule_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"rule_code" text NOT NULL,
	"scope" "rule_scope_type" NOT NULL,
	"quotation_id" uuid,
	"status" "rule_status" DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"deactivation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_registry_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "rule_registry_current_version_check" CHECK ("rule_registry"."current_version" > 0),
	CONSTRAINT "rule_registry_scope_consistency_check" CHECK (("rule_registry"."scope" = 'quotation' AND "rule_registry"."quotation_id" IS NOT NULL) OR ("rule_registry"."scope" = 'company' AND "rule_registry"."quotation_id" IS NULL))
);
--> statement-breakpoint

CREATE TABLE "rule_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" "severity" NOT NULL,
	"error_category" "error_category" NOT NULL,
	"competency_area" text NOT NULL,
	"suggested_action" text NOT NULL,
	"canonical_statement" text NOT NULL,
	"structured_condition_json" jsonb NOT NULL,
	"source_evidence_json" jsonb NOT NULL,
	"source_candidate_id" uuid,
	"change_log" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_versions_company_id_rule_id_version_key" UNIQUE("company_id","rule_id","version"),
	CONSTRAINT "rule_versions_version_check" CHECK ("rule_versions"."version" > 0)
);
--> statement-breakpoint

ALTER TABLE "assistance_resources" ADD CONSTRAINT "assistance_resources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "assistance_resources" ADD CONSTRAINT "assistance_resources_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "competency_signal_evidence" ADD CONSTRAINT "competency_signal_evidence_competency_signal_id_observed_user_id_company_id_competency_signals_id_user_id_company_id_fk" FOREIGN KEY ("competency_signal_id","observed_user_id","company_id") REFERENCES "public"."competency_signals"("id","user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "competency_signal_evidence" ADD CONSTRAINT "competency_signal_evidence_review_finding_id_company_id_review_findings_id_company_id_fk" FOREIGN KEY ("review_finding_id","company_id") REFERENCES "public"."review_findings"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "competency_signals" ADD CONSTRAINT "competency_signals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "competency_signals" ADD CONSTRAINT "competency_signals_rule_id_company_id_rule_registry_id_company_id_fk" FOREIGN KEY ("rule_id","company_id") REFERENCES "public"."rule_registry"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "competency_signals" ADD CONSTRAINT "competency_signals_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "competency_signals" ADD CONSTRAINT "competency_signals_manager_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("manager_reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "document_processing_runs" ADD CONSTRAINT "document_processing_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "document_processing_runs" ADD CONSTRAINT "document_processing_runs_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("uploaded_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_findings" ADD CONSTRAINT "review_findings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_findings" ADD CONSTRAINT "review_findings_review_session_id_quotation_id_company_id_review_sessions_id_quotation_id_company_id_fk" FOREIGN KEY ("review_session_id","quotation_id","company_id") REFERENCES "public"."review_sessions"("id","quotation_id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_findings" ADD CONSTRAINT "review_findings_quotation_item_id_quotation_id_company_id_quotation_items_id_quotation_id_company_id_fk" FOREIGN KEY ("quotation_item_id","quotation_id","company_id") REFERENCES "public"."quotation_items"("id","quotation_id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_findings" ADD CONSTRAINT "review_findings_rule_id_company_id_rule_registry_id_company_id_fk" FOREIGN KEY ("rule_id","company_id") REFERENCES "public"."rule_registry"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_findings" ADD CONSTRAINT "review_findings_reported_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reported_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_findings" ADD CONSTRAINT "review_findings_resolved_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("resolved_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_assigned_to_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("assigned_to_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_assistance_resources" ADD CONSTRAINT "rule_assistance_resources_rule_id_company_id_rule_registry_id_company_id_fk" FOREIGN KEY ("rule_id","company_id") REFERENCES "public"."rule_registry"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_assistance_resources" ADD CONSTRAINT "rule_assistance_resources_assistance_resource_id_company_id_assistance_resources_id_company_id_fk" FOREIGN KEY ("assistance_resource_id","company_id") REFERENCES "public"."assistance_resources"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_candidates" ADD CONSTRAINT "rule_candidates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_candidates" ADD CONSTRAINT "rule_candidates_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_candidates" ADD CONSTRAINT "rule_candidates_processing_run_id_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("processing_run_id","document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_candidates" ADD CONSTRAINT "rule_candidates_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_candidates" ADD CONSTRAINT "rule_candidates_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_registry" ADD CONSTRAINT "rule_registry_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_registry" ADD CONSTRAINT "rule_registry_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_registry" ADD CONSTRAINT "rule_registry_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_registry" ADD CONSTRAINT "rule_registry_approved_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("approved_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_rule_id_company_id_rule_registry_id_company_id_fk" FOREIGN KEY ("rule_id","company_id") REFERENCES "public"."rule_registry"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_source_candidate_id_company_id_rule_candidates_id_company_id_fk" FOREIGN KEY ("source_candidate_id","company_id") REFERENCES "public"."rule_candidates"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_document_processing_run_id_company_id_document_processing_runs_id_company_id_fk" FOREIGN KEY ("document_processing_run_id","company_id") REFERENCES "public"."document_processing_runs"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_assistance_resources_active" ON "assistance_resources" USING btree ("company_id","is_active");
--> statement-breakpoint

CREATE INDEX "idx_competency_signals_user" ON "competency_signals" USING btree ("company_id","user_id","status");
--> statement-breakpoint

CREATE INDEX "idx_processing_runs_lookup" ON "document_processing_runs" USING btree ("company_id","document_id","status");
--> statement-breakpoint

CREATE INDEX "idx_documents_company_status" ON "documents" USING btree ("company_id","status");
--> statement-breakpoint

CREATE INDEX "idx_review_findings_lookup" ON "review_findings" USING btree ("company_id","review_session_id");
--> statement-breakpoint

CREATE INDEX "idx_review_sessions_lookup" ON "review_sessions" USING btree ("company_id","quotation_id","status");
--> statement-breakpoint

CREATE INDEX "idx_review_sessions_assignee" ON "review_sessions" USING btree ("company_id","assigned_to_user_id","status");
--> statement-breakpoint

CREATE INDEX "idx_rule_candidates_lookup" ON "rule_candidates" USING btree ("company_id","document_id","status");
--> statement-breakpoint

CREATE INDEX "idx_rule_registry_lookup" ON "rule_registry" USING btree ("company_id","status");
--> statement-breakpoint

CREATE INDEX "idx_rule_versions_lookup" ON "rule_versions" USING btree ("company_id","rule_id","version");
--> statement-breakpoint

CREATE UNIQUE INDEX "rule_versions_unique_candidate_idx" ON "rule_versions" USING btree ("company_id","source_candidate_id") WHERE "rule_versions"."source_candidate_id" IS NOT NULL;
--> statement-breakpoint

CREATE INDEX "idx_usage_logs_processing_run" ON "usage_logs" USING btree ("company_id","document_processing_run_id");
