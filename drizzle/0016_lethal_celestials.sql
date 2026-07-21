ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_id_company_id_key" UNIQUE("id","company_id");--> statement-breakpoint
CREATE TABLE "academy_enrollment_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_enrollment_audit_logs_action_check" CHECK ("academy_enrollment_audit_logs"."action" in ('granted', 'extended', 'revoked', 'refunded', 'reactivated'))
);
--> statement-breakpoint
ALTER TABLE "academy_enrollment_audit_logs" ADD CONSTRAINT "academy_enrollment_audit_logs_enrollment_id_company_id_academy_enrollments_id_company_id_fk" FOREIGN KEY ("enrollment_id","company_id") REFERENCES "public"."academy_enrollments"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_enrollment_audit_logs" ADD CONSTRAINT "academy_enrollment_audit_logs_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academy_enrollment_audit" ON "academy_enrollment_audit_logs" USING btree ("enrollment_id","created_at");
