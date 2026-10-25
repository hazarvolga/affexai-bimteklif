ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assistance_resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "competency_signal_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "competency_signals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "review_findings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "review_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_assistance_resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_candidates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_registry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_alerts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "activities_app_tenant" ON "activities" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "activities"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "activities"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "activities_backup_read" ON "activities" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "activities_owner_migration" ON "activities" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "assistance_resources_app_tenant" ON "assistance_resources" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "assistance_resources"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "assistance_resources"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "assistance_resources_backup_read" ON "assistance_resources" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "assistance_resources_owner_migration" ON "assistance_resources" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "competency_signal_evidence_app_tenant" ON "competency_signal_evidence" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "competency_signal_evidence"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "competency_signal_evidence"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "competency_signal_evidence_backup_read" ON "competency_signal_evidence" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "competency_signal_evidence_owner_migration" ON "competency_signal_evidence" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "competency_signals_app_tenant" ON "competency_signals" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "competency_signals"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "competency_signals"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "competency_signals_backup_read" ON "competency_signals" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "competency_signals_owner_migration" ON "competency_signals" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "deals_app_tenant" ON "deals" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "deals"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "deals"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "deals_backup_read" ON "deals" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "deals_owner_migration" ON "deals" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "review_findings_app_tenant" ON "review_findings" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "review_findings"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "review_findings"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "review_findings_backup_read" ON "review_findings" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "review_findings_owner_migration" ON "review_findings" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "review_sessions_app_tenant" ON "review_sessions" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "review_sessions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "review_sessions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "review_sessions_backup_read" ON "review_sessions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "review_sessions_owner_migration" ON "review_sessions" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "rule_assistance_resources_app_tenant" ON "rule_assistance_resources" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "rule_assistance_resources"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "rule_assistance_resources"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "rule_assistance_resources_backup_read" ON "rule_assistance_resources" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "rule_assistance_resources_owner_migration" ON "rule_assistance_resources" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "rule_candidates_app_tenant" ON "rule_candidates" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "rule_candidates"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "rule_candidates"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "rule_candidates_backup_read" ON "rule_candidates" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "rule_candidates_owner_migration" ON "rule_candidates" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "rule_registry_app_tenant" ON "rule_registry" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "rule_registry"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "rule_registry"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "rule_registry_backup_read" ON "rule_registry" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "rule_registry_owner_migration" ON "rule_registry" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "rule_versions_app_tenant" ON "rule_versions" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "rule_versions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "rule_versions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "rule_versions_backup_read" ON "rule_versions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "rule_versions_owner_migration" ON "rule_versions" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "supplier_quote_entries_app_tenant" ON "supplier_quote_entries" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "supplier_quote_entries"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "supplier_quote_entries"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "supplier_quote_entries_backup_read" ON "supplier_quote_entries" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "supplier_quote_entries_owner_migration" ON "supplier_quote_entries" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "supplier_quote_submissions_app_tenant" ON "supplier_quote_submissions" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "supplier_quote_submissions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "supplier_quote_submissions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "supplier_quote_submissions_backup_read" ON "supplier_quote_submissions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "supplier_quote_submissions_owner_migration" ON "supplier_quote_submissions" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "usage_alerts_app_tenant" ON "usage_alerts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "usage_alerts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "usage_alerts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "usage_alerts_backup_read" ON "usage_alerts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "usage_alerts_owner_migration" ON "usage_alerts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "usage_alerts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "deals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activities" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_quote_submissions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_quote_entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_candidates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_registry" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_versions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "review_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "review_findings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "competency_signals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "competency_signal_evidence" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assistance_resources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rule_assistance_resources" FORCE ROW LEVEL SECURITY;
