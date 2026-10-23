ALTER TABLE "construction_contract_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "construction_contracts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contract_variations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "final_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_measurement_review_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_measurements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_adjustments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "construction_contract_items_app_tenant" ON "construction_contract_items" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "construction_contract_items"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "construction_contract_items"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "construction_contract_items_backup_read" ON "construction_contract_items" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "construction_contract_items_owner_migration" ON "construction_contract_items" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "construction_contracts_app_tenant" ON "construction_contracts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "construction_contracts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "construction_contracts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "construction_contracts_backup_read" ON "construction_contracts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "construction_contracts_owner_migration" ON "construction_contracts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "contract_variations_app_tenant" ON "contract_variations" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "contract_variations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "contract_variations"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "contract_variations_backup_read" ON "contract_variations" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "contract_variations_owner_migration" ON "contract_variations" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "final_accounts_app_tenant" ON "final_accounts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "final_accounts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "final_accounts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "final_accounts_backup_read" ON "final_accounts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "final_accounts_owner_migration" ON "final_accounts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "progress_measurement_review_events_app_tenant" ON "progress_measurement_review_events" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "progress_measurement_review_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "progress_measurement_review_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "progress_measurement_review_events_backup_read" ON "progress_measurement_review_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "progress_measurement_review_events_owner_migration" ON "progress_measurement_review_events" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "progress_measurements_app_tenant" ON "progress_measurements" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "progress_measurements"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "progress_measurements"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "progress_measurements_backup_read" ON "progress_measurements" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "progress_measurements_owner_migration" ON "progress_measurements" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "progress_payment_adjustments_app_tenant" ON "progress_payment_adjustments" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "progress_payment_adjustments"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "progress_payment_adjustments"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "progress_payment_adjustments_backup_read" ON "progress_payment_adjustments" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "progress_payment_adjustments_owner_migration" ON "progress_payment_adjustments" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "progress_payment_events_app_tenant" ON "progress_payment_events" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "progress_payment_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "progress_payment_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "progress_payment_events_backup_read" ON "progress_payment_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "progress_payment_events_owner_migration" ON "progress_payment_events" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "progress_payment_lines_app_tenant" ON "progress_payment_lines" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "progress_payment_lines"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "progress_payment_lines"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "progress_payment_lines_backup_read" ON "progress_payment_lines" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "progress_payment_lines_owner_migration" ON "progress_payment_lines" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "progress_payment_periods_app_tenant" ON "progress_payment_periods" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "progress_payment_periods"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "progress_payment_periods"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "progress_payment_periods_backup_read" ON "progress_payment_periods" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "progress_payment_periods_owner_migration" ON "progress_payment_periods" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "construction_contracts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "construction_contract_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_periods" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_lines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_measurements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_measurement_review_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_adjustments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress_payment_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contract_variations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "final_accounts" FORCE ROW LEVEL SECURITY;
