ALTER TABLE "clients" ADD COLUMN "privacy_status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "privacy_masked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_privacy_status_check" CHECK ("clients"."privacy_status" in ('active', 'requested', 'hold', 'masked'));
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_privacy_mask_check" CHECK ("clients"."privacy_status" <> 'masked' OR ("clients"."name" = 'Maskelenmiş müşteri' AND "clients"."phone" IS NULL AND "clients"."email" IS NULL AND "clients"."address" IS NULL AND "clients"."notes" IS NULL AND "clients"."privacy_masked_at" IS NOT NULL));
