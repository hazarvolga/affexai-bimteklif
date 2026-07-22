ALTER TYPE "public"."processing_stage" ADD VALUE 'normalizing' BEFORE 'extracting_rules';--> statement-breakpoint
ALTER TYPE "public"."processing_stage" ADD VALUE 'validating' BEFORE 'extracting_rules';--> statement-breakpoint
ALTER TYPE "public"."processing_stage" ADD VALUE 'awaiting_review' BEFORE 'extracting_rules';--> statement-breakpoint
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
	"formula_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_description" text,
	"normalized_position_code" text,
	"normalized_unit" text,
	"normalized_quantity" numeric(20, 4),
	"normalized_price" numeric(20, 2),
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
	CONSTRAINT "normalized_quantity_rows_review_status_check" CHECK ("normalized_quantity_rows"."review_status" in ('pending_review', 'approved', 'rejected')),
	CONSTRAINT "normalized_quantity_rows_confidence_check" CHECK ("normalized_quantity_rows"."mapping_confidence" >= 0 AND "normalized_quantity_rows"."mapping_confidence" <= 1)
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
ALTER TABLE "document_processing_artifacts" ADD CONSTRAINT "document_processing_artifacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_artifacts" ADD CONSTRAINT "document_processing_artifacts_processing_run_id_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("processing_run_id","document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_processing_run_id_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("processing_run_id","document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_audit_logs" ADD CONSTRAINT "smartcheck_audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_audit_logs" ADD CONSTRAINT "smartcheck_audit_logs_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_smartcheck_audit_lookup" ON "smartcheck_audit_logs" USING btree ("company_id","created_at");