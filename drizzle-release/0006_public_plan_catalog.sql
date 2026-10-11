ALTER TABLE "plans" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "marketing_badge" text;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "marketing_description" text;
