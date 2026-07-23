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
ALTER TABLE "source_ingestion_artifacts" ADD CONSTRAINT "source_ingestion_artifacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_ingestion_artifacts" ADD CONSTRAINT "source_ingestion_artifacts_ingestion_run_id_company_id_source_ingestion_runs_id_company_id_fk" FOREIGN KEY ("ingestion_run_id","company_id") REFERENCES "public"."source_ingestion_runs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_adapter_id_company_id_source_intelligence_adapters_id_company_id_fk" FOREIGN KEY ("adapter_id","company_id") REFERENCES "public"."source_intelligence_adapters"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_price_source_id_company_id_price_sources_id_company_id_fk" FOREIGN KEY ("price_source_id","company_id") REFERENCES "public"."price_sources"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ADD CONSTRAINT "source_ingestion_runs_requested_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("requested_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_intelligence_adapters" ADD CONSTRAINT "source_intelligence_adapters_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_intelligence_adapters" ADD CONSTRAINT "source_intelligence_adapters_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_ingestion_run_id_company_id_source_ingestion_runs_id_company_id_fk" FOREIGN KEY ("ingestion_run_id","company_id") REFERENCES "public"."source_ingestion_runs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_artifact_id_company_id_source_ingestion_artifacts_id_company_id_fk" FOREIGN KEY ("artifact_id","company_id") REFERENCES "public"."source_ingestion_artifacts"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_review_items" ADD CONSTRAINT "source_review_items_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_source_ingestion_artifacts_lookup" ON "source_ingestion_artifacts" USING btree ("company_id","ingestion_run_id","artifact_type");--> statement-breakpoint
CREATE INDEX "idx_source_ingestion_runs_lookup" ON "source_ingestion_runs" USING btree ("company_id","adapter_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_source_intelligence_adapters_lookup" ON "source_intelligence_adapters" USING btree ("company_id","enabled","source_kind");--> statement-breakpoint
CREATE INDEX "idx_source_review_items_queue" ON "source_review_items" USING btree ("company_id","status","item_type","created_at");