ALTER TABLE "allplan_certificate_audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_checkpoint_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_exam_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_activity" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_bookmarks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_progress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "allplan_certificate_audit_logs_app_tenant" ON "allplan_certificate_audit_logs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_certificate_audit_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_certificate_audit_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_certificate_audit_logs_backup_read" ON "allplan_certificate_audit_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_certificate_audit_logs_owner_migration" ON "allplan_certificate_audit_logs" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_checkpoint_attempts_app_tenant" ON "allplan_checkpoint_attempts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_checkpoint_attempts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_checkpoint_attempts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_checkpoint_attempts_backup_read" ON "allplan_checkpoint_attempts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_checkpoint_attempts_owner_migration" ON "allplan_checkpoint_attempts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_exam_attempts_app_tenant" ON "allplan_exam_attempts" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_exam_attempts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_exam_attempts"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_exam_attempts_backup_read" ON "allplan_exam_attempts" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_exam_attempts_owner_migration" ON "allplan_exam_attempts" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_activity_app_tenant" ON "allplan_lesson_activity" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_lesson_activity"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_lesson_activity"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_lesson_activity_backup_read" ON "allplan_lesson_activity" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_activity_owner_migration" ON "allplan_lesson_activity" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_bookmarks_app_tenant" ON "allplan_lesson_bookmarks" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_lesson_bookmarks"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_lesson_bookmarks"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_lesson_bookmarks_backup_read" ON "allplan_lesson_bookmarks" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_bookmarks_owner_migration" ON "allplan_lesson_bookmarks" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_notes_app_tenant" ON "allplan_lesson_notes" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_lesson_notes"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_lesson_notes"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_lesson_notes_backup_read" ON "allplan_lesson_notes" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_notes_owner_migration" ON "allplan_lesson_notes" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_progress_app_tenant" ON "allplan_lesson_progress" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "allplan_lesson_progress"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "allplan_lesson_progress"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "allplan_lesson_progress_backup_read" ON "allplan_lesson_progress" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "allplan_lesson_progress_owner_migration" ON "allplan_lesson_progress" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "allplan_lesson_progress" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_activity" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_notes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_lesson_bookmarks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_checkpoint_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_exam_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "allplan_certificate_audit_logs" FORCE ROW LEVEL SECURITY;
