DROP POLICY "smartcheck_audit_logs_app_non_pilot_mutation" ON "smartcheck_audit_logs" CASCADE;
--> statement-breakpoint
DROP POLICY "smartcheck_audit_logs_worker_non_pilot" ON "smartcheck_audit_logs" CASCADE;
--> statement-breakpoint
ALTER POLICY "smartcheck_audit_logs_app_read" ON "smartcheck_audit_logs" TO public USING (current_user = 'bimmetraj_app' AND "smartcheck_audit_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
ALTER POLICY "smartcheck_audit_logs_app_insert" ON "smartcheck_audit_logs" TO public WITH CHECK (current_user = 'bimmetraj_app' AND "smartcheck_audit_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid AND "smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case');
