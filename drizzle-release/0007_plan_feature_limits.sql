ALTER TABLE "plans" ADD COLUMN "monthly_ai_limit" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "monthly_pdf_limit" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "monthly_crm_limit" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "monthly_regulation_limit" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "monthly_profit_analysis_limit" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "storage_max_bytes" bigint;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_documents" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "is_trial" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "plans_single_trial_idx" ON "plans" USING btree ("is_trial") WHERE "plans"."is_trial";
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_feature_limits_nonnegative" CHECK (coalesce("plans"."monthly_ai_limit", 0) >= 0 AND coalesce("plans"."monthly_pdf_limit", 0) >= 0 AND coalesce("plans"."monthly_crm_limit", 0) >= 0 AND coalesce("plans"."monthly_regulation_limit", 0) >= 0 AND coalesce("plans"."monthly_profit_analysis_limit", 0) >= 0 AND coalesce("plans"."storage_max_bytes", 1) > 0 AND coalesce("plans"."max_documents", 1) > 0);
