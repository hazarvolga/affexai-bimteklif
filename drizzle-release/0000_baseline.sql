CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'quotation_update', 'stage_change', 'note');
--> statement-breakpoint
CREATE TYPE "public"."competency_signal_status" AS ENUM('observing', 'suggested', 'manager_confirmed', 'dismissed', 'resolved');
--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('TRY', 'USD', 'EUR');
--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'queued', 'processing', 'awaiting_review', 'completed', 'failed', 'cancelled', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."error_category" AS ENUM('classification_code', 'quantity_unit', 'modeling_standard', 'missing_duplicate', 'pricing_margin');
--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('open', 'in_progress', 'resolved', 'disputed', 'accepted_exception', 'rejected');
--> statement-breakpoint
CREATE TYPE "public"."impact_level" AS ENUM('low', 'medium', 'high');
--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('lead', 'contacted', 'quotation_sent', 'negotiation', 'won', 'lost');
--> statement-breakpoint
CREATE TYPE "public"."processing_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."processing_stage" AS ENUM('queued', 'parsing', 'normalizing', 'validating', 'awaiting_review', 'extracting_rules', 'consolidating', 'preparing_review', 'completed', 'failed', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'negotiation', 'won', 'lost', 'archived');
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
CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'pro', 'elite', 'enterprise');
--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled');
--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'manager', 'viewer');
--> statement-breakpoint
CREATE TABLE "academy_acquisition_events" (
	"acquisition_id" text PRIMARY KEY NOT NULL,
	"landing_path" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"registered_user_id" uuid,
	"registered_at" timestamp with time zone
);

--> statement-breakpoint
CREATE TABLE "academy_activation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"lesson_slug" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_activation_events_type_check" CHECK ("academy_activation_events"."event_type" in ('registration_completed', 'first_lesson_opened', 'second_lesson_opened', 'learner_active_day', 'structural_early_access_requested'))
);

--> statement-breakpoint
CREATE TABLE "academy_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"access_mode" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_editions_product_version_key" UNIQUE("product_id","version"),
	CONSTRAINT "academy_editions_access_mode_check" CHECK ("academy_editions"."access_mode" in ('free_pilot', 'invited', 'paid'))
);

--> statement-breakpoint
CREATE TABLE "academy_enrollment_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_enrollment_audit_logs_action_check" CHECK ("academy_enrollment_audit_logs"."action" in ('granted', 'extended', 'revoked', 'refunded', 'reactivated'))
);

--> statement-breakpoint
CREATE TABLE "academy_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_enrollments_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "academy_enrollments_user_company_edition_key" UNIQUE("user_id","company_id","edition_id"),
	CONSTRAINT "academy_enrollments_status_check" CHECK ("academy_enrollments"."status" in ('active', 'expired', 'refunded', 'revoked')),
	CONSTRAINT "academy_enrollments_source_check" CHECK ("academy_enrollments"."source" in ('pilot', 'invite', 'purchase', 'admin'))
);

--> statement-breakpoint
CREATE TABLE "academy_learner_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"selected_lesson_slug" text,
	"terms_version" text NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"privacy_version" text NOT NULL,
	"privacy_accepted_at" timestamp with time zone NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent_version" text,
	"marketing_consent_at" timestamp with time zone,
	"acquisition_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "academy_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"payment_reference" text NOT NULL,
	"payload_hash" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_payment_events_provider_event_key" UNIQUE("provider","event_id"),
	CONSTRAINT "academy_payment_events_provider_reference_type_key" UNIQUE("provider","payment_reference","event_type"),
	CONSTRAINT "academy_payment_events_type_check" CHECK ("academy_payment_events"."event_type" in ('academy.purchase.completed', 'academy.purchase.refunded'))
);

--> statement-breakpoint
CREATE TABLE "academy_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_products_code_unique" UNIQUE("code")
);

--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "activity_type" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "allplan_certificate_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_certificate_audit_logs_action_check" CHECK ("allplan_certificate_audit_logs"."action" in ('issued', 'revoked'))
);

--> statement-breakpoint
CREATE TABLE "allplan_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_number" text NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_attempt_id" uuid NOT NULL,
	"program_version" text NOT NULL,
	"holder_name" text NOT NULL,
	"company_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	CONSTRAINT "allplan_certificates_certificate_number_unique" UNIQUE("certificate_number"),
	CONSTRAINT "allplan_certificates_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_certificates_user_company_program_key" UNIQUE("user_id","company_id","program_version"),
	CONSTRAINT "allplan_certificates_status_check" CHECK ("allplan_certificates"."status" in ('active', 'revoked', 'expired'))
);

--> statement-breakpoint
CREATE TABLE "allplan_checkpoint_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"tool" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_checkpoint_attempts_lesson_slug_check" CHECK (length("allplan_checkpoint_attempts"."lesson_slug") between 1 and 180),
	CONSTRAINT "allplan_checkpoint_attempts_tool_check" CHECK ("allplan_checkpoint_attempts"."tool" in ('wall-simulator', 'coordinate-calculator', 'shortcut-trainer', 'reinforcement-estimator'))
);

--> statement-breakpoint
CREATE TABLE "allplan_exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"program_version" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_exam_attempts_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_exam_attempts_score_check" CHECK ("allplan_exam_attempts"."score" between 0 and 100)
);

--> statement-breakpoint
CREATE TABLE "allplan_lesson_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_activity_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_activity_user_company_lesson_key" UNIQUE("user_id","company_id","lesson_slug"),
	CONSTRAINT "allplan_lesson_activity_lesson_slug_check" CHECK (length("allplan_lesson_activity"."lesson_slug") between 1 and 180),
	CONSTRAINT "allplan_lesson_activity_seconds_check" CHECK ("allplan_lesson_activity"."active_seconds" >= 0)
);

--> statement-breakpoint
CREATE TABLE "allplan_lesson_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_bookmarks_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_bookmarks_user_company_lesson_key" UNIQUE("user_id","company_id","lesson_slug"),
	CONSTRAINT "allplan_lesson_bookmarks_lesson_slug_check" CHECK (length("allplan_lesson_bookmarks"."lesson_slug") between 1 and 180)
);

--> statement-breakpoint
CREATE TABLE "allplan_lesson_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_notes_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_notes_lesson_slug_check" CHECK (length("allplan_lesson_notes"."lesson_slug") between 1 and 180),
	CONSTRAINT "allplan_lesson_notes_body_check" CHECK (length("allplan_lesson_notes"."body") between 1 and 5000)
);

--> statement-breakpoint
CREATE TABLE "allplan_lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"completed_at" timestamp with time zone,
	"checkpoint_completed_at" timestamp with time zone,
	"checkpoint_evidence" jsonb,
	"checkpoint_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_progress_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_progress_user_company_lesson_key" UNIQUE("user_id","company_id","lesson_slug"),
	CONSTRAINT "allplan_lesson_progress_lesson_slug_check" CHECK (length("allplan_lesson_progress"."lesson_slug") between 1 and 180)
);

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
CREATE TABLE "auth_action_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_action_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_action_tokens_type_check" CHECK ("auth_action_tokens"."type" in ('verify_email', 'reset_password'))
);

--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"pipeline_stage" "pipeline_stage" DEFAULT 'lead' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"tax_number" text,
	"tax_office" text,
	"address" text,
	"signature_url" text,
	"stamp_url" text,
	"default_currency" "currency" DEFAULT 'TRY' NOT NULL,
	"default_vat_rate" integer DEFAULT 20 NOT NULL,
	"smartcheck_max_waste_percent" numeric(5, 2) DEFAULT '20' NOT NULL,
	"default_escalation_volatility_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"default_carbon_risk_premium_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"default_information_delivery_cost_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "company_industry_settings" (
	"company_id" uuid NOT NULL,
	"industry_id" text NOT NULL,
	"preferred_model" text DEFAULT 'balanced',
	"custom_rules" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "company_industry_settings_company_id_industry_id_pk" PRIMARY KEY("company_id","industry_id")
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
CREATE TABLE "cost_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"material_cost" numeric(20, 2) DEFAULT '0',
	"labor_cost" numeric(20, 2) DEFAULT '0',
	"logistics_cost" numeric(20, 2) DEFAULT '0',
	"subcontractor_cost" numeric(20, 2) DEFAULT '0',
	"overhead_cost" numeric(20, 2) DEFAULT '0',
	CONSTRAINT "cost_components_quotation_id_unique" UNIQUE("quotation_id")
);

--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"quotation_id" uuid,
	"name" text NOT NULL,
	"stage" "pipeline_stage" DEFAULT 'lead' NOT NULL,
	"value" numeric(20, 2) DEFAULT '0',
	"probability" numeric(5, 2) DEFAULT '0',
	"expected_close_date" timestamp,
	"risk_level" text DEFAULT 'low',
	"ai_insights" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "document_processing_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"processing_run_id" uuid NOT NULL,
	"artifact_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_processing_artifacts_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "document_processing_artifacts_run_type_key" UNIQUE("company_id","processing_run_id","artifact_type"),
	CONSTRAINT "document_processing_artifacts_size_check" CHECK ("document_processing_artifacts"."size_bytes" >= 0)
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
	"import_mapping_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "documents_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "documents_file_size_bytes_check" CHECK ("documents"."file_size_bytes" > 0),
	CONSTRAINT "documents_archive_consistency_check" CHECK (("documents"."status" = 'archived' AND "documents"."archived_at" IS NOT NULL) OR ("documents"."status" != 'archived' AND "documents"."archived_at" IS NULL))
);

--> statement-breakpoint
CREATE TABLE "industries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config_json" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);

--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);

--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_company_id_key" UNIQUE("user_id","company_id")
);

--> statement-breakpoint
CREATE TABLE "normalized_quantity_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"processing_run_id" uuid NOT NULL,
	"sheet_name" text NOT NULL,
	"source_row_number" integer NOT NULL,
	"source_cell_range" text NOT NULL,
	"raw_description" text,
	"raw_position_code" text,
	"raw_unit" text,
	"raw_quantity" text,
	"raw_price" text,
	"raw_waste_percent" text,
	"formula_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_description" text,
	"normalized_position_code" text,
	"normalized_unit" text,
	"normalized_quantity" numeric(20, 4),
	"normalized_price" numeric(20, 2),
	"normalized_waste_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"quantity_source" text DEFAULT 'document' NOT NULL,
	"price_source" text DEFAULT 'document' NOT NULL,
	"mapping_confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL,
	"findings_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "normalized_quantity_rows_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "normalized_quantity_rows_source_key" UNIQUE("company_id","processing_run_id","sheet_name","source_row_number"),
	CONSTRAINT "normalized_quantity_rows_review_status_check" CHECK ("normalized_quantity_rows"."review_status" in ('pending_review', 'approved', 'accepted_exception', 'rejected')),
	CONSTRAINT "normalized_quantity_rows_confidence_check" CHECK ("normalized_quantity_rows"."mapping_confidence" >= 0 AND "normalized_quantity_rows"."mapping_confidence" <= 1)
);

--> statement-breakpoint
CREATE TABLE "pilot_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"company_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"team_size" text,
	"current_workflow" text,
	"source" text DEFAULT 'website' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"offer_amount" numeric(12, 2),
	"offer_currency" text DEFAULT 'TRY' NOT NULL,
	"offer_sent_at" timestamp,
	"payment_status" text DEFAULT 'not_offered' NOT NULL,
	"paid_at" timestamp,
	"contacted_at" timestamp,
	"qualified_at" timestamp,
	"converted_at" timestamp,
	"consent_at" timestamp NOT NULL,
	"provisioned_company_id" uuid,
	"provisioned_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"price_source_id" uuid NOT NULL,
	"snapshot_key" text NOT NULL,
	"external_reference" text,
	"position_code" text,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"amount" numeric(20, 4) NOT NULL,
	"currency" "currency" DEFAULT 'TRY' NOT NULL,
	"vat_status" text DEFAULT 'unknown' NOT NULL,
	"vat_percent" numeric(5, 2),
	"freight_status" text DEFAULT 'unknown' NOT NULL,
	"region" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_document_hash" text NOT NULL,
	"source_version" text,
	"confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_status" text DEFAULT 'advisory' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_snapshots_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "price_snapshots_company_source_key" UNIQUE("company_id","price_source_id","snapshot_key"),
	CONSTRAINT "price_snapshots_amount_check" CHECK ("price_snapshots"."amount" >= 0),
	CONSTRAINT "price_snapshots_confidence_check" CHECK ("price_snapshots"."confidence" >= 0 AND "price_snapshots"."confidence" <= 1),
	CONSTRAINT "price_snapshots_vat_status_check" CHECK ("price_snapshots"."vat_status" in ('included', 'excluded', 'unknown')),
	CONSTRAINT "price_snapshots_freight_status_check" CHECK ("price_snapshots"."freight_status" in ('included', 'excluded', 'unknown')),
	CONSTRAINT "price_snapshots_review_status_check" CHECK ("price_snapshots"."review_status" in ('draft', 'advisory', 'approved', 'rejected')),
	CONSTRAINT "price_snapshots_validity_check" CHECK ("price_snapshots"."valid_until" IS NULL OR "price_snapshots"."valid_from" IS NULL OR "price_snapshots"."valid_until" >= "price_snapshots"."valid_from"),
	CONSTRAINT "price_snapshots_source_document_hash_check" CHECK (length("price_snapshots"."source_document_hash") >= 16)
);

--> statement-breakpoint
CREATE TABLE "price_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"name" text NOT NULL,
	"authority" text,
	"source_url" text,
	"source_document_identifier" text,
	"source_document_hash" text NOT NULL,
	"license_status" text DEFAULT 'unknown' NOT NULL,
	"jurisdiction" text,
	"region" text,
	"created_by_user_id" uuid NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_sources_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "price_sources_source_type_check" CHECK ("price_sources"."source_type" in ('official_reference', 'supplier_quote', 'company_actual', 'index_adjusted', 'manual_override')),
	CONSTRAINT "price_sources_license_status_check" CHECK ("price_sources"."license_status" in ('unknown', 'verified', 'restricted', 'not_applicable')),
	CONSTRAINT "price_sources_source_document_hash_check" CHECK (length("price_sources"."source_document_hash") >= 16)
);

--> statement-breakpoint
CREATE TABLE "quotation_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"total_cost" numeric(20, 2) NOT NULL,
	"total_price" numeric(20, 2) NOT NULL,
	"profit" numeric(20, 2) NOT NULL,
	"margin" numeric(5, 2) NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"risk_level" text NOT NULL,
	"cost_data_status" text DEFAULT 'incomplete' NOT NULL,
	"currency_exposure" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_financials_quotation_id_unique" UNIQUE("quotation_id")
);

--> statement-breakpoint
CREATE TABLE "quotation_item_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_item_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"evidence_key" text NOT NULL,
	"price_snapshot_id" uuid,
	"source_document_id" uuid,
	"source_processing_run_id" uuid,
	"source_quantity_row_id" uuid,
	"source_cell_range" text,
	"source_document_hash" text,
	"captured_value_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'current' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_item_evidence_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "quotation_item_evidence_key_unique" UNIQUE("company_id","quotation_item_id","evidence_key"),
	CONSTRAINT "quotation_item_evidence_type_check" CHECK ("quotation_item_evidence"."evidence_type" in ('quantity', 'price', 'rule', 'source')),
	CONSTRAINT "quotation_item_evidence_status_check" CHECK ("quotation_item_evidence"."status" in ('current', 'stale', 'superseded')),
	CONSTRAINT "quotation_item_evidence_source_hash_check" CHECK ("quotation_item_evidence"."source_document_hash" IS NULL OR length("quotation_item_evidence"."source_document_hash") >= 16)
);

--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(20, 4) NOT NULL,
	"unit_price" numeric(20, 2) NOT NULL,
	"cost_unit_price" numeric(20, 2),
	"waste_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cost_category" text DEFAULT 'material' NOT NULL,
	"quantity_source" text DEFAULT 'manual' NOT NULL,
	"price_source" text DEFAULT 'manual' NOT NULL,
	"source_reference" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"source_document_id" uuid,
	"source_processing_run_id" uuid,
	"source_quantity_row_id" uuid,
	"source_cell_range" text,
	"source_rule_version" text,
	"transfer_idempotency_key" text,
	"price_snapshot_id" uuid,
	"price_snapshot_locked_at" timestamp with time zone,
	"price_snapshot_status" text DEFAULT 'none' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"vat_percent" numeric(5, 2) DEFAULT '20' NOT NULL,
	"total" numeric(20, 2) NOT NULL,
	CONSTRAINT "quotation_items_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "quotation_items_id_quotation_id_company_id_key" UNIQUE("id","quotation_id","company_id"),
	CONSTRAINT "quotation_items_price_snapshot_status_check" CHECK ("quotation_items"."price_snapshot_status" in ('none', 'attached', 'locked', 'stale', 'missing'))
);

--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"quote_number" text NOT NULL,
	"project_name" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"currency" "currency" DEFAULT 'TRY' NOT NULL,
	"notes" text,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"industry_id" text,
	"project_duration_months" integer DEFAULT 1 NOT NULL,
	"escalation_volatility_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"procurement_profile" text DEFAULT 'standard' NOT NULL,
	"carbon_risk_premium_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"information_delivery_level" text DEFAULT 'none' NOT NULL,
	"information_delivery_cost_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"observed_actual_cost" numeric(20, 2),
	"observed_actual_duration_months" integer,
	"calibration_status" text DEFAULT 'not_collected' NOT NULL,
	"calibration_note" text,
	"pricing_snapshot_lock_status" text DEFAULT 'unlocked' NOT NULL,
	"pricing_snapshot_locked_at" timestamp with time zone,
	"pricing_snapshot_locked_by_user_id" uuid,
	"pricing_snapshot_lock_hash" text,
	"subtotal" numeric(20, 2) NOT NULL,
	"discount_total" numeric(20, 2) NOT NULL,
	"vat_total" numeric(20, 2) NOT NULL,
	"grand_total" numeric(20, 2) NOT NULL,
	"revision_version" integer DEFAULT 1 NOT NULL,
	"parent_id" uuid,
	"is_latest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "quotations_pricing_snapshot_lock_status_check" CHECK ("quotations"."pricing_snapshot_lock_status" in ('unlocked', 'locked', 'stale'))
);

--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"resets_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_request_count_check" CHECK ("rate_limit_buckets"."request_count" >= 0)
);

--> statement-breakpoint
CREATE TABLE "regulation_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"effective_date" timestamp NOT NULL,
	"impact_level" "impact_level" NOT NULL,
	"summary" text NOT NULL,
	"affected_modules" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "regulation_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_review_item_id" uuid NOT NULL,
	"ingestion_run_id" uuid NOT NULL,
	"version_key" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"impact_level" "impact_level" NOT NULL,
	"authority" text NOT NULL,
	"source_url" text NOT NULL,
	"source_document_identifier" text NOT NULL,
	"source_document_hash" text NOT NULL,
	"source_version" text,
	"source_text" text NOT NULL,
	"jurisdiction" text DEFAULT 'TR' NOT NULL,
	"contract_type" text,
	"applicability" text,
	"exceptions" text,
	"published_at" timestamp with time zone,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"governance_status" text DEFAULT 'advisory' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regulation_versions_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "regulation_versions_company_key" UNIQUE("company_id","version_key"),
	CONSTRAINT "regulation_versions_category_check" CHECK ("regulation_versions"."category" in ('tax', 'labor', 'material', 'procurement', 'legal')),
	CONSTRAINT "regulation_versions_status_check" CHECK ("regulation_versions"."governance_status" in ('draft', 'advisory', 'approved', 'rejected')),
	CONSTRAINT "regulation_versions_source_hash_check" CHECK (length("regulation_versions"."source_document_hash") >= 16),
	CONSTRAINT "regulation_versions_validity_check" CHECK ("regulation_versions"."effective_until" IS NULL OR "regulation_versions"."effective_from" IS NULL OR "regulation_versions"."effective_until" >= "regulation_versions"."effective_from")
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
	"governance_status" text DEFAULT 'draft' NOT NULL,
	"jurisdiction" text,
	"contract_type" text,
	"official_authority" text,
	"source_document_identifier" text,
	"source_document_hash" text,
	"standard_version" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"unit_policy_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rounding_policy_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applicability" text,
	"exceptions" text,
	"technical_reviewer_user_id" uuid,
	"technical_approved_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_versions_company_id_rule_id_version_key" UNIQUE("company_id","rule_id","version"),
	CONSTRAINT "rule_versions_version_check" CHECK ("rule_versions"."version" > 0),
	CONSTRAINT "rule_versions_governance_status_check" CHECK ("rule_versions"."governance_status" in ('draft', 'advisory', 'approved'))
);

--> statement-breakpoint
CREATE TABLE "smartcheck_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "smartcheck_pilot_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"pilot_id" text NOT NULL,
	"customer_reference" text NOT NULL,
	"project_reference" text NOT NULL,
	"discipline" text DEFAULT 'MEP' NOT NULL,
	"permission_reference" text NOT NULL,
	"permission_granted_at" timestamp with time zone NOT NULL,
	"retention_until" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'admitted' NOT NULL,
	"expected_row_count" integer,
	"workflow_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workflow_completed_at" timestamp with time zone,
	"reviewer_user_id" uuid,
	"reviewer_role" text,
	"reviewed_at" timestamp with time zone,
	"reviewer_decision" text,
	"reviewer_notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "smartcheck_pilot_cases_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "smartcheck_pilot_cases_pilot_document_key" UNIQUE("company_id","pilot_id","document_id"),
	CONSTRAINT "smartcheck_pilot_cases_status_check" CHECK ("smartcheck_pilot_cases"."status" in ('admitted', 'processing', 'review', 'completed', 'failed', 'rejected')),
	CONSTRAINT "smartcheck_pilot_cases_expected_row_count_check" CHECK ("smartcheck_pilot_cases"."expected_row_count" IS NULL OR "smartcheck_pilot_cases"."expected_row_count" >= 0),
	CONSTRAINT "smartcheck_pilot_cases_retention_check" CHECK ("smartcheck_pilot_cases"."retention_until" >= "smartcheck_pilot_cases"."permission_granted_at"),
	CONSTRAINT "smartcheck_pilot_cases_reviewer_decision_check" CHECK ("smartcheck_pilot_cases"."reviewer_decision" IS NULL OR "smartcheck_pilot_cases"."reviewer_decision" in ('approved', 'rejected', 'accepted_exception'))
);

--> statement-breakpoint
CREATE TABLE "smartcheck_pilot_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"pilot_case_id" uuid NOT NULL,
	"processing_run_id" uuid,
	"measured_by_user_id" uuid NOT NULL,
	"measurement_key" text NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"parsed_rows" integer DEFAULT 0 NOT NULL,
	"manually_corrected_rows" integer DEFAULT 0 NOT NULL,
	"finding_count" integer DEFAULT 0 NOT NULL,
	"approved_rows" integer DEFAULT 0 NOT NULL,
	"transferred_rows" integer DEFAULT 0 NOT NULL,
	"provenance_complete_rows" integer DEFAULT 0 NOT NULL,
	"processing_duration_seconds" integer,
	"workflow_duration_seconds" integer,
	"parse_rate" numeric(5, 4),
	"manual_reentry_free_rate" numeric(5, 4),
	"provenance_coverage" numeric(5, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "smartcheck_pilot_measurements_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "smartcheck_pilot_measurements_case_key" UNIQUE("company_id","pilot_case_id","measurement_key"),
	CONSTRAINT "smartcheck_pilot_measurements_non_negative_check" CHECK ("smartcheck_pilot_measurements"."total_rows" >= 0 AND "smartcheck_pilot_measurements"."parsed_rows" >= 0 AND "smartcheck_pilot_measurements"."manually_corrected_rows" >= 0 AND "smartcheck_pilot_measurements"."finding_count" >= 0 AND "smartcheck_pilot_measurements"."approved_rows" >= 0 AND "smartcheck_pilot_measurements"."transferred_rows" >= 0 AND "smartcheck_pilot_measurements"."provenance_complete_rows" >= 0),
	CONSTRAINT "smartcheck_pilot_measurements_rate_check" CHECK (("smartcheck_pilot_measurements"."parse_rate" IS NULL OR ("smartcheck_pilot_measurements"."parse_rate" >= 0 AND "smartcheck_pilot_measurements"."parse_rate" <= 1)) AND ("smartcheck_pilot_measurements"."manual_reentry_free_rate" IS NULL OR ("smartcheck_pilot_measurements"."manual_reentry_free_rate" >= 0 AND "smartcheck_pilot_measurements"."manual_reentry_free_rate" <= 1)) AND ("smartcheck_pilot_measurements"."provenance_coverage" IS NULL OR ("smartcheck_pilot_measurements"."provenance_coverage" >= 0 AND "smartcheck_pilot_measurements"."provenance_coverage" <= 1))),
	CONSTRAINT "smartcheck_pilot_measurements_duration_check" CHECK (("smartcheck_pilot_measurements"."processing_duration_seconds" IS NULL OR "smartcheck_pilot_measurements"."processing_duration_seconds" >= 0) AND ("smartcheck_pilot_measurements"."workflow_duration_seconds" IS NULL OR "smartcheck_pilot_measurements"."workflow_duration_seconds" >= 0))
);

--> statement-breakpoint
CREATE TABLE "source_ingestion_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"ingestion_run_id" uuid NOT NULL,
	"artifact_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_ingestion_artifacts_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "source_ingestion_artifacts_run_type_key" UNIQUE("company_id","ingestion_run_id","artifact_type"),
	CONSTRAINT "source_ingestion_artifacts_type_check" CHECK ("source_ingestion_artifacts"."artifact_type" in ('raw', 'normalized', 'diff', 'error')),
	CONSTRAINT "source_ingestion_artifacts_checksum_check" CHECK (length("source_ingestion_artifacts"."checksum_sha256") >= 16),
	CONSTRAINT "source_ingestion_artifacts_size_check" CHECK ("source_ingestion_artifacts"."size_bytes" >= 0)
);

--> statement-breakpoint
CREATE TABLE "source_ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"adapter_id" uuid NOT NULL,
	"price_source_id" uuid,
	"run_key" text NOT NULL,
	"source_document_identifier" text NOT NULL,
	"source_url" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"source_hash" text,
	"previous_source_hash" text,
	"parser_version" text NOT NULL,
	"http_status" integer,
	"requested_by_user_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"diff_summary_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_ingestion_runs_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "source_ingestion_runs_company_run_key" UNIQUE("company_id","run_key"),
	CONSTRAINT "source_ingestion_runs_status_check" CHECK ("source_ingestion_runs"."status" in ('queued', 'fetching', 'quarantined', 'parsed', 'diffed', 'awaiting_review', 'approved', 'rejected', 'unchanged', 'failed')),
	CONSTRAINT "source_ingestion_runs_source_hash_check" CHECK ("source_ingestion_runs"."source_hash" IS NULL OR length("source_ingestion_runs"."source_hash") >= 16)
);

--> statement-breakpoint
CREATE TABLE "source_intelligence_adapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"adapter_key" text NOT NULL,
	"source_kind" text NOT NULL,
	"display_name" text NOT NULL,
	"authority" text NOT NULL,
	"source_url" text NOT NULL,
	"allowed_host" text NOT NULL,
	"jurisdiction" text DEFAULT 'TR' NOT NULL,
	"region" text,
	"cadence" text DEFAULT 'manual' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"configuration_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_source_hash" text,
	"last_error_code" text,
	"last_error_message" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_intelligence_adapters_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "source_intelligence_adapters_company_key" UNIQUE("company_id","adapter_key"),
	CONSTRAINT "source_intelligence_adapters_source_kind_check" CHECK ("source_intelligence_adapters"."source_kind" in ('price', 'regulation', 'index')),
	CONSTRAINT "source_intelligence_adapters_adapter_key_check" CHECK ("source_intelligence_adapters"."adapter_key" in ('yfk', 'tuik', 'gib', 'resmi_gazete')),
	CONSTRAINT "source_intelligence_adapters_cadence_check" CHECK ("source_intelligence_adapters"."cadence" in ('manual', 'daily', 'weekly', 'monthly'))
);

--> statement-breakpoint
CREATE TABLE "source_review_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"ingestion_run_id" uuid NOT NULL,
	"artifact_id" uuid,
	"price_snapshot_id" uuid,
	"item_type" text NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"proposed_payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_review_items_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "source_review_items_type_check" CHECK ("source_review_items"."item_type" in ('price_snapshot', 'regulation_diff')),
	CONSTRAINT "source_review_items_status_check" CHECK ("source_review_items"."status" in ('pending', 'approved', 'rejected'))
);

--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'starter' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_company_id_unique" UNIQUE("company_id")
);

--> statement-breakpoint
CREATE TABLE "supplier_quote_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"source_processing_run_id" uuid,
	"source_quantity_row_id" uuid,
	"source_row_key" text NOT NULL,
	"position_code" text,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(20, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(20, 4) NOT NULL,
	"currency" "currency" DEFAULT 'TRY' NOT NULL,
	"vat_status" text DEFAULT 'unknown' NOT NULL,
	"vat_percent" numeric(5, 2),
	"freight_status" text DEFAULT 'unknown' NOT NULL,
	"region" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"source_cell_range" text,
	"baseline_count" integer DEFAULT 0 NOT NULL,
	"outlier_status" text DEFAULT 'insufficient_data' NOT NULL,
	"outlier_score" numeric(8, 3),
	"confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"price_snapshot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_quote_entries_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "supplier_quote_entries_source_row_key" UNIQUE("company_id","submission_id","source_row_key"),
	CONSTRAINT "supplier_quote_entries_vat_status_check" CHECK ("supplier_quote_entries"."vat_status" in ('included', 'excluded', 'unknown')),
	CONSTRAINT "supplier_quote_entries_freight_status_check" CHECK ("supplier_quote_entries"."freight_status" in ('included', 'excluded', 'unknown')),
	CONSTRAINT "supplier_quote_entries_outlier_status_check" CHECK ("supplier_quote_entries"."outlier_status" in ('normal', 'outlier', 'insufficient_data', 'not_evaluated')),
	CONSTRAINT "supplier_quote_entries_review_status_check" CHECK ("supplier_quote_entries"."review_status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "supplier_quote_entries_quantity_check" CHECK ("supplier_quote_entries"."quantity" > 0),
	CONSTRAINT "supplier_quote_entries_unit_price_check" CHECK ("supplier_quote_entries"."unit_price" >= 0),
	CONSTRAINT "supplier_quote_entries_baseline_count_check" CHECK ("supplier_quote_entries"."baseline_count" >= 0),
	CONSTRAINT "supplier_quote_entries_confidence_check" CHECK ("supplier_quote_entries"."confidence" >= 0 AND "supplier_quote_entries"."confidence" <= 1),
	CONSTRAINT "supplier_quote_entries_validity_check" CHECK ("supplier_quote_entries"."valid_until" IS NULL OR "supplier_quote_entries"."valid_from" IS NULL OR "supplier_quote_entries"."valid_until" >= "supplier_quote_entries"."valid_from")
);

--> statement-breakpoint
CREATE TABLE "supplier_quote_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid,
	"source_document_hash" text NOT NULL,
	"source_document_identifier" text NOT NULL,
	"source_url" text,
	"supplier_name" text NOT NULL,
	"supplier_contact" text,
	"quote_number" text,
	"quote_date" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"currency" "currency" DEFAULT 'TRY' NOT NULL,
	"region" text,
	"delivery_terms" text,
	"delivery_location" text,
	"vat_status" text DEFAULT 'unknown' NOT NULL,
	"vat_percent" numeric(5, 2),
	"freight_status" text DEFAULT 'unknown' NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'awaiting_review' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_quote_submissions_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "supplier_quote_submissions_status_check" CHECK ("supplier_quote_submissions"."status" in ('draft', 'awaiting_review', 'approved', 'rejected', 'expired')),
	CONSTRAINT "supplier_quote_submissions_vat_status_check" CHECK ("supplier_quote_submissions"."vat_status" in ('included', 'excluded', 'unknown')),
	CONSTRAINT "supplier_quote_submissions_freight_status_check" CHECK ("supplier_quote_submissions"."freight_status" in ('included', 'excluded', 'unknown')),
	CONSTRAINT "supplier_quote_submissions_confidence_check" CHECK ("supplier_quote_submissions"."confidence" >= 0 AND "supplier_quote_submissions"."confidence" <= 1),
	CONSTRAINT "supplier_quote_submissions_source_hash_check" CHECK (length("supplier_quote_submissions"."source_document_hash") >= 16),
	CONSTRAINT "supplier_quote_submissions_validity_check" CHECK ("supplier_quote_submissions"."valid_until" IS NULL OR "supplier_quote_submissions"."quote_date" IS NULL OR "supplier_quote_submissions"."valid_until" >= "supplier_quote_submissions"."quote_date")
);

--> statement-breakpoint
CREATE TABLE "usage_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"feature" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"tokens_used" integer,
	"cost_estimate" numeric(10, 5),
	"date" timestamp DEFAULT now() NOT NULL,
	"document_processing_run_id" uuid
);

--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"full_name" text NOT NULL,
	"email_verified" timestamp,
	"verification_token" text,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

--> statement-breakpoint
ALTER TABLE "academy_acquisition_events" ADD CONSTRAINT "academy_acquisition_events_registered_user_id_users_id_fk" FOREIGN KEY ("registered_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_activation_events" ADD CONSTRAINT "academy_activation_events_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_editions" ADD CONSTRAINT "academy_editions_product_id_academy_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."academy_products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_enrollment_audit_logs" ADD CONSTRAINT "academy_enrollment_audit_logs_enrollment_id_company_id_academy_enrollments_id_company_id_fk" FOREIGN KEY ("enrollment_id","company_id") REFERENCES "public"."academy_enrollments"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_enrollment_audit_logs" ADD CONSTRAINT "academy_enrollment_audit_logs_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_edition_id_academy_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."academy_editions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_learner_profiles" ADD CONSTRAINT "academy_learner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_learner_profiles" ADD CONSTRAINT "academy_learner_profiles_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_payment_events" ADD CONSTRAINT "academy_payment_events_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academy_payment_events" ADD CONSTRAINT "academy_payment_events_enrollment_id_company_id_academy_enrollments_id_company_id_fk" FOREIGN KEY ("enrollment_id","company_id") REFERENCES "public"."academy_enrollments"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_certificate_audit_logs" ADD CONSTRAINT "allplan_certificate_audit_logs_certificate_id_company_id_allplan_certificates_id_company_id_fk" FOREIGN KEY ("certificate_id","company_id") REFERENCES "public"."allplan_certificates"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_certificate_audit_logs" ADD CONSTRAINT "allplan_certificate_audit_logs_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_certificates" ADD CONSTRAINT "allplan_certificates_exam_attempt_id_company_id_allplan_exam_attempts_id_company_id_fk" FOREIGN KEY ("exam_attempt_id","company_id") REFERENCES "public"."allplan_exam_attempts"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_certificates" ADD CONSTRAINT "allplan_certificates_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_checkpoint_attempts" ADD CONSTRAINT "allplan_checkpoint_attempts_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_exam_attempts" ADD CONSTRAINT "allplan_exam_attempts_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_activity" ADD CONSTRAINT "allplan_lesson_activity_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_bookmarks" ADD CONSTRAINT "allplan_lesson_bookmarks_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_notes" ADD CONSTRAINT "allplan_lesson_notes_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_progress" ADD CONSTRAINT "allplan_lesson_progress_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assistance_resources" ADD CONSTRAINT "assistance_resources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assistance_resources" ADD CONSTRAINT "assistance_resources_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_industry_settings" ADD CONSTRAINT "company_industry_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_industry_settings" ADD CONSTRAINT "company_industry_settings_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
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
ALTER TABLE "cost_components" ADD CONSTRAINT "cost_components_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_processing_artifacts" ADD CONSTRAINT "document_processing_artifacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_processing_artifacts" ADD CONSTRAINT "document_processing_artifacts_processing_run_id_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("processing_run_id","document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_processing_runs" ADD CONSTRAINT "document_processing_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_processing_runs" ADD CONSTRAINT "document_processing_runs_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("uploaded_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_processing_run_id_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("processing_run_id","document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD CONSTRAINT "pilot_applications_provisioned_company_id_companies_id_fk" FOREIGN KEY ("provisioned_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD CONSTRAINT "pilot_applications_provisioned_user_id_users_id_fk" FOREIGN KEY ("provisioned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_price_source_id_company_id_price_sources_id_company_id_fk" FOREIGN KEY ("price_source_id","company_id") REFERENCES "public"."price_sources"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_financials" ADD CONSTRAINT "quotation_financials_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_quotation_item_id_quotation_id_company_id_quotation_items_id_quotation_id_company_id_fk" FOREIGN KEY ("quotation_item_id","quotation_id","company_id") REFERENCES "public"."quotation_items"("id","quotation_id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_source_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("source_document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_source_processing_run_id_source_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("source_processing_run_id","source_document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_source_quantity_row_id_company_id_normalized_quantity_rows_id_company_id_fk" FOREIGN KEY ("source_quantity_row_id","company_id") REFERENCES "public"."normalized_quantity_rows"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_pricing_snapshot_locked_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("pricing_snapshot_locked_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulation_alerts" ADD CONSTRAINT "regulation_alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_source_review_item_id_company_id_source_review_items_id_company_id_fk" FOREIGN KEY ("source_review_item_id","company_id") REFERENCES "public"."source_review_items"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_ingestion_run_id_company_id_source_ingestion_runs_id_company_id_fk" FOREIGN KEY ("ingestion_run_id","company_id") REFERENCES "public"."source_ingestion_runs"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
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
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_technical_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("technical_reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_audit_logs" ADD CONSTRAINT "smartcheck_audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_audit_logs" ADD CONSTRAINT "smartcheck_audit_logs_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_pilot_case_id_company_id_smartcheck_pilot_cases_id_company_id_fk" FOREIGN KEY ("pilot_case_id","company_id") REFERENCES "public"."smartcheck_pilot_cases"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_processing_run_id_company_id_document_processing_runs_id_company_id_fk" FOREIGN KEY ("processing_run_id","company_id") REFERENCES "public"."document_processing_runs"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_measured_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("measured_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_ingestion_artifacts" ADD CONSTRAINT "source_ingestion_artifacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_ingestion_artifacts" ADD CONSTRAINT "source_ingestion_artifacts_ingestion_run_id_company_id_source_ingestion_runs_id_company_id_fk" FOREIGN KEY ("ingestion_run_id","company_id") REFERENCES "public"."source_ingestion_runs"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_adapter_id_company_id_source_intelligence_adapters_id_company_id_fk" FOREIGN KEY ("adapter_id","company_id") REFERENCES "public"."source_intelligence_adapters"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_price_source_id_company_id_price_sources_id_company_id_fk" FOREIGN KEY ("price_source_id","company_id") REFERENCES "public"."price_sources"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_requested_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("requested_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_intelligence_adapters" ADD CONSTRAINT "source_intelligence_adapters_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_intelligence_adapters" ADD CONSTRAINT "source_intelligence_adapters_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_ingestion_run_id_company_id_source_ingestion_runs_id_company_id_fk" FOREIGN KEY ("ingestion_run_id","company_id") REFERENCES "public"."source_ingestion_runs"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_artifact_id_company_id_source_ingestion_artifacts_id_company_id_fk" FOREIGN KEY ("artifact_id","company_id") REFERENCES "public"."source_ingestion_artifacts"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_submission_id_company_id_supplier_quote_submissions_id_company_id_fk" FOREIGN KEY ("submission_id","company_id") REFERENCES "public"."supplier_quote_submissions"("id","company_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_source_processing_run_id_company_id_document_processing_runs_id_company_id_fk" FOREIGN KEY ("source_processing_run_id","company_id") REFERENCES "public"."document_processing_runs"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_source_quantity_row_id_company_id_normalized_quantity_rows_id_company_id_fk" FOREIGN KEY ("source_quantity_row_id","company_id") REFERENCES "public"."normalized_quantity_rows"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_document_processing_run_id_company_id_document_processing_runs_id_company_id_fk" FOREIGN KEY ("document_processing_run_id","company_id") REFERENCES "public"."document_processing_runs"("id","company_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_academy_acquisition_registered" ON "academy_acquisition_events" USING btree ("registered_at");
--> statement-breakpoint
CREATE INDEX "idx_academy_activation_events_funnel" ON "academy_activation_events" USING btree ("event_type","occurred_at");
--> statement-breakpoint
CREATE INDEX "idx_academy_activation_events_user" ON "academy_activation_events" USING btree ("company_id","user_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "idx_academy_enrollment_audit" ON "academy_enrollment_audit_logs" USING btree ("enrollment_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_academy_enrollments_access" ON "academy_enrollments" USING btree ("company_id","user_id","status","ends_at");
--> statement-breakpoint
CREATE INDEX "idx_academy_learner_profiles_company" ON "academy_learner_profiles" USING btree ("company_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_academy_payment_events_reference" ON "academy_payment_events" USING btree ("provider","payment_reference");
--> statement-breakpoint
CREATE INDEX "idx_allplan_certificate_audit" ON "allplan_certificate_audit_logs" USING btree ("certificate_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_allplan_certificates_number" ON "allplan_certificates" USING btree ("certificate_number");
--> statement-breakpoint
CREATE INDEX "idx_allplan_checkpoint_attempts_user_lesson" ON "allplan_checkpoint_attempts" USING btree ("company_id","user_id","lesson_slug","attempted_at");
--> statement-breakpoint
CREATE INDEX "idx_allplan_exam_attempts_user" ON "allplan_exam_attempts" USING btree ("company_id","user_id","completed_at");
--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_activity_user" ON "allplan_lesson_activity" USING btree ("company_id","user_id","updated_at");
--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_bookmarks_user" ON "allplan_lesson_bookmarks" USING btree ("company_id","user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_notes_user_lesson" ON "allplan_lesson_notes" USING btree ("company_id","user_id","lesson_slug","created_at");
--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_progress_user" ON "allplan_lesson_progress" USING btree ("company_id","user_id","updated_at");
--> statement-breakpoint
CREATE INDEX "idx_assistance_resources_active" ON "assistance_resources" USING btree ("company_id","is_active");
--> statement-breakpoint
CREATE INDEX "idx_auth_action_tokens_user_type" ON "auth_action_tokens" USING btree ("user_id","type","created_at");
--> statement-breakpoint
CREATE INDEX "idx_competency_signals_user" ON "competency_signals" USING btree ("company_id","user_id","status");
--> statement-breakpoint
CREATE INDEX "idx_processing_runs_lookup" ON "document_processing_runs" USING btree ("company_id","document_id","status");
--> statement-breakpoint
CREATE INDEX "idx_documents_company_status" ON "documents" USING btree ("company_id","status");
--> statement-breakpoint
CREATE INDEX "idx_pilot_applications_email" ON "pilot_applications" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "idx_pilot_applications_status" ON "pilot_applications" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_price_snapshots_lookup" ON "price_snapshots" USING btree ("company_id","review_status","valid_until");
--> statement-breakpoint
CREATE INDEX "idx_price_sources_lookup" ON "price_sources" USING btree ("company_id","source_type","region");
--> statement-breakpoint
CREATE INDEX "idx_quotation_item_evidence_lookup" ON "quotation_item_evidence" USING btree ("company_id","quotation_id","quotation_item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_items_transfer_idempotency_idx" ON "quotation_items" USING btree ("company_id","quotation_id","transfer_idempotency_key") WHERE "quotation_items"."transfer_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_buckets_expiry" ON "rate_limit_buckets" USING btree ("resets_at");
--> statement-breakpoint
CREATE INDEX "idx_regulation_alerts_company_created" ON "regulation_alerts" USING btree ("company_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_regulation_versions_lookup" ON "regulation_versions" USING btree ("company_id","governance_status","effective_from");
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
CREATE INDEX "idx_smartcheck_audit_lookup" ON "smartcheck_audit_logs" USING btree ("company_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_smartcheck_pilot_cases_lookup" ON "smartcheck_pilot_cases" USING btree ("company_id","status","retention_until");
--> statement-breakpoint
CREATE INDEX "idx_smartcheck_pilot_measurements_lookup" ON "smartcheck_pilot_measurements" USING btree ("company_id","pilot_case_id","measured_at");
--> statement-breakpoint
CREATE INDEX "idx_source_ingestion_artifacts_lookup" ON "source_ingestion_artifacts" USING btree ("company_id","ingestion_run_id","artifact_type");
--> statement-breakpoint
CREATE INDEX "idx_source_ingestion_runs_lookup" ON "source_ingestion_runs" USING btree ("company_id","adapter_id","status","created_at");
--> statement-breakpoint
CREATE INDEX "idx_source_intelligence_adapters_lookup" ON "source_intelligence_adapters" USING btree ("company_id","enabled","source_kind");
--> statement-breakpoint
CREATE INDEX "idx_source_review_items_queue" ON "source_review_items" USING btree ("company_id","status","item_type","created_at");
--> statement-breakpoint
CREATE INDEX "idx_supplier_quote_entries_lookup" ON "supplier_quote_entries" USING btree ("company_id","submission_id","review_status","outlier_status");
--> statement-breakpoint
CREATE INDEX "idx_supplier_quote_submissions_lookup" ON "supplier_quote_submissions" USING btree ("company_id","status","valid_until");
--> statement-breakpoint
CREATE INDEX "idx_usage_logs_processing_run" ON "usage_logs" USING btree ("company_id","document_processing_run_id");
