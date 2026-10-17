import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuoteCsvTemplate,
  parseNumberCell,
  parseQuoteCsv,
  parseQuoteRows,
} from "./quote-excel-import";

test("parseNumberCell handles Turkish and international number strings", () => {
  assert.equal(parseNumberCell(1250.5), 1250.5);
  assert.equal(parseNumberCell("1.250,50"), 1250.5);
  assert.equal(parseNumberCell("1,250.50"), 1250.5);
  assert.equal(parseNumberCell("125,50 ₺"), 125.5);
  assert.equal(parseNumberCell("  3500 "), 3500);
  assert.equal(parseNumberCell(""), null);
  assert.equal(parseNumberCell(null), null);
});

test("parseQuoteCsv parses standard semicolon delimited Turkish quote CSV", () => {
  const csv = buildQuoteCsvTemplate();
  const res = parseQuoteCsv(csv, "ornek.csv");

  assert.equal(res.errors.length, 0);
  assert.equal(res.items.length, 4);
  assert.equal(res.items[0]?.description, "[15.120.1001] C25/30 Hazır Beton Dökülmesi");
  assert.equal(res.items[0]?.unit, "m3");
  assert.equal(res.items[0]?.quantity, 1250);
  assert.equal(res.items[0]?.unitPrice, 3450);
  assert.equal(res.items[0]?.vatPercent, 20);
  assert.equal(res.items[0]?.total, 1250 * 3450);
});

test("parseQuoteCsv parses English headers and comma delimiter", () => {
  const csv = [
    "Item No,Description,Unit,Quantity,Unit Price,VAT",
    "01,Structural Steel,ton,50,45000,20",
    "02,Interior Paint,m2,1200,85,20",
  ].join("\n");

  const res = parseQuoteCsv(csv, "english.csv");
  assert.equal(res.errors.length, 0);
  assert.equal(res.items.length, 2);
  assert.equal(res.items[0]?.description, "[01] Structural Steel");
  assert.equal(res.items[0]?.quantity, 50);
  assert.equal(res.items[0]?.unitPrice, 45000);
});

test("parseQuoteRows skips non-numeric quantities and subtotal rows", () => {
  const rows = [
    ["İş Kalemi", "Birim", "Miktar", "Birim Fiyat"],
    ["Hafriyat", "m3", "500", "120"],
    ["Genel Toplam", "", "", "60000"],
    ["Eksik Miktarlı Kalem", "m2", "yok", "50"],
  ];
  const res = parseQuoteRows(rows, "test.csv");
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0]?.description, "Hafriyat");
  assert.equal(res.skippedRowCount, 2); // 1 total + 1 invalid quantity
});

test("parseQuoteRows records warning for 0 TL unit price when price column is missing", () => {
  const rows = [
    ["İş Kalemi", "Birim", "Miktar"],
    ["Demir Bağlama", "ton", "10"],
  ];
  const res = parseQuoteRows(rows, "fiyatsiz.csv");
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0]?.unitPrice, 0);
  assert.ok(res.warnings.some((w) => w.includes("0 ₺ olarak kaydedildi")));
});

test("parseQuoteXlsx loads and parses Excel workbook correctly", async () => {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Teklif Kalemleri");
  ws.addRow(["Poz No", "İş Kalemi Açıklaması", "Birim", "Miktar", "Birim Fiyat"]);
  ws.addRow(["01", "C30 Beton", "m3", 250, 3200]);
  ws.addRow(["02", "Kalıp", "m2", 800, 500]);
  const buffer = await wb.xlsx.writeBuffer();

  const { parseQuoteXlsx } = await import("./quote-excel-import");
  const res = await parseQuoteXlsx(buffer, "test.xlsx");
  assert.equal(res.errors.length, 0);
  assert.equal(res.items.length, 2);
  assert.equal(res.items[0]?.description, "[01] C30 Beton");
  assert.equal(res.items[0]?.quantity, 250);
  assert.equal(res.items[0]?.unitPrice, 3200);
});

