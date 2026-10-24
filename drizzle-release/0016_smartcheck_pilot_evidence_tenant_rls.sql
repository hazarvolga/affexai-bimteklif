ALTER TABLE "smartcheck_audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD COLUMN "request_hash" text;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD COLUMN "case_revision" integer;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_case_revision_key" UNIQUE("company_id","pilot_case_id","case_revision");
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_request_hash_check" CHECK ("smartcheck_pilot_measurements"."request_hash" IS NULL OR "smartcheck_pilot_measurements"."request_hash" ~ '^[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" ADD CONSTRAINT "smartcheck_pilot_measurements_case_revision_check" CHECK ("smartcheck_pilot_measurements"."case_revision" IS NULL OR "smartcheck_pilot_measurements"."case_revision" > 0);
--> statement-breakpoint
CREATE POLICY "smartcheck_audit_logs_app_read" ON "smartcheck_audit_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND ("smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case' OR "smartcheck_audit_logs"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid));
--> statement-breakpoint
CREATE POLICY "smartcheck_audit_logs_app_insert" ON "smartcheck_audit_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_app' AND "smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case');
--> statement-breakpoint
CREATE POLICY "smartcheck_audit_logs_app_non_pilot_mutation" ON "smartcheck_audit_logs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case') WITH CHECK (current_user = 'bimmetraj_app' AND "smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case');
--> statement-breakpoint
CREATE POLICY "smartcheck_audit_logs_worker_non_pilot" ON "smartcheck_audit_logs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_worker' AND "smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case') WITH CHECK (current_user = 'bimmetraj_worker' AND "smartcheck_audit_logs"."entity_type" <> 'smartcheck_pilot_case');
--> statement-breakpoint
CREATE POLICY "smartcheck_audit_logs_backup_read" ON "smartcheck_audit_logs" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "smartcheck_audit_logs_owner_migration" ON "smartcheck_audit_logs" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_owner') WITH CHECK (current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_cases_app_tenant" ON "smartcheck_pilot_cases" AS PERMISSIVE FOR ALL TO public USING (current_user = 'bimmetraj_app' AND "smartcheck_pilot_cases"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid) WITH CHECK (current_user = 'bimmetraj_app' AND "smartcheck_pilot_cases"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_cases_backup_read" ON "smartcheck_pilot_cases" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_cases_owner_migration" ON "smartcheck_pilot_cases" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_measurements_app_tenant_read" ON "smartcheck_pilot_measurements" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_app' AND "smartcheck_pilot_measurements"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_measurements_app_tenant_insert" ON "smartcheck_pilot_measurements" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_user = 'bimmetraj_app' AND "smartcheck_pilot_measurements"."company_id" = nullif(current_setting('bimmetraj.company_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_measurements_backup_read" ON "smartcheck_pilot_measurements" AS PERMISSIVE FOR SELECT TO public USING (current_user = 'bimmetraj_backup');
--> statement-breakpoint
CREATE POLICY "smartcheck_pilot_measurements_owner_migration" ON "smartcheck_pilot_measurements" AS PERMISSIVE FOR ALL TO public USING (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner') WITH CHECK (session_user = 'bimmetraj_migrator' AND current_user = 'bimmetraj_owner');
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_cases" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "smartcheck_pilot_measurements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "smartcheck_audit_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION prevent_smartcheck_pilot_measurement_mutation() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'smartcheck_pilot_measurements is append-only';
END;
$$
--> statement-breakpoint
ALTER FUNCTION prevent_smartcheck_pilot_measurement_mutation() OWNER TO CURRENT_USER
--> statement-breakpoint
REVOKE ALL ON FUNCTION prevent_smartcheck_pilot_measurement_mutation() FROM PUBLIC
--> statement-breakpoint
CREATE TRIGGER smartcheck_pilot_measurements_append_only
BEFORE UPDATE OR DELETE ON smartcheck_pilot_measurements
FOR EACH ROW EXECUTE FUNCTION prevent_smartcheck_pilot_measurement_mutation()
--> statement-breakpoint
CREATE FUNCTION validate_smartcheck_pilot_measurement_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE actor_id uuid;
DECLARE expected_revision integer;
BEGIN
  IF current_user <> 'bimmetraj_app' THEN RETURN NEW; END IF;
  actor_id := nullif(current_setting('bimmetraj.user_id', true), '')::uuid;
  IF NEW.company_id IS DISTINCT FROM nullif(current_setting('bimmetraj.company_id', true), '')::uuid
     OR NEW.measured_by_user_id IS DISTINCT FROM actor_id OR NEW.request_hash !~ '^[0-9a-f]{64}$' OR NEW.case_revision IS NULL THEN
    RAISE EXCEPTION 'pilot measurement insert requires bound tenant actor, request hash and revision';
  END IF;
  SELECT coalesce(max(case_revision),0)+1 INTO expected_revision FROM smartcheck_pilot_measurements
    WHERE company_id=NEW.company_id AND pilot_case_id=NEW.pilot_case_id;
  IF NEW.case_revision <> expected_revision OR NOT EXISTS (SELECT 1 FROM smartcheck_pilot_cases c
      WHERE c.id=NEW.pilot_case_id AND c.company_id=NEW.company_id AND c.reviewer_decision IS NULL AND c.status NOT IN ('completed','rejected')) THEN
    RAISE EXCEPTION 'pilot measurement revision or case state is invalid';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
ALTER FUNCTION validate_smartcheck_pilot_measurement_insert() OWNER TO CURRENT_USER
--> statement-breakpoint
REVOKE ALL ON FUNCTION validate_smartcheck_pilot_measurement_insert() FROM PUBLIC
--> statement-breakpoint
CREATE TRIGGER smartcheck_pilot_measurements_insert_guard BEFORE INSERT ON smartcheck_pilot_measurements FOR EACH ROW EXECUTE FUNCTION validate_smartcheck_pilot_measurement_insert()
--> statement-breakpoint
CREATE FUNCTION enforce_smartcheck_pilot_case_mutation() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE actor_id uuid;
DECLARE live_role text;
DECLARE review_measurement_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'smartcheck_pilot_cases cannot be deleted directly'; END IF;
  IF OLD.company_id IS DISTINCT FROM NEW.company_id OR OLD.document_id IS DISTINCT FROM NEW.document_id
     OR OLD.pilot_id IS DISTINCT FROM NEW.pilot_id OR OLD.customer_reference IS DISTINCT FROM NEW.customer_reference
     OR OLD.project_reference IS DISTINCT FROM NEW.project_reference OR OLD.discipline IS DISTINCT FROM NEW.discipline
     OR OLD.permission_reference IS DISTINCT FROM NEW.permission_reference OR OLD.permission_granted_at IS DISTINCT FROM NEW.permission_granted_at
     OR OLD.retention_until IS DISTINCT FROM NEW.retention_until OR OLD.expected_row_count IS DISTINCT FROM NEW.expected_row_count
     OR OLD.workflow_started_at IS DISTINCT FROM NEW.workflow_started_at OR OLD.created_by_user_id IS DISTINCT FROM NEW.created_by_user_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN RAISE EXCEPTION 'smartcheck pilot case identity and consent are immutable'; END IF;
  IF OLD.reviewer_decision IS NOT NULL THEN RAISE EXCEPTION 'reviewed smartcheck pilot case is immutable'; END IF;
  IF NEW.reviewer_decision IS NULL THEN
    IF NEW.status <> 'review' OR NEW.reviewer_user_id IS NOT NULL OR NEW.reviewer_role IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NEW.reviewer_notes IS NOT NULL
       OR NOT EXISTS (SELECT 1 FROM smartcheck_pilot_measurements m WHERE m.company_id=NEW.company_id AND m.pilot_case_id=NEW.id) THEN
      RAISE EXCEPTION 'pilot measurement transition requires append-only evidence and review state';
    END IF;
    RETURN NEW;
  END IF;
  actor_id := nullif(current_setting('bimmetraj.user_id', true), '')::uuid;
  SELECT role INTO live_role FROM memberships WHERE company_id=NEW.company_id AND user_id=actor_id;
  IF actor_id IS NULL OR NEW.reviewer_user_id IS DISTINCT FROM actor_id OR NEW.reviewer_role IS DISTINCT FROM live_role
     OR live_role NOT IN ('owner','admin','manager') OR NEW.reviewed_at IS NULL
     OR (NEW.reviewer_decision='rejected' AND NEW.status<>'rejected')
     OR (NEW.reviewer_decision IN ('approved','accepted_exception') AND NEW.status<>'completed')
     OR NOT EXISTS (SELECT 1 FROM smartcheck_pilot_measurements m JOIN smartcheck_audit_logs a
          ON a.company_id=m.company_id AND a.entity_id=m.pilot_case_id AND a.action='pilot_case_measured'
          AND a.metadata_json->>'measurementId'=m.id::text AND a.metadata_json->>'requestHash'=m.request_hash
        WHERE m.id=(SELECT latest.id FROM smartcheck_pilot_measurements latest WHERE latest.company_id=NEW.company_id AND latest.pilot_case_id=NEW.id
          ORDER BY latest.case_revision DESC NULLS LAST,latest.measured_at DESC,latest.id DESC LIMIT 1)
          AND m.request_hash ~ '^[0-9a-f]{64}$' AND m.case_revision IS NOT NULL AND m.measured_by_user_id<>actor_id) THEN
    RAISE EXCEPTION 'pilot review transition requires live maker-checker authority';
  END IF;
  SELECT id INTO review_measurement_id FROM smartcheck_pilot_measurements WHERE company_id=NEW.company_id AND pilot_case_id=NEW.id
    ORDER BY case_revision DESC NULLS LAST,measured_at DESC,id DESC LIMIT 1;
  PERFORM set_config('bimmetraj.pilot_review_measurement_id',review_measurement_id::text,true);
  RETURN NEW;
END;
$$
--> statement-breakpoint
ALTER FUNCTION enforce_smartcheck_pilot_case_mutation() OWNER TO CURRENT_USER
--> statement-breakpoint
REVOKE ALL ON FUNCTION enforce_smartcheck_pilot_case_mutation() FROM PUBLIC
--> statement-breakpoint
CREATE TRIGGER smartcheck_pilot_cases_mutation_guard BEFORE UPDATE OR DELETE ON smartcheck_pilot_cases FOR EACH ROW EXECUTE FUNCTION enforce_smartcheck_pilot_case_mutation()
--> statement-breakpoint
CREATE FUNCTION prevent_smartcheck_pilot_audit_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.entity_type<>'smartcheck_pilot_case' THEN RETURN NEW; END IF;
    IF current_user<>'bimmetraj_owner' AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
      RAISE EXCEPTION 'pilot audit insert role is forbidden';
    END IF;
    IF current_user='bimmetraj_owner' THEN RETURN NEW; END IF;
    IF NOT EXISTS (SELECT 1 FROM smartcheck_pilot_cases c WHERE c.id=NEW.entity_id AND c.company_id=NEW.company_id) THEN RAISE EXCEPTION 'pilot audit case binding is invalid'; END IF;
    IF NEW.action='pilot_case_admitted' AND NOT EXISTS (SELECT 1 FROM smartcheck_pilot_cases c WHERE c.id=NEW.entity_id AND c.company_id=NEW.company_id
      AND c.created_by_user_id=NEW.user_id AND c.document_id::text=NEW.metadata_json->>'documentId' AND c.pilot_id=NEW.metadata_json->>'pilotId'
      AND c.permission_reference=NEW.metadata_json->>'permissionReference' AND c.retention_until=(NEW.metadata_json->>'retentionUntil')::timestamptz) THEN
      RAISE EXCEPTION 'pilot admission audit binding is invalid';
    ELSIF NEW.action='pilot_case_measured' AND NOT EXISTS (SELECT 1 FROM smartcheck_pilot_measurements m WHERE m.id=(NEW.metadata_json->>'measurementId')::uuid
      AND m.company_id=NEW.company_id AND m.pilot_case_id=NEW.entity_id AND m.measured_by_user_id=NEW.user_id
      AND m.measurement_key=NEW.metadata_json->>'measurementKey' AND m.request_hash=NEW.metadata_json->>'requestHash') THEN
      RAISE EXCEPTION 'pilot measurement audit binding is invalid';
    ELSIF NEW.action IN ('pilot_case_approved','pilot_case_rejected','pilot_case_accepted_exception') AND NOT EXISTS (
      SELECT 1 FROM smartcheck_pilot_cases c JOIN smartcheck_pilot_measurements m ON m.id=(NEW.metadata_json->>'measurementId')::uuid
      WHERE c.id=NEW.entity_id AND c.company_id=NEW.company_id AND c.reviewer_user_id=NEW.user_id
        AND c.reviewer_decision=NEW.metadata_json->>'decision' AND NEW.action='pilot_case_'||c.reviewer_decision
        AND m.company_id=c.company_id AND m.pilot_case_id=c.id AND m.request_hash ~ '^[0-9a-f]{64}$' AND m.case_revision IS NOT NULL
        AND m.id=(SELECT latest.id FROM smartcheck_pilot_measurements latest WHERE latest.company_id=c.company_id AND latest.pilot_case_id=c.id
          ORDER BY latest.case_revision DESC NULLS LAST,latest.measured_at DESC,latest.id DESC LIMIT 1)) THEN
      RAISE EXCEPTION 'pilot review audit binding is invalid';
    ELSIF NEW.action NOT IN ('pilot_case_admitted','pilot_case_measured','pilot_case_approved','pilot_case_rejected','pilot_case_accepted_exception') THEN
      RAISE EXCEPTION 'pilot audit action is invalid';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.entity_type='smartcheck_pilot_case' OR (TG_OP='UPDATE' AND NEW.entity_type='smartcheck_pilot_case') THEN RAISE EXCEPTION 'smartcheck pilot audit evidence is append-only'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
ALTER FUNCTION prevent_smartcheck_pilot_audit_mutation() OWNER TO CURRENT_USER
--> statement-breakpoint
REVOKE ALL ON FUNCTION prevent_smartcheck_pilot_audit_mutation() FROM PUBLIC
--> statement-breakpoint
CREATE TRIGGER smartcheck_pilot_audit_append_only BEFORE INSERT OR UPDATE OR DELETE ON smartcheck_audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_smartcheck_pilot_audit_mutation()
--> statement-breakpoint
CREATE FUNCTION record_smartcheck_pilot_measurement_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json)
  VALUES (NEW.company_id,NEW.measured_by_user_id,'pilot_case_measured','smartcheck_pilot_case',NEW.pilot_case_id,
    jsonb_build_object('measurementId',NEW.id,'measurementKey',NEW.measurement_key,'requestHash',NEW.request_hash,'caseRevision',NEW.case_revision));
  RETURN NEW;
END;
$$
--> statement-breakpoint
ALTER FUNCTION record_smartcheck_pilot_measurement_evidence() OWNER TO CURRENT_USER
--> statement-breakpoint
REVOKE ALL ON FUNCTION record_smartcheck_pilot_measurement_evidence() FROM PUBLIC
--> statement-breakpoint
CREATE TRIGGER smartcheck_pilot_measurements_record_evidence AFTER INSERT ON smartcheck_pilot_measurements FOR EACH ROW EXECUTE FUNCTION record_smartcheck_pilot_measurement_evidence()
--> statement-breakpoint
CREATE FUNCTION record_smartcheck_pilot_case_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE measurement_id uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json)
    VALUES (NEW.company_id,NEW.created_by_user_id,'pilot_case_admitted','smartcheck_pilot_case',NEW.id,
      jsonb_build_object('documentId',NEW.document_id,'pilotId',NEW.pilot_id,'permissionReference',NEW.permission_reference,'retentionUntil',NEW.retention_until));
  ELSIF NEW.reviewer_decision IS NOT NULL AND OLD.reviewer_decision IS NULL THEN
    measurement_id := nullif(current_setting('bimmetraj.pilot_review_measurement_id',true),'')::uuid;
    INSERT INTO smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json)
    VALUES (NEW.company_id,NEW.reviewer_user_id,'pilot_case_'||NEW.reviewer_decision,'smartcheck_pilot_case',NEW.id,
      jsonb_build_object('measurementId',measurement_id,'decision',NEW.reviewer_decision,'reviewerRole',NEW.reviewer_role,'notes',NEW.reviewer_notes));
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
ALTER FUNCTION record_smartcheck_pilot_case_evidence() OWNER TO CURRENT_USER
--> statement-breakpoint
REVOKE ALL ON FUNCTION record_smartcheck_pilot_case_evidence() FROM PUBLIC
--> statement-breakpoint
CREATE TRIGGER smartcheck_pilot_cases_record_evidence AFTER INSERT OR UPDATE ON smartcheck_pilot_cases FOR EACH ROW EXECUTE FUNCTION record_smartcheck_pilot_case_evidence()
