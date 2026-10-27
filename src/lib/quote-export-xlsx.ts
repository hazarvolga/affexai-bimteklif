/**
 * Teklifi Excel'e (.xlsx) dışa aktarma (Faz 1, C-4). Patronun açacağı dosya olduğu için sade tutulur:
 * tek sayfa, başlık bilgisi, kalem tablosu ve toplamlar. Toplamlar PDF ile aynı hesap motorundan gelir;
 * Excel formülü kullanılmaz, böylece dosyadaki sayı teklifteki sayıyla kuruşu kuruşuna aynıdır.
 * ExcelJS yalnız dışa aktarma istendiğinde dinamik yüklenir (T45).
 */
import { calculateLineBreakdown, calculateQuotationTotals } from "./calculations";

export interface QuoteExportItem {
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  discountPercent?: number | string | null;
  vatPercent?: number | string | null;
  /** Poz number when the line came from a catalogue or IFC icmal. */
  sourceReference?: string | null;
}

export interface QuoteExportInput {
  quoteNumber: string;
  projectName: string;
  revisionVersion: number;
  date: string | Date;
  expiryDate: string | Date;
  currency: string;
  overheadProfitPercent?: number | string | null;
  items: readonly QuoteExportItem[];
}

export const QUOTE_EXPORT_SHEET = "Teklif";
const MONEY_FORMAT = "#,##0.00";
const QUANTITY_FORMAT = "#,##0.00##";
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } } as const;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function percentLabel(value: number): string {
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
}

export function quoteExportFileName(input: Pick<QuoteExportInput, "quoteNumber" | "revisionVersion">): string {
  return `teklif-${input.quoteNumber.replace(/[^A-Za-z0-9_-]+/g, "_")}-rev${input.revisionVersion}.xlsx`;
}

export async function buildQuotationXlsx(input: QuoteExportInput): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMMetraj";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(QUOTE_EXPORT_SHEET, { views: [{ state: "frozen", ySplit: 7 }] });
  sheet.columns = [
    { width: 6 }, { width: 16 }, { width: 50 }, { width: 9 }, { width: 13 }, { width: 16 }, { width: 11 }, { width: 9 }, { width: 18 },
  ];

  const info: Array<[string, string | Date]> = [
    ["Teklif No", `${input.quoteNumber} · Rev. ${input.revisionVersion}`],
    ["Proje", input.projectName],
    ["Tarih", toDate(input.date)],
    ["Geçerlilik", toDate(input.expiryDate)],
    ["Para birimi", input.currency],
  ];
  info.forEach(([label, value], index) => {
    const row = sheet.getRow(index + 1);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    sheet.mergeCells(index + 1, 1, index + 1, 2);
    row.getCell(3).value = value;
    if (value instanceof Date) row.getCell(3).numFmt = "dd.mm.yyyy";
  });

  const header = sheet.getRow(7);
  header.values = ["Sıra", "Poz No", "Açıklama", "Birim", "Miktar", "Birim Fiyat", "İskonto %", "KDV %", "Tutar (KDV hariç)"];
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle", wrapText: true };

  input.items.forEach((item, index) => {
    const line = calculateLineBreakdown(item);
    const row = sheet.getRow(8 + index);
    row.values = [
      index + 1,
      item.sourceReference ?? "",
      item.description,
      item.unit,
      Number(item.quantity),
      Number(item.unitPrice),
      Number(item.discountPercent ?? 0),
      Number(item.vatPercent ?? 20),
      line.net,
    ];
    row.getCell(5).numFmt = QUANTITY_FORMAT;
    row.getCell(6).numFmt = MONEY_FORMAT;
    row.getCell(9).numFmt = MONEY_FORMAT;
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
  });

  const totals = calculateQuotationTotals(input.items, { overheadProfitPercent: input.overheadProfitPercent });
  const overheadPercent = Number(input.overheadProfitPercent ?? 0);
  const summary: Array<[string, number]> = [
    ["Ara toplam", totals.subtotal],
    ["İndirim", totals.discountTotal === 0 ? 0 : -totals.discountTotal],
    ...(totals.overheadProfitTotal > 0 ? [[`Müteahhitlik kârı ve genel gider (${percentLabel(overheadPercent)})`, totals.overheadProfitTotal] as [string, number]] : []),
    ["KDV", totals.vatTotal],
    ["Genel toplam", totals.grandTotal],
  ];
  const firstSummaryRow = 8 + input.items.length + 1;
  summary.forEach(([label, value], index) => {
    const row = sheet.getRow(firstSummaryRow + index);
    sheet.mergeCells(firstSummaryRow + index, 6, firstSummaryRow + index, 8);
    row.getCell(6).value = label;
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(9).value = value;
    row.getCell(9).numFmt = MONEY_FORMAT;
    if (index === summary.length - 1) row.font = { bold: true };
  });

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
