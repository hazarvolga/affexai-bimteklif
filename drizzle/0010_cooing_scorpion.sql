ALTER TABLE "quotations" ADD COLUMN "observed_actual_cost" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "observed_actual_duration_months" integer;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "calibration_status" text DEFAULT 'not_collected' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "calibration_note" text;