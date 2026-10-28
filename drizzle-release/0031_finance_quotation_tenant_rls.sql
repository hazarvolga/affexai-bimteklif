ALTER TABLE "cost_components" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_financials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "cost_components_app_tenant" ON "cost_components" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND EXISTS (SELECT 1 FROM "quotations" WHERE "quotations"."id" = "cost_components"."quotation_id" AND "quotations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid)) WITH CHECK (current_user = 'bimmetraj_app' AND EXISTS (SELECT 1 FROM "quotations" WHERE "quotations"."id" = "cost_components"."quotation_id" AND "quotations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid));
--> statement-breakpoint
CREATE POLICY "cost_components_backup_read" ON "cost_components" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "cost_components_owner_migration" ON "cost_components" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "quotation_financials_app_tenant" ON "quotation_financials" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND EXISTS (SELECT 1 FROM "quotations" WHERE "quotations"."id" = "quotation_financials"."quotation_id" AND "quotations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid)) WITH CHECK (current_user = 'bimmetraj_app' AND EXISTS (SELECT 1 FROM "quotations" WHERE "quotations"."id" = "quotation_financials"."quotation_id" AND "quotations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid));
--> statement-breakpoint
CREATE POLICY "quotation_financials_backup_read" ON "quotation_financials" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "quotation_financials_owner_migration" ON "quotation_financials" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "cost_components" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotation_financials" FORCE ROW LEVEL SECURITY;
