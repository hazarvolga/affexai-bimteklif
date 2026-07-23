import assert from "node:assert/strict";
import test from "node:test";
import { findRegulationQuotationImpact } from "./impact";

const quotation = { id: "q1", quoteNumber: "TP-001", projectName: "MEP Pilot", date: new Date("2026-07-01"), expiryDate: new Date("2026-09-01"), status: "draft" };

test("labor regulation impact only matches labor items", () => {
  const result = findRegulationQuotationImpact({ category: "labor", title: "SGK değişikliği", effectiveFrom: new Date("2026-08-01"), effectiveUntil: null, applicability: null }, quotation, [
    { id: "i1", quotationId: "q1", description: "Montaj işçilik", unit: "saat", costCategory: "labor" },
    { id: "i2", quotationId: "q1", description: "VRF dış ünite", unit: "adet", costCategory: "material" },
  ], new Date("2026-07-23"));
  assert.ok(result);
  assert.deepEqual(result.itemIds, ["i1"]);
  assert.equal(result.effectiveStatus, "upcoming");
  assert.equal(result.matchType, "targeted");
});
test("tax regulation impact is broad and remains low confidence", () => {
  const result = findRegulationQuotationImpact({ category: "tax", title: "KDV advisory", effectiveFrom: new Date("2026-07-01"), effectiveUntil: null, applicability: null }, quotation, [
    { id: "i1", quotationId: "q1", description: "VRF dış ünite", unit: "adet", costCategory: "material" },
  ], new Date("2026-07-23"));
  assert.ok(result);
  assert.deepEqual(result.itemIds, ["i1"]);
  assert.equal(result.effectiveStatus, "effective");
  assert.equal(result.confidence, "low");
  assert.equal(result.matchType, "quotation_wide");
});

test("unrelated material regulation does not match a labor-only quotation", () => {
  const result = findRegulationQuotationImpact({ category: "material", title: "Boru fiyat değişimi", effectiveFrom: null, effectiveUntil: null, applicability: null }, quotation, [
    { id: "i1", quotationId: "q1", description: "Montaj işçilik", unit: "saat", costCategory: "labor" },
  ]);
  assert.equal(result, null);
});
