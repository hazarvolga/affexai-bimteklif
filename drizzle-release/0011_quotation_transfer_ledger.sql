ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_transfer_scope_key" UNIQUE("id","company_id","document_id","processing_run_id");
--> statement-breakpoint
CREATE TABLE "quotation_transfer_ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_processing_run_id" uuid NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"source_quotation_id" uuid NOT NULL,
	"target_quotation_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_payload_hash" text NOT NULL,
	"request_hash" text NOT NULL,
	"scope_snapshot_json" jsonb NOT NULL,
	"source_rule_version" text NOT NULL,
	"result_summary_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_transfer_ledgers_id_company_id_key" UNIQUE("id","company_id"),
	CONSTRAINT "quotation_transfer_ledgers_scope_key" UNIQUE("id","company_id","source_document_id","source_processing_run_id","target_quotation_id"),
	CONSTRAINT "quotation_transfer_ledgers_actor_idempotency_key" UNIQUE("company_id","actor_user_id","idempotency_key"),
	CONSTRAINT "quotation_transfer_ledgers_request_hash_check" CHECK ("quotation_transfer_ledgers"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "quotation_transfer_ledgers_request_payload_hash_check" CHECK ("quotation_transfer_ledgers"."request_payload_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "quotation_transfer_ledgers_idempotency_key_check" CHECK (length(trim("quotation_transfer_ledgers"."idempotency_key")) between 1 and 160),
	CONSTRAINT "quotation_transfer_ledgers_distinct_revision_check" CHECK ("quotation_transfer_ledgers"."source_quotation_id" <> "quotation_transfer_ledgers"."target_quotation_id")
);

--> statement-breakpoint
CREATE TABLE "quotation_transfer_source_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"transfer_ledger_id" uuid NOT NULL,
	"source_quantity_row_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_processing_run_id" uuid NOT NULL,
	"target_quotation_id" uuid NOT NULL,
	"target_quotation_item_id" uuid NOT NULL,
	"contributed_quantity" numeric(20, 4) NOT NULL,
	"source_cell_range" text NOT NULL,
	"source_rule_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_transfer_source_rows_ledger_row_item_key" UNIQUE("transfer_ledger_id","source_quantity_row_id","target_quotation_item_id"),
	CONSTRAINT "quotation_transfer_source_rows_quantity_check" CHECK ("quotation_transfer_source_rows"."contributed_quantity" > 0)
);

--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_actor_user_id_company_id_memberships_user_id_company_id_fk" FOREIGN KEY ("actor_user_id","company_id") REFERENCES "public"."memberships"("user_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_source_document_id_company_id_documents_id_company_id_fk" FOREIGN KEY ("source_document_id","company_id") REFERENCES "public"."documents"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_source_processing_run_id_source_document_id_company_id_document_processing_runs_id_document_id_company_id_fk" FOREIGN KEY ("source_processing_run_id","source_document_id","company_id") REFERENCES "public"."document_processing_runs"("id","document_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_source_artifact_id_company_id_source_processing_run_id_source_document_id_document_processing_artifacts_id_company_id_processing_run_id_document_id_fk" FOREIGN KEY ("source_artifact_id","company_id","source_processing_run_id","source_document_id") REFERENCES "public"."document_processing_artifacts"("id","company_id","processing_run_id","document_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_source_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("source_quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_ledgers" ADD CONSTRAINT "quotation_transfer_ledgers_target_quotation_id_company_id_quotations_id_company_id_fk" FOREIGN KEY ("target_quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_source_rows" ADD CONSTRAINT "quotation_transfer_source_rows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_source_rows" ADD CONSTRAINT "quotation_transfer_source_rows_ledger_scope_fk" FOREIGN KEY ("transfer_ledger_id","company_id","source_document_id","source_processing_run_id","target_quotation_id") REFERENCES "public"."quotation_transfer_ledgers"("id","company_id","source_document_id","source_processing_run_id","target_quotation_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_source_rows" ADD CONSTRAINT "quotation_transfer_source_rows_source_scope_fk" FOREIGN KEY ("source_quantity_row_id","company_id","source_document_id","source_processing_run_id") REFERENCES "public"."normalized_quantity_rows"("id","company_id","document_id","processing_run_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotation_transfer_source_rows" ADD CONSTRAINT "quotation_transfer_source_rows_target_quotation_item_id_target_quotation_id_company_id_quotation_items_id_quotation_id_company_id_fk" FOREIGN KEY ("target_quotation_item_id","target_quotation_id","company_id") REFERENCES "public"."quotation_items"("id","quotation_id","company_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_quotation_transfer_ledgers_lookup" ON "quotation_transfer_ledgers" USING btree ("company_id","source_quotation_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_quotation_transfer_source_rows_lookup" ON "quotation_transfer_source_rows" USING btree ("company_id","target_quotation_id","target_quotation_item_id");
--> statement-breakpoint
CREATE FUNCTION prevent_quotation_transfer_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'quotation_transfer_ledgers'
     AND TG_OP = 'UPDATE'
     AND (to_jsonb(OLD) ->> 'sealed_at') IS NULL
     AND (to_jsonb(NEW) ->> 'sealed_at') IS NOT NULL
     AND (to_jsonb(NEW) - 'sealed_at') = (to_jsonb(OLD) - 'sealed_at') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_ledgers_append_only BEFORE UPDATE OR DELETE ON quotation_transfer_ledgers FOR EACH ROW EXECUTE FUNCTION prevent_quotation_transfer_ledger_mutation()
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_source_rows_append_only BEFORE UPDATE OR DELETE ON quotation_transfer_source_rows FOR EACH ROW EXECUTE FUNCTION prevent_quotation_transfer_ledger_mutation()
--> statement-breakpoint
CREATE FUNCTION validate_quotation_transfer_revision_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  source_parent_id uuid;
  source_revision integer;
  target_parent_id uuid;
  target_revision integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text || ':' || LEAST(NEW.source_quotation_id, NEW.target_quotation_id)::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text || ':' || GREATEST(NEW.source_quotation_id, NEW.target_quotation_id)::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('t34:document:' || NEW.company_id::text || ':' || NEW.source_document_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('t34:run:' || NEW.company_id::text || ':' || NEW.source_processing_run_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('t34:artifact:' || NEW.company_id::text || ':' || NEW.source_artifact_id::text, 0));
  SELECT parent_id, revision_version INTO STRICT source_parent_id, source_revision
    FROM quotations WHERE id = NEW.source_quotation_id AND company_id = NEW.company_id;
  SELECT parent_id, revision_version INTO STRICT target_parent_id, target_revision
    FROM quotations WHERE id = NEW.target_quotation_id AND company_id = NEW.company_id;
  IF target_parent_id IS DISTINCT FROM COALESCE(source_parent_id, NEW.source_quotation_id)
     OR target_revision <> source_revision + 1 THEN
    RAISE EXCEPTION 'target quotation must be the immediate successor of source quotation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.company_id = NEW.company_id
      AND q.id <> NEW.target_quotation_id
      AND COALESCE(q.parent_id, q.id) = COALESCE(source_parent_id, NEW.source_quotation_id)
      AND q.revision_version = target_revision
  ) THEN
    RAISE EXCEPTION 'target quotation revision already exists in source series';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER quotation_transfer_revision_binding
AFTER INSERT OR UPDATE ON quotation_transfer_ledgers
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION validate_quotation_transfer_revision_binding()
--> statement-breakpoint
CREATE FUNCTION prevent_transfer_bound_quotation_identity_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(OLD.company_id::text || ':' || OLD.id::text, 0));
  IF (OLD.id IS DISTINCT FROM NEW.id
      OR OLD.company_id IS DISTINCT FROM NEW.company_id
      OR OLD.parent_id IS DISTINCT FROM NEW.parent_id
      OR OLD.revision_version IS DISTINCT FROM NEW.revision_version)
     AND EXISTS (
       SELECT 1 FROM quotation_transfer_ledgers
       WHERE company_id = OLD.company_id
         AND (source_quotation_id = OLD.id OR target_quotation_id = OLD.id)
     ) THEN
    RAISE EXCEPTION 'transfer-bound quotation revision identity is immutable';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_quotation_identity_immutable
BEFORE UPDATE OF id, company_id, parent_id, revision_version ON quotations
FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_quotation_identity_mutation()
--> statement-breakpoint
CREATE FUNCTION prevent_transfer_bound_source_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE lock_scope text;
BEGIN
  lock_scope := CASE TG_TABLE_NAME
    WHEN 'normalized_quantity_rows' THEN 'row'
    WHEN 'document_processing_artifacts' THEN 'artifact'
    WHEN 'document_processing_runs' THEN 'run'
    WHEN 'documents' THEN 'document'
  END;
  PERFORM pg_advisory_xact_lock(hashtextextended('t34:' || lock_scope || ':' || OLD.company_id::text || ':' || OLD.id::text, 0));
  IF (TG_TABLE_NAME = 'normalized_quantity_rows' AND EXISTS (
      SELECT 1 FROM quotation_transfer_source_rows WHERE source_quantity_row_id = OLD.id AND company_id = OLD.company_id
    )) OR (TG_TABLE_NAME = 'document_processing_artifacts' AND EXISTS (
      SELECT 1 FROM quotation_transfer_ledgers WHERE source_artifact_id = OLD.id AND company_id = OLD.company_id
    )) OR (TG_TABLE_NAME = 'document_processing_runs' AND EXISTS (
      SELECT 1 FROM quotation_transfer_ledgers WHERE source_processing_run_id = OLD.id AND company_id = OLD.company_id
    )) OR (TG_TABLE_NAME = 'documents' AND EXISTS (
      SELECT 1 FROM quotation_transfer_ledgers WHERE source_document_id = OLD.id AND company_id = OLD.company_id
    )) THEN
    RAISE EXCEPTION 'transfer-bound source evidence is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_row_immutable BEFORE UPDATE OF raw_description, raw_position_code, raw_unit, raw_quantity, source_cell_range, review_status, reviewed_at, reviewer_user_id, normalized_description, normalized_position_code, normalized_unit, normalized_quantity, normalized_waste_percent, formula_json, quantity_source OR DELETE ON normalized_quantity_rows FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_artifact_immutable BEFORE UPDATE OF checksum_sha256, schema_version OR DELETE ON document_processing_artifacts FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_run_immutable BEFORE UPDATE OF pipeline_version, provider, model, status, current_stage OR DELETE ON document_processing_runs FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_document_immutable BEFORE UPDATE OF checksum_sha256 OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()
--> statement-breakpoint
CREATE FUNCTION enforce_quotation_transfer_junction_seal() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE ledger_sealed_at timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('t34:row:' || NEW.company_id::text || ':' || NEW.source_quantity_row_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('t34:item:' || NEW.company_id::text || ':' || NEW.target_quotation_item_id::text, 0));
  SELECT sealed_at INTO STRICT ledger_sealed_at FROM quotation_transfer_ledgers
    WHERE id = NEW.transfer_ledger_id AND company_id = NEW.company_id;
  IF ledger_sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'quotation transfer junction is sealed';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_source_rows_sealed
BEFORE INSERT ON quotation_transfer_source_rows
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_transfer_junction_seal()
--> statement-breakpoint
CREATE FUNCTION enforce_quotation_transfer_finalized() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM quotation_transfer_ledgers
    WHERE id = NEW.id AND company_id = NEW.company_id AND sealed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'quotation transfer ledger must be sealed before commit';
  END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER quotation_transfer_ledger_must_be_sealed
AFTER INSERT OR UPDATE ON quotation_transfer_ledgers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_transfer_finalized()
--> statement-breakpoint
CREATE FUNCTION prevent_transfer_bound_target_item_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE old_quote_id uuid;
DECLARE new_quote_id uuid;
DECLARE old_tenant_id uuid;
DECLARE new_tenant_id uuid;
DECLARE old_item_id uuid;
DECLARE new_item_id uuid;
DECLARE old_scope text;
DECLARE new_scope text;
DECLARE old_item_scope text;
DECLARE new_item_scope text;
BEGIN
  old_quote_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.quotation_id ELSE OLD.quotation_id END;
  new_quote_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.quotation_id ELSE NEW.quotation_id END;
  old_tenant_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.company_id ELSE OLD.company_id END;
  new_tenant_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
  old_item_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.id ELSE OLD.id END;
  new_item_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  old_scope := old_tenant_id::text || ':' || old_quote_id::text;
  new_scope := new_tenant_id::text || ':' || new_quote_id::text;
  old_item_scope := 't34:item:' || old_tenant_id::text || ':' || old_item_id::text;
  new_item_scope := 't34:item:' || new_tenant_id::text || ':' || new_item_id::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(LEAST(old_scope, new_scope), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(GREATEST(old_scope, new_scope), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(LEAST(old_item_scope, new_item_scope), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(GREATEST(old_item_scope, new_item_scope), 0));
  IF EXISTS (
    SELECT 1 FROM quotation_transfer_ledgers
    WHERE sealed_at IS NOT NULL AND (
      (company_id = old_tenant_id AND target_quotation_id = old_quote_id)
      OR (company_id = new_tenant_id AND target_quotation_id = new_quote_id)
    )
  ) THEN
    RAISE EXCEPTION 'transfer-bound target quotation items are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_target_items_immutable
BEFORE INSERT OR UPDATE OR DELETE ON quotation_items
FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_target_item_mutation()
--> statement-breakpoint
CREATE FUNCTION prevent_transfer_bound_target_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE old_quote_id uuid;
DECLARE new_quote_id uuid;
DECLARE old_tenant_id uuid;
DECLARE new_tenant_id uuid;
DECLARE old_item_id uuid;
DECLARE new_item_id uuid;
DECLARE old_scope text;
DECLARE new_scope text;
DECLARE old_item_scope text;
DECLARE new_item_scope text;
BEGIN
  old_quote_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.quotation_id ELSE OLD.quotation_id END;
  new_quote_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.quotation_id ELSE NEW.quotation_id END;
  old_tenant_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.company_id ELSE OLD.company_id END;
  new_tenant_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END;
  old_item_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.quotation_item_id ELSE OLD.quotation_item_id END;
  new_item_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.quotation_item_id ELSE NEW.quotation_item_id END;
  old_scope := old_tenant_id::text || ':' || old_quote_id::text;
  new_scope := new_tenant_id::text || ':' || new_quote_id::text;
  old_item_scope := 't34:item:' || old_tenant_id::text || ':' || old_item_id::text;
  new_item_scope := 't34:item:' || new_tenant_id::text || ':' || new_item_id::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(LEAST(old_scope, new_scope), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(GREATEST(old_scope, new_scope), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(LEAST(old_item_scope, new_item_scope), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(GREATEST(old_item_scope, new_item_scope), 0));
  IF EXISTS (
    SELECT 1 FROM quotation_transfer_ledgers
    WHERE sealed_at IS NOT NULL AND (
      (company_id = old_tenant_id AND target_quotation_id = old_quote_id)
      OR (company_id = new_tenant_id AND target_quotation_id = new_quote_id)
    )
  ) THEN
    RAISE EXCEPTION 'transfer-bound target quotation evidence is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$
--> statement-breakpoint
CREATE TRIGGER quotation_transfer_target_evidence_immutable
BEFORE INSERT OR UPDATE OR DELETE ON quotation_item_evidence
FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_target_evidence_mutation()
