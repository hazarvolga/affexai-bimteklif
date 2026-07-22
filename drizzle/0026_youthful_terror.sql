ALTER TABLE "companies" ADD COLUMN "smartcheck_max_waste_percent" numeric(5, 2) DEFAULT '20' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "import_mapping_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD COLUMN "raw_waste_percent" text;--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ADD COLUMN "normalized_waste_percent" numeric(5, 2) DEFAULT '0' NOT NULL;