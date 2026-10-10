CREATE TABLE IF NOT EXISTS "pricing_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"authority" text,
	"category" text NOT NULL,
	"source_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"sync_frequency" text DEFAULT 'monthly' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"validity_start" timestamp with time zone,
	"validity_end" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"version_tag" text DEFAULT '2026/1' NOT NULL,
	"data_hash" text,
	"crawler_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_data_sources_category_check" CHECK ("category" in ('official_gazette', 'tuik_index', 'market_commodity', 'epys_standard')),
	CONSTRAINT "pricing_data_sources_status_check" CHECK ("status" in ('active', 'syncing', 'error', 'stale')),
	CONSTRAINT "pricing_data_sources_sync_freq_check" CHECK ("sync_frequency" in ('realtime', 'daily', 'weekly', 'monthly', 'annually'))
);

CREATE TABLE IF NOT EXISTS "price_feed_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL REFERENCES "pricing_data_sources"("id") ON DELETE CASCADE,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"unit" text NOT NULL,
	"current_price" numeric(20, 2),
	"crawled_price" numeric(20, 2) NOT NULL,
	"diff_percent" numeric(6, 2),
	"source_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"confidence_score" numeric(4, 2) DEFAULT '0.90' NOT NULL,
	"notes" text,
	"crawled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" uuid REFERENCES "users"("id"),
	CONSTRAINT "price_feed_staging_status_check" CHECK ("status" in ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS "idx_price_feed_staging_status" ON "price_feed_staging"("status");
CREATE INDEX IF NOT EXISTS "idx_pricing_data_sources_category" ON "pricing_data_sources"("category");
