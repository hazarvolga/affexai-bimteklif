CREATE TABLE "supplier_quote_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
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
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_submission_id_company_id_supplier_quote_submissions_id_company_id_fk" FOREIGN KEY ("submission_id","company_id") REFERENCES "public"."supplier_quote_submissions"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ADD CONSTRAINT "supplier_quote_entries_price_snapshot_id_company_id_price_snapshots_id_company_id_fk" FOREIGN KEY ("price_snapshot_id","company_id") REFERENCES "public"."price_snapshots"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ADD CONSTRAINT "supplier_quote_submissions_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_supplier_quote_entries_lookup" ON "supplier_quote_entries" USING btree ("company_id","submission_id","review_status","outlier_status");--> statement-breakpoint
CREATE INDEX "idx_supplier_quote_submissions_lookup" ON "supplier_quote_submissions" USING btree ("company_id","status","valid_until");