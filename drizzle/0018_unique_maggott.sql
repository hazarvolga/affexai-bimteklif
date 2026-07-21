ALTER TABLE "allplan_certificate_audit_logs" DROP CONSTRAINT "allplan_certificate_audit_logs_certificate_id_allplan_certificates_id_fk";
--> statement-breakpoint
ALTER TABLE "allplan_certificates" DROP CONSTRAINT "allplan_certificates_exam_attempt_id_allplan_exam_attempts_id_fk";
--> statement-breakpoint
ALTER TABLE "allplan_certificates" ADD CONSTRAINT "allplan_certificates_id_company_id_key" UNIQUE("id","company_id");--> statement-breakpoint
ALTER TABLE "allplan_exam_attempts" ADD CONSTRAINT "allplan_exam_attempts_id_company_id_key" UNIQUE("id","company_id");--> statement-breakpoint
ALTER TABLE "allplan_certificate_audit_logs" ADD CONSTRAINT "allplan_certificate_audit_logs_certificate_id_company_id_allplan_certificates_id_company_id_fk" FOREIGN KEY ("certificate_id","company_id") REFERENCES "public"."allplan_certificates"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allplan_certificates" ADD CONSTRAINT "allplan_certificates_exam_attempt_id_company_id_allplan_exam_attempts_id_company_id_fk" FOREIGN KEY ("exam_attempt_id","company_id") REFERENCES "public"."allplan_exam_attempts"("id","company_id") ON DELETE restrict ON UPDATE no action;
