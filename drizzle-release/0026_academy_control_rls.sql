ALTER TABLE "academy_activation_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_enrollment_audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_enrollments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_learner_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_payment_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_certificates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "academy_activation_events_app_tenant_read" ON "academy_activation_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "academy_activation_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "academy_activation_events_control_access" ON "academy_activation_events" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "academy_activation_events_backup_read" ON "academy_activation_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "academy_activation_events_owner_migration" ON "academy_activation_events" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "academy_enrollment_audit_logs_app_tenant_read" ON "academy_enrollment_audit_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "academy_enrollment_audit_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "academy_enrollment_audit_logs_control_access" ON "academy_enrollment_audit_logs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "academy_enrollment_audit_logs_backup_read" ON "academy_enrollment_audit_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "academy_enrollment_audit_logs_owner_migration" ON "academy_enrollment_audit_logs" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "academy_enrollments_app_tenant_read" ON "academy_enrollments" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "academy_enrollments"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "academy_enrollments_control_access" ON "academy_enrollments" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "academy_enrollments_backup_read" ON "academy_enrollments" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "academy_enrollments_owner_migration" ON "academy_enrollments" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "academy_learner_profiles_app_tenant_read" ON "academy_learner_profiles" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "academy_learner_profiles"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "academy_learner_profiles_control_access" ON "academy_learner_profiles" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "academy_learner_profiles_backup_read" ON "academy_learner_profiles" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "academy_learner_profiles_owner_migration" ON "academy_learner_profiles" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "academy_payment_events_app_tenant_read" ON "academy_payment_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "academy_payment_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "academy_payment_events_control_access" ON "academy_payment_events" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "academy_payment_events_backup_read" ON "academy_payment_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "academy_payment_events_owner_migration" ON "academy_payment_events" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_certificates_app_tenant" ON "allplan_certificates" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_certificates"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_certificates"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_certificates_app_verify_read" ON "allplan_certificates" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "allplan_certificates"."certificate_number" = nullif(current_setting('bimmetraj.certificate_number', true), ''));
--> statement-breakpoint
CREATE POLICY "allplan_certificates_backup_read" ON "allplan_certificates" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_certificates_owner_migration" ON "allplan_certificates" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "allplan_certificates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_enrollments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_learner_profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_activation_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_enrollment_audit_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academy_payment_events" FORCE ROW LEVEL SECURITY;
