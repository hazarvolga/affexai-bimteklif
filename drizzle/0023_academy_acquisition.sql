CREATE TABLE "academy_acquisition_events" (
	"acquisition_id" text PRIMARY KEY NOT NULL,
	"landing_path" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"registered_user_id" uuid,
	"registered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "academy_acquisition_events" ADD CONSTRAINT "academy_acquisition_events_registered_user_id_users_id_fk" FOREIGN KEY ("registered_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academy_acquisition_registered" ON "academy_acquisition_events" USING btree ("registered_at");