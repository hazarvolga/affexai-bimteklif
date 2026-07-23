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
ALTER TABLE "normalized_quantity_rows" DROP CONSTRAINT "normalized_quantity_rows_review_status_check";--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "price_snapshot_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "price_snapshot_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "price_snapshot_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pricing_snapshot_lock_status" text DEFAULT 'unlocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pricing_snapshot_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pricing_snapshot_locked_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "pricing_snapshot_lock_hash" text;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_price_source_id_company_id_price_sources_id_company_id_fk" FOREIGN KEY ("price_source_id","company_id") REFERENCES "public"."price_sources"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_quotation_item_id_quotation_id_company_id_quotation_items_id_quotation_id_company_id_fk" FOREIGN KEY ("quotation_item_id","quotation_id","company_id") REFERENCES "public"."quotation_items"("id","quotation_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_source_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("source_document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_source_processing_run_id_source_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("source_processing_run_id","source_document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_source_quantity_row_id_company_id_normalized_quantity_rows_id_company_id_fk" FOREIGN KEY ("source_quantity_row_id","company_id") REFERENCES "public"."normalized_quantity_rows"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ADD CONSTRAINT "quotation_item_evidence_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_price_snapshots_lookup" ON "price_snapshots" USING btree ("company_id","review_status","valid_until");--> statement-breakpoint
CREATE INDEX "idx_price_sources_lookup" ON "price_sources" USING btree ("company_id","source_type","region");--> statement-breakpoint
CREATE INDEX "idx_quotation_item_evidence_lookup" ON "quotation_item_evidence" USING btree ("company_id","quotation_id","quotation_item_id");--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_pricing_snapshot_locked_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("pricing_snapshot_locked_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_review_status_check" CHECK ("normalized_quantity_rows"."review_status" in ('pending_review', 'approved', 'accepted_exception', 'rejected'));--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_price_snapshot_status_check" CHECK ("quotation_items"."price_snapshot_status" in ('none', 'attached', 'locked', 'stale', 'missing'));--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_pricing_snapshot_lock_status_check" CHECK ("quotations"."pricing_snapshot_lock_status" in ('unlocked', 'locked', 'stale'));
