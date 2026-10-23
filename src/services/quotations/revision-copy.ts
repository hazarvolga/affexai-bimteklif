import { randomUUID } from "node:crypto";
import type { quotationItemEvidence, quotationItems } from "../../db/schema";
import { sha256Payload } from "../../smartcheck/pricing/snapshots";

export function copyRevisionItems(
  items: (typeof quotationItems.$inferSelect)[],
  evidence: (typeof quotationItemEvidence.$inferSelect)[],
  quotationId: string,
  aggregateProvenanceItemIds: ReadonlySet<string> = new Set(),
) {
  const itemsById = new Map(items.map(item => [item.id, item]));
  const evidencedItems = new Set(evidence.filter(record => {
    const item = itemsById.get(record.quotationItemId);
    return item && record.evidenceType === "quantity" && record.status === "current"
      && item.sourceDocumentId && item.sourceProcessingRunId && item.sourceQuantityRowId
      && record.sourceDocumentId === item.sourceDocumentId
      && record.sourceProcessingRunId === item.sourceProcessingRunId
      && record.sourceQuantityRowId === item.sourceQuantityRowId;
  }).map(record => record.quotationItemId));
  // Allocate IDs explicitly: INSERT RETURNING order is not an item identity contract.
  const itemIds = new Map(items.map(item => [item.id, randomUUID()]));
  const clonedItems = items.map(item => ({
    ...item, id: itemIds.get(item.id)!, quotationId,
    verificationStatus: item.verificationStatus === "verified" && !evidencedItems.has(item.id) && !aggregateProvenanceItemIds.has(item.id) ? "unverified" : item.verificationStatus,
    priceSnapshotLockedAt: null,
    priceSnapshotStatus: item.priceSnapshotStatus === "locked" ? (item.priceSnapshotId ? "attached" : "none") : item.priceSnapshotStatus,
  }));
  const clonedEvidence = evidence.map(({ id, ...record }) => {
    const quotationItemId = itemIds.get(record.quotationItemId);
    if (!quotationItemId) throw new Error("Quotation evidence item is missing");
    return {
      ...record, quotationId, quotationItemId,
      // A revision identity key, not a renewed approval or pricing lock fingerprint.
      evidenceKey: sha256Payload({ sourceEvidenceId: id, sourceEvidenceKey: record.evidenceKey, quotationItemId }),
    };
  });
  return { items: clonedItems, evidence: clonedEvidence };
}
