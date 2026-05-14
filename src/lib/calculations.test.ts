import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateLineItemTotal, calculateQuotationTotals } from "./calculations";

describe("quotation calculations", () => {
  it("calculates a discounted line total before VAT", () => {
    assert.equal(calculateLineItemTotal({
      quantity: 10,
      unitPrice: 100,
      discountPercent: 15,
      vatPercent: 20,
    }), 850);
  });

  it("aggregates subtotal, discount, VAT, and grand total", () => {
    assert.deepEqual(calculateQuotationTotals([
      { quantity: 10, unitPrice: 100, discountPercent: 10, vatPercent: 20 },
      { quantity: "2", unitPrice: "250", discountPercent: "0", vatPercent: "10" },
    ]), {
      subtotal: 1500,
      discountTotal: 100,
      vatTotal: 230,
      grandTotal: 1630,
    });
  });

  it("normalizes invalid numeric input to safe defaults", () => {
    assert.deepEqual(calculateQuotationTotals([
      { quantity: "not-a-number", unitPrice: 100, discountPercent: null, vatPercent: undefined },
    ]), {
      subtotal: 0,
      discountTotal: 0,
      vatTotal: 0,
      grandTotal: 0,
    });
  });
});
