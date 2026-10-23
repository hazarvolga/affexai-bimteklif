CREATE TABLE "construction_contract_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"source_quotation_item_id" uuid,
	"item_code" text NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"contract_quantity" numeric(20, 4) NOT NULL,
	"unit_price" numeric(20, 2) NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "construction_contract_items_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "construction_contract_items_id_contract_company_key" UNIQUE("id","contract_id","company_id"),
	CONSTRAINT "construction_contract_items_contract_code_key" UNIQUE("company_id","contract_id","item_code"),
	CONSTRAINT "construction_contract_items_quantity_check" CHECK ("construction_contract_items"."contract_quantity" >= 0),
	CONSTRAINT "construction_contract_items_price_check" CHECK ("construction_contract_items"."unit_price" >= 0),
	CONSTRAINT "construction_contract_items_source_hash_check" CHECK ("construction_contract_items"."source_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "construction_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_quotation_id" uuid,
	"contract_number" text NOT NULL,
	"project_name" text NOT NULL,
	"currency" "currency" DEFAULT 'TRY' NOT NULL,
	"regime" text NOT NULL,
	"initial_amount" numeric(20, 2) NOT NULL,
	"source_document_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "construction_contracts_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "construction_contracts_company_number_key" UNIQUE("company_id","contract_number"),
	CONSTRAINT "construction_contracts_initial_amount_check" CHECK ("construction_contracts"."initial_amount" >= 0),
	CONSTRAINT "construction_contracts_status_check" CHECK ("construction_contracts"."status" in ('draft', 'active', 'closed', 'cancelled')),
	CONSTRAINT "construction_contracts_regime_check" CHECK (length(trim("construction_contracts"."regime")) between 1 and 80),
	CONSTRAINT "construction_contracts_source_hash_check" CHECK ("construction_contracts"."source_document_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "contract_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"variation_number" integer NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"decision_document_hash" text,
	"status" text DEFAULT 'manual_review' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_variations_contract_number_key" UNIQUE("company_id","contract_id","variation_number"),
	CONSTRAINT "contract_variations_kind_check" CHECK ("contract_variations"."kind" in ('addition', 'omission', 'new_item')),
	CONSTRAINT "contract_variations_status_check" CHECK ("contract_variations"."status" in ('manual_review', 'approved', 'rejected')),
	CONSTRAINT "contract_variations_decision_hash_check" CHECK ("contract_variations"."decision_document_hash" IS NULL OR "contract_variations"."decision_document_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "contract_variations_approved_evidence_check" CHECK ("contract_variations"."status" <> 'approved' OR "contract_variations"."decision_document_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "final_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"result_json" jsonb NOT NULL,
	"source_aggregate_hash" text NOT NULL,
	"sealed_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "final_accounts_contract_revision_key" UNIQUE("company_id","contract_id","revision_number"),
	CONSTRAINT "final_accounts_status_check" CHECK ("final_accounts"."status" in ('draft', 'manual_review', 'sealed', 'superseded')),
	CONSTRAINT "final_accounts_source_hash_check" CHECK ("final_accounts"."source_aggregate_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "final_accounts_seal_check" CHECK (("final_accounts"."status" = 'sealed' AND "final_accounts"."sealed_at" IS NOT NULL) OR ("final_accounts"."status" <> 'sealed' AND "final_accounts"."sealed_at" IS NULL))
);

--> statement-breakpoint
CREATE TABLE "progress_measurement_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"measurement_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"expected_version" integer NOT NULL,
	"resulting_version" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_measurement_review_events_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "progress_measurement_review_events_idempotency_key" UNIQUE("company_id","period_id","idempotency_key","measurement_id"),
	CONSTRAINT "progress_measurement_review_events_decision_check" CHECK ("progress_measurement_review_events"."decision" in ('approved', 'rejected')),
	CONSTRAINT "progress_measurement_review_events_version_check" CHECK ("progress_measurement_review_events"."expected_version" >= 0 AND "progress_measurement_review_events"."resulting_version" = "progress_measurement_review_events"."expected_version" + 1),
	CONSTRAINT "progress_measurement_review_events_request_hash_check" CHECK ("progress_measurement_review_events"."request_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "progress_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"contract_item_id" uuid NOT NULL,
	"parent_measurement_id" uuid,
	"location" text NOT NULL,
	"element_key" text,
	"source_type" text NOT NULL,
	"quantity" numeric(20, 4) NOT NULL,
	"unit" text NOT NULL,
	"source_document_id" uuid,
	"source_processing_run_id" uuid,
	"source_quantity_row_id" uuid,
	"source_cell_range" text,
	"source_identity" text NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"correction_reason" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_measurements_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "progress_measurements_full_scope_key" UNIQUE("id","contract_item_id","contract_id","period_id","company_id"),
	CONSTRAINT "progress_measurements_review_scope_key" UNIQUE("id","contract_id","period_id","company_id"),
	CONSTRAINT "progress_measurements_parent_scope_key" UNIQUE("id","contract_item_id","contract_id","company_id"),
	CONSTRAINT "progress_measurements_source_identity_key" UNIQUE("company_id","period_id","source_identity"),
	CONSTRAINT "progress_measurements_quantity_check" CHECK ("progress_measurements"."quantity" > 0),
	CONSTRAINT "progress_measurements_source_type_check" CHECK ("progress_measurements"."source_type" in ('manual', 'ifc', 'xlsx', 'pdf', 'field_record')),
	CONSTRAINT "progress_measurements_review_status_check" CHECK ("progress_measurements"."review_status" in ('pending_review', 'approved', 'rejected', 'superseded')),
	CONSTRAINT "progress_measurements_source_binding_check" CHECK (
    ("progress_measurements"."source_type" = 'manual' AND "progress_measurements"."source_document_id" IS NULL AND "progress_measurements"."source_processing_run_id" IS NULL AND "progress_measurements"."source_quantity_row_id" IS NULL AND "progress_measurements"."source_cell_range" IS NULL)
    OR ("progress_measurements"."source_type" in ('ifc','xlsx') AND "progress_measurements"."source_document_id" IS NOT NULL AND "progress_measurements"."source_processing_run_id" IS NOT NULL AND "progress_measurements"."source_quantity_row_id" IS NOT NULL AND "progress_measurements"."source_cell_range" IS NOT NULL)
    OR ("progress_measurements"."source_type" in ('pdf','field_record') AND "progress_measurements"."source_document_id" IS NOT NULL AND "progress_measurements"."source_processing_run_id" IS NOT NULL AND "progress_measurements"."source_quantity_row_id" IS NULL AND "progress_measurements"."source_cell_range" IS NOT NULL)),
	CONSTRAINT "progress_measurements_review_binding_check" CHECK (
    ("progress_measurements"."review_status" = 'pending_review' AND "progress_measurements"."reviewed_by_user_id" IS NULL AND "progress_measurements"."reviewed_at" IS NULL AND "progress_measurements"."review_reason" IS NULL)
    OR ("progress_measurements"."review_status" in ('approved','rejected') AND "progress_measurements"."reviewed_by_user_id" IS NOT NULL AND "progress_measurements"."reviewed_at" IS NOT NULL AND length(trim("progress_measurements"."review_reason")) > 0)
    OR "progress_measurements"."review_status" = 'superseded')
);

--> statement-breakpoint
CREATE TABLE "progress_payment_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"adjustment_type" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"evidence_hash" text NOT NULL,
	"review_status" text DEFAULT 'manual_review' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_payment_adjustments_type_check" CHECK ("progress_payment_adjustments"."adjustment_type" in ('advance_payment', 'advance_recovery', 'retention', 'penalty', 'tax', 'price_difference', 'other')),
	CONSTRAINT "progress_payment_adjustments_status_check" CHECK ("progress_payment_adjustments"."review_status" in ('manual_review', 'approved', 'rejected')),
	CONSTRAINT "progress_payment_adjustments_evidence_hash_check" CHECK ("progress_payment_adjustments"."evidence_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "progress_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"expected_version" integer NOT NULL,
	"resulting_version" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"reason" text,
	"actor_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_payment_events_idempotency_key" UNIQUE("company_id","period_id","idempotency_key"),
	CONSTRAINT "progress_payment_events_resulting_version_key" UNIQUE("company_id","period_id","resulting_version"),
	CONSTRAINT "progress_payment_events_action_check" CHECK ("progress_payment_events"."action" in ('submit', 'approve', 'reject', 'correct', 'cancel')),
	CONSTRAINT "progress_payment_events_status_check" CHECK (
    ("progress_payment_events"."action"='submit' AND "progress_payment_events"."from_status"='draft' AND "progress_payment_events"."to_status"='submitted')
    OR ("progress_payment_events"."action"='approve' AND "progress_payment_events"."from_status"='submitted' AND "progress_payment_events"."to_status"='approved')
    OR ("progress_payment_events"."action"='reject' AND "progress_payment_events"."from_status"='submitted' AND "progress_payment_events"."to_status"='draft')
    OR ("progress_payment_events"."action"='cancel' AND "progress_payment_events"."from_status" in ('draft','submitted') AND "progress_payment_events"."to_status"='cancelled')
    OR ("progress_payment_events"."action"='correct' AND "progress_payment_events"."from_status"='approved' AND "progress_payment_events"."to_status"='superseded')),
	CONSTRAINT "progress_payment_events_version_check" CHECK ("progress_payment_events"."expected_version" >= 0 AND "progress_payment_events"."resulting_version" = "progress_payment_events"."expected_version" + 1),
	CONSTRAINT "progress_payment_events_request_hash_check" CHECK ("progress_payment_events"."request_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
CREATE TABLE "progress_payment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"contract_item_id" uuid NOT NULL,
	"previous_quantity" numeric(20, 4) NOT NULL,
	"current_quantity" numeric(20, 4) NOT NULL,
	"cumulative_quantity" numeric(20, 4) NOT NULL,
	"unit_price_snapshot" numeric(20, 2) NOT NULL,
	"current_amount" numeric(20, 2) NOT NULL,
	"cumulative_amount" numeric(20, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_payment_lines_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "progress_payment_lines_period_item_key" UNIQUE("company_id","period_id","contract_item_id"),
	CONSTRAINT "progress_payment_lines_quantity_check" CHECK ("progress_payment_lines"."previous_quantity" >= 0 AND "progress_payment_lines"."current_quantity" >= 0 AND "progress_payment_lines"."cumulative_quantity" = "progress_payment_lines"."previous_quantity" + "progress_payment_lines"."current_quantity"),
	CONSTRAINT "progress_payment_lines_amount_check" CHECK ("progress_payment_lines"."unit_price_snapshot" >= 0 AND "progress_payment_lines"."current_amount" >= 0 AND "progress_payment_lines"."cumulative_amount" >= 0 AND "progress_payment_lines"."cumulative_amount" = round("progress_payment_lines"."cumulative_quantity" * "progress_payment_lines"."unit_price_snapshot", 2) AND "progress_payment_lines"."current_amount" = "progress_payment_lines"."cumulative_amount" - round("progress_payment_lines"."previous_quantity" * "progress_payment_lines"."unit_price_snapshot", 2))
);

--> statement-breakpoint
CREATE TABLE "progress_payment_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"payment_number" integer NOT NULL,
	"revision_number" integer DEFAULT 0 NOT NULL,
	"parent_period_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"scope_hash" text,
	"correction_reason" text,
	"submitted_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"sealed_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_payment_periods_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "progress_payment_periods_id_contract_company_key" UNIQUE("id","contract_id","company_id"),
	CONSTRAINT "progress_payment_periods_parent_scope_key" UNIQUE("id","contract_id","payment_number","company_id"),
	CONSTRAINT "progress_payment_periods_revision_key" UNIQUE("company_id","contract_id","payment_number","revision_number"),
	CONSTRAINT "progress_payment_periods_status_check" CHECK ("progress_payment_periods"."status" in ('draft', 'submitted', 'approved', 'superseded', 'cancelled')),
	CONSTRAINT "progress_payment_periods_dates_check" CHECK ("progress_payment_periods"."period_end" >= "progress_payment_periods"."period_start"),
	CONSTRAINT "progress_payment_periods_sequence_check" CHECK ("progress_payment_periods"."payment_number" > 0 AND "progress_payment_periods"."revision_number" >= 0 AND "progress_payment_periods"."version" >= 0),
	CONSTRAINT "progress_payment_periods_scope_hash_check" CHECK (("progress_payment_periods"."scope_hash" IS NULL OR "progress_payment_periods"."scope_hash" ~ '^[0-9a-f]{64}$') AND ("progress_payment_periods"."status" <> 'approved' OR "progress_payment_periods"."scope_hash" ~ '^[0-9a-f]{64}$'))
);

--> statement-breakpoint
ALTER TABLE "construction_contract_items" ADD CONSTRAINT "construction_contract_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "construction_contract_items" ADD CONSTRAINT "construction_contract_items_contract_id_company_id_construction_contracts_id_company_id_fk" FOREIGN KEY ("contract_id","company_id") REFERENCES "public"."construction_contracts"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "construction_contract_items" ADD CONSTRAINT "construction_contract_items_source_quotation_item_id_company_id_quotation_items_id_company_id_fk" FOREIGN KEY ("source_quotation_item_id","company_id") REFERENCES "public"."quotation_items"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "construction_contracts" ADD CONSTRAINT "construction_contracts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "construction_contracts" ADD CONSTRAINT "construction_contracts_source_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("source_quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "construction_contracts" ADD CONSTRAINT "construction_contracts_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_variations" ADD CONSTRAINT "contract_variations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_variations" ADD CONSTRAINT "contract_variations_contract_id_company_id_construction_contracts_id_company_id_fk" FOREIGN KEY ("contract_id","company_id") REFERENCES "public"."construction_contracts"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_variations" ADD CONSTRAINT "contract_variations_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "final_accounts" ADD CONSTRAINT "final_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "final_accounts" ADD CONSTRAINT "final_accounts_contract_id_company_id_construction_contracts_id_company_id_fk" FOREIGN KEY ("contract_id","company_id") REFERENCES "public"."construction_contracts"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "final_accounts" ADD CONSTRAINT "final_accounts_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurement_review_events" ADD CONSTRAINT "progress_measurement_review_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurement_review_events" ADD CONSTRAINT "progress_measurement_review_events_period_id_contract_id_company_id_progress_payment_periods_id_contract_id_company_id_fk" FOREIGN KEY ("period_id","contract_id","company_id") REFERENCES "public"."progress_payment_periods"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurement_review_events" ADD CONSTRAINT "progress_measurement_review_events_measurement_id_contract_id_period_id_company_id_progress_measurements_id_contract_id_period_id_company_id_fk" FOREIGN KEY ("measurement_id","contract_id","period_id","company_id") REFERENCES "public"."progress_measurements"("id","contract_id","period_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurement_review_events" ADD CONSTRAINT "progress_measurement_review_events_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_period_id_contract_id_company_id_progress_payment_periods_id_contract_id_company_id_fk" FOREIGN KEY ("period_id","contract_id","company_id") REFERENCES "public"."progress_payment_periods"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_contract_item_id_contract_id_company_id_construction_contract_items_id_contract_id_company_id_fk" FOREIGN KEY ("contract_item_id","contract_id","company_id") REFERENCES "public"."construction_contract_items"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_parent_measurement_id_contract_item_id_contract_id_company_id_progress_measurements_id_contract_item_id_contract_id_company_id_fk" FOREIGN KEY ("parent_measurement_id","contract_item_id","contract_id","company_id") REFERENCES "public"."progress_measurements"("id","contract_item_id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_source_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("source_document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_source_processing_run_id_source_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("source_processing_run_id","source_document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_source_quantity_row_id_company_id_source_document_id_source_processing_run_id_normalized_quantity_rows_id_company_id_document_id_processing_run_id_fk" FOREIGN KEY ("source_quantity_row_id","company_id","source_document_id","source_processing_run_id") REFERENCES "public"."normalized_quantity_rows"("id","company_id","document_id","processing_run_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ADD CONSTRAINT "progress_measurements_reviewed_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("reviewed_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_adjustments" ADD CONSTRAINT "progress_payment_adjustments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_adjustments" ADD CONSTRAINT "progress_payment_adjustments_period_id_contract_id_company_id_progress_payment_periods_id_contract_id_company_id_fk" FOREIGN KEY ("period_id","contract_id","company_id") REFERENCES "public"."progress_payment_periods"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_adjustments" ADD CONSTRAINT "progress_payment_adjustments_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_events" ADD CONSTRAINT "progress_payment_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_events" ADD CONSTRAINT "progress_payment_events_period_id_contract_id_company_id_progress_payment_periods_id_contract_id_company_id_fk" FOREIGN KEY ("period_id","contract_id","company_id") REFERENCES "public"."progress_payment_periods"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_events" ADD CONSTRAINT "progress_payment_events_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_lines" ADD CONSTRAINT "progress_payment_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_lines" ADD CONSTRAINT "progress_payment_lines_period_id_contract_id_company_id_progress_payment_periods_id_contract_id_company_id_fk" FOREIGN KEY ("period_id","contract_id","company_id") REFERENCES "public"."progress_payment_periods"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_lines" ADD CONSTRAINT "progress_payment_lines_contract_item_id_contract_id_company_id_construction_contract_items_id_contract_id_company_id_fk" FOREIGN KEY ("contract_item_id","contract_id","company_id") REFERENCES "public"."construction_contract_items"("id","contract_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ADD CONSTRAINT "progress_payment_periods_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ADD CONSTRAINT "progress_payment_periods_contract_id_company_id_construction_contracts_id_company_id_fk" FOREIGN KEY ("contract_id","company_id") REFERENCES "public"."construction_contracts"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ADD CONSTRAINT "progress_payment_periods_parent_period_id_contract_id_payment_number_company_id_progress_payment_periods_id_contract_id_payment_number_company_id_fk" FOREIGN KEY ("parent_period_id","contract_id","payment_number","company_id") REFERENCES "public"."progress_payment_periods"("id","contract_id","payment_number","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ADD CONSTRAINT "progress_payment_periods_created_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("created_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ADD CONSTRAINT "progress_payment_periods_submitted_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("submitted_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ADD CONSTRAINT "progress_payment_periods_approved_by_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("approved_by_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_progress_measurement_review_events_period_created" ON "progress_measurement_review_events" USING btree ("company_id","period_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_progress_measurements_period_created" ON "progress_measurements" USING btree ("company_id","period_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_progress_payment_adjustments_period_created" ON "progress_payment_adjustments" USING btree ("company_id","period_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_progress_payment_events_period_created" ON "progress_payment_events" USING btree ("company_id","period_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_progress_payment_lines_contract_period_item" ON "progress_payment_lines" USING btree ("company_id","contract_id","period_id","contract_item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "progress_payment_periods_current_key" ON "progress_payment_periods" USING btree ("company_id","contract_id","payment_number") WHERE "progress_payment_periods"."is_current" = true;
--> statement-breakpoint
CREATE FUNCTION enforce_progress_period_transition() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE contract_amount numeric(20,2);
DECLARE item_amount numeric(20,2);
DECLARE item_count integer;
DECLARE latest_payment_number integer;
DECLARE latest_status text;
DECLARE latest_sealed_at timestamptz;
DECLARE latest_scope_hash text;
DECLARE parent_revision integer;
DECLARE parent_status text;
DECLARE parent_is_current boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('progress:' || NEW.company_id::text || ':' || NEW.contract_id::text, 0));
    SELECT initial_amount INTO STRICT contract_amount FROM construction_contracts
      WHERE id=NEW.contract_id AND company_id=NEW.company_id;
    SELECT count(*)::integer, coalesce(sum(round(contract_quantity * unit_price, 2)),0)::numeric(20,2)
      INTO item_count,item_amount FROM construction_contract_items
      WHERE contract_id=NEW.contract_id AND company_id=NEW.company_id;
    IF item_count=0 OR item_amount <> contract_amount THEN
      RAISE EXCEPTION 'progress contract requires reconciled item scope before first period';
    END IF;
    IF NEW.status <> 'draft' OR NEW.version <> 0 OR NEW.is_current <> true
       OR NEW.scope_hash IS NOT NULL OR NEW.submitted_by_user_id IS NOT NULL OR NEW.approved_by_user_id IS NOT NULL
       OR NEW.submitted_at IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.sealed_at IS NOT NULL THEN
      RAISE EXCEPTION 'new progress payment revision must start as unsealed draft version zero';
    END IF;
    IF (NEW.revision_number = 0 AND NEW.parent_period_id IS NOT NULL)
       OR (NEW.revision_number > 0 AND NEW.parent_period_id IS NULL) THEN
      RAISE EXCEPTION 'progress payment revision parent binding is invalid';
    END IF;
    IF NEW.revision_number = 0 THEN
      SELECT payment_number,status,sealed_at,scope_hash INTO latest_payment_number,latest_status,latest_sealed_at,latest_scope_hash
        FROM progress_payment_periods WHERE company_id=NEW.company_id AND contract_id=NEW.contract_id AND is_current=true
        ORDER BY payment_number DESC LIMIT 1;
      IF latest_payment_number IS NULL AND NEW.payment_number <> 1 THEN
        RAISE EXCEPTION 'first progress payment number must be one';
      END IF;
      IF latest_payment_number IS NOT NULL AND (
        NEW.payment_number <> latest_payment_number + 1 OR latest_status <> 'approved'
        OR latest_sealed_at IS NULL OR latest_scope_hash !~ '^[0-9a-f]{64}$'
      ) THEN RAISE EXCEPTION 'new progress payment requires next number and sealed prior current period'; END IF;
    ELSE
      SELECT revision_number,status,is_current INTO STRICT parent_revision,parent_status,parent_is_current
        FROM progress_payment_periods WHERE id=NEW.parent_period_id AND company_id=NEW.company_id
          AND contract_id=NEW.contract_id AND payment_number=NEW.payment_number;
      IF NEW.revision_number <> parent_revision + 1 OR parent_status <> 'superseded' OR parent_is_current <> false THEN
        RAISE EXCEPTION 'correction revision requires exact superseded parent revision';
      END IF;
      IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.company_id=NEW.company_id AND p.contract_id=NEW.contract_id
        AND p.payment_number > NEW.payment_number AND p.status <> 'cancelled') THEN
        RAISE EXCEPTION 'correction revision cannot follow a later non-cancelled period';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'progress payment periods are append-only revisions'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('progress:' || OLD.company_id::text || ':' || OLD.contract_id::text, 0));
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.contract_id IS DISTINCT FROM OLD.contract_id OR NEW.payment_number IS DISTINCT FROM OLD.payment_number
     OR NEW.revision_number IS DISTINCT FROM OLD.revision_number OR NEW.parent_period_id IS DISTINCT FROM OLD.parent_period_id
     OR NEW.period_start IS DISTINCT FROM OLD.period_start OR NEW.period_end IS DISTINCT FROM OLD.period_end
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'progress payment revision identity is immutable';
  END IF;
  IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'progress payment version must advance exactly once'; END IF;
  IF OLD.status = 'draft' AND NEW.status IN ('draft','submitted','cancelled') THEN NULL;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('draft','approved','cancelled') THEN NULL;
  ELSIF OLD.status = 'approved' AND NEW.status = 'superseded' AND NEW.is_current = false THEN NULL;
  ELSE RAISE EXCEPTION 'invalid progress payment state transition'; END IF;
  IF OLD.status = 'approved' AND NEW.status = 'superseded' AND EXISTS (
    SELECT 1 FROM progress_payment_periods p
    WHERE p.company_id=OLD.company_id AND p.contract_id=OLD.contract_id
      AND p.payment_number > OLD.payment_number AND p.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'progress payment correction cannot supersede a period followed by a later non-cancelled period';
  END IF;
  IF OLD.status = 'approved' AND NEW.status = 'superseded'
     AND (to_jsonb(NEW) - ARRAY['status','is_current','version','updated_at'])
         IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','is_current','version','updated_at']) THEN
    RAISE EXCEPTION 'approved progress payment sealed fields are immutable while superseding';
  END IF;
  IF NEW.status = 'approved' AND (
    NEW.approved_at IS NULL OR NEW.sealed_at IS NULL OR NEW.approved_by_user_id IS NULL
    OR NEW.submitted_by_user_id IS NULL OR NEW.submitted_by_user_id = NEW.approved_by_user_id
    OR NEW.scope_hash IS NULL OR NEW.scope_hash !~ '^[0-9a-f]{64}$'
  ) THEN RAISE EXCEPTION 'approved progress payment requires maker-checker evidence'; END IF;
  IF NEW.status = 'approved' THEN
    IF NOT EXISTS (SELECT 1 FROM progress_measurements m WHERE m.period_id=NEW.id AND m.company_id=NEW.company_id AND m.review_status='approved')
       OR EXISTS (SELECT 1 FROM progress_measurements m WHERE m.period_id=NEW.id AND m.company_id=NEW.company_id AND m.review_status <> 'approved') THEN
      RAISE EXCEPTION 'approved progress payment requires only approved measurements';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM progress_payment_lines l WHERE l.period_id=NEW.id AND l.company_id=NEW.company_id)
       OR EXISTS (
         WITH measured AS (
           SELECT contract_item_id,sum(quantity)::numeric(20,4) quantity FROM progress_measurements
           WHERE period_id=NEW.id AND company_id=NEW.company_id AND review_status='approved' GROUP BY contract_item_id
         ), lines AS (
           SELECT contract_item_id,current_quantity FROM progress_payment_lines
           WHERE period_id=NEW.id AND company_id=NEW.company_id
         )
         SELECT 1 FROM measured m FULL JOIN lines l ON l.contract_item_id=m.contract_item_id
         WHERE m.contract_item_id IS NULL OR l.contract_item_id IS NULL OR m.quantity <> l.current_quantity
       ) THEN RAISE EXCEPTION 'approved progress payment requires reconciled materialized lines'; END IF;
    IF EXISTS (SELECT 1 FROM progress_payment_adjustments a WHERE a.period_id=NEW.id AND a.company_id=NEW.company_id AND a.review_status <> 'approved') THEN
      RAISE EXCEPTION 'approved progress payment requires approved adjustments';
    END IF;
    IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.company_id=NEW.company_id AND p.contract_id=NEW.contract_id
      AND p.is_current=true AND p.payment_number < NEW.payment_number
      AND (p.status <> 'approved' OR p.sealed_at IS NULL OR p.scope_hash !~ '^[0-9a-f]{64}$')) THEN
      RAISE EXCEPTION 'approved progress payment requires sealed prior current periods';
    END IF;
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER progress_payment_period_transition_guard
BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_periods
FOR EACH ROW EXECUTE FUNCTION enforce_progress_period_transition()
--> statement-breakpoint
CREATE FUNCTION enforce_progress_correction_child_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'superseded' AND NOT EXISTS (
    SELECT 1 FROM progress_payment_periods child
    WHERE child.company_id=OLD.company_id AND child.contract_id=OLD.contract_id
      AND child.payment_number=OLD.payment_number AND child.parent_period_id=OLD.id
      AND child.revision_number=OLD.revision_number + 1 AND child.status='draft'
      AND child.is_current=true AND child.version=0
  ) THEN
    RAISE EXCEPTION 'superseded progress payment requires exact current draft correction child';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER progress_correction_child_binding
AFTER UPDATE OF status,is_current ON progress_payment_periods
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (OLD.status = 'approved' AND NEW.status = 'superseded')
EXECUTE FUNCTION enforce_progress_correction_child_binding()
--> statement-breakpoint
CREATE FUNCTION prevent_progress_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE bound_period_id uuid;
DECLARE bound_company_id uuid;
DECLARE bound_status text;
DECLARE item_quantity numeric(20,4);
DECLARE item_price numeric(20,2);
DECLARE expected_previous numeric(20,4);
BEGIN
  IF TG_TABLE_NAME IN ('progress_payment_events','progress_measurement_review_events')
     OR (TG_TABLE_NAME = 'progress_payment_lines' AND TG_OP <> 'INSERT') THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
  END IF;
  IF TG_TABLE_NAME = 'construction_contract_items' THEN
    IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'construction_contract_items is append-only'; END IF;
    IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.contract_id=NEW.contract_id AND p.company_id=NEW.company_id) THEN
      RAISE EXCEPTION 'contract items cannot be inserted after first progress period';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'final_accounts' THEN
    IF TG_OP='INSERT' AND (NEW.status <> 'draft' OR NEW.sealed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'final account must start as unsealed draft';
    END IF;
    IF TG_OP <> 'INSERT' AND (OLD.sealed_at IS NOT NULL OR OLD.status = 'sealed') THEN
      RAISE EXCEPTION 'sealed final account is immutable';
    END IF;
    IF TG_OP='UPDATE' AND NEW.status='sealed' THEN
      RAISE EXCEPTION 'final account sealing requires append-only expert decision workflow';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'contract_variations' THEN
    IF TG_OP='INSERT' AND (NEW.status <> 'manual_review' OR NEW.decision_document_hash IS NOT NULL) THEN
      RAISE EXCEPTION 'contract variation must start in manual_review without decision attestation';
    END IF;
    IF TG_OP <> 'INSERT' AND OLD.status = 'approved' THEN RAISE EXCEPTION 'approved contract variation is immutable'; END IF;
    IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'contract variation review requires append-only expert decision workflow';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'progress_measurements' THEN
    bound_period_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'period_id')::uuid;
    bound_company_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'company_id')::uuid;
    SELECT status INTO STRICT bound_status FROM progress_payment_periods WHERE id=bound_period_id AND company_id=bound_company_id;
    IF bound_status <> 'draft' THEN RAISE EXCEPTION 'non-draft progress measurement is immutable'; END IF;
    IF TG_OP <> 'INSERT' AND OLD.review_status <> 'pending_review' THEN
      RAISE EXCEPTION 'reviewed progress measurement is immutable';
    END IF;
    IF TG_OP='UPDATE' AND (
      (to_jsonb(NEW) - ARRAY['review_status','reviewed_by_user_id','reviewed_at','review_reason'])
      IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['review_status','reviewed_by_user_id','reviewed_at','review_reason'])
    ) THEN RAISE EXCEPTION 'measurement evidence is immutable during review'; END IF;
    IF NEW.source_type IN ('pdf','field_record') THEN
      RAISE EXCEPTION 'progress measurement source pipeline is unavailable';
    END IF;
    IF NEW.source_type <> 'manual' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:document:' || NEW.company_id::text || ':' || NEW.source_document_id::text, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:run:' || NEW.company_id::text || ':' || NEW.source_processing_run_id::text, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:row:' || NEW.company_id::text || ':' || NEW.source_quantity_row_id::text, 0));
    END IF;
    IF (CASE WHEN TG_OP='INSERT' THEN NEW.source_type ELSE NEW.source_type END) <> 'manual' AND NOT EXISTS (
      SELECT 1 FROM documents d JOIN document_processing_runs r
        ON r.document_id=d.id AND r.company_id=d.company_id
      WHERE d.id=NEW.source_document_id AND d.company_id=NEW.company_id AND d.status='completed'
        AND r.id=NEW.source_processing_run_id AND r.status='succeeded'
    ) THEN RAISE EXCEPTION 'external progress measurement requires completed document and succeeded run'; END IF;
    IF NEW.source_type IN ('ifc','xlsx') AND NOT EXISTS (
      SELECT 1 FROM normalized_quantity_rows n
      WHERE n.id=NEW.source_quantity_row_id AND n.company_id=NEW.company_id
        AND n.document_id=NEW.source_document_id AND n.processing_run_id=NEW.source_processing_run_id
        AND n.source_cell_range=NEW.source_cell_range AND n.review_status IN ('approved','accepted_exception')
        AND n.normalized_quantity IS NOT NULL AND n.normalized_quantity=NEW.quantity
        AND n.normalized_unit IS NOT NULL AND n.normalized_unit=NEW.unit
    ) THEN RAISE EXCEPTION 'external progress measurement requires exact approved canonical source row binding'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'progress_payment_adjustments' THEN
    bound_period_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'period_id')::uuid;
    bound_company_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'company_id')::uuid;
    SELECT status INTO STRICT bound_status FROM progress_payment_periods WHERE id=bound_period_id AND company_id=bound_company_id;
    IF bound_status <> 'draft' THEN RAISE EXCEPTION 'progress payment adjustments are immutable outside draft'; END IF;
    IF TG_OP='INSERT' AND NEW.review_status <> 'manual_review' THEN
      RAISE EXCEPTION 'adjustment must start in manual_review';
    END IF;
    IF TG_OP='UPDATE' AND NEW.review_status IS DISTINCT FROM OLD.review_status THEN
      RAISE EXCEPTION 'adjustment review requires append-only decision workflow';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'progress_payment_lines' AND TG_OP = 'INSERT' THEN
    SELECT status INTO STRICT bound_status FROM progress_payment_periods WHERE id=NEW.period_id AND company_id=NEW.company_id;
    IF bound_status <> 'submitted' THEN RAISE EXCEPTION 'progress lines can only materialize for submitted periods'; END IF;
    SELECT contract_quantity, unit_price INTO STRICT item_quantity, item_price
      FROM construction_contract_items WHERE id=NEW.contract_item_id AND contract_id=NEW.contract_id AND company_id=NEW.company_id;
    SELECT coalesce(sum(l.current_quantity),0)::numeric(20,4) INTO expected_previous
      FROM progress_payment_lines l JOIN progress_payment_periods p ON p.id=l.period_id AND p.company_id=l.company_id
      WHERE l.company_id=NEW.company_id AND l.contract_id=NEW.contract_id AND l.contract_item_id=NEW.contract_item_id
        AND p.status='approved' AND p.payment_number < (SELECT payment_number FROM progress_payment_periods WHERE id=NEW.period_id);
    IF NEW.previous_quantity <> expected_previous OR NEW.cumulative_quantity <> expected_previous + NEW.current_quantity THEN
      RAISE EXCEPTION 'materialized progress quantity chain mismatch';
    END IF;
    IF NEW.cumulative_quantity > item_quantity THEN RAISE EXCEPTION 'cumulative quantity exceeds contract quantity'; END IF;
    IF NEW.unit_price_snapshot <> item_price
       OR NEW.cumulative_amount <> round(NEW.cumulative_quantity * item_price, 2)
       OR NEW.current_amount <> round(NEW.cumulative_quantity * item_price, 2) - round(expected_previous * item_price, 2) THEN
      RAISE EXCEPTION 'materialized progress amount mismatch';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER progress_payment_events_append_only BEFORE UPDATE OR DELETE ON progress_payment_events FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER progress_measurement_review_events_append_only BEFORE UPDATE OR DELETE ON progress_measurement_review_events FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER progress_payment_lines_append_only BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_lines FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER progress_measurements_state_guard BEFORE INSERT OR UPDATE OR DELETE ON progress_measurements FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER progress_payment_adjustments_state_guard BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_adjustments FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER construction_contract_items_append_only BEFORE INSERT OR UPDATE OR DELETE ON construction_contract_items FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER contract_variations_approved_guard BEFORE INSERT OR UPDATE OR DELETE ON contract_variations FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE TRIGGER final_accounts_sealed_guard BEFORE INSERT OR UPDATE OR DELETE ON final_accounts FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()
--> statement-breakpoint
CREATE FUNCTION prevent_progress_bound_source_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE source_kind text;
BEGIN
  source_kind := CASE TG_TABLE_NAME
    WHEN 'normalized_quantity_rows' THEN 'row'
    WHEN 'document_processing_runs' THEN 'run'
    WHEN 'documents' THEN 'document'
  END;
  PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:' || source_kind || ':' || OLD.company_id::text || ':' || OLD.id::text, 0));
  IF (TG_TABLE_NAME = 'normalized_quantity_rows' AND EXISTS (
      SELECT 1 FROM progress_measurements WHERE source_quantity_row_id=OLD.id AND company_id=OLD.company_id
    )) OR (TG_TABLE_NAME = 'document_processing_runs' AND EXISTS (
      SELECT 1 FROM progress_measurements WHERE source_processing_run_id=OLD.id AND company_id=OLD.company_id
    )) OR (TG_TABLE_NAME = 'documents' AND EXISTS (
      SELECT 1 FROM progress_measurements WHERE source_document_id=OLD.id AND company_id=OLD.company_id
    )) THEN
    RAISE EXCEPTION 'progress-bound source evidence is immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER progress_source_row_immutable BEFORE UPDATE OF sheet_name, source_row_number, raw_description, raw_position_code, raw_unit, raw_quantity, source_cell_range, review_status, reviewed_at, reviewer_user_id, reviewer_notes, normalized_description, normalized_position_code, normalized_unit, normalized_quantity, normalized_waste_percent, formula_json, quantity_source, mapping_confidence, findings_json OR DELETE ON normalized_quantity_rows FOR EACH ROW EXECUTE FUNCTION prevent_progress_bound_source_mutation()
--> statement-breakpoint
CREATE TRIGGER progress_source_run_immutable BEFORE UPDATE OF pipeline_version, provider, model, status, current_stage OR DELETE ON document_processing_runs FOR EACH ROW EXECUTE FUNCTION prevent_progress_bound_source_mutation()
--> statement-breakpoint
CREATE TRIGGER progress_source_document_immutable BEFORE UPDATE OF checksum_sha256, status OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_progress_bound_source_mutation()
--> statement-breakpoint
CREATE FUNCTION enforce_progress_measurement_review_event() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE measurement_row progress_measurements%ROWTYPE;
DECLARE period_version integer;
DECLARE period_status text;
BEGIN
  SELECT * INTO STRICT measurement_row FROM progress_measurements
    WHERE id=NEW.measurement_id AND company_id=NEW.company_id AND contract_id=NEW.contract_id AND period_id=NEW.period_id;
  SELECT version,status INTO STRICT period_version,period_status FROM progress_payment_periods
    WHERE id=NEW.period_id AND company_id=NEW.company_id AND contract_id=NEW.contract_id;
  IF period_status <> 'draft' OR period_version <> NEW.expected_version OR NEW.resulting_version <> period_version + 1 THEN
    RAISE EXCEPTION 'review event period version or state mismatch';
  END IF;
  IF measurement_row.created_by_user_id = NEW.actor_user_id THEN RAISE EXCEPTION 'measurement maker-checker required'; END IF;
  IF measurement_row.review_status <> NEW.decision OR measurement_row.reviewed_by_user_id <> NEW.actor_user_id
     OR measurement_row.reviewed_at IS NULL OR measurement_row.review_reason <> NEW.reason THEN
    RAISE EXCEPTION 'review event does not match reviewed measurement';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER progress_measurement_review_event_guard
BEFORE INSERT ON progress_measurement_review_events
FOR EACH ROW EXECUTE FUNCTION enforce_progress_measurement_review_event()
--> statement-breakpoint
CREATE FUNCTION enforce_progress_measurement_review_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.review_status IN ('approved','rejected') AND NOT EXISTS (
    SELECT 1 FROM progress_measurement_review_events e
    WHERE e.measurement_id=NEW.id AND e.period_id=NEW.period_id AND e.contract_id=NEW.contract_id AND e.company_id=NEW.company_id
      AND e.decision=NEW.review_status AND e.actor_user_id=NEW.reviewed_by_user_id AND e.reason=NEW.review_reason
  ) THEN RAISE EXCEPTION 'reviewed measurement requires append-only review event'; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER progress_measurement_review_binding
AFTER INSERT OR UPDATE OF review_status, reviewed_by_user_id, reviewed_at, review_reason ON progress_measurements
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_progress_measurement_review_binding()
--> statement-breakpoint
CREATE FUNCTION prevent_progress_contract_header_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.contract_id=OLD.id AND p.company_id=OLD.company_id) THEN
    IF TG_OP='DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.source_quotation_id IS DISTINCT FROM OLD.source_quotation_id OR NEW.contract_number IS DISTINCT FROM OLD.contract_number
       OR NEW.project_name IS DISTINCT FROM OLD.project_name OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.regime IS DISTINCT FROM OLD.regime OR NEW.initial_amount IS DISTINCT FROM OLD.initial_amount
       OR NEW.source_document_hash IS DISTINCT FROM OLD.source_document_hash OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'progress contract header identity amount and source are immutable after first period';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER construction_contracts_period_lock
BEFORE UPDATE OR DELETE ON construction_contracts
FOR EACH ROW EXECUTE FUNCTION prevent_progress_contract_header_mutation()
--> statement-breakpoint
CREATE FUNCTION enforce_progress_payment_event() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE period_row progress_payment_periods%ROWTYPE;
BEGIN
  SELECT * INTO STRICT period_row FROM progress_payment_periods
    WHERE id=NEW.period_id AND company_id=NEW.company_id AND contract_id=NEW.contract_id;
  IF period_row.status <> NEW.to_status OR period_row.version <> NEW.resulting_version THEN
    RAISE EXCEPTION 'progress payment event does not match current period state and version';
  END IF;
  IF NEW.action='submit' AND period_row.submitted_by_user_id IS DISTINCT FROM NEW.actor_user_id THEN
    RAISE EXCEPTION 'progress payment submit event actor mismatch';
  END IF;
  IF NEW.action='approve' AND period_row.approved_by_user_id IS DISTINCT FROM NEW.actor_user_id THEN
    RAISE EXCEPTION 'progress payment approve event actor mismatch';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER progress_payment_event_guard
BEFORE INSERT ON progress_payment_events
FOR EACH ROW EXECUTE FUNCTION enforce_progress_payment_event()
--> statement-breakpoint
CREATE FUNCTION enforce_progress_payment_event_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT EXISTS (
    SELECT 1 FROM progress_payment_events e
    WHERE e.period_id=NEW.id AND e.contract_id=NEW.contract_id AND e.company_id=NEW.company_id
      AND e.from_status=OLD.status AND e.to_status=NEW.status
      AND e.expected_version=OLD.version AND e.resulting_version=NEW.version
  ) THEN RAISE EXCEPTION 'progress payment state change requires matching append-only event'; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER progress_payment_event_binding
AFTER UPDATE OF status ON progress_payment_periods
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_progress_payment_event_binding()
