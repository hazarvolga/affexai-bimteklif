export type CalmTransferSelection = {
  priceSnapshotIdsByCalmLineId: Record<string, string>;
};

export type CalmTransferUiItem = {
  lineId: string;
  sourceQuantityRowIds: readonly string[];
  priceSnapshotId: string;
};

export function buildCalmTransferSelection(
  items: ReadonlyArray<CalmTransferUiItem>,
): CalmTransferSelection {
  if (!items.length) throw new Error("CALM_TRANSFER_ITEMS_REQUIRED");
  const snapshots = new Map<string, string>();
  for (const item of items) {
    if (!item.sourceQuantityRowIds.length) throw new Error("CALM_TRANSFER_SOURCE_LINEAGE_REQUIRED");
    if (!item.priceSnapshotId.trim()) throw new Error("CALM_TRANSFER_PRICE_SELECTION_REQUIRED");
    if (!item.lineId.trim()) throw new Error("CALM_TRANSFER_LINE_ID_REQUIRED");
    const current = snapshots.get(item.lineId);
    if (current && current !== item.priceSnapshotId) throw new Error("CALM_TRANSFER_PRICE_CONFLICT");
    snapshots.set(item.lineId, item.priceSnapshotId);
  }
  const lineIds = [...snapshots.keys()].sort();
  return { priceSnapshotIdsByCalmLineId: Object.fromEntries(lineIds.map((lineId) => [lineId, snapshots.get(lineId)!])) };
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type CalmTransferAttemptRecord = {
  signature: string;
  idempotencyKey: string;
  resultQuotationId?: string;
  revisionVersion?: number;
};

export function getOrCreateCalmTransferAttempt(
  storage: StorageLike,
  documentId: string,
  quotationId: string,
  selection: CalmTransferSelection,
  createKey: () => string,
) {
  const signature = JSON.stringify(selection);
  const storageKey = `bimmetraj:calm-transfer:v1:${documentId}:${quotationId}`;
  try {
    const current = JSON.parse(storage.getItem(storageKey) ?? "null") as CalmTransferAttemptRecord | null;
    if (current?.signature === signature && current.idempotencyKey?.trim() && current.idempotencyKey.length <= 160) return { storageKey, record: current };
  } catch {
    // Corrupt browser state must not weaken the server idempotency boundary.
  }
  const record: CalmTransferAttemptRecord = { signature, idempotencyKey: createKey() };
  storage.setItem(storageKey, JSON.stringify(record));
  return { storageKey, record };
}
