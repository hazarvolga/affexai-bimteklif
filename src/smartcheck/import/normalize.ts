import { isAmbiguousNumberText, parseImportNumber } from "../../lib/tr-number";
export type SpreadsheetArchetype =
  | "flat_table"
  | "multi_header_pivot"
  | "repeating_block_boq"
  | "hybrid_summary_and_blocks";

export type SpreadsheetTableMode = "auto" | "flat_or_pivot" | "repeating_blocks";

export type ColumnMapping = {
  profileId?: string;
  sheet?: string;
  headerRow?: number;
  tableMode?: SpreadsheetTableMode;
  detectedArchetype?: SpreadsheetArchetype;
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
  ad: "adet", "ad.": "adet", adet: "adet", pcs: "adet", br: "adet", boy: "adet",
  m: "m", "m.": "m", mt: "m", "mt.": "m", metre: "m", mtül: "m", mtul: "m",
  "m2": "m²", "m2.": "m²", "m²": "m²", "m^2": "m²", mkare: "m²",
  "m3": "m³", "m3.": "m³", "m³": "m³", "m^3": "m³", mküp: "m³", mkup: "m³",
  kg: "kg", "kg.": "kg", ton: "ton", t: "ton",
  set: "set", takım: "set", takim: "set", tk: "set",
  lt: "lt", litre: "lt",
  gün: "gün", gun: "gün", saat: "saat", ay: "ay",
  paket: "paket", pkt: "paket", torba: "torba", sefer: "sefer",
};

export function normalizeUnit(value: string): string | null {
  const cleaned = value.trim().toLocaleLowerCase("tr-TR");
  return unitAliases[cleaned] ?? null;
}

export const parseLocalizedNumber = parseImportNumber;

export function cleanTurkishHeader(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\u0307/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/\s+/g, " ");
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => header.normalize("NFC").trim().toLocaleLowerCase("tr-TR"));
  const ascii = headers.map((header) => cleanTurkishHeader(header));
  const find = (trNeedles: string[], asciiNeedles: string[] = []) => {
    const index = normalized.findIndex((header, idx) =>
      header.length > 0 &&
      header.length <= 45 &&
      !header.endsWith(":") && (
        trNeedles.some((needle) => header.includes(needle)) ||
        asciiNeedles.some((needle) => ascii[idx].includes(needle))
      ),
    );
    return index >= 0 ? headers[index] : undefined;
  };
  return {
    positionCode: find(
      ["poz", "kod", "item no", "kalem no", "malzeme pozu"],
      ["poz", "kod", "item no", "kalem no", "malzeme pozu"],
    ),
    description:
      find(
        ["açıklama", "aciklama", "tanım", "description", "imalatın tanımı", "imalatın adı", "imalatın cinsi", "iş kalemi"],
        ["aciklama", "tanim", "description", "imalatin tanimi", "imalatin adi", "imalatin cinsi", "is kalemi"],
      ) ??
      find(["malzeme"], ["malzeme"]),
    unit: find(
      ["birim", "unit", "ölçü birimi", "birimi"],
      ["birim", "unit", "olcu birimi", "birimi"],
    ),
    quantity: find(
      ["miktar", "quantity", "qty", "net metraj", "metraj", "toplam", "keşif", "hakediş"],
      ["miktar", "quantity", "qty", "net metraj", "metraj", "toplam", "kesif", "hakedis"],
    ),
    price: find(
      ["birim fiyat", "fiyat", "price", "b.fiyat", "teklif fiyat"],
      ["birim fiyat", "fiyat", "price", "b.fiyat", "teklif fiyat"],
    ),
    wastePercent: find(
      ["zayiat", "waste", "fire"],
      ["zayiat", "waste", "fire"],
    ),
  };
}

/** Machine decimals come from the IFC worker: their dot is always a decimal point. */
export function validateRows(rows: ParsedQuantityRow[], maxWastePercent = 20, options: { machineDecimals?: boolean } = {}) {
  const readNumber = (raw: string) => {
    if (!options.machineDecimals) return parseImportNumber(raw);
    const value = raw.trim() ? Number(raw) : Number.NaN;
    return Number.isFinite(value) ? value : null;
  };
  const isAmbiguous = (raw: string) => !options.machineDecimals && isAmbiguousNumberText(raw);
  const positionCounts = new Map<string, number>();
  for (const row of rows) if (row.rawPositionCode.trim()) positionCounts.set(row.rawPositionCode.trim(), (positionCounts.get(row.rawPositionCode.trim()) ?? 0) + 1);
  return rows.map((row) => {
    const findings: Finding[] = [];
    const positionCode = row.rawPositionCode.trim();
    const unit = normalizeUnit(row.rawUnit);
    const quantity = readNumber(row.rawQuantity);
    const price = readNumber(row.rawPrice);
    const wastePercent = readNumber(row.rawWastePercent) ?? 0;
    const ambiguous = [row.rawQuantity, row.rawPrice, row.rawWastePercent].filter(isAmbiguous);
    for (const raw of ambiguous) findings.push({ code: "AMBIGUOUS_NUMBER", severity: "high", message: `"${raw.trim()}" belirsiz: binlik mi ondalık mı olduğu anlaşılamıyor.`, ruleVersion: "pilot-number-v1", suggestion: "Ondalık için virgül kullanın (1,250) veya binlik için noktasız yazın (1250)." });
    if (!positionCode) findings.push({ code: "MISSING_POSITION_CODE", severity: "high", message: "Poz kodu eksik.", ruleVersion: "pilot-integrity-v1", suggestion: "Kaynak satırdaki poz kodunu girin." });
    else if ((positionCounts.get(positionCode) ?? 0) > 1) findings.push({ code: "DUPLICATE_POSITION_CODE", severity: "medium", message: "Poz kodu dosyada tekrarlanıyor.", ruleVersion: "pilot-integrity-v1", suggestion: "Mükerrerliğin kapsam farkından kaynaklandığını doğrulayın." });
    if (!unit) findings.push({ code: "UNKNOWN_UNIT", severity: "high", message: "Birim boş veya tanınmıyor.", ruleVersion: "pilot-unit-v1", suggestion: "Desteklenen canonical birimi seçin." });
    if ((quantity === null && !isAmbiguous(row.rawQuantity)) || (quantity !== null && quantity <= 0)) findings.push({ code: "INVALID_QUANTITY", severity: "high", message: "Miktar sıfır, negatif veya geçersiz.", ruleVersion: "pilot-quantity-v1", suggestion: "Kaynak miktarı doğrulayın." });
    if ((price === null && !isAmbiguous(row.rawPrice)) || (price !== null && price < 0)) findings.push({ code: "MISSING_PRICE_SOURCE", severity: "medium", message: "Maliyet/fiyat kaynağı eksik veya geçersiz.", ruleVersion: "pilot-cost-v1", suggestion: "Gerçek maliyeti ve fiyat kaynağını belirtin." });
    if (wastePercent > maxWastePercent) findings.push({ code: "WASTE_LIMIT_EXCEEDED", severity: "medium", message: `Zayiat şirket limitini (%${maxWastePercent}) aşıyor.`, ruleVersion: "pilot-waste-v1", suggestion: "Zayiatı düzeltin veya istisna gerekçesi girin." });
    return { row, normalized: { positionCode: positionCode || null, description: row.rawDescription.trim() || null, unit, quantity, price, wastePercent }, findings };
  });
}
