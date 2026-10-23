import { canonicalPriceUnit } from "./matching";
import { sha256Payload } from "./snapshots";

export function verifiedPayloadHash(payload: unknown, claimedHash?: unknown): string {
  if (payload === undefined) throw new Error("SOURCE_DOCUMENT_PAYLOAD_REQUIRED");
  const computed = sha256Payload(payload);
  if (claimedHash !== undefined && claimedHash !== null && claimedHash !== "") {
    if (typeof claimedHash !== "string" || claimedHash.toLowerCase() !== computed) {
      throw new Error("SOURCE_DOCUMENT_HASH_MISMATCH");
    }
  }
  return computed;
}

export type LockableQuotationItem = {
  description: string;
  unit: string;
  unitPrice: string | number;
  sourceReference?: string | null;
};

export type LockablePriceSnapshot = {
  description: string;
  unit: string;
  amount: string | number;
  currency: string;
  positionCode?: string | null;
};

function normalizedReference(value?: string | null): string {
  return (value ?? "").trim().toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g, "");
}

function normalizedDescription(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

export function priceSnapshotMatchesQuotationItem(
  item: LockableQuotationItem,
  snapshot: LockablePriceSnapshot,
  quotationCurrency: string,
): { eligible: true } | { eligible: false; reason: string } {
  if (canonicalPriceUnit(item.unit) !== canonicalPriceUnit(snapshot.unit)) {
    return { eligible: false, reason: "UNIT_MISMATCH" };
  }
  if (snapshot.currency !== quotationCurrency) {
    return { eligible: false, reason: "CURRENCY_MISMATCH" };
  }
  if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) !== Number(snapshot.amount)) {
    return { eligible: false, reason: "AMOUNT_MISMATCH" };
  }
  const itemReference = normalizedReference(item.sourceReference);
  const snapshotReference = normalizedReference(snapshot.positionCode);
  if (itemReference || snapshotReference) {
    if (!itemReference || itemReference !== snapshotReference) {
      return { eligible: false, reason: "POSITION_CODE_MISMATCH" };
    }
  } else if (normalizedDescription(item.description) !== normalizedDescription(snapshot.description)) {
    return { eligible: false, reason: "DESCRIPTION_MISMATCH" };
  }
  return { eligible: true };
}
