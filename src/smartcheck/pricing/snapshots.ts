import crypto from "node:crypto";

export type PriceSnapshotLike = {
  id: string;
  amount: string | number;
  currency: string;
  unit: string;
  sourceDocumentHash: string;
  validUntil: Date | string | null;
  reviewStatus: string;
};

export type PricingLockItem = {
  quotationItemId: string;
  priceSnapshotId: string | null;
  priceSnapshotStatus: string;
  amount: string | number | null;
  currency: string | null;
  unit: string | null;
};

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
}

export function sha256Payload(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

export function buildPriceSnapshotKey(input: {
  sourceDocumentHash: string;
  externalReference?: string | null;
  positionCode?: string | null;
  description: string;
  unit: string;
  amount: string | number;
  currency: string;
  capturedAt: Date | string;
}): string {
  return sha256Payload({
    sourceDocumentHash: input.sourceDocumentHash,
    externalReference: input.externalReference ?? null,
    positionCode: input.positionCode ?? null,
    description: input.description.trim(),
    unit: input.unit.trim(),
    amount: String(input.amount),
    currency: input.currency,
    capturedAt: new Date(input.capturedAt).toISOString(),
  });
}

export function isPriceSnapshotStale(snapshot: Pick<PriceSnapshotLike, "validUntil">, now = new Date()): boolean {
  return snapshot.validUntil !== null && new Date(snapshot.validUntil).getTime() < now.getTime();
}

export function computePricingLockHash(items: PricingLockItem[]): string {
  return sha256Payload(items
    .map((item) => ({
      quotationItemId: item.quotationItemId,
      priceSnapshotId: item.priceSnapshotId,
      priceSnapshotStatus: item.priceSnapshotStatus,
      amount: item.amount === null ? null : String(item.amount),
      currency: item.currency,
      unit: item.unit,
    }))
    .sort((a, b) => a.quotationItemId.localeCompare(b.quotationItemId)));
}
