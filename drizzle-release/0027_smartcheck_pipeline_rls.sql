ALTER TABLE "document_processing_artifacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "document_processing_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "document_processing_artifacts_app_tenant" ON "document_processing_artifacts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "document_processing_artifacts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "document_processing_artifacts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "document_processing_artifacts_worker_access" ON "document_processing_artifacts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_worker') WITH CHECK (current_user = 'bimmetraj_worker');
--> statement-breakpoint
CREATE POLICY "document_processing_artifacts_backup_read" ON "document_processing_artifacts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "document_processing_artifacts_owner_migration" ON "document_processing_artifacts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "document_processing_runs_app_tenant" ON "document_processing_runs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "document_processing_runs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "document_processing_runs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "document_processing_runs_app_super_admin_read" ON "document_processing_runs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND nullif(current_setting('bimmetraj.super_admin_user_id', true), '')::uuid IS NOT NULL);
--> statement-breakpoint
CREATE POLICY "document_processing_runs_worker_access" ON "document_processing_runs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_worker') WITH CHECK (current_user = 'bimmetraj_worker');
--> statement-breakpoint
CREATE POLICY "document_processing_runs_backup_read" ON "document_processing_runs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "document_processing_runs_owner_migration" ON "document_processing_runs" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "documents_app_tenant" ON "documents" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "documents"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "documents"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "documents_app_super_admin_read" ON "documents" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND nullif(current_setting('bimmetraj.super_admin_user_id', true), '')::uuid IS NOT NULL);
--> statement-breakpoint
CREATE POLICY "documents_worker_access" ON "documents" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_worker') WITH CHECK (current_user = 'bimmetraj_worker');
--> statement-breakpoint
CREATE POLICY "documents_backup_read" ON "documents" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "documents_owner_migration" ON "documents" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "normalized_quantity_rows_app_tenant" ON "normalized_quantity_rows" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "normalized_quantity_rows"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "normalized_quantity_rows"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "normalized_quantity_rows_worker_access" ON "normalized_quantity_rows" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_worker') WITH CHECK (current_user = 'bimmetraj_worker');
--> statement-breakpoint
CREATE POLICY "normalized_quantity_rows_backup_read" ON "normalized_quantity_rows" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "normalized_quantity_rows_owner_migration" ON "normalized_quantity_rows" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "document_processing_runs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "document_processing_artifacts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "normalized_quantity_rows" FORCE ROW LEVEL SECURITY;
