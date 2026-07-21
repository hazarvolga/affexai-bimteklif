CREATE TABLE "allplan_lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_lesson_progress_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "allplan_lesson_progress_user_company_lesson_key" UNIQUE("user_id","company_id","lesson_slug"),
	CONSTRAINT "allplan_lesson_progress_lesson_slug_check" CHECK (length("allplan_lesson_progress"."lesson_slug") between 1 and 180)
);
--> statement-breakpoint
ALTER TABLE "allplan_lesson_progress" ADD CONSTRAINT "allplan_lesson_progress_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_allplan_lesson_progress_user" ON "allplan_lesson_progress" USING btree ("company_id","user_id","updated_at");