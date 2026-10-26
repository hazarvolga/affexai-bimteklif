/**
 * IFC metraj icmalini Excel'e (.xlsx) dışa aktarma (Faz 1, C-4). İlk sayfa sade icmaldir; fiyat kaydı
 * kimliği ve kaynak hash'i gibi teknik iz, isteyen için ayrı "Fiyat Kaynakları" sayfasındadır.
 * Fiyatı olmayan kaleme tutar yazılmaz ve toplamın eksik olduğu açıkça yazılır (sıfır TL gösterilmez).
 * ExcelJS yalnız dışa aktarma istendiğinde dinamik yüklenir (T45).
 */
import { roundMoney } from "./calculations";

export interface IcmalExportSource {
  snapshotId: string;
  sourceName: string;
  sourceDocumentHash: string;
  capturedAt: string | null;
}

export interface IcmalExportLine {
  group: string;
  pozCode: string;
  title: string;
  grossQuantity: number;
  deductedQuantity: number;
  netQuantity: number;
  unit: string;
  /** Unit price from an approved catalogue price; null when the line still waits for a price. */
  unitPrice: number | null;
  source?: IcmalExportSource;
}

export interface IcmalExportApartment {
  storey: string;
  unitCode: string;
  unitLabel: string;
  grossM2: number | null;
  balconyM2: number;
  netM2: number;
  rooms: ReadonlyArray<{ code: string; name: string; finish: string; netAreaM2: number }>;
}

export interface IcmalExportInput {
  projectTitle: string;
  lines: readonly IcmalExportLine[];
  apartments?: readonly IcmalExportApartment[];
}

export const ICMAL_SHEET = "Metraj İcmali";
export const APARTMENT_SHEET = "Daire İcmali";
export const SOURCE_SHEET = "Fiyat Kaynakları";
const MONEY_FORMAT = "#,##0.00";
const QUANTITY_FORMAT = "#,##0.00";
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } } as const;

type Worksheet = import("exceljs").Worksheet;

function styleHeader(sheet: Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", wrapText: true };
}

export function icmalExportFileName(projectTitle: string): string {
  const safe = projectTitle.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "proje";
  return `${safe}_Metraj_Icmali.xlsx`;
}

/** Line amount rounded per line, as the quotation does, so the icmal and the quotation agree to the kuruş. */
export function icmalLineAmount(line: Pick<IcmalExportLine, "netQuantity" | "unitPrice">): number | null {
  return line.unitPrice === null ? null : roundMoney(line.netQuantity * line.unitPrice);
}

export async function buildIcmalXlsx(input: IcmalExportInput): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMMetraj";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(ICMAL_SHEET, { views: [{ state: "frozen", ySplit: 3 }] });
  sheet.columns = [{ width: 26 }, { width: 14 }, { width: 46 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 15 }, { width: 17 }, { width: 16 }];
  sheet.getCell("A1").value = `${input.projectTitle} — Metraj İcmali`;
  sheet.getCell("A1").font = { bold: true, size: 13 };
  sheet.getRow(3).values = ["Grup", "Poz No", "İmalat", "Brüt Miktar", "Minha", "Net Miktar", "Birim", "Birim Fiyat (TL)", "Tutar (TL, KDV hariç)", "Durum"];
  styleHeader(sheet, 3);

  let pricedTotal = 0;
  let missingCount = 0;
  input.lines.forEach((line, index) => {
    const amount = icmalLineAmount(line);
    if (amount === null) missingCount += 1;
    else pricedTotal += amount;
    const row = sheet.getRow(4 + index);
    row.values = [line.group, line.pozCode || "Belirlenemedi", line.title, line.grossQuantity, line.deductedQuantity, line.netQuantity, line.unit, line.unitPrice ?? null, amount, amount === null ? "Fiyat bekliyor" : "Fiyatlandı"];
    for (const column of [4, 5, 6]) row.getCell(column).numFmt = QUANTITY_FORMAT;
    for (const column of [8, 9]) row.getCell(column).numFmt = MONEY_FORMAT;
  });

  const summaryRow = sheet.getRow(4 + input.lines.length + 1);
  summaryRow.getCell(8).value = "Fiyatlanan kalemler toplamı";
  summaryRow.getCell(9).value = roundMoney(pricedTotal);
  summaryRow.getCell(9).numFmt = MONEY_FORMAT;
  summaryRow.font = { bold: true };
  if (missingCount > 0) {
    const note = sheet.getRow(4 + input.lines.length + 2);
    note.getCell(8).value = `${missingCount} kalem fiyat bekliyor; genel toplam henüz hesaplanmadı.`;
    note.getCell(8).font = { italic: true, color: { argb: "FFB45309" } };
  }

  if (input.apartments?.length) {
    const apartments = workbook.addWorksheet(APARTMENT_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
    apartments.columns = [{ width: 12 }, { width: 12 }, { width: 30 }, { width: 14 }, { width: 14 }, { width: 14 }];
    apartments.getRow(1).values = ["Kat", "Daire / Mahal", "Ad", "Brüt (m²)", "Balkon (m²)", "Net (m²)"];
    styleHeader(apartments, 1);
    for (const apartment of input.apartments) {
      const row = apartments.addRow([apartment.storey, apartment.unitCode, apartment.unitLabel, apartment.grossM2, apartment.balconyM2, apartment.netM2]);
      row.font = { bold: true };
      for (const room of apartment.rooms) apartments.addRow(["", room.code, `${room.name} (${room.finish})`, null, null, room.netAreaM2]);
    }
    apartments.eachRow((row, rowNumber) => { if (rowNumber > 1) for (const column of [4, 5, 6]) row.getCell(column).numFmt = QUANTITY_FORMAT; });
  }

  const priced = input.lines.filter((line) => line.source);
  if (priced.length) {
    const sources = workbook.addWorksheet(SOURCE_SHEET);
    sources.columns = [{ width: 14 }, { width: 40 }, { width: 30 }, { width: 38 }, { width: 66 }, { width: 22 }];
    sources.getRow(1).values = ["Poz No", "İmalat", "Fiyat kaynağı", "Fiyat kaydı", "Kaynak belge hash (SHA-256)", "Kayıt tarihi"];
    styleHeader(sources, 1);
    for (const line of priced) sources.addRow([line.pozCode, line.title, line.source!.sourceName, line.source!.snapshotId, line.source!.sourceDocumentHash, line.source!.capturedAt ?? ""]);
  }

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
