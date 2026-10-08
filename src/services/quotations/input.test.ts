import assert from "node:assert/strict";
import test from "node:test";
import { manualQuotationInput, quotationStatusInput } from "./input";

const payload = () => ({
  clientId: "11111111-1111-4111-8111-111111111111", quoteNumber: "Q-1", projectName: "Project",
  date: "2026-10-08", expiryDate: "2026-11-08",
  items: [{ description: "Work", unit: "m2", quantity: "2", unitPrice: "100" }],
});

test("manual DTO strips all authority fields without mutating the input", () => {
  const input = { ...payload(), id: "spoof", companyId: "spoof", parentId: "spoof", grandTotal: 1,
    pricingSnapshotLockedByUserId: "spoof", observedActualCost: 1,
    items: [{ ...payload().items[0], id: "spoof", companyId: "spoof", verificationStatus: "verified", quantitySource: "imported",
      priceSnapshotId: "spoof", priceSnapshotLockedAt: "2026-10-08", evidence: { verified: true } }],
  };
  const original = structuredClone(input);
  const parsed = manualQuotationInput.parse(input);
  assert.deepEqual(input, original);
  for (const key of ["id", "companyId", "parentId", "grandTotal", "pricingSnapshotLockedByUserId", "observedActualCost"]) assert.equal(key in parsed, false);
  for (const key of ["id", "companyId", "verificationStatus", "quantitySource", "priceSnapshotId", "priceSnapshotLockedAt", "evidence"]) assert.equal(key in parsed.items[0], false);
  assert.equal(parsed.items[0].quantity, 2);
  assert.equal(parsed.items[0].vatPercent, 20);
  assert.equal(parsed.status, "draft");
  assert.ok(parsed.date instanceof Date);
});

test("manual DTO supports optional cost and notes without losing valid zero values", () => {
  for (const cost of [undefined, null, "", 0, "0", "75.5"]) {
    const parsed = manualQuotationInput.parse({ ...payload(), notes: "", industryId: null,
      items: [{ ...payload().items[0], costUnitPrice: cost, unitPrice: 0, discountPercent: 0, vatPercent: 0 }],
    });
    assert.equal(parsed.items[0].costUnitPrice, cost === "" ? null : cost == null ? cost : Number(cost));
    assert.equal(parsed.items[0].unitPrice, 0);
    assert.equal(parsed.items[0].vatPercent, 0);
    assert.equal(parsed.notes, "");
  }
});

test("manual DTO rejects malformed objects, dates, enums, and numeric inputs", () => {
  for (const input of [null, [], {}, { ...payload(), clientId: "bad" }, { ...payload(), date: "bad" },
    { ...payload(), status: "verified" }, { ...payload(), currency: "invalid" },
    { ...payload(), projectDurationMonths: 1.5 }, { ...payload(), items: [null] }]) {
    assert.equal(manualQuotationInput.safeParse(input).success, false);
  }
  for (const value of [null, true, {}, "", " ", -1, Infinity, NaN, "not-number"]) {
    assert.equal(manualQuotationInput.safeParse({ ...payload(), items: [{ ...payload().items[0], unitPrice: value }] }).success, false);
  }
  for (const key of ["discountPercent", "vatPercent", "wastePercent"]) {
    assert.equal(manualQuotationInput.safeParse({ ...payload(), items: [{ ...payload().items[0], [key]: 101 }] }).success, false);
  }
});

test("status accepts only the persisted quotation enum", () => {
  for (const status of ["draft", "sent", "negotiation", "won", "lost", "archived"]) assert.equal(quotationStatusInput.parse(status), status);
  for (const status of [undefined, null, "", "verified", "DRAFT", 1, {}]) assert.equal(quotationStatusInput.safeParse(status).success, false);
});
