ALTER TABLE "pilot_applications" ADD COLUMN "offer_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD COLUMN "offer_currency" text DEFAULT 'TRY' NOT NULL;--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD COLUMN "offer_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD COLUMN "payment_status" text DEFAULT 'not_offered' NOT NULL;--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD COLUMN "paid_at" timestamp;