import { buildPricePermissionEvidence } from "../../server/pricing/source-review-policy";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { withAppTenantTransaction } from "../../db/app-tenant";
import type { TenantContext } from "../../db/tenant-context";
import { priceSnapshots, priceSources, quotationItemEvidence } from "../../db/schema";
import { priceSnapshotMatchesQuotationItem } from "../../smartcheck/pricing/integrity";
import { sha256Payload } from "../../smartcheck/pricing/snapshots";
import { snapshotAmountForCalculation, snapshotIsEligible, snapshotVatPercent } from "./calm-transfer";
import { QuotationIntegrityError } from "./integrity";

type Transaction = Parameters<Parameters<typeof withAppTenantTransaction>[1]>[0];
type Snapshot = typeof priceSnapshots.$inferSelect;

/** Fields a manual line needs for the catalogue check; extra fields pass through unchanged. */
type CatalogLine = {
  priceSnapshotId?: string;
  description: string;
  unit: string;
  unitPrice?: number;
  vatPercent?: number;
};

export const CATALOG_BINDING_STALE_MESSAGE =
  "Firma kataloğundaki fiyat kaydı değişti, onayı kalktı ya da satırın birimi, fiyatı veya KDV'si kayıttan farklı. Satırı katalogdan yeniden ekleyin.";

function lineMatchesSnapshot(line: CatalogLine, snapshot: Snapshot, currency: string): boolean {
  if (snapshot.vatStatus !== "excluded") return false;
  try {
    if (Number(snapshotVatPercent(snapshot.vatPercent)) !== Number(line.vatPercent)) return false;
    if (snapshotAmountForCalculation(snapshot.amount).numeric !== Number(line.unitPrice)) return false;
  } catch {
    return false;
  }
  // The position code identifies the catalogue row; without one the description must match.
  const match = priceSnapshotMatchesQuotationItem(
    { description: line.description, unit: line.unit, unitPrice: Number(line.unitPrice), sourceReference: snapshot.positionCode },
    { ...snapshot, amount: snapshotAmountForCalculation(snapshot.amount).numeric },
    currency,
  );
  return match.eligible;
}

/**
 * M-12.6: a manual line picked from the company price catalogue keeps a link to the approved price snapshot.
 * The same eligibility and match rules as the IFC transfer apply; every line gets an id so its price evidence
 * can point at it. Lines without `priceSnapshotId` pass through unchanged.
 */
export async function resolveCatalogProvenance<T extends CatalogLine>(
  tx: Transaction,
  actor: TenantContext,
  items: readonly T[],
  currency: string,
  at = new Date(),
) {
  const snapshotIds = [...new Set(items.flatMap((item) => item.priceSnapshotId ? [item.priceSnapshotId] : []))].sort();
  const snapshotById = new Map<string, Snapshot>();
  const permissionBySnapshotId = new Map<string, ReturnType<typeof buildPricePermissionEvidence>>();
  if (snapshotIds.length) {
    const snapshots = await tx.select().from(priceSnapshots)
      .where(and(eq(priceSnapshots.companyId, actor.companyId), inArray(priceSnapshots.id, snapshotIds))).orderBy(asc(priceSnapshots.id)).for("share");
    const sourceIds = [...new Set(snapshots.map((snapshot) => snapshot.priceSourceId))].sort();
    const sources = sourceIds.length ? await tx.select().from(priceSources)
      .where(and(eq(priceSources.companyId, actor.companyId), inArray(priceSources.id, sourceIds))).orderBy(asc(priceSources.id)).for("share") : [];
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    for (const snapshot of snapshots) {
      const source = sourceById.get(snapshot.priceSourceId);
      if (source && snapshotIsEligible(snapshot, source, at)) {
        snapshotById.set(snapshot.id, snapshot);
        permissionBySnapshotId.set(snapshot.id, buildPricePermissionEvidence(source));
      }
    }
  }

  const lines = items.map(({ priceSnapshotId, ...item }) => {
    const id = randomUUID();
    if (!priceSnapshotId) return { line: { ...item, id }, snapshot: null };
    const snapshot = snapshotById.get(priceSnapshotId);
    if (!snapshot || !lineMatchesSnapshot({ ...item, priceSnapshotId }, snapshot, currency)) {
      throw new QuotationIntegrityError(409, CATALOG_BINDING_STALE_MESSAGE);
    }
    return {
      line: {
        ...item, id,
        priceSource: "snapshot", sourceReference: snapshot.positionCode ?? null,
        priceSnapshotId: snapshot.id, priceSnapshotStatus: "attached",
      },
      snapshot,
    };
  });

  const evidenceFor = (quotationId: string): Array<typeof quotationItemEvidence.$inferInsert> => lines.flatMap(({ line, snapshot }) => snapshot ? [{
    companyId: actor.companyId, quotationId, quotationItemId: line.id, evidenceType: "price",
    evidenceKey: sha256Payload({ quotationId, quotationItemId: line.id, type: "price", priceSnapshotId: snapshot.id }),
    priceSnapshotId: snapshot.id, sourceDocumentHash: snapshot.sourceDocumentHash,
    capturedValueJson: {
      amount: snapshotAmountForCalculation(snapshot.amount).amount, sourceAmount: snapshot.amount,
      currency: snapshot.currency, unit: snapshot.unit, snapshotKey: snapshot.snapshotKey, selection: "manual_catalog_pick", permissionReview: permissionBySnapshotId.get(snapshot.id),
    },
    status: "current", createdByUserId: actor.userId,
  }] : []);

  return { items: lines.map(({ line }) => line), evidenceFor };
}
