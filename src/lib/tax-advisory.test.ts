import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTaxAdvisory } from "./tax-advisory";

describe("tax advisory", () => {
  it("models VAT and withholding as separate calculations", () => {
    assert.deepEqual(calculateTaxAdvisory(1000, 20, 50), { taxableAmount: 1000, vatPercent: 20, vatAmount: 200, withholdingPercent: 50, withholdingAmount: 100, payableTotal: 1100, authority: "advisory", regulationVersion: null });
  });
});
