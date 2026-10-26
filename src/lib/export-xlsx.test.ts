import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { calculateQuotationTotals } from "./calculations";
import { buildQuotationXlsx, quoteExportFileName, QUOTE_EXPORT_SHEET } from "./quote-export-xlsx";
import { APARTMENT_SHEET, buildIcmalXlsx, ICMAL_SHEET, icmalExportFileName, icmalLineAmount, SOURCE_SHEET } from "./icmal-export-xlsx";

async function open(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return workbook;
}

function rowValues(sheet: ExcelJS.Worksheet, rowNumber: number) {
  return (sheet.getRow(rowNumber).values as unknown[]).slice(1);
}

const QUOTE = {
  quoteNumber: "IFC-20261027-AB12",
  projectName: "Konut A Blok",
  revisionVersion: 2,
  date: "2026-10-27T00:00:00Z",
  expiryDate: "2026-11-26T00:00:00Z",
  currency: "TRY",
  overheadProfitPercent: "15.00",
  items: [
    { sourceReference: "15.150.1006", description: "C30/37 Betonarme", unit: "m³", quantity: "12.5000", unitPrice: "3450.00", discountPercent: "0", vatPercent: "20.00" },
    { sourceReference: "15.390.1002", description: "Seramik_A1", unit: "m²", quantity: "32.5000", unitPrice: "610.00", discountPercent: "0", vatPercent: "20.00" },
    { sourceReference: null, description: "Mermer_B1", unit: "m²", quantity: "9.0000", unitPrice: "1250.00", discountPercent: "10", vatPercent: "20.00" },
  ],
};

test("quotation workbook lists the lines and the same totals as the quotation, profit and overhead included", async () => {
  const workbook = await open(await buildQuotationXlsx(QUOTE));
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [QUOTE_EXPORT_SHEET]);
  const sheet = workbook.getWorksheet(QUOTE_EXPORT_SHEET)!;
  assert.equal(sheet.getCell("C1").value, "IFC-20261027-AB12 · Rev. 2");
  assert.deepEqual(rowValues(sheet, 7), ["Sıra", "Poz No", "Açıklama", "Birim", "Miktar", "Birim Fiyat", "İskonto %", "KDV %", "Tutar (KDV hariç)"]);
  assert.deepEqual(rowValues(sheet, 8), [1, "15.150.1006", "C30/37 Betonarme", "m³", 12.5, 3450, 0, 20, 43125]);
  assert.deepEqual(rowValues(sheet, 10).slice(1, 9), ["", "Mermer_B1", "m²", 9, 1250, 10, 20, 10125]);
  const totals = calculateQuotationTotals(QUOTE.items, { overheadProfitPercent: QUOTE.overheadProfitPercent });
  const summary = new Map<string, number>();
  for (let rowNumber = 12; rowNumber <= 16; rowNumber += 1) summary.set(String(sheet.getRow(rowNumber).getCell(6).value), Number(sheet.getRow(rowNumber).getCell(9).value));
  assert.deepEqual([...summary.entries()], [
    ["Ara toplam", totals.subtotal],
    ["İndirim", -totals.discountTotal],
    ["Müteahhitlik kârı ve genel gider (%15)", totals.overheadProfitTotal],
    ["KDV", totals.vatTotal],
    ["Genel toplam", totals.grandTotal],
  ]);
  assert.equal(quoteExportFileName(QUOTE), "teklif-IFC-20261027-AB12-rev2.xlsx");
});

test("quotation workbook leaves out the profit row when the quotation adds none", async () => {
  const sheet = (await open(await buildQuotationXlsx({ ...QUOTE, overheadProfitPercent: 0 }))).getWorksheet(QUOTE_EXPORT_SHEET)!;
  const labels = [12, 13, 14, 15].map((rowNumber) => String(sheet.getRow(rowNumber).getCell(6).value));
  assert.deepEqual(labels, ["Ara toplam", "İndirim", "KDV", "Genel toplam"]);
});

test("icmal workbook keeps a missing price empty, totals priced lines only and puts evidence on its own sheet", async () => {
  const source = { snapshotId: "snap-1", sourceName: "Firma kataloğu", sourceDocumentHash: "a".repeat(64), capturedAt: "2026-10-27T10:00:00Z" };
  const lines = [
    { group: "Kaba yapı", pozCode: "15.150.1006", title: "C30/37 Betonarme", grossQuantity: 13, deductedQuantity: 0.5, netQuantity: 12.5, unit: "m³", unitPrice: 3450, source },
    { group: "Döşeme kaplamaları", pozCode: "15.390.1002", title: "Seramik_A1", grossQuantity: 32.5, deductedQuantity: 0, netQuantity: 32.5, unit: "m²", unitPrice: 610.55, source: { ...source, snapshotId: "snap-2" } },
    { group: "Döşeme kaplamaları", pozCode: "", title: "Laminat Parke", grossQuantity: 18, deductedQuantity: 0, netQuantity: 18, unit: "m²", unitPrice: null },
  ];
  const workbook = await open(await buildIcmalXlsx({
    projectTitle: "konut-a-blok.ifc",
    lines,
    apartments: [{ storey: "Zemin", unitCode: "D01", unitLabel: "Daire 1", grossM2: 120.5, balconyM2: 6, netM2: 98.25, rooms: [{ code: "S01", name: "Salon", finish: "Parke", netAreaM2: 32.4 }] }],
  }));
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [ICMAL_SHEET, APARTMENT_SHEET, SOURCE_SHEET]);
  const sheet = workbook.getWorksheet(ICMAL_SHEET)!;
  assert.deepEqual(rowValues(sheet, 5), ["Döşeme kaplamaları", "15.390.1002", "Seramik_A1", 32.5, 0, 32.5, "m²", 610.55, 19842.88, "Fiyatlandı"]);
  const missing = rowValues(sheet, 6);
  assert.deepEqual([missing[1], missing[7], missing[8], missing[9]], ["Belirlenemedi", undefined, undefined, "Fiyat bekliyor"], "no zero is written for a missing price");
  assert.equal(sheet.getRow(8).getCell(9).value, 62967.88);
  assert.match(String(sheet.getRow(9).getCell(8).value), /1 kalem fiyat bekliyor/);
  assert.equal(workbook.getWorksheet(SOURCE_SHEET)!.actualRowCount, 3, "only priced lines carry evidence");
  assert.equal(rowValues(workbook.getWorksheet(SOURCE_SHEET)!, 2)[4], "a".repeat(64));
  assert.equal(rowValues(workbook.getWorksheet(APARTMENT_SHEET)!, 3)[2], "Salon (Parke)");
  assert.equal(icmalLineAmount({ netQuantity: 32.5, unitPrice: 610.55 }), 19842.88, "rounded to the kuruş, not to whole lira");
  assert.equal(icmalExportFileName("konut-a-blok.ifc"), "konut-a-blok_Metraj_Icmali.xlsx");
});

test("an icmal without apartments or prices still exports and says the total is incomplete", async () => {
  const workbook = await open(await buildIcmalXlsx({ projectTitle: "x", lines: [{ group: "G", pozCode: "1", title: "T", grossQuantity: 1, deductedQuantity: 0, netQuantity: 1, unit: "adet", unitPrice: null }] }));
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [ICMAL_SHEET]);
  assert.equal(workbook.getWorksheet(ICMAL_SHEET)!.getRow(6).getCell(9).value, 0);
  assert.match(String(workbook.getWorksheet(ICMAL_SHEET)!.getRow(7).getCell(8).value), /genel toplam henüz hesaplanmadı/);
});
