import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateLineBreakdown, calculateLineItemTotal, calculateQuotationTotals, roundMoney, validateQuotationItems } from "./calculations";
import { calculateQuotationFinancials, escalationPremiumFor } from "./financial-calculations";
import { auditQuotationItems } from "./quotation-audit";

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

  it("compounds escalation to the spend midpoint instead of the full duration", () => {
    // 1 M TL malzeme, 12 ay, aylık %2: 1e6 × (1,02^6 − 1) = 126.162,42 TL (doğrusal formül 240.000 TL verirdi).
    const result = calculateQuotationFinancials([{ quantity: 1, unitPrice: 1_500_000, costUnitPrice: 1_000_000, costCategory: "material" }], { projectDurationMonths: 12, escalationVolatilityPercent: 2 });
    assert.equal(result.escalationPremium, 126162.42);
    assert.equal(result.totalCost, 1_126_162.42);
  });

  it("escalates only material and labor, not fixed-price subcontracts or overhead", () => {
    const result = calculateQuotationFinancials([
      { quantity: 1, unitPrice: 200, costUnitPrice: 100, costCategory: "labor" },
      { quantity: 1, unitPrice: 200, costUnitPrice: 100, costCategory: "subcontractor" },
      { quantity: 1, unitPrice: 200, costUnitPrice: 100, costCategory: "overhead" },
    ], { projectDurationMonths: 24, escalationVolatilityPercent: 2 });
    assert.equal(result.escalationPremium, 26.82);
  });

  it("keeps carbon risk as an explicit scenario premium", () => {
    const result = calculateQuotationFinancials([{ quantity: 1, unitPrice: 200, costUnitPrice: 100 }], { carbonRiskPremiumPercent: 4 });
    assert.equal(result.carbonRiskPremium, 4);
    assert.equal(result.totalCost, 104);
    assert.equal(result.profit, 96);
  });

  it("prices information delivery as an explicit scope cost", () => {
    const result = calculateQuotationFinancials([{ quantity: 1, unitPrice: 200, costUnitPrice: 100 }], { informationDeliveryCostPercent: 2 });
    assert.equal(result.informationDeliveryCostPremium, 2);
    assert.equal(result.totalCost, 102);
    assert.equal(result.profit, 98);
  });
});

describe("quotation source audit", () => {
  it("flags AI estimates and missing costs without claiming engineering validation", () => {
    const issues = auditQuotationItems([{ quantitySource: "ai_estimate", priceSource: "ai_estimate", verificationStatus: "unverified", costUnitPrice: null }]);
    assert.deepEqual(issues.map((issue) => issue.code), ["SOURCE_UNVERIFIED", "COST_MISSING"]);
    assert.deepEqual(issues.map((issue) => issue.academyGuidance.lessonSlug), ["bim-basics-openbim", "bar-schedules-takeoffs"]);
  });

  it("links missing source references to a canonical protected Allplan lesson", () => {
    const [issue] = auditQuotationItems([{ quantitySource: "model", priceSource: "manual", sourceReference: "", verificationStatus: "verified", costUnitPrice: 10 }]);
    assert.equal(issue.code, "SOURCE_REFERENCE_MISSING");
    assert.equal(issue.academyGuidance.lessonSlug, "bim-basics-openbim");
  });
});

describe("kuruş yuvarlama doğruluğu", () => {
  it("yarım kuruşu ikili kayan nokta hatası olmadan yukarı yuvarlar", () => {
    assert.equal(roundMoney(1.005), 1.01);
    assert.equal(roundMoney(2.675), 2.68);
    assert.equal(roundMoney(1.255), 1.26);
    assert.equal(roundMoney(-1.005), -1.01);
    assert.equal(roundMoney(0), 0);
    assert.equal(roundMoney(1e-7), 0);
  });

  it("satır toplamlarının toplamı her zaman ara toplam eksi iskontoya eşittir", () => {
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 20000; k++) {
      const items = Array.from({ length: 1 + Math.floor(rnd() * 15) }, () => ({
        quantity: Math.round(rnd() * 50000) / 1000,
        unitPrice: Math.round(rnd() * 500000) / 100,
        discountPercent: [0, 5, 7.5, 10, 12.5][Math.floor(rnd() * 5)],
        vatPercent: [20, 10, 1][Math.floor(rnd() * 3)],
      }));
      const totals = calculateQuotationTotals(items);
      const lineNetCents = items.reduce((sum, item) => sum + Math.round(calculateLineItemTotal(item) * 100), 0);
      const lineVatCents = items.reduce((sum, item) => sum + Math.round(calculateLineBreakdown(item).vat * 100), 0);
      assert.equal(lineNetCents, Math.round((totals.subtotal - totals.discountTotal) * 100));
      assert.equal(lineVatCents, Math.round(totals.vatTotal * 100));
      assert.equal(Math.round(totals.grandTotal * 100), lineNetCents + lineVatCents);
    }
  });

  it("3 × 0,335 TL satırı 1,01 TL'dir (toFixed hatası 1,00 verirdi)", () => {
    assert.equal(calculateLineItemTotal({ quantity: 3, unitPrice: 0.335, discountPercent: 0, vatPercent: 20 }), 1.01);
  });
});

describe("fiyatsız kalem denetimi", () => {
  it("birim fiyatı sıfır veya boş kalemi uyarı olarak işaretler", () => {
    const issues = auditQuotationItems([
      { unitPrice: 0, costUnitPrice: 1, verificationStatus: "verified" },
      { unitPrice: "", costUnitPrice: 1, verificationStatus: "verified" },
      { unitPrice: 10, costUnitPrice: 1, verificationStatus: "verified" },
    ]);
    assert.deepEqual(issues.filter((issue) => issue.code === "PRICE_MISSING").map((issue) => issue.itemIndex), [0, 1]);
    assert.ok(issues.every((issue) => issue.code !== "PRICE_MISSING" || issue.severity === "warning"));
  });
});

describe("inceleme düzeltmeleri", () => {
  it("eskalasyon taşarsa 0 yerine hata verir", () => {
    assert.throws(() => escalationPremiumFor(1000, 1e9, 2), /ESCALATION_OUT_OF_RANGE/);
  });

  it("kârlılık satış tutarı teklif toplamıyla kuruşu kuruşuna eşittir", () => {
    const items = [
      { quantity: 3, unitPrice: 0.335, costUnitPrice: 0.1, discountPercent: 0 },
      { quantity: 1.005, unitPrice: 1, costUnitPrice: 0.5, discountPercent: 12.5 },
    ];
    const totals = calculateQuotationTotals(items);
    assert.equal(calculateQuotationFinancials(items).salesNet, Math.round((totals.subtotal - totals.discountTotal) * 100) / 100);
  });
});
