import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectAndValidateFile, maxBytesForSmartCheckFileName, sanitizeSpreadsheetText } from "./file-security";

describe("SmartCheck file security", () => {
  it("rejects extension and signature mismatches", () => {
    assert.throws(() => detectAndValidateFile(Buffer.from("a,b\n1,2"), "fake.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), /FILE_SIGNATURE_MISMATCH/);
  });
  it("accepts textual CSV and neutralizes spreadsheet formulas", () => {
    assert.equal(detectAndValidateFile(Buffer.from("poz,miktar\nA,2"), "metraj.csv", "text/csv"), "csv");
    assert.equal(sanitizeSpreadsheetText("=HYPERLINK(\"bad\")"), "'=HYPERLINK(\"bad\")");
    assert.equal(sanitizeSpreadsheetText("normal"), "normal");
  });
  it("accepts IFC STEP text only when schema evidence is present", () => {
    const ifc = Buffer.from("ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4X3_ADD2'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;");
    assert.equal(detectAndValidateFile(ifc, "model.ifc", "model/ifc"), "ifc");
    assert.throws(() => detectAndValidateFile(Buffer.from("ISO-10303-21;\nDATA;"), "model.ifc", "model/ifc"), /FILE_SIGNATURE_MISMATCH/);
    assert.equal(maxBytesForSmartCheckFileName("model.ifc") > maxBytesForSmartCheckFileName("metraj.csv"), true);
  });
  it("accepts bounded PDF signatures and rejects renamed or oversized PDFs", () => {
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
    assert.equal(detectAndValidateFile(pdf, "260001_00_MM_XXXX_PL_MMC_K00_01_000.pdf", "application/pdf"), "pdf");
    assert.throws(() => detectAndValidateFile(pdf, "report.csv", "application/pdf"), /FILE_SIGNATURE_MISMATCH/);
    assert.throws(() => detectAndValidateFile(Buffer.from("not pdf"), "report.pdf", "application/pdf"), /FILE_SIGNATURE_MISMATCH/);
    assert.equal(maxBytesForSmartCheckFileName("report.pdf"), 25 * 1024 * 1024);
  });
});
