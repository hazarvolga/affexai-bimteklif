/**
 * Firma fiyat kataloğu içe aktarma (CSV ve .xlsx). SmartCheckImportWorkspace içindeki CSV okuyucudan taşındı;
 * kurallar aynı: açıklama, birim ve sıfırdan büyük fiyat zorunlu, para birimi yoksa TRY.
 * ExcelJS yalnız .xlsx seçildiğinde dinamik yüklenir (T45 paket ayrımı).
 */
import type { TenantPriceCatalogRow } from "@/smartcheck/pricing/catalog-import";
import { LEGACY_XLS_MESSAGE } from "./spreadsheet-format";

export type PriceCatalogImportRow = TenantPriceCatalogRow;

export type Cell = string | number | null | undefined;

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

export type PriceCatalogField = "positionCode" | "description" | "unit" | "amount" | "currency" | "validUntil" | "externalReference";

export interface PriceCatalogColumn {
  field: PriceCatalogField;
  label: string;
  required: boolean;
  /** Column index in the header row, -1 when the file has no such column. */
  index: number;
  /** The header text as written in the file. */
  header: string | null;
}

const COLUMN_SPECS: ReadonlyArray<{ field: PriceCatalogField; label: string; required: boolean; aliases: string[] }> = [
  { field: "positionCode", label: "Poz No", required: false, aliases: ["poz", "pozno", "positioncode", "position", "code"] },
  { field: "description", label: "Açıklama", required: true, aliases: ["aciklama", "description", "malzeme", "item", "kalem"] },
  { field: "unit", label: "Birim", required: true, aliases: ["birim", "unit"] },
  { field: "amount", label: "Birim Fiyat", required: true, aliases: ["birimfiyat", "birimfiyattl", "fiyat", "amount", "unitprice", "price"] },
  { field: "currency", label: "Para Birimi", required: false, aliases: ["parabirimi", "currency", "doviz"] },
  { field: "validUntil", label: "Geçerlilik Tarihi", required: false, aliases: ["gecerlilik", "gecerliliktarihi", "validuntil", "validto"] },
  { field: "externalReference", label: "Referans", required: false, aliases: ["referans", "externalreference", "ref"] },
];

/** Which file column feeds which catalogue field ("alanları eşleştir"). */
export function detectPriceCatalogColumns(headerRow: readonly Cell[]): PriceCatalogColumn[] {
  const headers = headerRow.map((cell) => normalizeHeader(text(cell)));
  return COLUMN_SPECS.map(({ field, label, required, aliases }) => {
    const index = aliases.map((alias) => headers.indexOf(alias)).find((candidate) => candidate >= 0) ?? -1;
    return { field, label, required, index, header: index >= 0 ? text(headerRow[index]) : null };
  });
}

function nonEmptyRows(rows: readonly (readonly Cell[])[]) {
  return rows.filter((row) => row.some((cell) => text(cell) !== ""));
}

/** Header row first; every following non-empty row is a price line. Row numbers in errors are 1-based. */
export function parsePriceCatalogRows(rows: readonly (readonly Cell[])[]): PriceCatalogImportRow[] {
  const nonEmpty = nonEmptyRows(rows);
  if (nonEmpty.length < 2) throw new Error("Dosya en az başlık ve bir fiyat satırı içermeli.");
  const columns = detectPriceCatalogColumns(nonEmpty[0]);
  const indexes = Object.fromEntries(columns.map((column) => [column.field, column.index])) as Record<PriceCatalogField, number>;
  if (columns.some((column) => column.required && column.index < 0)) throw new Error("Başlıklarda açıklama, birim ve fiyat kolonları zorunlu.");
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

export function readPriceCatalogCsvTable(content: string): Cell[][] {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const delimiter = lines[0]?.includes(";") ? ";" : lines[0]?.includes("\t") ? "\t" : ",";
  return lines.map((line) => splitCsvLine(line, delimiter));
}

export function parsePriceCatalogCsv(content: string): PriceCatalogImportRow[] {
  return parsePriceCatalogRows(readPriceCatalogCsvTable(content));
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

export async function readPriceCatalogXlsxTable(data: ArrayBuffer): Promise<Cell[][]> {
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
  return rows;
}

export async function parsePriceCatalogXlsx(data: ArrayBuffer): Promise<PriceCatalogImportRow[]> {
  return parsePriceCatalogRows(await readPriceCatalogXlsxTable(data));
}
