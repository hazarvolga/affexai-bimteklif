/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

/**
 * Elle teklifte firma kataloğundan satır seçme (marka.md M-12.6). Seçilen satır onaylı fiyat kaydına bağlı kalır;
 * sunucu aynı kayıtla birim, KDV hariç fiyat ve KDV oranını yeniden doğrular. Satırın bu alanları elle
 * değiştirilirse bağlantı düşer ve satır elle girilmiş fiyat olur; böylece sunucu reddetmeden önce kullanıcı farkı görür.
 */
import type { QuoteItem } from "@/types";

export interface CatalogSnapshot {
  id: string;
  positionCode: string | null;
  description: string;
  unit: string;
  amount: string;
  currency: string;
  vatStatus: string;
  vatPercent: string | null;
  validUntil: string | null;
  stale: boolean;
}

const BOUND_FIELDS = ["unit", "unitPrice", "vatPercent"] as const;

/** Only rows the server can bind: VAT excluded with a rate, still valid, in the quote currency, cents precision. */
export function catalogPickable(snapshot: CatalogSnapshot, currency: string): boolean {
  if (snapshot.stale || snapshot.vatStatus !== "excluded" || snapshot.vatPercent === null || snapshot.currency !== currency) return false;
  return /^\d+(\.\d{1,2}(0{0,2}))?$/.test(snapshot.amount.trim());
}

export function catalogQuoteItem(snapshot: CatalogSnapshot): Partial<QuoteItem> {
  const unitPrice = Number(snapshot.amount);
  return {
    id: crypto.randomUUID(),
    priceSnapshotId: snapshot.id,
    priceSource: "snapshot",
    sourceReference: snapshot.positionCode,
    description: snapshot.description,
    unit: snapshot.unit,
    quantity: 0,
    unitPrice,
    costUnitPrice: unitPrice,
    wastePercent: 0,
    costCategory: "material",
    discountPercent: 0,
    vatPercent: Number(snapshot.vatPercent),
    total: 0,
  };
}

/** Applies a row edit; drops the catalogue link when a bound field changes (description too when there is no poz code). */
export function applyLineEdit(item: Partial<QuoteItem>, updates: Partial<QuoteItem>): Partial<QuoteItem> {
  const next = { ...item, ...updates };
  if (!item.priceSnapshotId) return next;
  const touched = BOUND_FIELDS.some((field) => field in updates && updates[field] !== item[field])
    || (!item.sourceReference && "description" in updates && updates.description !== item.description);
  if (!touched) return next;
  const { priceSnapshotId: _dropped, ...unbound } = next;
  return { ...unbound, priceSource: "manual", sourceReference: null };
}

export function searchCatalog(snapshots: readonly CatalogSnapshot[], query: string): CatalogSnapshot[] {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return [...snapshots];
  return snapshots.filter((snapshot) =>
    `${snapshot.positionCode ?? ""} ${snapshot.description}`.toLocaleLowerCase("tr-TR").includes(needle));
}
