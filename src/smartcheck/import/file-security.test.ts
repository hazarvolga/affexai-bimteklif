import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectAndValidateFile, sanitizeSpreadsheetText } from "./file-security";

describe("SmartCheck file security", () => {
  it("rejects extension and signature mismatches", () => {
    assert.throws(() => detectAndValidateFile(Buffer.from("a,b\n1,2"), "fake.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), /FILE_SIGNATURE_MISMATCH/);
  });
  it("accepts textual CSV and neutralizes spreadsheet formulas", () => {
    assert.equal(detectAndValidateFile(Buffer.from("poz,miktar\nA,2"), "metraj.csv", "text/csv"), "csv");
    assert.equal(sanitizeSpreadsheetText("=HYPERLINK(\"bad\")"), "'=HYPERLINK(\"bad\")");
    assert.equal(sanitizeSpreadsheetText("normal"), "normal");
  });
});
