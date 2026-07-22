import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeUnit, parseLocalizedNumber, suggestMapping, validateRows } from "./normalize";

describe("SmartCheck normalization", () => {
  it("maps Turkish headers, units and localized numbers deterministically", () => {
    assert.deepEqual(suggestMapping(["Poz No", "Açıklama", "Birim", "Miktar", "Birim Fiyat"]), { positionCode: "Poz No", description: "Açıklama", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: undefined });
    assert.equal(normalizeUnit("m2"), "m²");
    assert.equal(parseLocalizedNumber("1.234,50"), 1234.5);
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
