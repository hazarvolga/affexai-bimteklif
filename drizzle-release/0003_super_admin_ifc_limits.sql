ALTER TABLE "companies" ADD COLUMN "is_smartcheck_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "admin_notes" text;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "monthly_ifc_limit" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "ifc_max_file_mb" integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "ifc_max_concurrent" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "bonus_ifc_limit" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "ifc_count" integer DEFAULT 0 NOT NULL;
