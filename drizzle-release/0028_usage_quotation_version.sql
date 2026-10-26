ALTER TABLE "usage_logs" ADD COLUMN "quotation_id" uuid;
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "quotation_version_key" text;
--> statement-breakpoint
CREATE INDEX "idx_usage_logs_quotation_version" ON "usage_logs" USING btree ("company_id","feature","quotation_id","quotation_version_key");
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_quotation_version_pair" CHECK (("usage_logs"."quotation_id" IS NULL) = ("usage_logs"."quotation_version_key" IS NULL));
