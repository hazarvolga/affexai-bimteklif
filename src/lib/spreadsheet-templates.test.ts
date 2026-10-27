import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { LEGACY_XLS_MESSAGE, isLegacyXls, spreadsheetKind } from "./spreadsheet-format";
import { buildParcelXlsxTemplate, buildPriceCatalogXlsxTemplate, buildQuoteXlsxTemplate, PARCEL_SHEET, PRICE_CATALOG_SHEET, QUOTE_SHEET } from "./spreadsheet-templates";
import { parseParcelXlsx } from "./pre-bim-xlsx";
import { parseQuoteXlsx } from "./quote-xlsx";
import { parsePriceCatalogCsv, parsePriceCatalogXlsx } from "./price-catalog-import";

const OLE_HEADER = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
const ZIP_HEADER = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);

async function fillSheet(template: Uint8Array, sheetName: string, rows: (string | number | null)[][]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer);
  const sheet = workbook.getWorksheet(sheetName);
  assert.ok(sheet, `sheet ${sheetName}`);
  const firstEmpty = sheet.actualRowCount + 1;
  rows.forEach((values, offset) => { sheet.getRow(firstEmpty + offset).values = values; });
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

test("legacy .xls is recognised by extension or by its OLE signature, .xlsx and .csv are not", () => {
  assert.equal(isLegacyXls("metraj.XLS", null), true);
  assert.equal(isLegacyXls("metraj.xlsx", OLE_HEADER), true, "a renamed old workbook is still legacy");
  assert.equal(isLegacyXls("metraj.xlsx", ZIP_HEADER), false);
  assert.equal(isLegacyXls("metraj.csv", null), false);
  assert.equal(spreadsheetKind("liste.xlsx", ZIP_HEADER), "xlsx");
  assert.equal(spreadsheetKind("liste.csv", null), "csv");
  assert.equal(spreadsheetKind("liste.xls", null), "xls");
  assert.equal(spreadsheetKind("liste.pdf", null), "other");
  assert.match(LEGACY_XLS_MESSAGE, /Farklı Kaydet/);
  assert.match(LEGACY_XLS_MESSAGE, /\.xlsx/);
});

test("quote template opens on an empty data sheet with instructions and examples on separate sheets", async () => {
  const workbook = new ExcelJS.Workbook();
  const bytes = await buildQuoteXlsxTemplate();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), [QUOTE_SHEET, "Nasıl Doldurulur", "Örnek"]);
  const data = workbook.getWorksheet(QUOTE_SHEET)!;
  assert.deepEqual((data.getRow(1).values as unknown[]).slice(1), ["Poz No", "İş Kalemi Açıklaması", "Birim", "Miktar", "Birim Fiyat (TL)", "KDV (%)", "İskonto (%)"]);
  assert.equal(data.actualRowCount, 1, "no example rows in the data sheet, so nothing fake is imported");
  assert.ok(data.getCell("C2").dataValidation?.formulae?.length, "unit column offers a list");
  // An untouched template is not mistaken for a quote.
  const untouched = await parseQuoteXlsx(bytes, "teklif-sablonu.xlsx");
  assert.equal(untouched.items.length, 0);
});

test("a filled quote template round-trips through the importer with Turkish numbers", async () => {
  const filled = await fillSheet(await buildQuoteXlsxTemplate(), QUOTE_SHEET, [
    ["15.150.1006", "C30/37 betonarme betonu", "m³", 412.5, 3450, 20, 0],
    [null, "Plywood kalıp", "m²", "1.860,00", "650", 20, 5],
  ]);
  const result = await parseQuoteXlsx(filled, "teklif.xlsx");
  assert.deepEqual(result.errors, []);
  assert.equal(result.items.length, 2);
  // The importer keeps the poz code in front of the description.
  assert.equal(result.items[0].description, "[15.150.1006] C30/37 betonarme betonu");
  assert.equal(result.items[0].quantity, 412.5);
  assert.equal(result.items[1].quantity, 1860);
  assert.equal(result.items[1].unitPrice, 650);
});

test("price catalogue template round-trips and the CSV reader keeps its rules", async () => {
  const filled = await fillSheet(await buildPriceCatalogXlsxTemplate(), PRICE_CATALOG_SHEET, [
    ["15.150.1006", "C30/37 hazır beton", "m³", "3.450,00", "TRY", "2026-12-31", "Teklif-77"],
    [null, "Nervürlü donatı Ø12", "ton", 42000, null, null, null],
  ]);
  const rows = await parsePriceCatalogXlsx(filled);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { positionCode: "15.150.1006", description: "C30/37 hazır beton", unit: "m³", amount: 3450, currency: "TRY", validUntil: "2026-12-31", externalReference: "Teklif-77" });
  assert.deepEqual([rows[1].amount, rows[1].currency, rows[1].positionCode], [42000, "TRY", undefined]);
  await assert.rejects(parsePriceCatalogXlsx(await buildPriceCatalogXlsxTemplate()), /bir fiyat satırı/);
  assert.equal(parsePriceCatalogCsv("Poz No;Açıklama;Birim;Birim Fiyat\n15.1;Beton;m³;3.450,50")[0].amount, 3450.5);
  assert.throws(() => parsePriceCatalogCsv("Açıklama;Birim;Birim Fiyat\nBeton;m³;0"), /fiyat geçersiz/);
});

test("the price catalogue reader refuses a legacy .xls with the conversion hint", async () => {
  await assert.rejects(parsePriceCatalogXlsx(OLE_HEADER.buffer as ArrayBuffer), /Farklı Kaydet/);
});

test("parcel template keeps the data sheet first, carries no example values and round-trips", async () => {
  const bytes = await buildParcelXlsxTemplate();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  assert.equal(workbook.worksheets[0].name, PARCEL_SHEET);
  assert.equal(workbook.worksheets[0].actualRowCount, 1);
  const filled = await fillSheet(bytes, PARCEL_SHEET, [["Ada 101 Parsel 5", 1250, 0.3, 1.5]]);
  const parsed = await parseParcelXlsx(filled);
  assert.equal(parsed.parcels.length, 1);
  assert.equal(parsed.parcels[0].name, "Ada 101 Parsel 5");
  assert.equal(parsed.parcels[0].areaM2, 1250);
});
