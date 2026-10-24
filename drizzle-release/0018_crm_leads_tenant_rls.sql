ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "idx_leads_tenant_created_id" ON "leads" USING btree ("company_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_count_nonnegative" CHECK ("usage_logs"."count" >= 0);
--> statement-breakpoint
CREATE POLICY "companies_app_tenant_read" ON "companies" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "companies"."id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "companies_backup_read" ON "companies" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "companies_owner_migration" ON "companies" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "leads_app_tenant_read" ON "leads" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "leads"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "leads_app_tenant_insert" ON "leads" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_app' AND "leads"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "leads_backup_read" ON "leads" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "leads_owner_migration" ON "leads" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "subscriptions_app_tenant_read" ON "subscriptions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "subscriptions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "subscriptions_backup_read" ON "subscriptions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "subscriptions_owner_migration" ON "subscriptions" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "usage_logs_app_tenant_read" ON "usage_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "usage_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "usage_logs_app_tenant_insert" ON "usage_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_app' AND "usage_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "usage_logs_backup_read" ON "usage_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "usage_logs_owner_migration" ON "usage_logs" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "usage_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;
