/**
 * .xlsx parsel dosyası okuyucu (Paket M-3 devamı).
 *
 * Saf hesap modülünden (pre-bim-feasibility.ts) ayrı tutulur: exceljs ağır bir bağımlılıktır
 * ve yalnızca kullanıcı .xlsx seçtiğinde dinamik olarak yüklenir.
 */
import { parseParcelRows, type ParcelCsvParseResult, type SheetCell } from "./pre-bim-feasibility";

/** Dosya boyutu üst sınırı: tarayıcıda gereksiz büyük dosyaların belleği doldurmasını önler. */
export const MAX_XLSX_BYTES = 5 * 1024 * 1024;

function cellToValue(value: unknown): SheetCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as { result?: unknown; text?: unknown; richText?: Array<{ text: string }> };
    if (v.result !== undefined) return cellToValue(v.result);
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
  }
  return String(value);
}

export async function parseParcelXlsx(data: ArrayBuffer | Uint8Array): Promise<ParcelCsvParseResult> {
  const size = data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
  if (size > MAX_XLSX_BYTES) {
    return { parcels: [], errors: [`Dosya ${Math.round(MAX_XLSX_BYTES / 1024 / 1024)} MB sınırını aşıyor.`] };
  }
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data as ArrayBuffer);
  } catch {
    return { parcels: [], errors: ["Dosya geçerli bir .xlsx değil."] };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { parcels: [], errors: ["Çalışma sayfası bulunamadı."] };

  const rows: SheetCell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1); // exceljs 1 tabanlı, ilk eleman boş
    rows.push(values.map(cellToValue));
  });
  // Excel'de sayılar hücre olarak gelir; metin sayılar için Türkçe biçim varsayılır.
  return parseParcelRows(rows, ";");
}
