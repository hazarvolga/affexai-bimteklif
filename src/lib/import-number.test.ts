import assert from "node:assert/strict";
import test from "node:test";
import { isAmbiguousNumberText, isNumberText, numericCellText, parseImportNumber } from "./tr-number";
import { parseNumberCell } from "./quote-excel-import";
import { resolveTuikSubIndexForPoz } from "./price-escalation";

test("import numbers read Turkish, English and plain forms", () => {
  for (const [raw, expected] of [
    ["1.250,50", 1250.5], ["1,250.50", 1250.5], ["125,5", 125.5], ["1250.5", 1250.5], ["1.250.000", 1250000],
    ["1,250,000", 1250000], ["0.125", 0.125], ["1,250", 1.25], ["12.5", 12.5], ["1250", 1250], ["₺ 1.250,50", 1250.5],
    ["%25", 25], ["25%", 25], ["-3,5", -3.5],
  ] as const) assert.equal(parseImportNumber(raw), expected, raw);
});

test("a dot followed by exactly three digits is ambiguous and never read silently", () => {
  for (const raw of ["1.250", "12.500", "125.000", "-1.250"]) {
    assert.equal(parseImportNumber(raw), null, raw);
    assert.equal(isAmbiguousNumberText(raw), true, raw);
    assert.equal(isNumberText(raw), true, raw);
  }
  assert.equal(parseNumberCell("1.250"), null);
});

test("malformed text is neither a number nor ambiguous", () => {
  for (const raw of ["", "abc", "1.2.3", "1,2,3", "12.34.567"]) {
    assert.equal(parseImportNumber(raw), null, raw);
    assert.equal(isNumberText(raw), false, raw);
  }
});

test("numeric spreadsheet cells keep their exact value through text", () => {
  assert.equal(parseImportNumber(numericCellText(12.125)), 12.125);
  assert.equal(parseImportNumber(numericCellText(1250)), 1250);
  assert.equal(parseImportNumber(numericCellText(0.5)), 0.5);
  assert.equal(parseNumberCell(12.125), 12.125);
});

test("escalation sub-index matching handles Turkish and ASCII spellings in any case", () => {
  for (const label of ["çimento", "Çimento harcı", "ÇİMENTO", "cimento", "CIMENTO"]) assert.equal(resolveTuikSubIndexForPoz(label).code, "TUIK-23.5-CIMENTO-KIREC", label);
  assert.notEqual(resolveTuikSubIndexForPoz("kiremit").code, "TUIK-TUFE-GENEL");
  assert.notEqual(resolveTuikSubIndexForPoz("bitüm").code, "TUIK-TUFE-GENEL");
  assert.notEqual(resolveTuikSubIndexForPoz("hidrofor").code, "TUIK-TUFE-GENEL");
});
