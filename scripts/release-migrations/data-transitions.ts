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
  return [...schemaStatements];
}
