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

export function injectDataTransitions(tag: string, schemaStatements: readonly string[]): string[] {
  if (tag !== '0009_price_source_authorization') return [...schemaStatements];
  const index = schemaStatements.findIndex((statement) => statement.startsWith(currentPriceEvidenceIndex));
  if (index < 0) throw new Error('0009 data transition anchor is missing');
  return [...schemaStatements.slice(0, index), priceEvidenceDeduplication, ...schemaStatements.slice(index)];
}
