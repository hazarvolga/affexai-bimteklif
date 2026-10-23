ALTER TABLE "cde_containers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_project_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_projects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_revisions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_transition_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "cde_containers_app_tenant" ON "cde_containers" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "cde_containers"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "cde_containers"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "cde_containers_backup_read" ON "cde_containers" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "cde_containers_owner_migration" ON "cde_containers" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "cde_project_members_app_tenant" ON "cde_project_members" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "cde_project_members"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "cde_project_members"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "cde_project_members_backup_read" ON "cde_project_members" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "cde_project_members_owner_migration" ON "cde_project_members" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "cde_projects_app_tenant" ON "cde_projects" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "cde_projects"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "cde_projects"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "cde_projects_backup_read" ON "cde_projects" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "cde_projects_owner_migration" ON "cde_projects" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "cde_revisions_app_tenant" ON "cde_revisions" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "cde_revisions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "cde_revisions"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "cde_revisions_backup_read" ON "cde_revisions" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "cde_revisions_owner_migration" ON "cde_revisions" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "cde_transition_events_app_tenant" ON "cde_transition_events" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "cde_transition_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "cde_transition_events"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "cde_transition_events_backup_read" ON "cde_transition_events" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "cde_transition_events_owner_migration" ON "cde_transition_events" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "cde_projects" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_project_members" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_containers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_revisions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cde_transition_events" FORCE ROW LEVEL SECURITY;
