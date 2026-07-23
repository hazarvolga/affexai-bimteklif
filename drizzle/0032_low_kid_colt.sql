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
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_source_review_item_id_company_id_source_review_items_id_company_id_fk" FOREIGN KEY ("source_review_item_id","company_id") REFERENCES "public"."source_review_items"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_ingestion_run_id_company_id_source_ingestion_runs_id_company_id_fk" FOREIGN KEY ("ingestion_run_id","company_id") REFERENCES "public"."source_ingestion_runs"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_regulation_versions_lookup" ON "regulation_versions" USING btree ("company_id","governance_status","effective_from");