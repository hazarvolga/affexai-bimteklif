export type ColumnMapping = {
  sheet?: string;
  headerRow?: number;
  positionCode?: string;
  description?: string;
  unit?: string;
  quantity?: string;
  price?: string;
  wastePercent?: string;
};

export type ParsedQuantityRow = {
  sheetName: string;
  sourceRowNumber: number;
  sourceCellRange: string;
  rawDescription: string;
  rawPositionCode: string;
  rawUnit: string;
  rawQuantity: string;
  rawPrice: string;
  rawWastePercent: string;
  formulaJson: Record<string, string>;
};

export type Finding = { code: string; severity: "low" | "medium" | "high"; message: string; ruleVersion: string; suggestion: string };

const unitAliases: Record<string, string> = {
  ad: "adet", adet: "adet", pcs: "adet",
  m: "m", mt: "m", metre: "m",
  "m2": "m²", "m²": "m²", "m^2": "m²",
  "m3": "m³", "m³": "m³", "m^3": "m³",
  kg: "kg", ton: "ton", t: "ton", set: "set", takım: "set", takim: "set",
};

export function normalizeUnit(value: string): string | null {
  return unitAliases[value.trim().toLocaleLowerCase("tr-TR")] ?? null;
}

export function parseLocalizedNumber(value: string): number | null {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",") && raw.includes(".")
    ? raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "")
    : raw.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => header.trim().toLocaleLowerCase("tr-TR"));
  const find = (...needles: string[]) => {
    const index = normalized.findIndex((header) => needles.some((needle) => header.includes(needle)));
    return index >= 0 ? headers[index] : undefined;
  };
  return {
    positionCode: find("poz", "kod", "item no"),
    description: find("açıklama", "aciklama", "tanım", "description"),
    unit: find("birim", "unit"),
    quantity: find("miktar", "quantity", "qty"),
    price: find("birim fiyat", "fiyat", "price"),
    wastePercent: find("zayiat", "waste"),
  };
}

export function validateRows(rows: ParsedQuantityRow[], maxWastePercent = 20) {
  const positionCounts = new Map<string, number>();
  for (const row of rows) if (row.rawPositionCode.trim()) positionCounts.set(row.rawPositionCode.trim(), (positionCounts.get(row.rawPositionCode.trim()) ?? 0) + 1);
  return rows.map((row) => {
    const findings: Finding[] = [];
    const positionCode = row.rawPositionCode.trim();
    const unit = normalizeUnit(row.rawUnit);
    const quantity = parseLocalizedNumber(row.rawQuantity);
    const price = parseLocalizedNumber(row.rawPrice);
    const wastePercent = parseLocalizedNumber(row.rawWastePercent) ?? 0;
    if (!positionCode) findings.push({ code: "MISSING_POSITION_CODE", severity: "high", message: "Poz kodu eksik.", ruleVersion: "pilot-integrity-v1", suggestion: "Kaynak satırdaki poz kodunu girin." });
    else if ((positionCounts.get(positionCode) ?? 0) > 1) findings.push({ code: "DUPLICATE_POSITION_CODE", severity: "medium", message: "Poz kodu dosyada tekrarlanıyor.", ruleVersion: "pilot-integrity-v1", suggestion: "Mükerrerliğin kapsam farkından kaynaklandığını doğrulayın." });
    if (!unit) findings.push({ code: "UNKNOWN_UNIT", severity: "high", message: "Birim boş veya tanınmıyor.", ruleVersion: "pilot-unit-v1", suggestion: "Desteklenen canonical birimi seçin." });
    if (quantity === null || quantity <= 0) findings.push({ code: "INVALID_QUANTITY", severity: "high", message: "Miktar sıfır, negatif veya geçersiz.", ruleVersion: "pilot-quantity-v1", suggestion: "Kaynak miktarı doğrulayın." });
    if (price === null || price < 0) findings.push({ code: "MISSING_PRICE_SOURCE", severity: "medium", message: "Maliyet/fiyat kaynağı eksik veya geçersiz.", ruleVersion: "pilot-cost-v1", suggestion: "Gerçek maliyeti ve fiyat kaynağını belirtin." });
    if (wastePercent > maxWastePercent) findings.push({ code: "WASTE_LIMIT_EXCEEDED", severity: "medium", message: `Zayiat şirket limitini (%${maxWastePercent}) aşıyor.`, ruleVersion: "pilot-waste-v1", suggestion: "Zayiatı düzeltin veya istisna gerekçesi girin." });
    return { row, normalized: { positionCode: positionCode || null, description: row.rawDescription.trim() || null, unit, quantity, price, wastePercent }, findings };
  });
}
