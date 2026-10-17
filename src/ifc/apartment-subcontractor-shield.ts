/**
 * Daire Bazlı Taşeron Hakediş Kalkanı (Paket M-1)
 *
 * Saha dayanağı: Melih Dinekli geri bildirimi (17 Ekim 2026) — sıvacı / şapçı /
 * kaplamacı taşeronların hakedişte metrajı şişirmesine karşı müteahhidi korumak
 * için daire bazında net hakediş tavanı üretilir.
 *
 * Dürüstlük kuralları:
 * - Yalnızca IFC mahal cetvelinde (IfcSpace/IfcZone) gerçekten bulunan alanlar
 *   kullanılır. Duvar çevresi/yüksekliği IFC mahal cetvelinde olmadığı için duvar
 *   sıvası alanı ancak kullanıcı girdisiyle (wallPlasterAreaM2) hesaplanır.
 * - Kalınlık, çimento dozajı, taşeron beyanı ve tolerans kullanıcı girdisidir;
 *   gizli varsayılan yoktur. Girdi yoksa ilgili çıktı `null` döner.
 * - Hacim = alan × kalınlık (net, fire hariç). Fire/israf ayrı kullanıcı girdisidir.
 */
import type { ApartmentRoomScheduleItem, ApartmentUnitScheduleItem } from "./types";

export const MAX_LAYER_THICKNESS_CM = 20;

export type ClaimStatus = "not_declared" | "within_ceiling" | "exceeds_ceiling";

export interface TradeClaimInput {
  /** Taşeronun hakedişte beyan ettiği şap alanı (m²). */
  screedM2?: number | null;
  /** Taşeronun beyan ettiği duvar/tavan sıva alanı (m²). */
  plasterM2?: number | null;
  /** Taşeronun beyan ettiği zemin kaplaması (parke/seramik) alanı (m²). */
  floorFinishM2?: number | null;
}

export interface ApartmentShieldInput {
  apartment: ApartmentUnitScheduleItem;
  /** Şap kalınlığı (cm). Zorunlu kullanıcı girdisi; örn. 3 veya 5. */
  screedThicknessCm: number | null;
  /** Sıva kalınlığı (cm). Zorunlu kullanıcı girdisi; örn. 2, 3 veya 5. */
  plasterThicknessCm: number | null;
  /** Duvar sıvası brüt alanı (m²) — IFC mahal cetvelinde yoktur, kullanıcı girer. */
  wallPlasterAreaM2?: number | null;
  /** Bu daire için düşülecek boşluk (kapı/pencere) alanı (m²), kullanıcı girdisi. */
  wallOpeningDeductionM2?: number | null;
  /** Harç çimento dozajı (kg/m³) — karışım şartnamesinden kullanıcı girer. */
  cementKgPerM3?: number | null;
  /** Fire/israf oranı (%), kullanıcı girdisi; boşsa fire uygulanmaz. */
  wastePercent?: number | null;
  /** Hakediş beyanı kontrolü için kabul edilen tolerans (%), boşsa 0. */
  tolerancePercent?: number | null;
  claims?: TradeClaimInput;
}

export interface FloorFinishLine {
  floorFinish: string;
  areaM2: number;
  roomCount: number;
}

export interface ClaimCheck {
  declaredM2: number | null;
  ceilingM2: number | null;
  excessM2: number | null;
  status: ClaimStatus;
}

export interface ApartmentShieldResult {
  unitCode: string;
  unitLabel: string;
  interiorAreaM2: number;
  balconyAreaM2: number;
  screedAreaM2: number;
  screedVolumeM3: number | null;
  screedVolumeWithWasteM3: number | null;
  screedCementKg: number | null;
  floorFinishLines: FloorFinishLine[];
  plasterNetAreaM2: number | null;
  plasterVolumeM3: number | null;
  plasterVolumeWithWasteM3: number | null;
  plasterCementKg: number | null;
  claimChecks: {
    screed: ClaimCheck;
    plaster: ClaimCheck;
    floorFinish: ClaimCheck;
  };
  warnings: string[];
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeFinishLabel(label: string): string {
  const trimmed = (label ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Belirtilmemiş";
}

function groupFloorFinishes(rooms: ApartmentRoomScheduleItem[]): FloorFinishLine[] {
  const map = new Map<string, FloorFinishLine>();
  for (const room of rooms) {
    if (!isNonNegativeFinite(room.netAreaM2)) continue;
    const key = normalizeFinishLabel(room.floorFinish);
    const line = map.get(key) ?? { floorFinish: key, areaM2: 0, roomCount: 0 };
    line.areaM2 += room.netAreaM2;
    line.roomCount += 1;
    map.set(key, line);
  }
  return [...map.values()]
    .map((line) => ({ ...line, areaM2: round(line.areaM2, 2) }))
    .sort((a, b) => b.areaM2 - a.areaM2);
}

function checkClaim(
  declared: number | null | undefined,
  ceiling: number | null,
  tolerancePercent: number,
): ClaimCheck {
  if (!isNonNegativeFinite(declared) || ceiling === null) {
    return { declaredM2: null, ceilingM2: ceiling, excessM2: null, status: "not_declared" };
  }
  const allowed = ceiling * (1 + tolerancePercent / 100);
  const excess = declared - allowed;
  return {
    declaredM2: round(declared, 2),
    ceilingM2: round(ceiling, 2),
    excessM2: excess > 0 ? round(excess, 2) : 0,
    status: excess > 0.005 ? "exceeds_ceiling" : "within_ceiling",
  };
}

function mortar(
  areaM2: number | null,
  thicknessCm: number | null,
  wastePercent: number,
  cementKgPerM3: number | null,
): { volume: number | null; withWaste: number | null; cementKg: number | null } {
  if (areaM2 === null || !isPositiveFinite(thicknessCm)) {
    return { volume: null, withWaste: null, cementKg: null };
  }
  const volume = areaM2 * (thicknessCm / 100);
  const withWaste = volume * (1 + wastePercent / 100);
  return {
    volume: round(volume, 3),
    withWaste: round(withWaste, 3),
    cementKg: isPositiveFinite(cementKgPerM3) ? round(withWaste * cementKgPerM3, 1) : null,
  };
}

export function computeApartmentSubcontractorShield(
  input: ApartmentShieldInput,
): ApartmentShieldResult {
  const { apartment } = input;
  const warnings: string[] = [];

  const tolerance = isNonNegativeFinite(input.tolerancePercent) ? input.tolerancePercent : 0;
  const waste = isNonNegativeFinite(input.wastePercent) ? input.wastePercent : 0;

  let screedThickness = input.screedThicknessCm;
  if (screedThickness !== null && !isPositiveFinite(screedThickness)) {
    warnings.push("Şap kalınlığı pozitif bir sayı olmalıdır; hacim hesaplanmadı.");
    screedThickness = null;
  } else if (screedThickness !== null && screedThickness > MAX_LAYER_THICKNESS_CM) {
    warnings.push(`Şap kalınlığı ${MAX_LAYER_THICKNESS_CM} cm üstünde; girdiyi kontrol edin.`);
    screedThickness = null;
  }

  let plasterThickness = input.plasterThicknessCm;
  if (plasterThickness !== null && !isPositiveFinite(plasterThickness)) {
    warnings.push("Sıva kalınlığı pozitif bir sayı olmalıdır; hacim hesaplanmadı.");
    plasterThickness = null;
  } else if (plasterThickness !== null && plasterThickness > MAX_LAYER_THICKNESS_CM) {
    warnings.push(`Sıva kalınlığı ${MAX_LAYER_THICKNESS_CM} cm üstünde; girdiyi kontrol edin.`);
    plasterThickness = null;
  }

  const interior = apartment.rooms.filter((r) => !r.isBalcony);
  const balcony = apartment.rooms.filter((r) => r.isBalcony);
  const sum = (rooms: ApartmentRoomScheduleItem[]) =>
    rooms.reduce((acc, r) => acc + (isNonNegativeFinite(r.netAreaM2) ? r.netAreaM2 : 0), 0);

  const interiorAreaM2 = round(sum(interior), 2);
  const balconyAreaM2 = round(sum(balcony), 2);
  const screedAreaM2 = round(interiorAreaM2 + balconyAreaM2, 2);

  if (apartment.rooms.length === 0) {
    warnings.push("Bu daire için IFC mahal (IfcSpace) listesi boş; hakediş tavanı üretilemez.");
  }

  const cement = isPositiveFinite(input.cementKgPerM3) ? input.cementKgPerM3 : null;
  const screed = mortar(
    apartment.rooms.length > 0 ? screedAreaM2 : null,
    screedThickness,
    waste,
    cement,
  );

  let plasterNetAreaM2: number | null = null;
  if (isPositiveFinite(input.wallPlasterAreaM2)) {
    const deduction = isNonNegativeFinite(input.wallOpeningDeductionM2)
      ? input.wallOpeningDeductionM2
      : 0;
    plasterNetAreaM2 = round(Math.max(0, input.wallPlasterAreaM2 - deduction), 2);
    if (deduction > input.wallPlasterAreaM2) {
      warnings.push("Boşluk düşümü brüt duvar alanını aşıyor; net sıva alanı 0 alındı.");
    }
  } else {
    warnings.push(
      "Duvar sıvası alanı IFC mahal cetvelinde yoktur (çevre × yükseklik bilinmiyor); duvar sıvası tavanı için brüt duvar alanını girin.",
    );
  }
  const plaster = mortar(plasterNetAreaM2, plasterThickness, waste, cement);

  const floorFinishLines = groupFloorFinishes(apartment.rooms);
  const floorFinishCeiling = apartment.rooms.length > 0 ? screedAreaM2 : null;
  const claims = input.claims ?? {};

  return {
    unitCode: apartment.unitCode,
    unitLabel: apartment.unitLabel,
    interiorAreaM2,
    balconyAreaM2,
    screedAreaM2,
    screedVolumeM3: screed.volume,
    screedVolumeWithWasteM3: screed.withWaste,
    screedCementKg: screed.cementKg,
    floorFinishLines,
    plasterNetAreaM2,
    plasterVolumeM3: plaster.volume,
    plasterVolumeWithWasteM3: plaster.withWaste,
    plasterCementKg: plaster.cementKg,
    claimChecks: {
      screed: checkClaim(
        claims.screedM2,
        apartment.rooms.length > 0 ? screedAreaM2 : null,
        tolerance,
      ),
      plaster: checkClaim(claims.plasterM2, plasterNetAreaM2, tolerance),
      floorFinish: checkClaim(claims.floorFinishM2, floorFinishCeiling, tolerance),
    },
    warnings,
  };
}
