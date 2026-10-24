ALTER TABLE "company_industry_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "industries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "company_industry_settings_app_tenant_read" ON "company_industry_settings" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "company_industry_settings"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "company_industry_settings_app_tenant_insert" ON "company_industry_settings" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_app' AND "company_industry_settings"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "company_industry_settings_app_tenant_update" ON "company_industry_settings" AS PERMISSIVE FOR UPDATE TO public USING (current_user = 'bimmetraj_app' AND "company_industry_settings"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "company_industry_settings"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "company_industry_settings_backup_read" ON "company_industry_settings" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "company_industry_settings_owner_migration" ON "company_industry_settings" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "industries_app_read" ON "industries" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app');
--> statement-breakpoint
CREATE POLICY "industries_backup_read" ON "industries" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "industries_owner_migration" ON "industries" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
INSERT INTO industries (id,name,description,config_json,enabled) VALUES
      ('residential','Konut İnşaatı','Villa, apartman ve müstakil ev projeleri için kaba ve ince inşaat çözümleri.','{"source":"INITIAL_PLUGINS","calculationModel":"material_heavy","pdfTemplateId":"default_construction"}',true),
      ('electrical','Elektrik Taahhüt','Bina içi tesisat, altyapı, pano ve aydınlatma işleri.','{"source":"INITIAL_PLUGINS","calculationModel":"balanced","pdfTemplateId":"modern_minimal"}',true),
      ('mechanical','Mekanik & HVAC','Isıtma, soğutma, havalandırma ve sıhhi tesisat sistemleri.','{"source":"INITIAL_PLUGINS","calculationModel":"system_based","pdfTemplateId":"modern_minimal"}',true),
      ('renovation','Tadilat & Dekorasyon','Daire, ofis ve iş yeri yenileme, ince işçilik ve dekorasyon.','{"source":"INITIAL_PLUGINS","calculationModel":"labor_heavy","pdfTemplateId":"luxury_villa"}',true)
      ON CONFLICT (id) DO NOTHING
--> statement-breakpoint
ALTER TABLE "industries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company_industry_settings" FORCE ROW LEVEL SECURITY;
