ALTER TABLE "quotation_items" ADD COLUMN "quantity_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "price_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "source_reference" text;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "verification_status" text DEFAULT 'unverified' NOT NULL;