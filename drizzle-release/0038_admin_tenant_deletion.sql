ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_target_company_id_companies_id_fk";

--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_company_id_companies_id_fk" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
GRANT DELETE ON TABLE public.usage_records TO bimmetraj_control;
--> statement-breakpoint
GRANT DELETE ON TABLE public.invitations TO bimmetraj_control;
