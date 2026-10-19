import type { IfcUncoveredElementRecord, ParsedIfcElement, UncoveredQuantity, UncoveredQuantityUnit } from "./types";

/**
 * Açıkta kalan bir elemanın modelde yazan miktarı (fiyatlandırılmaz, poz atanmaz).
 * Yalnız pozitif değerler döner; hiçbir miktar tahmin edilmez.
 */
export function elementQuantity(el: Pick<ParsedIfcElement, "volumeM3" | "areaM2" | "lengthM">): UncoveredQuantity | undefined {
  if (typeof el.volumeM3 === "number" && el.volumeM3 > 0) return { value: el.volumeM3, unit: "m³" };
  if (typeof el.areaM2 === "number" && el.areaM2 > 0) return { value: el.areaM2, unit: "m²" };
  if (typeof el.lengthM === "number" && el.lengthM > 0) return { value: el.lengthM, unit: "mtül" };
  return undefined;
}

export interface UncoveredQuantityTotal {
  unit: UncoveredQuantityUnit;
  value: number;
  count: number;
}

const UNIT_ORDER: readonly UncoveredQuantityUnit[] = ["m³", "m²", "mtül"];

/**
 * Metraja giren ama icmale yerleşemeyen elemanların miktar toplamı, birim bazında.
 * Kapsam dışı kayıtlar (merdiven, giydirme cephe, proxy) toplanmaz: üst eleman ile parçaları
 * ayrı kayıt olarak miktar taşıyabilir ve toplam çift sayım olur.
 */
export function summarizeUncoveredQuantities(records: readonly IfcUncoveredElementRecord[]): UncoveredQuantityTotal[] {
  const totals = new Map<UncoveredQuantityUnit, UncoveredQuantityTotal>();
  for (const record of records) {
    if (record.scope === "out_of_scope" || !record.quantity) continue;
    const current = totals.get(record.quantity.unit) ?? { unit: record.quantity.unit, value: 0, count: 0 };
    totals.set(record.quantity.unit, {
      unit: current.unit,
      value: Number((current.value + record.quantity.value).toFixed(4)),
      count: current.count + 1,
    });
  }
  return UNIT_ORDER.flatMap((unit) => (totals.has(unit) ? [totals.get(unit)!] : []));
}
