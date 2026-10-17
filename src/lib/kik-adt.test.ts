import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateKikAbnormallyLowBid } from "./kik-adt";

describe("4734 KİK m.38 & Genel Tebliğ m.45 Aşırı Düşük Teklif (ADT) Motoru", () => {
  it("excludes bids above YM, filters 1-sigma outliers, computes Boundary Value (SD), and flags abnormally low bids", () => {
    const res = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100_000_000,
      validBidsTry: [
        78_000_000,
        80_000_000,
        82_000_000,
        84_000_000,
        105_000_000, // > YM -> excluded
      ],
      ourBidTry: 78_000_000,
      workCategory: "ust_yapi", // N = 1.00
    });

    assert.equal(res.admittedBidsTry.length, 4);
    assert.equal(res.excludedAboveYmBidsTry.length, 1);
    assert.equal(res.firstMeanTry, 81_000_000);
    // In-band bids around 81M -> correctedMeanTry = 81M, C = 0.81, R = 0.81, SD = 81,000,000
    assert.equal(res.correctedMeanTry, 81_000_000);
    assert.equal(res.cRatio, 0.81);
    assert.equal(res.boundaryValueTry, 81_000_000);
    assert.equal(res.isAbnormallyLow, true);
    assert.equal(res.marginToBoundaryPercent, -3.7);
  });

  it("partitions quotation line items into 80% Pareto explanation-required items per Tebliğ m.45.1.2", () => {
    const res = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 10_000_000,
      validBidsTry: [8_000_000, 8_200_000, 8_400_000],
      ourBidTry: 8_000_000,
      lineItems: [
        { id: "1", code: "15.150.1005", description: "C30/37 Beton", totalAmount: 4_500_000 }, // 56.25%
        { id: "2", code: "15.160.1003", description: "B420C Donatı", totalAmount: 2_500_000 }, // +31.25% = 87.50% (crosses 80%)
        { id: "3", code: "15.390.1002", description: "İç Cephe Sıva", totalAmount: 600_000 }, // exempt
        { id: "4", code: "15.410.1001", description: "Plastik Boya", totalAmount: 400_000 }, // exempt
      ],
    });

    assert.equal(res.explanationRequiredItems.length, 2);
    assert.equal(res.exemptMinorItems.length, 2);
    assert.equal(res.explanationRequiredItems[0].code, "15.150.1005");
    assert.equal(res.explanationRequiredItems[1].code, "15.160.1003");
  });
});
