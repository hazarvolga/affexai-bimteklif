CREATE TABLE "rate_limit_buckets" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"resets_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_request_count_check" CHECK ("rate_limit_buckets"."request_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_buckets_expiry" ON "rate_limit_buckets" USING btree ("resets_at");