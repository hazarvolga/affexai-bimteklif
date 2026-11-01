import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeUnit, parseLocalizedNumber, suggestMapping, validateRows } from "./normalize";

describe("SmartCheck normalization", () => {
  it("maps Turkish headers, units and localized numbers deterministically", () => {
    assert.deepEqual(suggestMapping(["Poz No", "Açıklama", "Birim", "Miktar", "Birim Fiyat"]), { positionCode: "Poz No", description: "Açıklama", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: undefined });
    assert.equal(normalizeUnit("m2"), "m²");
    assert.equal(parseLocalizedNumber("1.234,50"), 1234.5);
  });
  it("flags an ambiguous typed number for review and keeps exact machine decimals", () => {
    const base = { sheetName: "MEP", sourceRowNumber: 2, sourceCellRange: "A2:F2", formulaJson: null, rawPositionCode: "M-01", rawDescription: "Kanal", rawUnit: "m", rawPrice: "", rawWastePercent: "" };
    const [typed] = validateRows([{ ...base, rawQuantity: "1.250" }], 20);
    assert.equal(typed.normalized.quantity, null);
    assert.ok(typed.findings.some(finding => finding.code === "AMBIGUOUS_NUMBER" && finding.severity === "high"));
    assert.ok(!typed.findings.some(finding => finding.code === "INVALID_QUANTITY"));
    const [machine] = validateRows([{ ...base, rawQuantity: "12.125" }], 20, { machineDecimals: true });
    assert.equal(machine.normalized.quantity, 12.125);
    assert.ok(!machine.findings.some(finding => finding.code === "AMBIGUOUS_NUMBER"));
  });
  it("reads a percent waste value so the company limit still applies", () => {
    const base = { sheetName: "MEP", sourceRowNumber: 2, sourceCellRange: "A2:F2", formulaJson: null, rawPositionCode: "M-01", rawDescription: "Kanal", rawUnit: "m", rawQuantity: "5", rawPrice: "" };
    const [row] = validateRows([{ ...base, rawWastePercent: "%25" }], 20);
    assert.ok(row.findings.some(finding => finding.code === "WASTE_LIMIT_EXCEEDED"));
  });
  it("flags invalid and duplicate rows without changing source values", () => {
    const base = { sheetName: "MEP", sourceCellRange: "A2:F2", rawDescription: "Kanal", rawUnit: "m2", rawQuantity: "0", rawPrice: "", rawWastePercent: "25", formulaJson: {} };
    const result = validateRows([
      { ...base, sourceRowNumber: 2, rawPositionCode: "M-01" },
      { ...base, sourceRowNumber: 3, rawPositionCode: "M-01", rawQuantity: "5" },
    ], 20);
    assert.deepEqual(result[0].findings.map((finding) => finding.code), ["DUPLICATE_POSITION_CODE", "INVALID_QUANTITY", "MISSING_PRICE_SOURCE", "WASTE_LIMIT_EXCEEDED"]);
    assert.equal(result[0].row.rawQuantity, "0");
  });
});
