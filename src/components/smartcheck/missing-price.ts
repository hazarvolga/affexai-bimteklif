/**
 * Fiyatı eksik icmal kalemi için doğrudan eylemler (Faz 1, M-17.4/12.6). Saf kurallar: hangi eylemin
 * sunulacağına ve bir katalog fiyatının kaleme elle bağlanıp bağlanamayacağına sunucu aktarım kuralıyla
 * aynı ölçütle karar verilir (aynı poz, aynı birim, TL, süresi içinde).
 */
import { buildTenantPriceCatalogImportPayload } from "@/smartcheck/pricing/catalog-import";
import { canonicalPriceUnit, normalizeComparable } from "@/smartcheck/pricing/units";

export interface PriceSuggestionCandidate {
  snapshot: { id: string; amount: string | number; currency: string; sourceDocumentHash: string; capturedAt?: string | null; positionCode?: string | null; description?: string; unit?: string };
  source: { id: string; name: string };
  warnings?: string[];
}

export interface PriceSuggestionResult {
  rowId: string;
  decision: string;
  bestSuggestion: PriceSuggestionCandidate | null;
}

export interface MissingPriceItem {
  id: string;
  title: string;
  pozCode: string;
  unit: string;
}

/** Warnings a person may consciously accept; stale prices and unit mismatches are never offered. */
const ACCEPTABLE_WARNINGS = new Set(["LOW_CONFIDENCE"]);

export function publicPozCode(value: string): string {
  return value.startsWith("UNRESOLVED:") ? "" : value;
}

function samePoz(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeComparable(a ?? "").replace(/\s+/g, "");
  return left.length > 0 && left === normalizeComparable(b ?? "").replace(/\s+/g, "");
}

/**
 * A catalogue price the matcher did not apply automatically but the user may bind after looking at it:
 * same poz and unit, TRY, and only a description-similarity warning. Transfer re-checks poz, unit and amount.
 */
export function matchableCandidate(item: MissingPriceItem, suggestion: PriceSuggestionResult | undefined): PriceSuggestionCandidate | null {
  const candidate = suggestion?.decision === "review_required" ? suggestion.bestSuggestion : null;
  if (!candidate) return null;
  const amount = Number(candidate.snapshot.amount);
  if (candidate.snapshot.currency !== "TRY" || !Number.isFinite(amount) || amount <= 0) return null;
  if ((candidate.warnings ?? []).some((warning) => !ACCEPTABLE_WARNINGS.has(warning))) return null;
  if (!samePoz(publicPozCode(item.pozCode), candidate.snapshot.positionCode)) return null;
  if (canonicalPriceUnit(item.unit) !== canonicalPriceUnit(candidate.snapshot.unit)) return null;
  return candidate;
}

export type MissingPriceAction = "add_price" | "review_poz";

/** Without a poz number no catalogue price can be bound and transfer refuses the line, so it needs review first. */
export function missingPriceAction(item: MissingPriceItem): MissingPriceAction {
  return publicPozCode(item.pozCode) ? "add_price" : "review_poz";
}

export function parseTurkishAmount(value: string): number {
  const raw = value.trim().replace(/\s/g, "").replace(/[₺]/g, "");
  if (!/^\d[\d.,]*$/.test(raw)) return Number.NaN;
  // Turkish writing: "." groups thousands, "," is the decimal mark. "1.250" is one thousand two hundred fifty.
  const thousandsOnly = /^\d{1,3}(\.\d{3})+$/.test(raw);
  const normalized = raw.includes(",") || thousandsOnly ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized);
}

/** One owner-entered price for one icmal line, approved on import with an explicit VAT basis. */
export function buildItemPricePayload(item: MissingPriceItem, amount: number, vatPercent: string) {
  return buildTenantPriceCatalogImportPayload({
    sourceName: `İcmalden eklenen firma fiyatı · ${item.title}`.slice(0, 200),
    rows: [{ positionCode: publicPozCode(item.pozCode), description: item.title, unit: item.unit, amount, currency: "TRY" }],
    ownershipConfirmed: true,
    vatPercentExcluded: vatPercent,
    approveOnImport: true,
  });
}
