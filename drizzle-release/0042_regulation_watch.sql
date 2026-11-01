CREATE TABLE "regulation_watch_days" (
	"issue_date" date PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regulation_watch_days_status_valid" CHECK ("regulation_watch_days"."status" in ('checked', 'failed'))
);

--> statement-breakpoint
CREATE TABLE "regulation_watch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'resmi_gazete' NOT NULL,
	"issue_date" date NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"matched_keywords" jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regulation_watch_items_url_unique" UNIQUE("url"),
	CONSTRAINT "regulation_watch_items_status_valid" CHECK ("regulation_watch_items"."status" in ('new', 'reviewed', 'dismissed'))
);

--> statement-breakpoint
CREATE INDEX "regulation_watch_items_issue_date_idx" ON "regulation_watch_items" USING btree ("issue_date");
