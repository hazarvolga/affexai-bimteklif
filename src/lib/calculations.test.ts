import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateLineItemTotal, calculateQuotationTotals, validateQuotationItems } from "./calculations";
import { calculateQuotationFinancials } from "./financial-calculations";

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

  it("rejects unsafe quotation line items before persistence", () => {
    assert.deepEqual(validateQuotationItems([{
      description: "",
      unit: "m2",
      quantity: -2,
      unitPrice: 100,
      discountPercent: 120,
      vatPercent: -1,
    }]), [
      { code: "DESCRIPTION_REQUIRED", field: "items.0.description", message: "Kalem açıklaması zorunludur." },
      { code: "QUANTITY_INVALID", field: "items.0.quantity", message: "Miktar sıfırdan büyük, geçerli bir sayı olmalıdır." },
      { code: "DISCOUNT_INVALID", field: "items.0.discountPercent", message: "İskonto yüzde 0 ile 100 arasında olmalıdır." },
      { code: "VAT_INVALID", field: "items.0.vatPercent", message: "KDV yüzde 0 ile 100 arasında olmalıdır." },
    ]);
  });

  it("requires at least one line item", () => {
    assert.deepEqual(validateQuotationItems([]), [{ code: "ITEMS_REQUIRED", field: "items", message: "Teklifte en az bir kalem bulunmalıdır." }]);
  });
});

describe("real quotation financials", () => {
  it("calculates cost with waste and category breakdown", () => {
    const result = calculateQuotationFinancials([{ quantity: 100, unitPrice: 250, costUnitPrice: 150, wastePercent: 5, costCategory: "material" }]);
    assert.equal(result.salesNet, 25000);
    assert.equal(result.totalCost, 15750);
    assert.equal(result.profit, 9250);
    assert.equal(result.margin, 37);
    assert.equal(result.costBreakdown.material, 15750);
  });

  it("does not report profit while a cost is missing", () => {
    const result = calculateQuotationFinancials([
      { quantity: 1, unitPrice: 100, costUnitPrice: null },
      { quantity: 1, unitPrice: 50, costUnitPrice: 25 },
    ]);
    assert.deepEqual(result.missingCostItemIndexes, [0]);
    assert.equal(result.profit, 0);
    assert.equal(result.margin, 0);
  });
});
