import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { MAX_XLSX_BYTES, parseParcelXlsx } from "./pre-bim-xlsx";

async function buildXlsx(rows: unknown[][]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Parseller");
  for (const r of rows) ws.addRow(r);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

test("xlsx: sayısal ve metin hücreli parsel dosyası okunur", async () => {
  const data = await buildXlsx([
    ["parsel_adi", "alan_m2", "taks", "kaks", "emsal_harici_m2"],
    ["Parsel 12", 1000, 0.4, 0.8, 150],
    ["Parsel 13", "1.250,50", "0,35", "1,5", null],
  ]);
  const r = await parseParcelXlsx(data);
  assert.equal(r.errors.length, 0);
  assert.equal(r.parcels.length, 2);
  assert.deepEqual(r.parcels[0], { name: "Parsel 12", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 150 });
  assert.equal(r.parcels[1].areaM2, 1250.5);
});

test("xlsx: formül hücresinin sonucu okunur", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("S");
  ws.addRow(["parsel_adi", "alan_m2", "taks", "kaks"]);
  ws.addRow(["F", { formula: "500+500", result: 1000 }, 0.4, 0.8]);
  const r = await parseParcelXlsx(new Uint8Array(await wb.xlsx.writeBuffer()));
  assert.equal(r.parcels[0].areaM2, 1000);
});

test("xlsx: eksik sütun, bozuk dosya ve büyük dosya reddedilir", async () => {
  const missing = await parseParcelXlsx(await buildXlsx([["a", "b"], [1, 2]]));
  assert.ok(missing.errors[0].includes("Eksik sütun"));

  const bad = await parseParcelXlsx(new Uint8Array([1, 2, 3, 4]));
  assert.ok(bad.errors[0].includes("geçerli bir .xlsx değil"));

  const big = await parseParcelXlsx(new Uint8Array(MAX_XLSX_BYTES + 1));
  assert.ok(big.errors[0].includes("MB sınırını aşıyor"));
});
