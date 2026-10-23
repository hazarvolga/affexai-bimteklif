/**
 * Excel (.xlsx) ve CSV dosyalarından teklif kalemlerini (QuoteItem) içe aktarma motoru.
 *
 * Güvenlik ve Doğruluk İlkeleri:
 * - 5 MB dosya boyutu sınırı (tarayıcı bellek güvenliği).
 * - exceljs yalnızca .xlsx seçilince dinamik yüklenir.
 * - Formül hücrelerinin hesaplanmış sonucu (.result) okunur.
 * - Türkçe (1.250,50) ve uluslararası (1,250.50) sayı biçimleri güvenle çözülür.
 * - Hiçbir birim fiyat veya miktar uydurulmaz; eksik fiyat 0 ₺ olarak işaretlenir.
 */
import type { QuoteItem } from "@/types";
import { calculateLineItemTotal } from "./calculations";
import { parseCsv, serializeCsv } from "./tabular-data";

export const MAX_QUOTE_IMPORT_BYTES = 5 * 1024 * 1024;

export type SheetCell = string | number | null;

export interface QuoteImportResult {
  items: Partial<QuoteItem>[];
  projectName?: string;
  totalImported: number;
  skippedRowCount: number;
  warnings: string[];
  errors: string[];
}

const KNOWN_UNITS = new Set([
  "m2", "m²", "m3", "m³", "mt", "m", "ton", "t", "kg", "adet", "ad", "set", "takım", "gun", "gün", "ay", "saat", "lt", "litre", "paket", "torba", "sefer"
]);

function normalizeUnit(raw: string): string {
  const clean = raw.trim().toLowerCase();
  if (clean === "m²") return "m2";
  if (clean === "m³") return "m3";
  if (clean === "ad" || clean === "adet") return "adet";
  if (clean === "mt" || clean === "m") return "mt";
  return clean || "adet";
}

export function parseNumberCell(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const str = String(raw).trim().replace(/\s+/g, "").replace(/[₺$€]/g, "");
  if (!str) return null;

  // Türkçe biçim: 1.250,50 -> 1250.50
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(str)) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // Standart virgüllü: 1,250.50 -> 1250.50
  if (/^-?\d{1,3}(,\d{3})*\.\d+$/.test(str)) {
    const n = Number(str.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  // Yalnızca virgüllü: 125,50 -> 125.50
  if (/^-?\d+,\d+$/.test(str)) {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // Düz sayı: 1250 / 1250.50
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

interface ColumnIndices {
  code: number;
  description: number;
  unit: number;
  quantity: number;
  unitPrice: number;
  vat: number;
  discount: number;
}

function cleanHeader(str: string): string {
  return str
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .normalize("NFC")
    .trim();
}

function findHeaderRow(rows: SheetCell[][]): { headerIndex: number; indices: ColumnIndices } | null {
  for (let r = 0; r < Math.min(25, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    const lower = row.map((c) => cleanHeader(String(c ?? "")));

    const descIdx = lower.findIndex((c) =>
      c.includes("aciklama") || c.includes("is kalemi") ||
      c.includes("description") || c.includes("tanim") || c.includes("imalat") || c === "kalem"
    );
    const qtyIdx = lower.findIndex((c) =>
      c.includes("miktar") || c.includes("quantity") || c.includes("metraj") || c.includes("volume") || c === "adet"
    );

    if (descIdx !== -1 && qtyIdx !== -1) {
      const codeIdx = lower.findIndex((c) =>
        c.includes("poz no") || c.includes("poz kodu") || c.includes("item no") || c.includes("kod") || c === "no"
      );
      const unitIdx = lower.findIndex((c) =>
        c.includes("birim") || c.includes("unit") || c === "brm"
      );
      const priceIdx = lower.findIndex((c) =>
        c.includes("birim fiyat") || c.includes("b.fiyat") || c.includes("unit price") || c.includes("fiyat") || c.includes("rate") || c.includes("price")
      );
      const vatIdx = lower.findIndex((c) => c.includes("kdv") || c.includes("vat"));
      const discountIdx = lower.findIndex((c) => c.includes("iskonto") || c.includes("indirim") || c.includes("discount"));

      return {
        headerIndex: r,
        indices: {
          code: codeIdx,
          description: descIdx,
          unit: unitIdx,
          quantity: qtyIdx,
          unitPrice: priceIdx,
          vat: vatIdx,
          discount: discountIdx,
        },
      };
    }
  }
  return null;
}

export function parseQuoteRows(
  rows: SheetCell[][],
  fileName = "dosya",
  idFactory: () => string = () => crypto.randomUUID(),
): QuoteImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const items: Partial<QuoteItem>[] = [];

  if (rows.length === 0) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings, errors: ["Dosya boş."] };
  }

  const headerInfo = findHeaderRow(rows);
  let startRow = 0;
  let indices: ColumnIndices;

  if (headerInfo) {
    startRow = headerInfo.headerIndex + 1;
    indices = headerInfo.indices;
  } else {
    // Başlık bulunamadı; varsayılan kolon dizilimi tahmini: [0: Kod, 1: Açıklama, 2: Birim, 3: Miktar, 4: Birim Fiyat]
    warnings.push("Standart başlık satırı saptanamadı; varsayılan kolon dizilimi (Açıklama, Birim, Miktar, Birim Fiyat) denendi.");
    indices = {
      code: -1,
      description: 0,
      unit: 1,
      quantity: 2,
      unitPrice: 3,
      vat: -1,
      discount: -1,
    };
  }

  let skippedRowCount = 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }

    const descRaw = indices.description >= 0 ? String(row[indices.description] ?? "").trim() : "";
    const qtyRaw = indices.quantity >= 0 ? row[indices.quantity] : null;
    const priceRaw = indices.unitPrice >= 0 ? row[indices.unitPrice] : null;
    const unitRaw = indices.unit >= 0 ? String(row[indices.unit] ?? "").trim() : "";
    const codeRaw = indices.code >= 0 ? String(row[indices.code] ?? "").trim() : "";
    const vatRaw = indices.vat >= 0 ? row[indices.vat] : null;
    const discountRaw = indices.discount >= 0 ? row[indices.discount] : null;

    if (!descRaw) {
      skippedRowCount++;
      continue;
    }

    // Toplam satırlarını (Subtotal, Total, vb.) atla
    const lowerDesc = descRaw.toLowerCase();
    if (lowerDesc === "toplam" || lowerDesc === "genel toplam" || lowerDesc === "ara toplam" || lowerDesc.startsWith("total")) {
      skippedRowCount++;
      continue;
    }

    const quantity = parseNumberCell(qtyRaw);
    if (quantity === null || quantity <= 0) {
      warnings.push(`Satır ${r + 1} (${descRaw.slice(0, 30)}): geçerli miktar bulunamadığı için atlandı.`);
      skippedRowCount++;
      continue;
    }

    const unitPrice = parseNumberCell(priceRaw) ?? 0;
    if (unitPrice === 0 && priceRaw !== 0 && priceRaw !== "0") {
      warnings.push(`Satır ${r + 1} (${descRaw.slice(0, 30)}): birim fiyat bulunamadı, 0 ₺ olarak kaydedildi.`);
    }

    const vat = parseNumberCell(vatRaw) ?? 20;
    const discount = parseNumberCell(discountRaw) ?? 0;

    const fullDescription = codeRaw ? `[${codeRaw}] ${descRaw}` : descRaw;

    const item: Partial<QuoteItem> = {
      id: idFactory(),
      description: fullDescription,
      unit: normalizeUnit(unitRaw),
      quantity,
      unitPrice,
      costUnitPrice: null,
      discountPercent: Math.min(100, Math.max(0, discount)),
      vatPercent: Math.min(100, Math.max(0, vat)),
      quantitySource: "manual",
      priceSource: "manual",
      sourceReference: `Excel/CSV içe aktarım (${fileName}, satır ${r + 1})`,
      verificationStatus: "unverified",
      wastePercent: 0,
      costCategory: "material",
    };
    item.total = calculateLineItemTotal(item);
    items.push(item);
  }

  return {
    items,
    totalImported: items.length,
    skippedRowCount,
    warnings,
    errors,
  };
}

/** CSV metnini satır ve hücrelere ayırır (noktalı virgül veya virgül destekli). */
export function parseQuoteCsv(text: string, fileName = "teklif.csv"): QuoteImportResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: ["CSV dosyası boş."] };
  }

  try {
    return parseQuoteRows(parseCsv(trimmed), fileName);
  } catch {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: ["CSV tırnak veya satır yapısı geçersiz."] };
  }
}

function cellToValue(value: unknown): SheetCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as { result?: unknown; text?: unknown; richText?: Array<{ text: string }>; model?: { value?: unknown } };
    if (v.result !== undefined) return cellToValue(v.result);
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.model && v.model.value !== undefined) return cellToValue(v.model.value);
  }
  return String(value);
}

/** .xlsx dosyasını tarayıcıda dinamik exceljs ile okur. */
export async function parseQuoteXlsx(data: ArrayBuffer | Uint8Array, fileName = "teklif.xlsx"): Promise<QuoteImportResult> {
  const size = data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
  if (size > MAX_QUOTE_IMPORT_BYTES) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: [`Dosya ${Math.round(MAX_QUOTE_IMPORT_BYTES / 1024 / 1024)} MB sınırını aşıyor.`] };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data as ArrayBuffer);
  } catch {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: ["Dosya geçerli bir .xlsx değil."] };
  }

  // İlk dolu veya 'quote', 'teklif', 'estimate', 'cost' adlı çalışma sayfasını bul
  let sheet = workbook.worksheets.find((w) => {
    const n = w.name.toLowerCase();
    return n.includes("teklif") || n.includes("quote") || n.includes("estimate") || n.includes("cost") || n.includes("metraj");
  });
  if (!sheet) {
    sheet = workbook.worksheets[0];
  }
  if (!sheet) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: ["Çalışma sayfası bulunamadı."] };
  }

  const rows: SheetCell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1);
    rows.push(values.map(cellToValue));
  });

  return parseQuoteRows(rows, fileName);
}

/** Teklif hazırlama için standart CSV şablonu üretir. */
export function buildQuoteCsvTemplate(): string {
  return serializeCsv([
    ["Poz No", "İş Kalemi Açıklaması", "Birim", "Miktar", "Birim Fiyat (TL)", "KDV (%)", "İskonto (%)"],
    ["15.120.1001", "C25/30 Hazır Beton Dökülmesi", "m3", 1250, 3450, 20, 0],
    ["15.140.1002", "Nervürlü Donatı Çeliği Temini ve İşçiliği", "ton", 95, 42000, 20, 0],
    ["15.150.1005", "Plywood Kalıp Yapılması", "m2", 4800, 650, 20, 0],
    ["27.501.1001", "İç Cephe Alçı Sıva Yapılması", "m2", 3200, 185, 20, 0],
  ], { delimiter: ";" });
}
