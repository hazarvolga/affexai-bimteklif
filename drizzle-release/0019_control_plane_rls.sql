CREATE POLICY "companies_control_access" ON "companies" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "subscriptions_control_access" ON "subscriptions" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_control') WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "usage_logs_control_access" ON "usage_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "usage_logs_control_insert" ON "usage_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_control');
--> statement-breakpoint
CREATE POLICY "usage_logs_control_delete" ON "usage_logs" AS PERMISSIVE FOR DELETE TO public USING (current_user = 'bimmetraj_control');
