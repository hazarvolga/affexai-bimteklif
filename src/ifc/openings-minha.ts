/**
 * Modeldeki kapı/pencerelere sözleşmesel minha eşiğinin uygulanması.
 *
 * Eşik her boşluğun TEKİL alanına uygulanır (evaluatePlasterPaintMinha). Bu hesap modeldeki tüm
 * ölçülebilen kapı/pencereyi kapsar; kalem bazlı net miktarı değiştirmez, çünkü boşlukların hangi
 * duvar/kaplama kalemine ait olduğu IFC'den kalem düzeyinde eşlenmiyor. Ölçüsü okunamayan boşluklar
 * ayrıca sayılır; uydurma ölçü verilmez.
 */
import {
  evaluatePlasterPaintMinha,
  resolveMinhaProfileMetadata,
  type MeasurementStandard,
  type MinhaProfileMetadata,
} from "@/smartcheck/rules/minha";
import type { ParsedOpening } from "./types";

export type OpeningsMinhaStatus = "ok" | "threshold_required" | "no_openings";

export interface OpeningsMinhaSummary {
  status: OpeningsMinhaStatus;
  standard: MeasurementStandard;
  thresholdM2: number | null;
  totalCount: number;
  measuredCount: number;
  unmeasuredCount: number;
  doorCount: number;
  windowCount: number;
  deductedCount: number;
  deductedAreaM2: number;
  notDeductedCount: number;
  notDeductedAreaM2: number;
  /** Bu fonksiyon yalnız özetler; kalem miktarına uygulanmış hesap kanıtı değildir. */
  applicationStatus: "summary_only";
  applicationNote: string;
  profile: MinhaProfileMetadata;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Doors and windows are deducted from surfaces; a volume, count or length line has nothing to deduct them from. */
export function appliesOpeningDeduction(unit: string): boolean {
  return /m[²2]$/.test(unit.trim());
}

export function parseThresholdInput(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function summarizeOpeningsMinha(
  openings: ParsedOpening[] | undefined,
  standard: MeasurementStandard,
  customThresholdM2: number | null,
): OpeningsMinhaSummary {
  const list = openings ?? [];
  const measured = list.filter(
    (o) => typeof o.widthM === "number" && typeof o.heightM === "number" && o.widthM > 0 && o.heightM > 0,
  );
  const base: OpeningsMinhaSummary = {
    status: "ok",
    standard,
    thresholdM2: null,
    totalCount: list.length,
    measuredCount: measured.length,
    unmeasuredCount: list.length - measured.length,
    doorCount: list.filter((o) => o.kind === "door").length,
    windowCount: list.filter((o) => o.kind === "window").length,
    deductedCount: 0,
    deductedAreaM2: 0,
    notDeductedCount: 0,
    notDeductedAreaM2: 0,
    applicationStatus: "summary_only",
    applicationNote: "Özet yalnız tekil eşik karşılaştırmasıdır; host ve kalem bağlantısı olmadan minha kaleme uygulanmış sayılmaz.",
    profile: resolveMinhaProfileMetadata(standard),
  };
  if (list.length === 0) return { ...base, status: "no_openings" };
  if (standard === "CUSTOM_CONTRACT" && customThresholdM2 === null) {
    return { ...base, status: "threshold_required" };
  }

  const result = evaluatePlasterPaintMinha({
    grossAreaM2: 0,
    standard,
    customThresholdM2: customThresholdM2 ?? undefined,
    // Söve/yan yüz eklemesi derinlik girdisi gerektirir; bu özet yalnızca düşümü hesaplar.
    includeRevealOnDeducted: false,
    openings: measured.map((o) => ({ id: o.id, widthM: o.widthM as number, heightM: o.heightM as number, count: 1 })),
  });
  return {
    ...base,
    thresholdM2: result.thresholdM2,
    deductedCount: result.items.filter((i) => i.deducted).length,
    deductedAreaM2: round2(result.deductedOpeningAreaM2),
    notDeductedCount: result.items.filter((i) => !i.deducted).length,
    notDeductedAreaM2: round2(result.nonDeductedOpeningAreaM2),
  };
}
