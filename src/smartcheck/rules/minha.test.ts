import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluatePlasterPaintMinha,
  evaluateStructuralIntersectionTakeoff,
} from "./minha";

describe("Contractual Opening Deduction (Minha) & Structural Intersection Engine", () => {
  it("applies CSB_2026 0.50 m2 threshold and adds reveal surfaces on deducted openings", () => {
    const result = evaluatePlasterPaintMinha({
      grossAreaM2: 30,
      standard: "CSB_2026",
      wallThicknessM: 0.2,
      openings: [
        // 0.40 x 1.00 = 0.40 m2 (<= 0.50 m2 -> not deducted)
        { id: "W-SMALL", widthM: 0.4, heightM: 1.0, count: 1 },
        // 1.50 x 1.50 = 2.25 m2 (> 0.50 m2 -> deducted, 3-sided reveal = (1.5 + 3.0) * 0.2 = 0.90 m2)
        { id: "W-MAIN", widthM: 1.5, heightM: 1.5, count: 1, fourSidedReveal: false },
      ],
    });

    assert.equal(result.thresholdM2, 0.5);
    assert.equal(result.nonDeductedOpeningAreaM2, 0.4);
    assert.equal(result.deductedOpeningAreaM2, 2.25);
    assert.equal(result.addedRevealAreaM2, 0.9);
    // 30 - 2.25 + 0.90 = 28.65 m2 (matches eng_calc.py siva_boya_alani)
    assert.equal(result.netPayableAreaM2, 28.65);
  });

  it("applies DIN_18350 2.50 m2 threshold without deducting medium windows", () => {
    const result = evaluatePlasterPaintMinha({
      grossAreaM2: 30,
      standard: "DIN_18350",
      openings: [
        // 1.50 x 1.50 = 2.25 m2 (<= 2.50 m2 under DIN 18350 -> not deducted!)
        { id: "W-MAIN", widthM: 1.5, heightM: 1.5, count: 1 },
        // 2.00 x 1.50 = 3.00 m2 (> 2.50 m2 -> deducted)
        { id: "W-LARGE", widthM: 2.0, heightM: 1.5, count: 1 },
      ],
    });

    assert.equal(result.thresholdM2, 2.5);
    assert.equal(result.nonDeductedOpeningAreaM2, 2.25);
    assert.equal(result.deductedOpeningAreaM2, 3.0);
    assert.equal(result.addedRevealAreaM2, 0);
    assert.equal(result.netPayableAreaM2, 27.0);
  });

  it("calculates structural concrete, formwork, and rebar with node intersection deductions", () => {
    const column = evaluateStructuralIntersectionTakeoff({
      elementType: "column",
      widthM: 0.4,
      depthM: 0.6,
      lengthOrHeightM: 3.2,
      count: 10,
      intersectionDeductionVolumeM3: 0.48,
      intersectionDeductionFormworkM2: 2.4,
    });

    // Gross concrete = 0.4 * 0.6 * 3.2 * 10 = 7.68 m3
    assert.equal(column.grossConcreteM3, 7.68);
    assert.equal(column.netConcreteM3, 7.2);
    // Gross formwork = 2 * (0.4 + 0.6) * 3.2 * 10 = 64.0 m2
    assert.equal(column.grossFormworkM2, 64);
    assert.equal(column.netFormworkM2, 61.6);
    // Rebar = 7.2 m3 * 150 kg/m3 / 1000 = 1.08 ton
    assert.equal(column.estimatedRebarTon, 1.08);
  });
});
