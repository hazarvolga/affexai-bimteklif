import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeKikKFactor, evaluateKikAbnormallyLowBid } from "./kik-adt";

describe("4734 KİK m.38 & Genel Tebliğ m.45.1.1 Aşırı Düşük Teklif (ADT) Motoru", () => {
  it("filters bids outside [0.40 * YM, 1.20 * YM], keeps bids in (1.00 * YM, 1.20 * YM], and computes K and SD per Tebliğ m.45.1.1", () => {
    // YM = 100,000,000 TL
    // Valid bids in [40M, 120M]: 76M, 78M, 80M, 82M, 84M (mean = 80M, C = 0.80)
    // Excluded: 35M (< 40% YM) and 125M (> 120% YM)
    const res = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100_000_000,
      validBidsTry: [
        35_000_000, // < 40% YM -> excluded
        76_000_000,
        78_000_000,
        80_000_000,
        82_000_000,
        84_000_000,
        125_000_000, // > 120% YM -> excluded
      ],
      ourBidTry: 72_000_000,
      workCategory: "ust_yapi", // N = 1.00
    });

    assert.equal(res.hasTenderSessionInputs, true);
    assert.equal(res.admittedBidsTry.length, 5);
    assert.deepEqual(res.excludedBelow40PercentYmBidsTry, [35_000_000]);
    assert.deepEqual(res.excludedAbove120PercentYmBidsTry, [125_000_000]);
    assert.equal(res.firstMeanTry, 80_000_000);
    // In-band bids: [78M, 80M, 82M] -> T_ort2 = 80,000,000 -> C = 0.80
    // K = (3.2 * 0.8 - 0.64 - 0.6) / 1.8 = 1.32 / 1.8 = 0.733333
    // SD = (K * T_ort2) / (C * 1.00) = 73,333,300 TL
    assert.equal(res.correctedMeanTry, 80_000_000);
    assert.equal(res.cRatio, 0.8);
    assert.equal(res.kFactor, 0.733333);
    assert.equal(res.nCoefficient, 1.0);
    assert.equal(res.boundaryValueTry, 73_333_300);
    assert.equal(res.isAbnormallyLow, true);
  });

  it("applies N = 1.20 for infrastructure/other works (alt_yapi) and piecewise K for C < 0.60 and C > 1.00 per Tebliğ m.45.1.1.1", () => {
    // C = 0.50 (< 0.60) -> K = C = 0.50
    assert.equal(computeKikKFactor(0.5), 0.5);
    // C = 1.10 (> 1.00) -> K = (1.21 - 0.88 + 1.4) / 2.1 = 1.73 / 2.1 = 0.82381
    assert.equal(computeKikKFactor(1.1), 0.82381);

    // Single valid bid at 110M (between 100% and 120% YM -> admitted!) with alt_yapi (N = 1.20)
    const res = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100_000_000,
      validBidsTry: [110_000_000],
      ourBidTry: 70_000_000,
      workCategory: "alt_yapi", // N = 1.20
    });

    assert.equal(res.nCoefficient, 1.2);
    assert.equal(res.correctedMeanTry, 110_000_000);
    assert.equal(res.cRatio, 1.1);
    // SD = (0.82381 * 110,000,000) / (1.1 * 1.20) = 68,650,833.33 TL
    assert.equal(res.boundaryValueTry, 68_650_833.33);
    assert.equal(res.isAbnormallyLow, false);
  });

  it("enforces the 40% YM boundary floor per Tebliğ m.45.1.1.4 when all bids are outside [40%, 120%] or when raw SD < 40% YM", () => {
    const noAdmitted = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 50_000_000,
      validBidsTry: [15_000_000, 65_000_000],
      ourBidTry: 19_000_000,
      workCategory: "ust_yapi",
    });
    assert.equal(noAdmitted.boundaryValueTry, 20_000_000);
    assert.equal(noAdmitted.isAbnormallyLow, true);

    // Single valid bid at 42% YM with N = 1.20 -> raw SD = 42% / 1.20 = 35% YM -> floored at 40% YM
    const floored = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100_000_000,
      validBidsTry: [42_000_000],
      ourBidTry: 39_000_000,
      workCategory: "alt_yapi",
    });
    assert.equal(floored.boundaryValueTry, 40_000_000);
    assert.equal(floored.isAbnormallyLow, true);
  });

  it("does not fabricate boundary values when YM or bids are omitted, while still partitioning 80% Pareto line items per Tebliğ m.45.1.2", () => {
    const res = evaluateKikAbnormallyLowBid({
      estimatedCostTry: null,
      validBidsTry: [],
      ourBidTry: 8_000_000,
      lineItems: [
        { id: "1", code: "15.150.1005", description: "C30/37 Beton", totalAmount: 4_500_000 }, // 56.25%
        { id: "2", code: "15.160.1003", description: "B420C Donatı", totalAmount: 2_500_000 }, // +31.25% = 87.50% (crosses 80%)
        { id: "3", code: "15.390.1002", description: "İç Cephe Sıva", totalAmount: 600_000 }, // exempt
        { id: "4", code: "15.410.1001", description: "Plastik Boya", totalAmount: 400_000 }, // exempt
      ],
    });

    assert.equal(res.hasTenderSessionInputs, false);
    assert.equal(res.boundaryValueTry, 0);
    assert.equal(res.explanationRequiredItems.length, 2);
    assert.equal(res.exemptMinorItems.length, 2);
    assert.equal(res.explanationRequiredItems[0].code, "15.150.1005");
    assert.equal(res.explanationRequiredItems[1].code, "15.160.1003");
  });
});

