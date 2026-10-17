/**
 * Daire brüt alanı çözümleme.
 *
 * IFC mahal cetveli (IfcSpace/IfcZone) yalnızca net alanları taşır; duvar kalınlığı ve ortak alan
 * payı olmadığı için brüt alan modelden gelmez. Daha önce sabit çarpanlar (1,12/1,28 ve 1,132/1,298)
 * kullanılıyordu; bunlar tek bir projeye göre ayarlanmış, kaynaksız değerlerdi ve kaldırıldı.
 * Brüt alan yalnızca kullanıcının girdiği katsayıyla hesaplanır; katsayı yoksa null döner.
 */
import type { ApartmentUnitScheduleItem } from "./types";

export interface GrossRatios {
  /** Daire brüt / net katsayısı (> 0). */
  unitRatio: number | null;
  /** Genel brüt (ortak alan payı dahil) / net katsayısı (> 0). */
  generalRatio: number | null;
}

export type GrossSource = "model" | "user_ratio" | "none";

export interface ResolvedApartmentGross {
  unitGrossM2: number | null;
  generalGrossM2: number | null;
  unitSource: GrossSource;
  generalSource: GrossSource;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function validRatio(r: number | null | undefined): r is number {
  return typeof r === "number" && Number.isFinite(r) && r >= 1 && r <= 3;
}

/** Katsayılar fiziksel olarak brüt ≥ net olduğundan 1–3 aralığında kabul edilir. */
export function parseRatioInput(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return validRatio(n) ? n : null;
}

export function resolveApartmentGross(
  apt: Pick<ApartmentUnitScheduleItem, "totalNetM2" | "unitGrossM2" | "generalGrossM2" | "unitCode">,
  ratios: GrossRatios,
): ResolvedApartmentGross {
  // Ortak alan / bodrum gibi konut olmayan birimlerde brüt = net kabulü yapılmaz.
  const isResidential = /^D\d+$/i.test(apt.unitCode);

  const pick = (model: number | null | undefined, ratio: number | null) => {
    if (typeof model === "number" && Number.isFinite(model)) {
      return { value: model, source: "model" as const };
    }
    if (isResidential && validRatio(ratio)) {
      return { value: round2(apt.totalNetM2 * ratio), source: "user_ratio" as const };
    }
    return { value: null, source: "none" as const };
  };
  const u = pick(apt.unitGrossM2, ratios.unitRatio);
  const g = pick(apt.generalGrossM2, ratios.generalRatio);
  return {
    unitGrossM2: u.value,
    generalGrossM2: g.value,
    unitSource: u.source,
    generalSource: g.source,
  };
}

/** Yalnızca tüm konutların brütü biliniyorsa toplam döner; eksik varsa null. */
export function sumResidentialGross(
  apartments: ApartmentUnitScheduleItem[],
  ratios: GrossRatios,
): { totalUnitGrossM2: number | null; totalGeneralGrossM2: number | null } {
  const residential = apartments.filter((a) => /^D\d+$/i.test(a.unitCode));
  if (residential.length === 0) return { totalUnitGrossM2: null, totalGeneralGrossM2: null };
  let unit = 0;
  let general = 0;
  let unitOk = true;
  let generalOk = true;
  for (const a of residential) {
    const r = resolveApartmentGross(a, ratios);
    if (r.unitGrossM2 === null) unitOk = false;
    else unit += r.unitGrossM2;
    if (r.generalGrossM2 === null) generalOk = false;
    else general += r.generalGrossM2;
  }
  return {
    totalUnitGrossM2: unitOk ? round2(unit) : null,
    totalGeneralGrossM2: generalOk ? round2(general) : null,
  };
}
