const currentPriceEvidenceIndex = 'CREATE UNIQUE INDEX "quotation_item_evidence_current_price_unique"';

export const priceEvidenceDeduplication = `WITH ranked_current_price_evidence AS (
  SELECT evidence.id,
    row_number() OVER (
      PARTITION BY evidence.company_id, evidence.quotation_item_id
      ORDER BY
        (evidence.price_snapshot_id IS NOT NULL AND evidence.price_snapshot_id = item.price_snapshot_id) DESC,
        evidence.created_at DESC,
        evidence.id DESC
    ) AS rank
  FROM quotation_item_evidence AS evidence
  INNER JOIN quotation_items AS item
    ON item.id = evidence.quotation_item_id
    AND item.company_id = evidence.company_id
  WHERE evidence.evidence_type = 'price'
    AND evidence.status = 'current'
)
UPDATE quotation_item_evidence AS evidence
SET status = 'superseded'
FROM ranked_current_price_evidence AS ranked
WHERE evidence.id = ranked.id
  AND ranked.rank > 1`;

export const cdeAppendOnlyFunction = `CREATE FUNCTION prevent_cde_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$`;

export const cdeCurrentRevisionConstraint = `ALTER TABLE "cde_containers"
ADD CONSTRAINT "cde_containers_current_revision_company_fk"
FOREIGN KEY ("current_revision_id", "company_id", "id")
REFERENCES "public"."cde_revisions"("id", "company_id", "container_id")
ON DELETE RESTRICT ON UPDATE NO ACTION`;

export const cdeAppendOnlyTrigger = `CREATE TRIGGER cde_transition_events_append_only
BEFORE UPDATE OR DELETE ON cde_transition_events
FOR EACH ROW EXECUTE FUNCTION prevent_cde_ledger_mutation()`;

export const cdeRevisionAppendOnlyTrigger = `CREATE TRIGGER cde_revisions_append_only
BEFORE UPDATE OR DELETE ON cde_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_cde_ledger_mutation()`;

export const cdeEvidenceLockFunction = `CREATE FUNCTION prevent_cde_bound_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'document_processing_artifacts' AND EXISTS (
    SELECT 1 FROM cde_revisions WHERE result_artifact_id = OLD.id AND company_id = OLD.company_id
  ) THEN RAISE EXCEPTION 'CDE-bound evidence artifact is immutable';
  ELSIF TG_TABLE_NAME = 'document_processing_runs' AND EXISTS (
    SELECT 1 FROM cde_revisions WHERE processing_run_id = OLD.id AND company_id = OLD.company_id
  ) THEN RAISE EXCEPTION 'CDE-bound processing run is immutable';
  ELSIF TG_TABLE_NAME = 'documents' AND EXISTS (
    SELECT 1 FROM cde_revisions WHERE document_id = OLD.id AND company_id = OLD.company_id
  ) THEN RAISE EXCEPTION 'CDE-bound document identity is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$`;

export const cdeEvidenceLockTriggers = [
  `CREATE TRIGGER cde_bound_artifact_immutable BEFORE UPDATE OR DELETE ON document_processing_artifacts FOR EACH ROW EXECUTE FUNCTION prevent_cde_bound_evidence_mutation()`,
  `CREATE TRIGGER cde_bound_run_immutable BEFORE UPDATE OF idempotency_key, pipeline_version, provider, model, status OR DELETE ON document_processing_runs FOR EACH ROW EXECUTE FUNCTION prevent_cde_bound_evidence_mutation()`,
  `CREATE TRIGGER cde_bound_document_immutable BEFORE UPDATE OF checksum_sha256, storage_key OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_cde_bound_evidence_mutation()`,
] as const;

export const quotationTransferAppendOnlyFunction = `CREATE FUNCTION prevent_quotation_transfer_ledger_mutation() RETURNS trigger
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
$$`;

export const quotationTransferAppendOnlyTriggers = [
  `CREATE TRIGGER quotation_transfer_ledgers_append_only BEFORE UPDATE OR DELETE ON quotation_transfer_ledgers FOR EACH ROW EXECUTE FUNCTION prevent_quotation_transfer_ledger_mutation()`,
  `CREATE TRIGGER quotation_transfer_source_rows_append_only BEFORE UPDATE OR DELETE ON quotation_transfer_source_rows FOR EACH ROW EXECUTE FUNCTION prevent_quotation_transfer_ledger_mutation()`,
] as const;

export const quotationTransferRevisionBindingFunction = `CREATE FUNCTION validate_quotation_transfer_revision_binding() RETURNS trigger
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
$$`;

export const quotationTransferRevisionBindingTrigger = `CREATE CONSTRAINT TRIGGER quotation_transfer_revision_binding
AFTER INSERT OR UPDATE ON quotation_transfer_ledgers
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION validate_quotation_transfer_revision_binding()`;

export const quotationTransferQuotationIdentityFunction = `CREATE FUNCTION prevent_transfer_bound_quotation_identity_mutation() RETURNS trigger
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
$$`;

export const quotationTransferQuotationIdentityTrigger = `CREATE TRIGGER quotation_transfer_quotation_identity_immutable
BEFORE UPDATE OF id, company_id, parent_id, revision_version ON quotations
FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_quotation_identity_mutation()`;

export const quotationTransferSourceMutationFunction = `CREATE FUNCTION prevent_transfer_bound_source_mutation() RETURNS trigger
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
$$`;

export const quotationTransferSourceMutationTriggers = [
  `CREATE TRIGGER quotation_transfer_row_immutable BEFORE UPDATE OF raw_description, raw_position_code, raw_unit, raw_quantity, source_cell_range, review_status, reviewed_at, reviewer_user_id, normalized_description, normalized_position_code, normalized_unit, normalized_quantity, normalized_waste_percent, formula_json, quantity_source OR DELETE ON normalized_quantity_rows FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()`,
  `CREATE TRIGGER quotation_transfer_artifact_immutable BEFORE UPDATE OF checksum_sha256, schema_version OR DELETE ON document_processing_artifacts FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()`,
  `CREATE TRIGGER quotation_transfer_run_immutable BEFORE UPDATE OF pipeline_version, provider, model, status, current_stage OR DELETE ON document_processing_runs FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()`,
  `CREATE TRIGGER quotation_transfer_document_immutable BEFORE UPDATE OF checksum_sha256 OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_source_mutation()`,
] as const;

export const quotationTransferJunctionSealFunction = `CREATE FUNCTION enforce_quotation_transfer_junction_seal() RETURNS trigger
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
$$`;

export const quotationTransferJunctionSealTrigger = `CREATE TRIGGER quotation_transfer_source_rows_sealed
BEFORE INSERT ON quotation_transfer_source_rows
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_transfer_junction_seal()`;

export const quotationTransferFinalizeFunction = `CREATE FUNCTION enforce_quotation_transfer_finalized() RETURNS trigger
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
$$`;

export const quotationTransferFinalizeTrigger = `CREATE CONSTRAINT TRIGGER quotation_transfer_ledger_must_be_sealed
AFTER INSERT OR UPDATE ON quotation_transfer_ledgers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_transfer_finalized()`;

export const quotationTransferTargetItemFunction = `CREATE FUNCTION prevent_transfer_bound_target_item_mutation() RETURNS trigger
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
$$`;

export const quotationTransferTargetItemTrigger = `CREATE TRIGGER quotation_transfer_target_items_immutable
BEFORE INSERT OR UPDATE OR DELETE ON quotation_items
FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_target_item_mutation()`;

export const quotationTransferTargetEvidenceFunction = `CREATE FUNCTION prevent_transfer_bound_target_evidence_mutation() RETURNS trigger
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
$$`;

export const quotationTransferTargetEvidenceTrigger = `CREATE TRIGGER quotation_transfer_target_evidence_immutable
BEFORE INSERT OR UPDATE OR DELETE ON quotation_item_evidence
FOR EACH ROW EXECUTE FUNCTION prevent_transfer_bound_target_evidence_mutation()`;

export const progressPeriodTransitionFunction = `CREATE FUNCTION enforce_progress_period_transition() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE contract_amount numeric(20,2);
DECLARE item_amount numeric(20,2);
DECLARE item_count integer;
DECLARE latest_payment_number integer;
DECLARE latest_status text;
DECLARE latest_sealed_at timestamptz;
DECLARE latest_scope_hash text;
DECLARE parent_revision integer;
DECLARE parent_status text;
DECLARE parent_is_current boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('progress:' || NEW.company_id::text || ':' || NEW.contract_id::text, 0));
    SELECT initial_amount INTO STRICT contract_amount FROM construction_contracts
      WHERE id=NEW.contract_id AND company_id=NEW.company_id;
    SELECT count(*)::integer, coalesce(sum(round(contract_quantity * unit_price, 2)),0)::numeric(20,2)
      INTO item_count,item_amount FROM construction_contract_items
      WHERE contract_id=NEW.contract_id AND company_id=NEW.company_id;
    IF item_count=0 OR item_amount <> contract_amount THEN
      RAISE EXCEPTION 'progress contract requires reconciled item scope before first period';
    END IF;
    IF NEW.status <> 'draft' OR NEW.version <> 0 OR NEW.is_current <> true
       OR NEW.scope_hash IS NOT NULL OR NEW.submitted_by_user_id IS NOT NULL OR NEW.approved_by_user_id IS NOT NULL
       OR NEW.submitted_at IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.sealed_at IS NOT NULL THEN
      RAISE EXCEPTION 'new progress payment revision must start as unsealed draft version zero';
    END IF;
    IF (NEW.revision_number = 0 AND NEW.parent_period_id IS NOT NULL)
       OR (NEW.revision_number > 0 AND NEW.parent_period_id IS NULL) THEN
      RAISE EXCEPTION 'progress payment revision parent binding is invalid';
    END IF;
    IF NEW.revision_number = 0 THEN
      SELECT payment_number,status,sealed_at,scope_hash INTO latest_payment_number,latest_status,latest_sealed_at,latest_scope_hash
        FROM progress_payment_periods WHERE company_id=NEW.company_id AND contract_id=NEW.contract_id AND is_current=true
        ORDER BY payment_number DESC LIMIT 1;
      IF latest_payment_number IS NULL AND NEW.payment_number <> 1 THEN
        RAISE EXCEPTION 'first progress payment number must be one';
      END IF;
      IF latest_payment_number IS NOT NULL AND (
        NEW.payment_number <> latest_payment_number + 1 OR latest_status <> 'approved'
        OR latest_sealed_at IS NULL OR latest_scope_hash !~ '^[0-9a-f]{64}$'
      ) THEN RAISE EXCEPTION 'new progress payment requires next number and sealed prior current period'; END IF;
    ELSE
      SELECT revision_number,status,is_current INTO STRICT parent_revision,parent_status,parent_is_current
        FROM progress_payment_periods WHERE id=NEW.parent_period_id AND company_id=NEW.company_id
          AND contract_id=NEW.contract_id AND payment_number=NEW.payment_number;
      IF NEW.revision_number <> parent_revision + 1 OR parent_status <> 'superseded' OR parent_is_current <> false THEN
        RAISE EXCEPTION 'correction revision requires exact superseded parent revision';
      END IF;
      IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.company_id=NEW.company_id AND p.contract_id=NEW.contract_id
        AND p.payment_number > NEW.payment_number AND p.status <> 'cancelled') THEN
        RAISE EXCEPTION 'correction revision cannot follow a later non-cancelled period';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'progress payment periods are append-only revisions'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('progress:' || OLD.company_id::text || ':' || OLD.contract_id::text, 0));
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.contract_id IS DISTINCT FROM OLD.contract_id OR NEW.payment_number IS DISTINCT FROM OLD.payment_number
     OR NEW.revision_number IS DISTINCT FROM OLD.revision_number OR NEW.parent_period_id IS DISTINCT FROM OLD.parent_period_id
     OR NEW.period_start IS DISTINCT FROM OLD.period_start OR NEW.period_end IS DISTINCT FROM OLD.period_end
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'progress payment revision identity is immutable';
  END IF;
  IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'progress payment version must advance exactly once'; END IF;
  IF OLD.status = 'draft' AND NEW.status IN ('draft','submitted','cancelled') THEN NULL;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('draft','approved','cancelled') THEN NULL;
  ELSIF OLD.status = 'approved' AND NEW.status = 'superseded' AND NEW.is_current = false THEN NULL;
  ELSE RAISE EXCEPTION 'invalid progress payment state transition'; END IF;
  IF OLD.status = 'approved' AND NEW.status = 'superseded' AND EXISTS (
    SELECT 1 FROM progress_payment_periods p
    WHERE p.company_id=OLD.company_id AND p.contract_id=OLD.contract_id
      AND p.payment_number > OLD.payment_number AND p.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'progress payment correction cannot supersede a period followed by a later non-cancelled period';
  END IF;
  IF OLD.status = 'approved' AND NEW.status = 'superseded'
     AND (to_jsonb(NEW) - ARRAY['status','is_current','version','updated_at'])
         IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','is_current','version','updated_at']) THEN
    RAISE EXCEPTION 'approved progress payment sealed fields are immutable while superseding';
  END IF;
  IF NEW.status = 'approved' AND (
    NEW.approved_at IS NULL OR NEW.sealed_at IS NULL OR NEW.approved_by_user_id IS NULL
    OR NEW.submitted_by_user_id IS NULL OR NEW.submitted_by_user_id = NEW.approved_by_user_id
    OR NEW.scope_hash IS NULL OR NEW.scope_hash !~ '^[0-9a-f]{64}$'
  ) THEN RAISE EXCEPTION 'approved progress payment requires maker-checker evidence'; END IF;
  IF NEW.status = 'approved' THEN
    IF NOT EXISTS (SELECT 1 FROM progress_measurements m WHERE m.period_id=NEW.id AND m.company_id=NEW.company_id AND m.review_status='approved')
       OR EXISTS (SELECT 1 FROM progress_measurements m WHERE m.period_id=NEW.id AND m.company_id=NEW.company_id AND m.review_status <> 'approved') THEN
      RAISE EXCEPTION 'approved progress payment requires only approved measurements';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM progress_payment_lines l WHERE l.period_id=NEW.id AND l.company_id=NEW.company_id)
       OR EXISTS (
         WITH measured AS (
           SELECT contract_item_id,sum(quantity)::numeric(20,4) quantity FROM progress_measurements
           WHERE period_id=NEW.id AND company_id=NEW.company_id AND review_status='approved' GROUP BY contract_item_id
         ), lines AS (
           SELECT contract_item_id,current_quantity FROM progress_payment_lines
           WHERE period_id=NEW.id AND company_id=NEW.company_id
         )
         SELECT 1 FROM measured m FULL JOIN lines l ON l.contract_item_id=m.contract_item_id
         WHERE m.contract_item_id IS NULL OR l.contract_item_id IS NULL OR m.quantity <> l.current_quantity
       ) THEN RAISE EXCEPTION 'approved progress payment requires reconciled materialized lines'; END IF;
    IF EXISTS (SELECT 1 FROM progress_payment_adjustments a WHERE a.period_id=NEW.id AND a.company_id=NEW.company_id AND a.review_status <> 'approved') THEN
      RAISE EXCEPTION 'approved progress payment requires approved adjustments';
    END IF;
    IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.company_id=NEW.company_id AND p.contract_id=NEW.contract_id
      AND p.is_current=true AND p.payment_number < NEW.payment_number
      AND (p.status <> 'approved' OR p.sealed_at IS NULL OR p.scope_hash !~ '^[0-9a-f]{64}$')) THEN
      RAISE EXCEPTION 'approved progress payment requires sealed prior current periods';
    END IF;
  END IF;
  RETURN NEW;
END;
$$`;

export const progressPeriodTransitionTrigger = `CREATE TRIGGER progress_payment_period_transition_guard
BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_periods
FOR EACH ROW EXECUTE FUNCTION enforce_progress_period_transition()`;

export const progressCorrectionChildBindingFunction = `CREATE FUNCTION enforce_progress_correction_child_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'superseded' AND NOT EXISTS (
    SELECT 1 FROM progress_payment_periods child
    WHERE child.company_id=OLD.company_id AND child.contract_id=OLD.contract_id
      AND child.payment_number=OLD.payment_number AND child.parent_period_id=OLD.id
      AND child.revision_number=OLD.revision_number + 1 AND child.status='draft'
      AND child.is_current=true AND child.version=0
  ) THEN
    RAISE EXCEPTION 'superseded progress payment requires exact current draft correction child';
  END IF;
  RETURN NEW;
END;
$$`;

export const progressCorrectionChildBindingTrigger = `CREATE CONSTRAINT TRIGGER progress_correction_child_binding
AFTER UPDATE OF status,is_current ON progress_payment_periods
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (OLD.status = 'approved' AND NEW.status = 'superseded')
EXECUTE FUNCTION enforce_progress_correction_child_binding()`;

export const progressEvidenceMutationFunction = `CREATE FUNCTION prevent_progress_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE bound_period_id uuid;
DECLARE bound_company_id uuid;
DECLARE bound_status text;
DECLARE item_quantity numeric(20,4);
DECLARE item_price numeric(20,2);
DECLARE expected_previous numeric(20,4);
BEGIN
  IF TG_TABLE_NAME IN ('progress_payment_events','progress_measurement_review_events')
     OR (TG_TABLE_NAME = 'progress_payment_lines' AND TG_OP <> 'INSERT') THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
  END IF;
  IF TG_TABLE_NAME = 'construction_contract_items' THEN
    IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'construction_contract_items is append-only'; END IF;
    IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.contract_id=NEW.contract_id AND p.company_id=NEW.company_id) THEN
      RAISE EXCEPTION 'contract items cannot be inserted after first progress period';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'final_accounts' THEN
    IF TG_OP='INSERT' AND (NEW.status <> 'draft' OR NEW.sealed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'final account must start as unsealed draft';
    END IF;
    IF TG_OP <> 'INSERT' AND (OLD.sealed_at IS NOT NULL OR OLD.status = 'sealed') THEN
      RAISE EXCEPTION 'sealed final account is immutable';
    END IF;
    IF TG_OP='UPDATE' AND NEW.status='sealed' THEN
      RAISE EXCEPTION 'final account sealing requires append-only expert decision workflow';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'contract_variations' THEN
    IF TG_OP='INSERT' AND (NEW.status <> 'manual_review' OR NEW.decision_document_hash IS NOT NULL) THEN
      RAISE EXCEPTION 'contract variation must start in manual_review without decision attestation';
    END IF;
    IF TG_OP <> 'INSERT' AND OLD.status = 'approved' THEN RAISE EXCEPTION 'approved contract variation is immutable'; END IF;
    IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'contract variation review requires append-only expert decision workflow';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'progress_measurements' THEN
    bound_period_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'period_id')::uuid;
    bound_company_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'company_id')::uuid;
    SELECT status INTO STRICT bound_status FROM progress_payment_periods WHERE id=bound_period_id AND company_id=bound_company_id;
    IF bound_status <> 'draft' THEN RAISE EXCEPTION 'non-draft progress measurement is immutable'; END IF;
    IF TG_OP <> 'INSERT' AND OLD.review_status <> 'pending_review' THEN
      RAISE EXCEPTION 'reviewed progress measurement is immutable';
    END IF;
    IF TG_OP='UPDATE' AND (
      (to_jsonb(NEW) - ARRAY['review_status','reviewed_by_user_id','reviewed_at','review_reason'])
      IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['review_status','reviewed_by_user_id','reviewed_at','review_reason'])
    ) THEN RAISE EXCEPTION 'measurement evidence is immutable during review'; END IF;
    IF NEW.source_type IN ('pdf','field_record') THEN
      RAISE EXCEPTION 'progress measurement source pipeline is unavailable';
    END IF;
    IF NEW.source_type <> 'manual' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:document:' || NEW.company_id::text || ':' || NEW.source_document_id::text, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:run:' || NEW.company_id::text || ':' || NEW.source_processing_run_id::text, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:row:' || NEW.company_id::text || ':' || NEW.source_quantity_row_id::text, 0));
    END IF;
    IF (CASE WHEN TG_OP='INSERT' THEN NEW.source_type ELSE NEW.source_type END) <> 'manual' AND NOT EXISTS (
      SELECT 1 FROM documents d JOIN document_processing_runs r
        ON r.document_id=d.id AND r.company_id=d.company_id
      WHERE d.id=NEW.source_document_id AND d.company_id=NEW.company_id AND d.status='completed'
        AND r.id=NEW.source_processing_run_id AND r.status='succeeded'
    ) THEN RAISE EXCEPTION 'external progress measurement requires completed document and succeeded run'; END IF;
    IF NEW.source_type IN ('ifc','xlsx') AND NOT EXISTS (
      SELECT 1 FROM normalized_quantity_rows n
      WHERE n.id=NEW.source_quantity_row_id AND n.company_id=NEW.company_id
        AND n.document_id=NEW.source_document_id AND n.processing_run_id=NEW.source_processing_run_id
        AND n.source_cell_range=NEW.source_cell_range AND n.review_status IN ('approved','accepted_exception')
        AND n.normalized_quantity IS NOT NULL AND n.normalized_quantity=NEW.quantity
        AND n.normalized_unit IS NOT NULL AND n.normalized_unit=NEW.unit
    ) THEN RAISE EXCEPTION 'external progress measurement requires exact approved canonical source row binding'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'progress_payment_adjustments' THEN
    bound_period_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'period_id')::uuid;
    bound_company_id := (CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END ->> 'company_id')::uuid;
    SELECT status INTO STRICT bound_status FROM progress_payment_periods WHERE id=bound_period_id AND company_id=bound_company_id;
    IF bound_status <> 'draft' THEN RAISE EXCEPTION 'progress payment adjustments are immutable outside draft'; END IF;
    IF TG_OP='INSERT' AND NEW.review_status <> 'manual_review' THEN
      RAISE EXCEPTION 'adjustment must start in manual_review';
    END IF;
    IF TG_OP='UPDATE' AND NEW.review_status IS DISTINCT FROM OLD.review_status THEN
      RAISE EXCEPTION 'adjustment review requires append-only decision workflow';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'progress_payment_lines' AND TG_OP = 'INSERT' THEN
    SELECT status INTO STRICT bound_status FROM progress_payment_periods WHERE id=NEW.period_id AND company_id=NEW.company_id;
    IF bound_status <> 'submitted' THEN RAISE EXCEPTION 'progress lines can only materialize for submitted periods'; END IF;
    SELECT contract_quantity, unit_price INTO STRICT item_quantity, item_price
      FROM construction_contract_items WHERE id=NEW.contract_item_id AND contract_id=NEW.contract_id AND company_id=NEW.company_id;
    SELECT coalesce(sum(l.current_quantity),0)::numeric(20,4) INTO expected_previous
      FROM progress_payment_lines l JOIN progress_payment_periods p ON p.id=l.period_id AND p.company_id=l.company_id
      WHERE l.company_id=NEW.company_id AND l.contract_id=NEW.contract_id AND l.contract_item_id=NEW.contract_item_id
        AND p.status='approved' AND p.payment_number < (SELECT payment_number FROM progress_payment_periods WHERE id=NEW.period_id);
    IF NEW.previous_quantity <> expected_previous OR NEW.cumulative_quantity <> expected_previous + NEW.current_quantity THEN
      RAISE EXCEPTION 'materialized progress quantity chain mismatch';
    END IF;
    IF NEW.cumulative_quantity > item_quantity THEN RAISE EXCEPTION 'cumulative quantity exceeds contract quantity'; END IF;
    IF NEW.unit_price_snapshot <> item_price
       OR NEW.cumulative_amount <> round(NEW.cumulative_quantity * item_price, 2)
       OR NEW.current_amount <> round(NEW.cumulative_quantity * item_price, 2) - round(expected_previous * item_price, 2) THEN
      RAISE EXCEPTION 'materialized progress amount mismatch';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$`;

export const progressEvidenceMutationTriggers = [
  `CREATE TRIGGER progress_payment_events_append_only BEFORE UPDATE OR DELETE ON progress_payment_events FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER progress_measurement_review_events_append_only BEFORE UPDATE OR DELETE ON progress_measurement_review_events FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER progress_payment_lines_append_only BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_lines FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER progress_measurements_state_guard BEFORE INSERT OR UPDATE OR DELETE ON progress_measurements FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER progress_payment_adjustments_state_guard BEFORE INSERT OR UPDATE OR DELETE ON progress_payment_adjustments FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER construction_contract_items_append_only BEFORE INSERT OR UPDATE OR DELETE ON construction_contract_items FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER contract_variations_approved_guard BEFORE INSERT OR UPDATE OR DELETE ON contract_variations FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
  `CREATE TRIGGER final_accounts_sealed_guard BEFORE INSERT OR UPDATE OR DELETE ON final_accounts FOR EACH ROW EXECUTE FUNCTION prevent_progress_evidence_mutation()`,
] as const;

export const progressSourceMutationFunction = `CREATE FUNCTION prevent_progress_bound_source_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE source_kind text;
BEGIN
  source_kind := CASE TG_TABLE_NAME
    WHEN 'normalized_quantity_rows' THEN 'row'
    WHEN 'document_processing_runs' THEN 'run'
    WHEN 'documents' THEN 'document'
  END;
  PERFORM pg_advisory_xact_lock(hashtextextended('progress-source:' || source_kind || ':' || OLD.company_id::text || ':' || OLD.id::text, 0));
  IF (TG_TABLE_NAME = 'normalized_quantity_rows' AND EXISTS (
      SELECT 1 FROM progress_measurements WHERE source_quantity_row_id=OLD.id AND company_id=OLD.company_id
    )) OR (TG_TABLE_NAME = 'document_processing_runs' AND EXISTS (
      SELECT 1 FROM progress_measurements WHERE source_processing_run_id=OLD.id AND company_id=OLD.company_id
    )) OR (TG_TABLE_NAME = 'documents' AND EXISTS (
      SELECT 1 FROM progress_measurements WHERE source_document_id=OLD.id AND company_id=OLD.company_id
    )) THEN
    RAISE EXCEPTION 'progress-bound source evidence is immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$`;

export const progressSourceMutationTriggers = [
  `CREATE TRIGGER progress_source_row_immutable BEFORE UPDATE OF sheet_name, source_row_number, raw_description, raw_position_code, raw_unit, raw_quantity, source_cell_range, review_status, reviewed_at, reviewer_user_id, reviewer_notes, normalized_description, normalized_position_code, normalized_unit, normalized_quantity, normalized_waste_percent, formula_json, quantity_source, mapping_confidence, findings_json OR DELETE ON normalized_quantity_rows FOR EACH ROW EXECUTE FUNCTION prevent_progress_bound_source_mutation()`,
  `CREATE TRIGGER progress_source_run_immutable BEFORE UPDATE OF pipeline_version, provider, model, status, current_stage OR DELETE ON document_processing_runs FOR EACH ROW EXECUTE FUNCTION prevent_progress_bound_source_mutation()`,
  `CREATE TRIGGER progress_source_document_immutable BEFORE UPDATE OF checksum_sha256, status OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_progress_bound_source_mutation()`,
] as const;

export const progressMeasurementReviewEventFunction = `CREATE FUNCTION enforce_progress_measurement_review_event() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE measurement_row progress_measurements%ROWTYPE;
DECLARE period_version integer;
DECLARE period_status text;
BEGIN
  SELECT * INTO STRICT measurement_row FROM progress_measurements
    WHERE id=NEW.measurement_id AND company_id=NEW.company_id AND contract_id=NEW.contract_id AND period_id=NEW.period_id;
  SELECT version,status INTO STRICT period_version,period_status FROM progress_payment_periods
    WHERE id=NEW.period_id AND company_id=NEW.company_id AND contract_id=NEW.contract_id;
  IF period_status <> 'draft' OR period_version <> NEW.expected_version OR NEW.resulting_version <> period_version + 1 THEN
    RAISE EXCEPTION 'review event period version or state mismatch';
  END IF;
  IF measurement_row.created_by_user_id = NEW.actor_user_id THEN RAISE EXCEPTION 'measurement maker-checker required'; END IF;
  IF measurement_row.review_status <> NEW.decision OR measurement_row.reviewed_by_user_id <> NEW.actor_user_id
     OR measurement_row.reviewed_at IS NULL OR measurement_row.review_reason <> NEW.reason THEN
    RAISE EXCEPTION 'review event does not match reviewed measurement';
  END IF;
  RETURN NEW;
END;
$$`;

export const progressMeasurementReviewEventTrigger = `CREATE TRIGGER progress_measurement_review_event_guard
BEFORE INSERT ON progress_measurement_review_events
FOR EACH ROW EXECUTE FUNCTION enforce_progress_measurement_review_event()`;

export const progressMeasurementReviewBindingFunction = `CREATE FUNCTION enforce_progress_measurement_review_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.review_status IN ('approved','rejected') AND NOT EXISTS (
    SELECT 1 FROM progress_measurement_review_events e
    WHERE e.measurement_id=NEW.id AND e.period_id=NEW.period_id AND e.contract_id=NEW.contract_id AND e.company_id=NEW.company_id
      AND e.decision=NEW.review_status AND e.actor_user_id=NEW.reviewed_by_user_id AND e.reason=NEW.review_reason
  ) THEN RAISE EXCEPTION 'reviewed measurement requires append-only review event'; END IF;
  RETURN NEW;
END;
$$`;

export const progressMeasurementReviewBindingTrigger = `CREATE CONSTRAINT TRIGGER progress_measurement_review_binding
AFTER INSERT OR UPDATE OF review_status, reviewed_by_user_id, reviewed_at, review_reason ON progress_measurements
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_progress_measurement_review_binding()`;

export const constructionContractPeriodLockFunction = `CREATE FUNCTION prevent_progress_contract_header_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM progress_payment_periods p WHERE p.contract_id=OLD.id AND p.company_id=OLD.company_id) THEN
    IF TG_OP='DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.source_quotation_id IS DISTINCT FROM OLD.source_quotation_id OR NEW.contract_number IS DISTINCT FROM OLD.contract_number
       OR NEW.project_name IS DISTINCT FROM OLD.project_name OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.regime IS DISTINCT FROM OLD.regime OR NEW.initial_amount IS DISTINCT FROM OLD.initial_amount
       OR NEW.source_document_hash IS DISTINCT FROM OLD.source_document_hash OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'progress contract header identity amount and source are immutable after first period';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$`;

export const constructionContractPeriodLockTrigger = `CREATE TRIGGER construction_contracts_period_lock
BEFORE UPDATE OR DELETE ON construction_contracts
FOR EACH ROW EXECUTE FUNCTION prevent_progress_contract_header_mutation()`;

export const progressPaymentEventFunction = `CREATE FUNCTION enforce_progress_payment_event() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE period_row progress_payment_periods%ROWTYPE;
BEGIN
  SELECT * INTO STRICT period_row FROM progress_payment_periods
    WHERE id=NEW.period_id AND company_id=NEW.company_id AND contract_id=NEW.contract_id;
  IF period_row.status <> NEW.to_status OR period_row.version <> NEW.resulting_version THEN
    RAISE EXCEPTION 'progress payment event does not match current period state and version';
  END IF;
  IF NEW.action='submit' AND period_row.submitted_by_user_id IS DISTINCT FROM NEW.actor_user_id THEN
    RAISE EXCEPTION 'progress payment submit event actor mismatch';
  END IF;
  IF NEW.action='approve' AND period_row.approved_by_user_id IS DISTINCT FROM NEW.actor_user_id THEN
    RAISE EXCEPTION 'progress payment approve event actor mismatch';
  END IF;
  RETURN NEW;
END;
$$`;

export const progressPaymentEventTrigger = `CREATE TRIGGER progress_payment_event_guard
BEFORE INSERT ON progress_payment_events
FOR EACH ROW EXECUTE FUNCTION enforce_progress_payment_event()`;

export const progressPaymentEventBindingFunction = `CREATE FUNCTION enforce_progress_payment_event_binding() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT EXISTS (
    SELECT 1 FROM progress_payment_events e
    WHERE e.period_id=NEW.id AND e.contract_id=NEW.contract_id AND e.company_id=NEW.company_id
      AND e.from_status=OLD.status AND e.to_status=NEW.status
      AND e.expected_version=OLD.version AND e.resulting_version=NEW.version
  ) THEN RAISE EXCEPTION 'progress payment state change requires matching append-only event'; END IF;
  RETURN NEW;
END;
$$`;

export const progressPaymentEventBindingTrigger = `CREATE CONSTRAINT TRIGGER progress_payment_event_binding
AFTER UPDATE OF status ON progress_payment_periods
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_progress_payment_event_binding()`;

export const smartCheckWorkerLeaseTransition = `WITH affected AS (
UPDATE "document_processing_runs"
SET "status" = 'failed',
    "current_stage" = 'failed',
    "error_code" = 'WORKER_LEASE_MIGRATION',
    "error_message" = 'Worker lease migration requires an explicit retry.',
    "progress_message" = 'Worker lease migration; retry required',
    "completed_at" = now(),
    "updated_at" = now()
WHERE "status" = 'running'
RETURNING "document_id", "company_id"
)
UPDATE "documents" AS document
SET "status" = 'failed', "updated_at" = now()
FROM affected
WHERE document."id" = affected."document_id"
  AND document."company_id" = affected."company_id"`;

export const smartcheckPilotMeasurementAppendOnlyFunction = `CREATE FUNCTION prevent_smartcheck_pilot_measurement_mutation() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'smartcheck_pilot_measurements is append-only';
END;
$$`;

// Release migrations execute as the restricted migrator after SET LOCAL ROLE
// bimmetraj_owner. CURRENT_USER keeps empty-database verification possible while
// making the production owner exactly bimmetraj_owner.
export const smartcheckPilotMeasurementFunctionOwner = `ALTER FUNCTION prevent_smartcheck_pilot_measurement_mutation() OWNER TO CURRENT_USER`;
export const smartcheckPilotMeasurementFunctionRevoke = `REVOKE ALL ON FUNCTION prevent_smartcheck_pilot_measurement_mutation() FROM PUBLIC`;
export const smartcheckPilotMeasurementAppendOnlyTrigger = `CREATE TRIGGER smartcheck_pilot_measurements_append_only
BEFORE UPDATE OR DELETE ON smartcheck_pilot_measurements
FOR EACH ROW EXECUTE FUNCTION prevent_smartcheck_pilot_measurement_mutation()`;

export const smartcheckPilotMeasurementInsertFunction = `CREATE FUNCTION validate_smartcheck_pilot_measurement_insert() RETURNS trigger
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
$$`;
export const smartcheckPilotMeasurementInsertFunctionOwner = `ALTER FUNCTION validate_smartcheck_pilot_measurement_insert() OWNER TO CURRENT_USER`;
export const smartcheckPilotMeasurementInsertFunctionRevoke = `REVOKE ALL ON FUNCTION validate_smartcheck_pilot_measurement_insert() FROM PUBLIC`;
export const smartcheckPilotMeasurementInsertTrigger = `CREATE TRIGGER smartcheck_pilot_measurements_insert_guard BEFORE INSERT ON smartcheck_pilot_measurements FOR EACH ROW EXECUTE FUNCTION validate_smartcheck_pilot_measurement_insert()`;

export const smartcheckPilotMeasurementEvidenceFunction = `CREATE FUNCTION record_smartcheck_pilot_measurement_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO smartcheck_audit_logs(company_id,user_id,action,entity_type,entity_id,metadata_json)
  VALUES (NEW.company_id,NEW.measured_by_user_id,'pilot_case_measured','smartcheck_pilot_case',NEW.pilot_case_id,
    jsonb_build_object('measurementId',NEW.id,'measurementKey',NEW.measurement_key,'requestHash',NEW.request_hash,'caseRevision',NEW.case_revision));
  RETURN NEW;
END;
$$`;
export const smartcheckPilotMeasurementEvidenceFunctionOwner = `ALTER FUNCTION record_smartcheck_pilot_measurement_evidence() OWNER TO CURRENT_USER`;
export const smartcheckPilotMeasurementEvidenceFunctionRevoke = `REVOKE ALL ON FUNCTION record_smartcheck_pilot_measurement_evidence() FROM PUBLIC`;
export const smartcheckPilotMeasurementEvidenceTrigger = `CREATE TRIGGER smartcheck_pilot_measurements_record_evidence AFTER INSERT ON smartcheck_pilot_measurements FOR EACH ROW EXECUTE FUNCTION record_smartcheck_pilot_measurement_evidence()`;

export const smartcheckPilotCaseMutationFunction = `CREATE FUNCTION enforce_smartcheck_pilot_case_mutation() RETURNS trigger
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
$$`;
export const smartcheckPilotCaseFunctionOwner = `ALTER FUNCTION enforce_smartcheck_pilot_case_mutation() OWNER TO CURRENT_USER`;
export const smartcheckPilotCaseFunctionRevoke = `REVOKE ALL ON FUNCTION enforce_smartcheck_pilot_case_mutation() FROM PUBLIC`;
export const smartcheckPilotCaseMutationTrigger = `CREATE TRIGGER smartcheck_pilot_cases_mutation_guard BEFORE UPDATE OR DELETE ON smartcheck_pilot_cases FOR EACH ROW EXECUTE FUNCTION enforce_smartcheck_pilot_case_mutation()`;

export const smartcheckPilotCaseEvidenceFunction = `CREATE FUNCTION record_smartcheck_pilot_case_evidence() RETURNS trigger
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
$$`;
export const smartcheckPilotCaseEvidenceFunctionOwner = `ALTER FUNCTION record_smartcheck_pilot_case_evidence() OWNER TO CURRENT_USER`;
export const smartcheckPilotCaseEvidenceFunctionRevoke = `REVOKE ALL ON FUNCTION record_smartcheck_pilot_case_evidence() FROM PUBLIC`;
export const smartcheckPilotCaseEvidenceTrigger = `CREATE TRIGGER smartcheck_pilot_cases_record_evidence AFTER INSERT OR UPDATE ON smartcheck_pilot_cases FOR EACH ROW EXECUTE FUNCTION record_smartcheck_pilot_case_evidence()`;

export const smartcheckPilotAuditMutationFunction = `CREATE FUNCTION prevent_smartcheck_pilot_audit_mutation() RETURNS trigger
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
$$`;
export const smartcheckPilotAuditFunctionOwner = `ALTER FUNCTION prevent_smartcheck_pilot_audit_mutation() OWNER TO CURRENT_USER`;
export const smartcheckPilotAuditFunctionRevoke = `REVOKE ALL ON FUNCTION prevent_smartcheck_pilot_audit_mutation() FROM PUBLIC`;
export const smartcheckPilotAuditMutationTrigger = `CREATE TRIGGER smartcheck_pilot_audit_append_only BEFORE INSERT OR UPDATE OR DELETE ON smartcheck_audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_smartcheck_pilot_audit_mutation()`;

export function injectDataTransitions(tag: string, schemaStatements: readonly string[]): string[] {
  if (tag === '0009_price_source_authorization') {
    const index = schemaStatements.findIndex((statement) => statement.startsWith(currentPriceEvidenceIndex));
    if (index < 0) throw new Error('0009 data transition anchor is missing');
    return [...schemaStatements.slice(0, index), priceEvidenceDeduplication, ...schemaStatements.slice(index)];
  }
  if (tag === '0010_cde_workflow') {
    const ordered = [...schemaStatements];
    const artifactUniqueIndex = ordered.findIndex((statement) => statement.startsWith('ALTER TABLE "document_processing_artifacts" ADD CONSTRAINT "document_processing_artifacts_id_company_run_document_key"'));
    if (artifactUniqueIndex >= 0) ordered.unshift(...ordered.splice(artifactUniqueIndex, 1));
    const tableIndex = ordered.findIndex((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'));
    if (tableIndex < 0) throw new Error('0010 CDE event table anchor is missing');
    return [...ordered, cdeCurrentRevisionConstraint, cdeAppendOnlyFunction, cdeAppendOnlyTrigger, cdeRevisionAppendOnlyTrigger, cdeEvidenceLockFunction, ...cdeEvidenceLockTriggers];
  }
  if (tag === '0011_quotation_transfer_ledger') {
    const ordered = [...schemaStatements];
    const sourceScopeUniqueIndex = ordered.findIndex((statement) => statement.startsWith('ALTER TABLE "normalized_quantity_rows" ADD CONSTRAINT "normalized_quantity_rows_transfer_scope_key"'));
    if (sourceScopeUniqueIndex >= 0) ordered.unshift(...ordered.splice(sourceScopeUniqueIndex, 1));
    const cumulativeCdeTransitions = ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'))
      ? [cdeCurrentRevisionConstraint, cdeAppendOnlyFunction, cdeAppendOnlyTrigger, cdeRevisionAppendOnlyTrigger, cdeEvidenceLockFunction, ...cdeEvidenceLockTriggers]
      : [];
    return [
      ...ordered,
      ...cumulativeCdeTransitions,
      quotationTransferAppendOnlyFunction,
      ...quotationTransferAppendOnlyTriggers,
      quotationTransferRevisionBindingFunction,
      quotationTransferRevisionBindingTrigger,
      quotationTransferQuotationIdentityFunction,
      quotationTransferQuotationIdentityTrigger,
      quotationTransferSourceMutationFunction,
      ...quotationTransferSourceMutationTriggers,
      quotationTransferJunctionSealFunction,
      quotationTransferJunctionSealTrigger,
      quotationTransferFinalizeFunction,
      quotationTransferFinalizeTrigger,
      quotationTransferTargetItemFunction,
      quotationTransferTargetItemTrigger,
      quotationTransferTargetEvidenceFunction,
      quotationTransferTargetEvidenceTrigger,
    ];
  }
  if (tag === '0012_progress_payment_evidence') {
    const ordered = [...schemaStatements];
    const includesCde = ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'));
    const includesTransfer = ordered.some((statement) => statement.startsWith('CREATE TABLE "quotation_transfer_ledgers"'));
    const cumulativeCde = includesCde
      ? [cdeCurrentRevisionConstraint, cdeAppendOnlyFunction, cdeAppendOnlyTrigger, cdeRevisionAppendOnlyTrigger, cdeEvidenceLockFunction, ...cdeEvidenceLockTriggers]
      : [];
    const cumulativeTransfer = includesTransfer
      ? [
        quotationTransferAppendOnlyFunction, ...quotationTransferAppendOnlyTriggers,
        quotationTransferRevisionBindingFunction, quotationTransferRevisionBindingTrigger,
        quotationTransferQuotationIdentityFunction, quotationTransferQuotationIdentityTrigger,
        quotationTransferSourceMutationFunction, ...quotationTransferSourceMutationTriggers,
        quotationTransferJunctionSealFunction, quotationTransferJunctionSealTrigger,
        quotationTransferFinalizeFunction, quotationTransferFinalizeTrigger,
        quotationTransferTargetItemFunction, quotationTransferTargetItemTrigger,
        quotationTransferTargetEvidenceFunction, quotationTransferTargetEvidenceTrigger,
      ] : [];
    return [
      ...ordered,
      ...cumulativeCde,
      ...cumulativeTransfer,
      progressPeriodTransitionFunction,
      progressPeriodTransitionTrigger,
      progressCorrectionChildBindingFunction,
      progressCorrectionChildBindingTrigger,
      progressEvidenceMutationFunction,
      ...progressEvidenceMutationTriggers,
      progressSourceMutationFunction,
      ...progressSourceMutationTriggers,
      progressMeasurementReviewEventFunction,
      progressMeasurementReviewEventTrigger,
      progressMeasurementReviewBindingFunction,
      progressMeasurementReviewBindingTrigger,
      constructionContractPeriodLockFunction,
      constructionContractPeriodLockTrigger,
      progressPaymentEventFunction,
      progressPaymentEventTrigger,
      progressPaymentEventBindingFunction,
      progressPaymentEventBindingTrigger,
    ];
  }
  if (tag === '0013_cde_tenant_rls') {
    const ordered = [...schemaStatements];
    const forced = ['cde_projects', 'cde_project_members', 'cde_containers', 'cde_revisions', 'cde_transition_events']
      .map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    const statements = [...ordered, ...forced];
    return ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'))
      ? injectDataTransitions('0012_progress_payment_evidence', statements)
      : statements;
  }
  if (tag === '0014_smartcheck_worker_lease') {
    const ordered = [...schemaStatements];
    const cumulative = ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'))
      ? injectDataTransitions('0013_cde_tenant_rls', ordered)
      : ordered;
    return [...cumulative, smartCheckWorkerLeaseTransition];
  }
  if (tag === '0015_progress_payment_tenant_rls') {
    const ordered = [...schemaStatements];
    const forced = [
      'construction_contracts', 'construction_contract_items', 'progress_payment_periods', 'progress_payment_lines',
      'progress_measurements', 'progress_measurement_review_events', 'progress_payment_adjustments',
      'progress_payment_events', 'contract_variations', 'final_accounts',
    ].map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    const statements = [...ordered, ...forced];
    return ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'))
      ? [...injectDataTransitions('0014_smartcheck_worker_lease', statements)]
      : statements;
  }
  if (tag === '0016_smartcheck_pilot_evidence_tenant_rls') {
    const ordered = [...schemaStatements];
    const forced = ['smartcheck_pilot_cases', 'smartcheck_pilot_measurements', 'smartcheck_audit_logs']
      .map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    const statements = [
      ...ordered,
      ...forced,
      smartcheckPilotMeasurementAppendOnlyFunction,
      smartcheckPilotMeasurementFunctionOwner,
      smartcheckPilotMeasurementFunctionRevoke,
      smartcheckPilotMeasurementAppendOnlyTrigger,
      smartcheckPilotMeasurementInsertFunction,
      smartcheckPilotMeasurementInsertFunctionOwner,
      smartcheckPilotMeasurementInsertFunctionRevoke,
      smartcheckPilotMeasurementInsertTrigger,
      smartcheckPilotCaseMutationFunction,
      smartcheckPilotCaseFunctionOwner,
      smartcheckPilotCaseFunctionRevoke,
      smartcheckPilotCaseMutationTrigger,
      smartcheckPilotAuditMutationFunction,
      smartcheckPilotAuditFunctionOwner,
      smartcheckPilotAuditFunctionRevoke,
      smartcheckPilotAuditMutationTrigger,
      smartcheckPilotMeasurementEvidenceFunction,
      smartcheckPilotMeasurementEvidenceFunctionOwner,
      smartcheckPilotMeasurementEvidenceFunctionRevoke,
      smartcheckPilotMeasurementEvidenceTrigger,
      smartcheckPilotCaseEvidenceFunction,
      smartcheckPilotCaseEvidenceFunctionOwner,
      smartcheckPilotCaseEvidenceFunctionRevoke,
      smartcheckPilotCaseEvidenceTrigger,
    ];
    return ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'))
      ? [...injectDataTransitions('0015_progress_payment_tenant_rls', statements)]
      : statements;
  }
  if (tag === '0017_company_industry_settings_tenant_rls') {
    const ordered = [...schemaStatements];
    const canonicalIndustryBootstrap = `INSERT INTO industries (id,name,description,config_json,enabled) VALUES
      ('residential','Konut İnşaatı','Villa, apartman ve müstakil ev projeleri için kaba ve ince inşaat çözümleri.','{"source":"INITIAL_PLUGINS","calculationModel":"material_heavy","pdfTemplateId":"default_construction"}',true),
      ('electrical','Elektrik Taahhüt','Bina içi tesisat, altyapı, pano ve aydınlatma işleri.','{"source":"INITIAL_PLUGINS","calculationModel":"balanced","pdfTemplateId":"modern_minimal"}',true),
      ('mechanical','Mekanik & HVAC','Isıtma, soğutma, havalandırma ve sıhhi tesisat sistemleri.','{"source":"INITIAL_PLUGINS","calculationModel":"system_based","pdfTemplateId":"modern_minimal"}',true),
      ('renovation','Tadilat & Dekorasyon','Daire, ofis ve iş yeri yenileme, ince işçilik ve dekorasyon.','{"source":"INITIAL_PLUGINS","calculationModel":"labor_heavy","pdfTemplateId":"luxury_villa"}',true)
      ON CONFLICT (id) DO NOTHING`;
    const forced = ['industries', 'company_industry_settings']
      .map((table) => `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    const statements = [...ordered, canonicalIndustryBootstrap, ...forced];
    return ordered.some((statement) => statement.startsWith('CREATE TABLE "cde_transition_events"'))
      ? [...injectDataTransitions('0016_smartcheck_pilot_evidence_tenant_rls', statements)]
      : statements;
  }
  return [...schemaStatements];
}
