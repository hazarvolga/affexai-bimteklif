import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  neutralizeSpreadsheetFormula,
  parseCsv,
  serializeCsv,
  toSpreadsheetCell,
} from "./tabular-data";

test("neutralizeSpreadsheetFormula blocks formula prefixes and leading whitespace without changing typed numbers", () => {
  for (const value of ["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "\t=1+1", "\r=1+1", "\n=1+1", " =1+1"]) {
    assert.equal(neutralizeSpreadsheetFormula(value), `'${value}`);
  }

  assert.equal(neutralizeSpreadsheetFormula("Salon"), "Salon");
  assert.equal(toSpreadsheetCell(-5), -5);
  assert.equal(toSpreadsheetCell("-5,00"), "'-5,00");
});

test("serializeCsv preserves delimiter, quotes, CR/LF, Unicode and emits Excel-compatible CRLF", () => {
  const csv = serializeCsv(
    [
      ["Kod", "Açıklama", "Miktar"],
      ["=1+1", 'Salon;extra "özel"\r\nikinci satır 🏗️', 12.5],
    ],
    { delimiter: ";", bom: true },
  );

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /\r\n/);
  assert.equal(csv.replace(/\r\n/g, "").includes("\n"), false);
  assert.match(csv, /"'=1\+1"/);
  assert.match(csv, /"Salon;extra ""özel""\r\nikinci satır 🏗️"/);
  assert.match(csv, /;12\.5\r\n$/);

  assert.deepEqual(parseCsv(csv, { delimiter: ";" }), [
    ["Kod", "Açıklama", "Miktar"],
    ["'=1+1", 'Salon;extra "özel"\r\nikinci satır 🏗️', "12.5"],
  ]);
});

test("parseCsv detects comma, semicolon and tab delimiters outside quoted fields", () => {
  assert.deepEqual(parseCsv('a,b\r\n"x,y",2\r\n'), [["a", "b"], ["x,y", "2"]]);
  assert.deepEqual(parseCsv('a;b\r\n"x;y";2\r\n'), [["a", "b"], ["x;y", "2"]]);
  assert.deepEqual(parseCsv("a\tb\r\nx\t2\r\n"), [["a", "b"], ["x", "2"]]);
});

test("parseCsv rejects characters after a closing quote and quotes inside unquoted cells", () => {
  assert.throws(() => parseCsv('"a"x,b\r\n'), /kapanış tırnağından sonra/);
  assert.throws(() => parseCsv('a"b,c\r\n'), /tırnak işareti/);
});

test("parseCsv keeps valid escaped quotes and multiline quoted cells", () => {
  assert.deepEqual(parseCsv('"a""b","ilk\r\nikinci"\r\n'), [["a\"b", "ilk\r\nikinci"]]);
});

test("serializeCsv rejects unsupported delimiters and non-finite typed numbers", () => {
  assert.throws(() => serializeCsv([["a"]], { delimiter: "||" }), /tek karakter/);
  assert.throws(() => serializeCsv([[Number.NaN]]), /sonlu/);
  assert.throws(() => serializeCsv([[Number.POSITIVE_INFINITY]]), /sonlu/);
});

function findSoffice(): string | null {
  const candidates = [
    process.env.SOFFICE_BIN,
    ...String(process.env.PATH ?? "").split(delimiter).map((part) => join(part, "soffice")),
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const soffice = findSoffice();
test("LibreOffice opens exported CSV without executing neutralized text cells as formulas", { skip: soffice ? false : "LibreOffice/soffice aracı bu ortamda yok" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "bimmetraj-csv-open-"));
  try {
    const input = join(dir, "guvenli.csv");
    writeFileSync(input, serializeCsv([["Metin", "Sayı"], ["=1+1", -5], [" Salon", 12.5]], { delimiter: ";", bom: true }), "utf8");
    const conversion = spawnSync(soffice!, [
      "--headless",
      "--infilter=CSV:59,34,76,1",
      "--convert-to",
      "xlsx",
      "--outdir",
      dir,
      input,
    ], { encoding: "utf8", timeout: 30_000 });
    assert.equal(conversion.status, 0, conversion.stderr || conversion.stdout);

    const converted = join(dir, "guvenli.xlsx");
    assert.ok(existsSync(converted), "LibreOffice XLSX çıktısı üretmedi");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(readFileSync(converted));
    const sheet = workbook.worksheets[0];
    assert.ok(sheet);
    assert.equal(sheet.getCell("A2").formula, undefined);
    assert.equal(sheet.getCell("A2").text, "'=1+1");
    assert.equal(sheet.getCell("B2").value, -5);
    assert.equal(sheet.getCell("A3").formula, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
