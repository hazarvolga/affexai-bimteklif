ALTER TABLE "quotation_items" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "source_processing_run_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "source_quantity_row_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "source_cell_range" text;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "source_rule_version" text;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "transfer_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "governance_status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "jurisdiction" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "contract_type" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "official_authority" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "source_document_identifier" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "source_document_hash" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "standard_version" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "effective_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "effective_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "unit_policy_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "rounding_policy_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "applicability" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "exceptions" text;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "technical_reviewer_user_id" uuid;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD COLUMN "technical_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_technical_reviewer_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("technical_reviewer_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_items_transfer_idempotency_idx" ON "quotation_items" USING btree ("company_id","quotation_id","transfer_idempotency_key") WHERE "quotation_items"."transfer_idempotency_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_governance_status_check" CHECK ("rule_versions"."governance_status" in ('draft', 'advisory', 'approved'));