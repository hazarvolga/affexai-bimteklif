import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeKikKFactor, evaluateKikAbnormallyLowBid } from "./kik-adt";

const VERIFIED_ADMIN_SOURCE = { status: "verified" as const, issuer: "Test İdaresi", documentId: "YM-TEST", sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };

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
    // K = (3.2 * 0.8 - 0.64 - 0.6) / 1.8 = 1.32 / 1.8 = 0.7333... -> Tebliğ m.45.1.1 uyarınca 3 ondalık: 0.733
    // SD = (K * T_ort2) / (C * 1.00) = 73,333,333.33 TL
    assert.equal(res.correctedMeanTry, 80_000_000);
    assert.equal(res.cRatio, 0.8);
    assert.equal(res.kFactor, 0.733);
    assert.equal(res.nCoefficient, 1.0);
    assert.equal(res.boundaryValueTry, 73_300_000);
    assert.equal(res.isAbnormallyLow, true);
  });

  it("applies N = 1.20 for infrastructure/other works (alt_yapi) and piecewise K for C < 0.60 and C > 1.00 per Tebliğ m.45.1.1.1", () => {
    // C = 0.50 (< 0.60) -> K = C = 0.50
    assert.equal(computeKikKFactor(0.5), 0.5);
    // C = 1.10 (> 1.00) -> K = (1.21 - 0.88 + 1.4) / 2.1 = 1.73 / 2.1 = 0.82381 -> 3 ondalık: 0.824
    assert.equal(computeKikKFactor(1.1), 0.824);

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
    // SD = (0.824 * 110,000,000) / (1.100 * 1.20) = 68,666,666.67 TL
    assert.equal(res.boundaryValueTry, 68_666_666.67);
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
    assert.equal(res.explanationRequiredItems.length, 0);
    assert.equal(res.exemptMinorItems.length, 0);
    assert.equal(res.advisoryOfferExplanationRequiredItems.length, 2);
    assert.equal(res.advisoryOfferExplanationRequiredItems[0].code, "15.150.1005");
    assert.equal(res.advisoryOfferExplanationRequiredItems[1].code, "15.160.1003");
    assert.equal(res.officialExplanationListStatus, "not_evaluated");
  });

  it("does not publish an official 80% list without administration estimated-cost items and source identity", () => {
    const missing = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100,
      validBidsTry: [80],
      ourBidTry: 70,
      lineItems: [{ id: "offer", description: "Teklif kalemi", totalAmount: 100 }],
    });
    assert.equal(missing.officialExplanationListStatus, "not_evaluated");
    assert.deepEqual(missing.explanationRequiredItems, []);
    assert.equal(missing.advisoryOfferExplanationRequiredItems.length, 1);

    const noSource = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100,
      validBidsTry: [80],
      ourBidTry: 70,
      administrationEstimatedCostItems: [{ id: "admin", description: "İdare kalemi", totalAmount: 100 }],
    });
    assert.equal(noSource.officialExplanationListStatus, "not_evaluated");
    assert.match(noSource.officialExplanationListReason ?? "", /kaynak kimliği/i);

    const userAsserted = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100, validBidsTry: [80], ourBidTry: 70,
      administrationEstimatedCostSourceIdentity: "YM-USER",
      administrationEstimatedCostSourceVerification: { ...VERIFIED_ADMIN_SOURCE, status: "user_asserted" },
      administrationEstimatedCostItems: [{ id: "admin", description: "İdare kalemi", totalAmount: 100 }],
    });
    assert.equal(userAsserted.officialExplanationListStatus, "not_evaluated");
    assert.match(userAsserted.officialExplanationListReason ?? "", /kullanıcı beyanı|doğrulanmış/i);
  });

  it("fails closed when administration items do not reconcile to YM, including one-kurus boundary", () => {
    const base = {
      estimatedCostTry: 100,
      validBidsTry: [80],
      ourBidTry: 70,
      administrationEstimatedCostSourceIdentity: "YM-CETVEL-1",
      administrationEstimatedCostSourceVerification: VERIFIED_ADMIN_SOURCE,
    };
    const exact = evaluateKikAbnormallyLowBid({
      ...base,
      administrationEstimatedCostItems: [
        { id: "a", description: "A", totalAmount: 80 },
        { id: "b", description: "B", totalAmount: 20 },
      ],
    });
    assert.equal(exact.officialExplanationListStatus, "evaluated");

    const mismatch = evaluateKikAbnormallyLowBid({
      ...base,
      administrationEstimatedCostItems: [
        { id: "a", description: "A", totalAmount: 80 },
        { id: "b", description: "B", totalAmount: 19.99 },
      ],
    });
    assert.equal(mismatch.officialExplanationListStatus, "not_evaluated");
    assert.match(mismatch.officialExplanationListReason ?? "", /100,00 TL/);
  });

  it("builds official 80% list deterministically from administration data; our bid never changes it", () => {
    const adminItems = [
      { id: "z", code: "B", description: "Eşit B", totalAmount: 40 },
      { id: "a", code: "A", description: "Eşit A", totalAmount: 40 },
      { id: "c", code: "C", description: "Sınırı geçen", totalAmount: 20 },
    ];
    const evaluate = (ourBidTry: number) => evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100,
      validBidsTry: [70, 80, 90],
      ourBidTry,
      administrationEstimatedCostSourceIdentity: "YM-CETVEL-2",
      administrationEstimatedCostSourceVerification: VERIFIED_ADMIN_SOURCE,
      administrationEstimatedCostItems: adminItems,
    });
    const low = evaluate(50);
    const high = evaluate(95);
    assert.deepEqual(low.explanationRequiredItems.map(item => item.code), ["A", "B"]);
    assert.deepEqual(high.explanationRequiredItems, low.explanationRequiredItems);
    assert.equal(low.explanationRequiredItems.at(-1)?.cumulativeRatio, 0.8);
  });

  it("evaluates the administration 80% list independently from tender bids", () => {
    const result = evaluateKikAbnormallyLowBid({
      estimatedCostTry: 100,
      validBidsTry: [],
      ourBidTry: 0,
      administrationEstimatedCostSourceIdentity: "YM-CETVEL-3",
      administrationEstimatedCostSourceVerification: VERIFIED_ADMIN_SOURCE,
      administrationEstimatedCostItems: [
        { id: "a", description: "A", totalAmount: 80 },
        { id: "b", description: "B", totalAmount: 20 },
      ],
    });
    assert.equal(result.hasTenderSessionInputs, false);
    assert.equal(result.boundaryValueTry, 0);
    assert.equal(result.officialExplanationListStatus, "evaluated");
    assert.deepEqual(result.explanationRequiredItems.map(item => item.id), ["a"]);
  });
});


describe("N katsayısı aralığı", () => {
  it("0,90–1,00 altı N için üstyapı, ön proje ve ilan/ihale beyanı gerektirir", () => {
    const base = { estimatedCostTry: 100_000, validBidsTry: [50_000, 60_000, 70_000], ourBidTry: 55_000, workCategory: "ust_yapi" as const, nCoefficientOverride: 0.9 };
    const exception = { preliminaryProject: true, issuingAuthority: "Bakanlık", officialGazetteReference: "RG 12345", tenderReference: "İhale 2026/1" };
    assert.throws(() => evaluateKikAbnormallyLowBid(base), /ön proje|dayanak/i);
    assert.throws(() => evaluateKikAbnormallyLowBid({ ...base, workCategory: "alt_yapi", nCoefficientException: exception }), /üstyapı/i);
    assert.throws(() => evaluateKikAbnormallyLowBid({ ...base, workCategory: undefined, nCoefficientException: exception }), /üstyapı/i);
    assert.throws(() => evaluateKikAbnormallyLowBid({ ...base, nCoefficientException: { ...exception, preliminaryProject: false } }), /ön proje/i);
    assert.throws(() => evaluateKikAbnormallyLowBid({ ...base, nCoefficientException: { ...exception, officialGazetteReference: " " } }), /ilan/i);
    assert.equal(evaluateKikAbnormallyLowBid({ ...base, nCoefficientException: exception }).nCoefficient, 0.9);
    assert.equal(evaluateKikAbnormallyLowBid({ ...base, nCoefficientOverride: 0.99, nCoefficientException: exception }).nCoefficient, 0.99);
    assert.throws(() => evaluateKikAbnormallyLowBid({ ...base, nCoefficientOverride: 0.89, nCoefficientException: exception }), /0,90/);
  });
  it("idare 1,00–1,20 arasında belirleyebilir; aralık dışı değer reddedilir", async () => {
  const { evaluateKikAbnormallyLowBid } = await import("./kik-adt");
  const base = { estimatedCostTry: 100_000_000, validBidsTry: [70_000_000, 80_000_000, 90_000_000], ourBidTry: 60_000_000 };
  const n100 = evaluateKikAbnormallyLowBid({ ...base, workCategory: "ust_yapi" });
  const n110 = evaluateKikAbnormallyLowBid({ ...base, workCategory: "ust_yapi", nCoefficientOverride: 1.1 });
  assert.equal(n110.nCoefficient, 1.1);
  assert.ok(n110.boundaryValueTry <= n100.boundaryValueTry, "N büyüdükçe sınır değer düşer (paydada)");
  for (const bad of [0.5, 1.3, 5, Number.NaN]) {
    assert.throws(() => evaluateKikAbnormallyLowBid({ ...base, nCoefficientOverride: bad }), /1,00 ile 1,20/);
  }
  });
});
