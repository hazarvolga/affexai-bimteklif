/**
 * .xlsx teklif kalemi okuyucu (T45 ExcelJS chunk izolasyonu).
 *
 * Saf CSV/satır ayrıştırıcısından (quote-excel-import.ts) ayrı tutulur:
 * exceljs (~940 kB) yalnızca kullanıcı .xlsx seçtiğinde dinamik olarak yüklenir
 * ve CreateQuote rotasının ana açılış paketine girmez.
 */
import {
  MAX_QUOTE_IMPORT_BYTES,
  parseQuoteRows,
  type QuoteImportResult,
  type SheetCell,
} from "./quote-excel-import";
import { isLegacyXls, LEGACY_XLS_MESSAGE } from "./spreadsheet-format";

function cellToValue(value: unknown): SheetCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as {
      result?: unknown;
      text?: unknown;
      richText?: Array<{ text: string }>;
      model?: { value?: unknown };
    };
    if (v.result !== undefined) return cellToValue(v.result);
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.model && v.model.value !== undefined) return cellToValue(v.model.value);
  }
  return String(value);
}

/** .xlsx dosyasını tarayıcıda dinamik exceljs ile okur. */
export async function parseQuoteXlsx(
  data: ArrayBuffer | Uint8Array,
  fileName = "teklif.xlsx",
): Promise<QuoteImportResult> {
  const size = data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
  if (size > MAX_QUOTE_IMPORT_BYTES) {
    return {
      items: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: [`Dosya ${Math.round(MAX_QUOTE_IMPORT_BYTES / 1024 / 1024)} MB sınırını aşıyor.`],
    };
  }

  const head = new Uint8Array(data instanceof ArrayBuffer ? data.slice(0, 8) : data.slice(0, 8));
  if (isLegacyXls(fileName, head)) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: [LEGACY_XLS_MESSAGE] };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data as ArrayBuffer);
  } catch {
    return {
      items: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: ["Dosya geçerli bir .xlsx değil."],
    };
  }

  let sheet = workbook.worksheets.find((w) => {
    const n = w.name.toLowerCase();
    return (
      n.includes("teklif") ||
      n.includes("quote") ||
      n.includes("estimate") ||
      n.includes("cost") ||
      n.includes("metraj")
    );
  });
  if (!sheet) {
    sheet = workbook.worksheets[0];
  }
  if (!sheet) {
    return {
      items: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: ["Çalışma sayfası bulunamadı."],
    };
  }

  const rows: SheetCell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1);
    rows.push(values.map(cellToValue));
  });

  return parseQuoteRows(rows, fileName);
}
