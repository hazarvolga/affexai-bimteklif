ALTER TABLE "quotation_financials" ADD COLUMN "cost_data_status" text DEFAULT 'incomplete' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "cost_unit_price" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "waste_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "cost_category" text DEFAULT 'material' NOT NULL;