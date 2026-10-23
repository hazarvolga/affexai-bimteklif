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
  return [...schemaStatements];
}
