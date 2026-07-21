CREATE TABLE "academy_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"payment_reference" text NOT NULL,
	"payload_hash" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_payment_events_provider_event_key" UNIQUE("provider","event_id"),
	CONSTRAINT "academy_payment_events_type_check" CHECK ("academy_payment_events"."event_type" in ('academy.purchase.completed', 'academy.purchase.refunded'))
);
--> statement-breakpoint
ALTER TABLE "academy_payment_events" ADD CONSTRAINT "academy_payment_events_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_payment_events" ADD CONSTRAINT "academy_payment_events_enrollment_id_company_id_academy_enrollments_id_company_id_fk" FOREIGN KEY ("enrollment_id","company_id") REFERENCES "public"."academy_enrollments"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academy_payment_events_reference" ON "academy_payment_events" USING btree ("provider","payment_reference");