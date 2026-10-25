ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_source_rows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "clients_app_tenant" ON "clients" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "clients"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "clients"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "clients_backup_read" ON "clients" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "clients_owner_migration" ON "clients" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "quotation_item_evidence_app_tenant" ON "quotation_item_evidence" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "quotation_item_evidence"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "quotation_item_evidence"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "quotation_item_evidence_backup_read" ON "quotation_item_evidence" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "quotation_item_evidence_owner_migration" ON "quotation_item_evidence" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "quotation_items_app_tenant" ON "quotation_items" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "quotation_items"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "quotation_items"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "quotation_items_backup_read" ON "quotation_items" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "quotation_items_owner_migration" ON "quotation_items" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "quotation_transfer_ledgers_app_tenant" ON "quotation_transfer_ledgers" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "quotation_transfer_ledgers"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "quotation_transfer_ledgers"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "quotation_transfer_ledgers_backup_read" ON "quotation_transfer_ledgers" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "quotation_transfer_ledgers_owner_migration" ON "quotation_transfer_ledgers" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "quotation_transfer_source_rows_app_tenant" ON "quotation_transfer_source_rows" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "quotation_transfer_source_rows"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "quotation_transfer_source_rows"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "quotation_transfer_source_rows_backup_read" ON "quotation_transfer_source_rows" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "quotation_transfer_source_rows_owner_migration" ON "quotation_transfer_source_rows" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "quotations_app_tenant" ON "quotations" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "quotations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "quotations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "quotations_backup_read" ON "quotations" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "quotations_owner_migration" ON "quotations" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_item_evidence" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_source_rows" FORCE ROW LEVEL SECURITY;
