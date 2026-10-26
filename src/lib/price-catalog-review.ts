/**
 * Fiyat kataloğu sihirbazının 4. adımı: birim, geçerlilik ve para birimi incelemesi (Faz 1, M-17.3).
 * Hiçbir değeri düzeltmez veya varsaymaz; yalnız kullanıcının kaydetmeden önce görmesi gerekenleri sayar.
 */
import type { PriceCatalogImportRow } from "./price-catalog-import";
import { canonicalPriceUnit } from "@/smartcheck/pricing/units";

/** Units the quote importer and IFC icmal produce; anything else will not match an icmal line. */
const KNOWN_UNITS = new Set(["adet", "m", "m2", "m3", "kg", "ton", "set", "takim", "gun", "ay", "saat", "lt", "paket", "torba", "sefer"]);

export const VAT_RATE_OPTIONS = ["20", "10", "1", "0"] as const;

export interface PriceCatalogUnitSummary {
  unit: string;
  count: number;
  known: boolean;
}

export interface PriceCatalogReview {
  rowCount: number;
  units: PriceCatalogUnitSummary[];
  /** Rows not in TRY. IFC icmal and quotation transfer use TRY only. */
  nonTryCount: number;
  /** Rows with neither a row validity date nor a catalogue-wide one: they never expire. */
  openEndedCount: number;
  /** Rows whose validity date has already passed: they will not be offered. */
  expiredCount: number;
  /** Rows without a poz number: they can price manual quotes but not an IFC icmal line. */
  missingPozCount: number;
  /** Same poz and unit listed with different prices; the matcher cannot choose between them. */
  conflictingPozKeys: string[];
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function reviewPriceCatalog(
  rows: readonly PriceCatalogImportRow[],
  options: { catalogValidUntil?: string; now?: Date } = {},
): PriceCatalogReview {
  const now = options.now ?? new Date();
  const catalogValidUntil = parseDate(options.catalogValidUntil);
  const unitCounts = new Map<string, number>();
  const pricesByPoz = new Map<string, Set<number>>();
  let nonTryCount = 0;
  let openEndedCount = 0;
  let expiredCount = 0;
  let missingPozCount = 0;

  for (const row of rows) {
    const unit = row.unit.trim();
    unitCounts.set(unit, (unitCounts.get(unit) ?? 0) + 1);
    if ((row.currency ?? "TRY").toUpperCase() !== "TRY") nonTryCount += 1;
    const validUntil = parseDate(row.validUntil) ?? catalogValidUntil;
    if (!validUntil) openEndedCount += 1;
    else if (validUntil.getTime() < now.getTime()) expiredCount += 1;
    const poz = row.positionCode?.trim();
    if (!poz) {
      missingPozCount += 1;
      continue;
    }
    const key = `${poz} · ${canonicalPriceUnit(unit)}`;
    pricesByPoz.set(key, new Set([...(pricesByPoz.get(key) ?? []), row.amount]));
  }

  return {
    rowCount: rows.length,
    units: [...unitCounts.entries()]
      .map(([unit, count]) => ({ unit, count, known: KNOWN_UNITS.has(canonicalPriceUnit(unit)) }))
      .sort((a, b) => b.count - a.count || a.unit.localeCompare(b.unit, "tr")),
    nonTryCount,
    openEndedCount,
    expiredCount,
    missingPozCount,
    conflictingPozKeys: [...pricesByPoz.entries()].filter(([, prices]) => prices.size > 1).map(([key]) => key),
  };
}
