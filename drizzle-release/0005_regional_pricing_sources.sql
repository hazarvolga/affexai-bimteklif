CREATE TABLE "price_feed_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
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
	"reviewed_by_user_id" uuid,
	CONSTRAINT "price_feed_staging_status_check" CHECK ("price_feed_staging"."status" in ('pending', 'approved', 'rejected'))
);

--> statement-breakpoint
CREATE TABLE "pricing_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"authority" text,
	"category" text NOT NULL,
	"source_url" text,
	"country_code" text DEFAULT 'TR' NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
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
	CONSTRAINT "pricing_data_sources_code_unique" UNIQUE("code"),
	CONSTRAINT "pricing_data_sources_category_check" CHECK ("pricing_data_sources"."category" in ('official_gazette', 'tuik_index', 'market_commodity', 'epys_standard')),
	CONSTRAINT "pricing_data_sources_status_check" CHECK ("pricing_data_sources"."status" in ('active', 'syncing', 'error', 'stale')),
	CONSTRAINT "pricing_data_sources_sync_freq_check" CHECK ("pricing_data_sources"."sync_frequency" in ('realtime', 'daily', 'weekly', 'monthly', 'annually'))
);

--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "country_code" text DEFAULT 'TR' NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "measurement_system" text DEFAULT 'metric' NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "active_standard" text DEFAULT 'TBDY_TS500' NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "classification_system" text DEFAULT 'CSB_TR' NOT NULL;
--> statement-breakpoint
ALTER TABLE "price_feed_staging" ADD CONSTRAINT "price_feed_staging_source_id_pricing_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."pricing_data_sources"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_feed_staging" ADD CONSTRAINT "price_feed_staging_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_price_feed_staging_status" ON "price_feed_staging" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_pricing_data_sources_category" ON "pricing_data_sources" USING btree ("category");
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_code_check" CHECK ("companies"."country_code" in ('TR', 'DE', 'GB', 'US', 'AE'));
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_measurement_system_check" CHECK ("companies"."measurement_system" in ('metric', 'imperial'));
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_active_standard_check" CHECK ("companies"."active_standard" in ('TBDY_TS500', 'EUROCODE_2', 'ACI_318'));
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_classification_system_check" CHECK ("companies"."classification_system" in ('CSB_TR', 'DIN_276', 'CSI_MASTERFORMAT', 'NRM2_UK'));
