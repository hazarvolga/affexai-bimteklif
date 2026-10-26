/**
 * Firma fiyat kataloğu içe aktarma (CSV ve .xlsx). SmartCheckImportWorkspace içindeki CSV okuyucudan taşındı;
 * kurallar aynı: açıklama, birim ve sıfırdan büyük fiyat zorunlu, para birimi yoksa TRY.
 * ExcelJS yalnız .xlsx seçildiğinde dinamik yüklenir (T45 paket ayrımı).
 */
import type { TenantPriceCatalogRow } from "@/smartcheck/pricing/catalog-import";
import { LEGACY_XLS_MESSAGE } from "./spreadsheet-format";

export type PriceCatalogImportRow = TenantPriceCatalogRow;

type Cell = string | number | null | undefined;

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCatalogAmount(value: Cell): number {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/[₺$€]/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  return Number(normalized);
}

function text(value: Cell): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Header row first; every following non-empty row is a price line. Row numbers in errors are 1-based. */
export function parsePriceCatalogRows(rows: readonly (readonly Cell[])[]): PriceCatalogImportRow[] {
  const nonEmpty = rows.filter((row) => row.some((cell) => text(cell) !== ""));
  if (nonEmpty.length < 2) throw new Error("Dosya en az başlık ve bir fiyat satırı içermeli.");
  const headers = nonEmpty[0].map((cell) => normalizeHeader(text(cell)));
  const headerIndex = (candidates: string[]) => candidates.map((candidate) => headers.indexOf(candidate)).find((index) => index >= 0) ?? -1;
  const indexes = {
    positionCode: headerIndex(["poz", "pozno", "positioncode", "position", "code"]),
    description: headerIndex(["aciklama", "description", "malzeme", "item", "kalem"]),
    unit: headerIndex(["birim", "unit"]),
    amount: headerIndex(["birimfiyat", "birimfiyattl", "fiyat", "amount", "unitprice", "price"]),
    currency: headerIndex(["parabirimi", "currency", "doviz"]),
    validUntil: headerIndex(["gecerlilik", "gecerliliktarihi", "validuntil", "validto"]),
    externalReference: headerIndex(["referans", "externalreference", "ref"]),
  };
  if (indexes.description < 0 || indexes.unit < 0 || indexes.amount < 0) throw new Error("Başlıklarda açıklama, birim ve fiyat kolonları zorunlu.");
  const optional = (cells: readonly Cell[], index: number) => (index >= 0 ? text(cells[index]) || undefined : undefined);
  return nonEmpty.slice(1).map((cells, index) => {
    const amount = parseCatalogAmount(cells[indexes.amount]);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${index + 2}. satırda fiyat geçersiz.`);
    const description = text(cells[indexes.description]);
    const unit = text(cells[indexes.unit]);
    if (!description || !unit) throw new Error(`${index + 2}. satırda açıklama ve birim zorunlu.`);
    return {
      positionCode: optional(cells, indexes.positionCode),
      description,
      unit,
      amount,
      currency: (optional(cells, indexes.currency) ?? "TRY").toUpperCase(),
      validUntil: optional(cells, indexes.validUntil),
      externalReference: optional(cells, indexes.externalReference),
    };
  });
}

export function parsePriceCatalogCsv(content: string): PriceCatalogImportRow[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("Dosya en az başlık ve bir fiyat satırı içermeli.");
  const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  return parsePriceCatalogRows(lines.map((line) => splitCsvLine(line, delimiter)));
}

function cellValue(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as { result?: unknown; text?: unknown; richText?: Array<{ text: string }> };
    if (v.result !== undefined) return cellValue(v.result);
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((part) => part.text).join("");
  }
  return String(value);
}

export async function parsePriceCatalogXlsx(data: ArrayBuffer): Promise<PriceCatalogImportRow[]> {
  const head = new Uint8Array(data.slice(0, OLE_SIGNATURE.length));
  if (OLE_SIGNATURE.every((byte, index) => head[index] === byte)) throw new Error(LEGACY_XLS_MESSAGE);
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data);
  } catch {
    throw new Error("Dosya geçerli bir .xlsx değil.");
  }
  const sheet = workbook.worksheets.find((candidate) => /fiyat|katalog|price/i.test(candidate.name)) ?? workbook.worksheets[0];
  if (!sheet) throw new Error("Çalışma sayfası bulunamadı.");
  const rows: Cell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => rows.push((row.values as unknown[]).slice(1).map(cellValue)));
  return parsePriceCatalogRows(rows);
}
