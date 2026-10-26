/** Browser-safe text and unit normalisation shared by price matching and the catalogue import wizard. */

export function normalizeComparable(value: string): string {
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
