CREATE TABLE "allplan_certificate_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_certificate_audit_logs_action_check" CHECK ("allplan_certificate_audit_logs"."action" in ('issued', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "allplan_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_number" text NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_attempt_id" uuid NOT NULL,
	"program_version" text NOT NULL,
	"holder_name" text NOT NULL,
	"company_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	CONSTRAINT "allplan_certificates_certificate_number_unique" UNIQUE("certificate_number"),
	CONSTRAINT "allplan_certificates_user_company_program_key" UNIQUE("user_id","company_id","program_version"),
	CONSTRAINT "allplan_certificates_status_check" CHECK ("allplan_certificates"."status" in ('active', 'revoked', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "allplan_exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"program_version" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allplan_exam_attempts_score_check" CHECK ("allplan_exam_attempts"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "allplan_certificate_audit_logs" ADD CONSTRAINT "allplan_certificate_audit_logs_certificate_id_allplan_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."allplan_certificates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_certificate_audit_logs" ADD CONSTRAINT "allplan_certificate_audit_logs_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_certificates" ADD CONSTRAINT "allplan_certificates_exam_attempt_id_allplan_exam_attempts_id_fk" FOREIGN KEY ("exam_attempt_id") REFERENCES "public"."allplan_exam_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_certificates" ADD CONSTRAINT "allplan_certificates_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_exam_attempts" ADD CONSTRAINT "allplan_exam_attempts_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_allplan_certificate_audit" ON "allplan_certificate_audit_logs" USING btree ("certificate_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_allplan_certificates_number" ON "allplan_certificates" USING btree ("certificate_number");--> statement-breakpoint
CREATE INDEX "idx_allplan_exam_attempts_user" ON "allplan_exam_attempts" USING btree ("company_id","user_id","completed_at");