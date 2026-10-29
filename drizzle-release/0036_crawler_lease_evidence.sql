ALTER TABLE "price_feed_staging" ADD COLUMN "content_hash" text;
--> statement-breakpoint
ALTER TABLE "price_feed_staging" ADD COLUMN "source_identity" jsonb;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "crawl_lease_token" uuid;
--> statement-breakpoint
ALTER TABLE "pricing_data_sources" ADD COLUMN "crawl_lease_until" timestamp with time zone;
