CREATE TABLE "allplan_checkpoint_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_slug" text NOT NULL,
	"tool" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_checkpoint_attempts_lesson_slug_check" CHECK (length("allplan_checkpoint_attempts"."lesson_slug") between 1 and 180),
	CONSTRAINT "allplan_checkpoint_attempts_tool_check" CHECK ("allplan_checkpoint_attempts"."tool" in ('wall-simulator', 'coordinate-calculator', 'shortcut-trainer', 'reinforcement-estimator'))
);
--> statement-breakpoint
ALTER TABLE "allplan_checkpoint_attempts" ADD CONSTRAINT "allplan_checkpoint_attempts_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_allplan_checkpoint_attempts_user_lesson" ON "allplan_checkpoint_attempts" USING btree ("company_id","user_id","lesson_slug","attempted_at");