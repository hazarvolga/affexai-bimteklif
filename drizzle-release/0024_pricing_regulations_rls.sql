ALTER TABLE "price_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "price_sources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "regulation_alerts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "regulation_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_ingestion_artifacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_intelligence_adapters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_review_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "price_snapshots_app_tenant" ON "price_snapshots" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "price_snapshots"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "price_snapshots"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "price_snapshots_backup_read" ON "price_snapshots" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "price_snapshots_owner_migration" ON "price_snapshots" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "price_sources_app_tenant" ON "price_sources" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "price_sources"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "price_sources"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "price_sources_backup_read" ON "price_sources" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "price_sources_owner_migration" ON "price_sources" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "regulation_alerts_app_tenant" ON "regulation_alerts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "regulation_alerts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "regulation_alerts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "regulation_alerts_backup_read" ON "regulation_alerts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "regulation_alerts_owner_migration" ON "regulation_alerts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "regulation_versions_app_tenant" ON "regulation_versions" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "regulation_versions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "regulation_versions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "regulation_versions_backup_read" ON "regulation_versions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "regulation_versions_owner_migration" ON "regulation_versions" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "source_ingestion_artifacts_app_tenant" ON "source_ingestion_artifacts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "source_ingestion_artifacts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "source_ingestion_artifacts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "source_ingestion_artifacts_backup_read" ON "source_ingestion_artifacts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "source_ingestion_artifacts_owner_migration" ON "source_ingestion_artifacts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "source_ingestion_runs_app_tenant" ON "source_ingestion_runs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "source_ingestion_runs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "source_ingestion_runs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "source_ingestion_runs_backup_read" ON "source_ingestion_runs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "source_ingestion_runs_owner_migration" ON "source_ingestion_runs" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "source_intelligence_adapters_app_tenant" ON "source_intelligence_adapters" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "source_intelligence_adapters"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "source_intelligence_adapters"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "source_intelligence_adapters_backup_read" ON "source_intelligence_adapters" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "source_intelligence_adapters_owner_migration" ON "source_intelligence_adapters" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "source_review_items_app_tenant" ON "source_review_items" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "source_review_items"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "source_review_items"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "source_review_items_backup_read" ON "source_review_items" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "source_review_items_owner_migration" ON "source_review_items" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "price_sources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "price_snapshots" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_intelligence_adapters" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_ingestion_runs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_ingestion_artifacts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_review_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "regulation_versions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "regulation_alerts" FORCE ROW LEVEL SECURITY;
