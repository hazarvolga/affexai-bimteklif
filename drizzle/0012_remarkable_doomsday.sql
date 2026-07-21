CREATE TABLE "allplan_lesson_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_activity_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_activity_user_company_lesson_key" UNIQUE("user_id","company_id","lesson_slug"),
	CONSTRAINT "allplan_lesson_activity_lesson_slug_check" CHECK (length("allplan_lesson_activity"."lesson_slug") between 1 and 180),
	CONSTRAINT "allplan_lesson_activity_seconds_check" CHECK ("allplan_lesson_activity"."active_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "allplan_lesson_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_bookmarks_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_bookmarks_user_company_lesson_key" UNIQUE("user_id","company_id","lesson_slug"),
	CONSTRAINT "allplan_lesson_bookmarks_lesson_slug_check" CHECK (length("allplan_lesson_bookmarks"."lesson_slug") between 1 and 180)
);
--> statement-breakpoint
CREATE TABLE "allplan_lesson_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_notes_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_notes_lesson_slug_check" CHECK (length("allplan_lesson_notes"."lesson_slug") between 1 and 180),
	CONSTRAINT "allplan_lesson_notes_body_check" CHECK (length("allplan_lesson_notes"."body") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "allplan_lesson_activity" ADD CONSTRAINT "allplan_lesson_activity_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_lesson_bookmarks" ADD CONSTRAINT "allplan_lesson_bookmarks_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_lesson_notes" ADD CONSTRAINT "allplan_lesson_notes_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_activity_user" ON "allplan_lesson_activity" USING btree ("company_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_bookmarks_user" ON "allplan_lesson_bookmarks" USING btree ("company_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_notes_user_lesson" ON "allplan_lesson_notes" USING btree ("company_id","user_id","lesson_slug","created_at");