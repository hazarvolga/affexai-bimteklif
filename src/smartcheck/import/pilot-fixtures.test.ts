import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import test from "node:test";
import { detectAndValidateFile, sanitizeSpreadsheetText } from "./file-security";
import { validateRows, type ParsedQuantityRow } from "./normalize";

const fixtureRoot = path.resolve(process.cwd(), "fixtures/smartcheck/pilot-v1");
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8")) as {
  cases: Array<{ id: string; file: string; expectedFindings?: number; expectedFindingCodes?: string[]; expectedParseRows?: number; expectedFormulaCells?: number; expectedError?: string }>;
};

function readCsvRows(fileName: string): ParsedQuantityRow[] {
  const content = fs.readFileSync(path.join(fixtureRoot, fileName));
  const records = parseCsv(content, { bom: true, skip_empty_lines: true, relax_column_count: true }) as string[][];
  return records.slice(1).map((values, index) => ({
    sheetName: "CSV", sourceRowNumber: index + 2, sourceCellRange: `A${index + 2}:F${index + 2}`,
    rawPositionCode: values[0] ?? "", rawDescription: values[1] ?? "", rawUnit: values[2] ?? "", rawQuantity: values[3] ?? "", rawPrice: values[4] ?? "", rawWastePercent: values[5] ?? "", formulaJson: {},
  }));
}

test("pilot fixture pack has five deterministic MEP cases", () => {
  const cases = manifest.cases.filter((item) => item.file.endsWith(".csv"));
  assert.equal(cases.length, 5);
  for (const item of cases) {
    const content = fs.readFileSync(path.join(fixtureRoot, item.file));
    assert.equal(detectAndValidateFile(content, item.file, "text/csv"), "csv", item.id);
    const rows = readCsvRows(item.file);
    assert.equal(rows.length, item.expectedParseRows, item.id);
    const validated = validateRows(rows, 20);
    if (item.expectedFindings !== undefined) assert.equal(validated.reduce((count, row) => count + row.findings.length, 0), item.expectedFindings, item.id);
    if (item.expectedFindingCodes) {
      const codes = new Set(validated.flatMap((row) => row.findings.map((finding) => finding.code)));
      for (const code of item.expectedFindingCodes) assert.equal(codes.has(code), true, `${item.id}: ${code}`);
    }
  }
});

test("pilot negative XLSX and formula fixture fail closed", () => {
  const corrupt = fs.readFileSync(path.join(fixtureRoot, "negative-corrupt.xlsx"));
  assert.throws(() => detectAndValidateFile(corrupt, "negative-corrupt.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), /FILE_SIGNATURE_MISMATCH/);
  const formulaRows = readCsvRows("mep-05-formula-safe.csv");
  const dangerous = formulaRows.map((row) => sanitizeSpreadsheetText(row.rawPrice));
  assert.equal(dangerous[0].startsWith("'=HYPERLINK"), true);
  assert.equal(dangerous[1].startsWith("'+CMD"), true);
});

test("pilot price and regulation fixtures remain advisory and versioned", () => {
  const prices = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "price-snapshots.json"), "utf8")) as { snapshots: Array<{ snapshotId: string; sourceDocumentHash: string; reviewStatus: string; validUntil: string }> };
  assert.ok(prices.snapshots.length >= 3);
  for (const snapshot of prices.snapshots) {
    assert.ok(snapshot.snapshotId && snapshot.sourceDocumentHash && snapshot.validUntil);
    assert.notEqual(snapshot.reviewStatus, "approved");
  }
  const diff = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "regulation-diff.json"), "utf8")) as { previousVersion: { status: string }; candidateVersion: { status: string }; expectedAction: string };
  assert.equal(diff.previousVersion.status, "advisory");
  assert.equal(diff.candidateVersion.status, "draft");
  assert.match(diff.expectedAction, /reviewer/);
});
