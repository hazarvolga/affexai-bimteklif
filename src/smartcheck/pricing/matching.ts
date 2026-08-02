import { isPriceSnapshotStale, type PriceSnapshotLike } from "./snapshots";

type PriceSnapshotMatchInput = PriceSnapshotLike & {
  positionCode: string | null;
  description: string;
  unit: string;
  amount: string | number;
  currency: string;
  reviewStatus: string;
  region?: string | null;
  capturedAt?: Date | string | null;
};

type PriceSourceMatchInput = {
  id: string;
  name: string;
  sourceType: string;
  licenseStatus: string;
  region?: string | null;
};

export type PriceMatchRowInput = {
  rowId: string;
  positionCode?: string | null;
  description?: string | null;
  unit?: string | null;
  region?: string | null;
};

export type PriceSnapshotMatchCandidate = {
  snapshot: PriceSnapshotMatchInput;
  source: PriceSourceMatchInput;
};

export type PriceSnapshotSuggestion = {
  snapshot: PriceSnapshotMatchInput & { stale: boolean };
  source: PriceSourceMatchInput;
  score: number;
  matchType: "position_unit_exact" | "position_only_unit_mismatch" | "description_unit_strong" | "description_unit_fuzzy";
  warnings: Array<"UNIT_MISMATCH" | "STALE_PRICE" | "LOW_CONFIDENCE">;
  explanation: string;
};

const stopWords = new Set([
  "ve", "ile", "icin", "için", "dahil", "malzeme", "malzemesi", "is", "iş", "iscilik", "işçilik", "montaj", "temini", "yapilmasi", "yapılması",
]);

function normalizeComparable(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePositionCode(value?: string | null): string {
  return normalizeComparable(value ?? "").replace(/\s+/g, "");
}

export function canonicalPriceUnit(value?: string | null): string {
  const unit = normalizeComparable((value ?? "").replace(/²/g, "2").replace(/³/g, "3").replace(/\^/g, "")).replace(/\s+/g, "");
  if (["ad", "adet", "pcs", "piece", "each"].includes(unit)) return "adet";
  if (["m", "mt", "metre", "meter"].includes(unit)) return "m";
  if (["m2", "metrekare"].includes(unit)) return "m2";
  if (["m3", "metrekup"].includes(unit)) return "m3";
  if (["kg", "kilogram"].includes(unit)) return "kg";
  if (["ton", "t"].includes(unit)) return "ton";
  return unit;
}

function stemToken(token: string): string {
  if (token.length <= 4) return token;
  return token
    .replace(/(lari|leri)$/u, "")
    .replace(/(lar|ler)$/u, "")
    .replace(/(s[ui]|si)$/u, "");
}

function tokenize(value?: string | null): Set<string> {
  return new Set(
    normalizeComparable(value ?? "")
      .split(/\s+/)
      .map(stemToken)
      .filter((token) => token.length >= 2 && !stopWords.has(token)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(0.98, Number(score.toFixed(2))));
}

function compareCapturedAt(a?: Date | string | null, b?: Date | string | null): number {
  return new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
}

export function suggestPriceSnapshotsForRow(
  row: PriceMatchRowInput,
  candidates: PriceSnapshotMatchCandidate[],
  options: { now?: Date; limit?: number } = {},
): PriceSnapshotSuggestion[] {
  const rowPosition = normalizePositionCode(row.positionCode);
  const rowUnit = canonicalPriceUnit(row.unit);
  const rowTokens = tokenize(row.description);
  const now = options.now ?? new Date();

  return candidates
    .map(({ snapshot, source }) => {
      const snapshotPosition = normalizePositionCode(snapshot.positionCode);
      const snapshotUnit = canonicalPriceUnit(snapshot.unit);
      const sameUnit = Boolean(rowUnit && snapshotUnit && rowUnit === snapshotUnit);
      const warnings: PriceSnapshotSuggestion["warnings"] = [];
      const stale = isPriceSnapshotStale(snapshot, now);
      if (stale) warnings.push("STALE_PRICE");
      let score = 0;
      let matchType: PriceSnapshotSuggestion["matchType"] | null = null;
      let explanation = "";

      if (rowPosition && snapshotPosition && rowPosition === snapshotPosition) {
        if (sameUnit) {
          score = 0.9;
          matchType = "position_unit_exact";
          explanation = "Poz kodu ve birim birebir eşleşti.";
        } else {
          score = 0.54;
          matchType = "position_only_unit_mismatch";
          warnings.push("UNIT_MISMATCH");
          explanation = "Poz kodu eşleşti ancak birim farklı; kullanıcı kontrolü gerekir.";
        }
      } else if (sameUnit) {
        const similarity = jaccard(rowTokens, tokenize(snapshot.description));
        if (similarity < 0.42) return null;
        score = 0.48 + similarity * 0.34;
        matchType = similarity >= 0.7 ? "description_unit_strong" : "description_unit_fuzzy";
        explanation = `${matchType === "description_unit_strong" ? "Açıklama ve birim güçlü" : "Açıklama ve birim yaklaşık"} eşleşti.`;
      } else {
        return null;
      }

      if (snapshot.reviewStatus === "approved") score += 0.04;
      if (!stale) score += 0.03;
      else score -= 0.08;
      if (row.region && (snapshot.region === row.region || source.region === row.region)) score += 0.03;
      if (source.sourceType === "company_actual") score += 0.02;
      const finalScore = clampScore(score);
      if (finalScore < 0.5) return null;
      if (finalScore < 0.8 && !warnings.includes("LOW_CONFIDENCE")) warnings.push("LOW_CONFIDENCE");
      return { snapshot: { ...snapshot, stale }, source, score: finalScore, matchType, warnings, explanation };
    })
    .filter((candidate): candidate is PriceSnapshotSuggestion => Boolean(candidate))
    .sort((a, b) => b.score - a.score || compareCapturedAt(a.snapshot.capturedAt, b.snapshot.capturedAt))
    .slice(0, options.limit ?? 3);
}
