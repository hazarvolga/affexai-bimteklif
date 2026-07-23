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
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ADD CONSTRAINT "smartcheck_pilot_cases_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_pilot_case_id_company_id_smartcheck_pilot_cases_id_company_id_fk" FOREIGN KEY ("pilot_case_id","company_id") REFERENCES "public"."smartcheck_pilot_cases"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_processing_run_id_company_id_document_processing_runs_id_company_id_fk" FOREIGN KEY ("processing_run_id","company_id") REFERENCES "public"."document_processing_runs"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_measured_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("measured_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_smartcheck_pilot_cases_lookup" ON "smartcheck_pilot_cases" USING btree ("company_id","status","retention_until");--> statement-breakpoint
CREATE INDEX "idx_smartcheck_pilot_measurements_lookup" ON "smartcheck_pilot_measurements" USING btree ("company_id","pilot_case_id","measured_at");