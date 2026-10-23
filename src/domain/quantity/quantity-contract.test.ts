import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuantityLedger,
  convertQuantity,
  normalizeQuantityUnit,
} from "./quantity-contract";

describe("quantity unit contract", () => {
  it("normalizes the canonical units and treats mtül as the m alias", () => {
    assert.equal(normalizeQuantityUnit("m2"), "m2");
    assert.equal(normalizeQuantityUnit("m³"), "m3");
    assert.equal(normalizeQuantityUnit("mtül"), "m");
    assert.equal(normalizeQuantityUnit("KG"), "kg");
    assert.equal(normalizeQuantityUnit("piece"), null);
  });

  it("converts kg and ton without dimensional evidence", () => {
    assert.deepEqual(convertQuantity({ value: 2_500, fromUnit: "kg", toUnit: "ton" }), {
      status: "ready",
      value: 2.5,
      unit: "ton",
      formula: "2500 kg / 1000",
      evidence: [],
    });
    assert.equal(convertQuantity({ value: 1.75, fromUnit: "ton", toUnit: "kg" }).value, 1_750);
  });

  it("requires verified thickness for m2-m3 conversion", () => {
    assert.deepEqual(convertQuantity({ value: 100, fromUnit: "m2", toUnit: "m3" }), {
      status: "requires_input",
      unit: "m3",
      missingInputs: ["verified_thickness_m"],
      reason: "m2-m3 conversion requires verified thickness evidence",
    });
    assert.equal(convertQuantity({
      value: 100,
      fromUnit: "m2",
      toUnit: "m3",
      evidence: { thicknessM: { value: 0.12, verificationStatus: "unverified", sourceReference: "manual" } },
    }).status, "requires_input");
    assert.deepEqual(convertQuantity({
      value: 100,
      fromUnit: "m2",
      toUnit: "m3",
      evidence: { thicknessM: { value: 0.12, verificationStatus: "verified", sourceReference: "IFC:wall-42" } },
    }), {
      status: "ready",
      value: 12,
      unit: "m3",
      formula: "100 m2 * 0.12 m",
      evidence: ["IFC:wall-42"],
    });
    assert.equal(convertQuantity({
      value: 12,
      fromUnit: "m3",
      toUnit: "m2",
      evidence: { thicknessM: { value: 0.12, verificationStatus: "verified", sourceReference: "IFC:wall-42" } },
    }).value, 100);
  });

  it("requires verified height or direct perimeter evidence for m2-m", () => {
    const missing = convertQuantity({ value: 48, fromUnit: "m2", toUnit: "m" });
    assert.equal(missing.status, "requires_input");
    if (missing.status === "requires_input") {
      assert.deepEqual(missing.missingInputs, ["verified_height_m_or_perimeter_m"]);
    }

    assert.equal(convertQuantity({
      value: 48,
      fromUnit: "m2",
      toUnit: "mtül",
      evidence: { heightM: { value: 3, verificationStatus: "verified", sourceReference: "IFC:space-7" } },
    }).value, 16);

    assert.deepEqual(convertQuantity({
      value: 48,
      fromUnit: "m2",
      toUnit: "m",
      evidence: { perimeterM: { value: 18, verificationStatus: "verified", sourceReference: "QTO:space-7" } },
    }), {
      status: "ready",
      value: 18,
      unit: "m",
      formula: "verified perimeter 18 m",
      evidence: ["QTO:space-7"],
    });
  });

  it("never silently converts incompatible units or invalid values", () => {
    assert.equal(convertQuantity({ value: 1, fromUnit: "adet", toUnit: "m" }).status, "requires_input");
    assert.equal(convertQuantity({ value: Number.NaN, fromUnit: "kg", toUnit: "ton" }).status, "requires_input");
    assert.equal(convertQuantity({ value: -1, fromUnit: "kg", toUnit: "ton" }).status, "requires_input");
  });
});

describe("quantity ledger", () => {
  it("keeps gross, deductions, net, waste, cost, offer and payment quantities separate", () => {
    assert.deepEqual(buildQuantityLedger({
      gross: { value: 120, unit: "m2" },
      deductions: [
        { value: 8, unit: "m2", sourceReference: "IFC:opening-1" },
        { value: 2, unit: "m2", sourceReference: "IFC:opening-2" },
      ],
      wastePercent: 5,
      offerQuantity: { value: 112, unit: "m2" },
    }), {
      status: "ready",
      unit: "m2",
      grossQuantity: 120,
      deductionQuantity: 10,
      netQuantity: 110,
      wastePercent: 5,
      wasteQuantity: 5.5,
      costQuantity: 115.5,
      offerQuantity: 112,
      payment: { status: "not_evaluated", quantity: null, reason: "verified payment quantity was not supplied" },
      evidence: ["IFC:opening-1", "IFC:opening-2"],
    });
  });

  it("marks payment as evaluated only with explicit verified evidence", () => {
    const result = buildQuantityLedger({
      gross: { value: 50, unit: "m3" },
      deductions: [],
      wastePercent: 2,
      offerQuantity: { value: 50, unit: "m3" },
      payment: {
        quantity: { value: 42, unit: "m3" },
        verificationStatus: "verified",
        sourceReference: "HAKEDIS:2026-10",
      },
    });
    assert.equal(result.status, "ready");
    if (result.status === "ready") {
      assert.deepEqual(result.payment, {
        status: "evaluated",
        quantity: 42,
        reason: null,
        sourceReference: "HAKEDIS:2026-10",
      });
    }
  });

  it("requires explicit offer quantity instead of reusing net or cost quantity", () => {
    assert.deepEqual(buildQuantityLedger({
      gross: { value: 10, unit: "m" },
      deductions: [],
      wastePercent: 10,
    }), {
      status: "requires_input",
      unit: "m",
      missingInputs: ["offer_quantity"],
      reason: "offer quantity must be supplied explicitly",
    });
  });

  it("rejects unit mixing, excessive deductions, negative waste and unverified payment", () => {
    const mixed = buildQuantityLedger({
      gross: { value: 10, unit: "m2" },
      deductions: [{ value: 1, unit: "m3" }],
      wastePercent: 0,
      offerQuantity: { value: 10, unit: "m2" },
    });
    assert.equal(mixed.status, "requires_input");

    const excessive = buildQuantityLedger({
      gross: { value: 10, unit: "m2" },
      deductions: [{ value: 11, unit: "m2" }],
      wastePercent: 0,
      offerQuantity: { value: 10, unit: "m2" },
    });
    assert.equal(excessive.status, "requires_input");

    const negativeWaste = buildQuantityLedger({
      gross: { value: 10, unit: "m2" },
      deductions: [],
      wastePercent: -1,
      offerQuantity: { value: 10, unit: "m2" },
    });
    assert.equal(negativeWaste.status, "requires_input");

    const unverifiedPayment = buildQuantityLedger({
      gross: { value: 10, unit: "m2" },
      deductions: [],
      wastePercent: 0,
      offerQuantity: { value: 10, unit: "m2" },
      payment: {
        quantity: { value: 8, unit: "m2" },
        verificationStatus: "unverified",
        sourceReference: "manual",
      },
    });
    assert.equal(unverifiedPayment.status, "ready");
    if (unverifiedPayment.status === "ready") {
      assert.equal(unverifiedPayment.payment.status, "not_evaluated");
    }
  });
});
