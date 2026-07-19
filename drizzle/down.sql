BEGIN;

-- ─── 1. BREAK BASELINE-TO-NEW DEPENDENCIES FIRST ───
ALTER TABLE "usage_logs" DROP CONSTRAINT IF EXISTS "usage_logs_document_processing_run_id_company_id_document_processing_runs_id_company_id_fk";
ALTER TABLE "usage_logs" DROP COLUMN IF EXISTS "document_processing_run_id";

-- ─── 2. DROP NEW TABLES (satisfies internal child-to-parent constraints deletion) ───
DROP TABLE IF EXISTS "rule_assistance_resources";
DROP TABLE IF EXISTS "assistance_resources";
DROP TABLE IF EXISTS "competency_signal_evidence";
DROP TABLE IF EXISTS "competency_signals";
DROP TABLE IF EXISTS "review_findings";
DROP TABLE IF EXISTS "review_sessions";
DROP TABLE IF EXISTS "rule_versions";
DROP TABLE IF EXISTS "rule_registry";
DROP TABLE IF EXISTS "rule_candidates";
DROP TABLE IF EXISTS "document_processing_runs";
DROP TABLE IF EXISTS "documents";

-- ─── 3. NOW DROP ALTERATIONS FROM BASELINE TABLES (since dependent child tables are gone) ───
ALTER TABLE "quotation_items" DROP CONSTRAINT IF EXISTS "quotation_items_quotation_id_company_id_quotations_id_company_id_fk";
ALTER TABLE "quotation_items" DROP CONSTRAINT IF EXISTS "quotation_items_id_quotation_id_company_id_key";
ALTER TABLE "quotation_items" DROP CONSTRAINT IF EXISTS "quotation_items_id_company_id_key";
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_id_company_id_key";
ALTER TABLE "memberships" DROP CONSTRAINT IF EXISTS "memberships_user_id_company_id_key";

-- ─── 4. DROP NEW ENUMS ───
DROP TYPE IF EXISTS "public"."rule_scope_type";
DROP TYPE IF EXISTS "public"."rule_status";
DROP TYPE IF EXISTS "public"."rule_candidate_status";
DROP TYPE IF EXISTS "public"."review_session_status";
DROP TYPE IF EXISTS "public"."resource_type";
DROP TYPE IF EXISTS "public"."processing_stage";
DROP TYPE IF EXISTS "public"."processing_run_status";
DROP TYPE IF EXISTS "public"."finding_status";
DROP TYPE IF EXISTS "public"."error_category";
DROP TYPE IF EXISTS "public"."document_status";
DROP TYPE IF EXISTS "public"."competency_signal_status";
DROP TYPE IF EXISTS "public"."severity";

COMMIT;
