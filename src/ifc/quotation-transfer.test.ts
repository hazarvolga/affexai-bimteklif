import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyIfcTransferredUnitPrices, buildIfcEstimateQuoteItems } from "./quotation-transfer";

describe("IFC quote transfer safety gate", () => {
  it("imports legacy IFC structural volumes as model estimates that require review", () => {
    const result = buildIfcEstimateQuoteItems({
      beamCount: 2,
      beamVolumeM3: 10,
      columnCount: 1,
      columnVolumeM3: 3,
      totalRebarTon: 4.2,
      totalFormworkM2: 50,
    }, {
      idFactory: (() => {
        let next = 0;
        return () => `id-${++next}`;
      })(),
    });

    assert.equal(result.items.length, 2);
    assert.deepEqual(result.items.map((item) => item.quantitySource), ["model_estimate", "model_estimate"]);
    assert.deepEqual(result.items.map((item) => item.verificationStatus), ["needs_review", "needs_review"]);
    assert.deepEqual(result.items.map((item) => item.priceSource), ["manual", "manual"]);
    assert.match(result.items[0].sourceReference ?? "", /demo_estimate/);
    assert.match(result.items[0].description ?? "", /review gerekli/);
  });

  it("never invents unit prices or costs for model estimates", () => {
    const result = buildIfcEstimateQuoteItems({ beamVolumeM3: 10, columnVolumeM3: 3, slabVolumeM3: 4, wallVolumeM3: 5 }, { idFactory: () => "id" });

    assert.deepEqual(result.items.map((item) => item.unitPrice), [0, 0, 0, 0]);
    assert.deepEqual(result.items.map((item) => item.total), [0, 0, 0, 0]);
    assert.ok(result.items.every((item) => item.costUnitPrice === undefined));
    assert.match(result.warnings.join(" "), /birim fiyat/i);
  });

  it("does not transfer derived rebar or formwork without explicit evidence", () => {
    const result = buildIfcEstimateQuoteItems({
      totalRebarTon: 3.1,
      totalFormworkM2: 120,
    }, {
      idFactory: () => "unused",
    });

    assert.equal(result.items.length, 0);
    assert.deepEqual(result.skipped.map((item) => item.code), [
      "REBAR_REQUIRES_MODEL_EVIDENCE",
      "FORMWORK_REQUIRES_MODEL_EVIDENCE",
    ]);
    assert.match(result.warnings[0], /demo_estimate/);
  });

  it("handles empty or corrupt transfer summaries without crashing quote creation", () => {
    assert.deepEqual(buildIfcEstimateQuoteItems(null, { idFactory: () => "unused" }).items, []);
    assert.deepEqual(buildIfcEstimateQuoteItems(undefined, { idFactory: () => "unused" }).items, []);
    assert.deepEqual(buildIfcEstimateQuoteItems({ beamVolumeM3: Number.NaN }, { idFactory: () => "unused" }).items, []);
  });

  it("converts the 4x3 sample summary into four review-required concrete items", () => {
    const result = buildIfcEstimateQuoteItems({
      beamCount: 293,
      beamVolumeM3: 362.65,
      columnCount: 177,
      columnVolumeM3: 146.76,
      slabCount: 173,
      slabVolumeM3: 404.67,
      wallCount: 537,
      wallVolumeM3: 1847.4,
      totalRebarTon: 244.76,
      totalFormworkM2: 14722.27,
    }, {
      idFactory: (() => {
        let next = 0;
        return () => `sample-${++next}`;
      })(),
    });

    assert.equal(result.items.length, 4);
    assert.deepEqual(result.items.map((item) => item.unit), ["m3", "m3", "m3", "m3"]);
    assert.deepEqual(result.items.map((item) => item.verificationStatus), ["needs_review", "needs_review", "needs_review", "needs_review"]);
    assert.deepEqual(result.items.map((item) => item.quantity), [362.65, 146.76, 404.67, 1847.4]);
    assert.deepEqual(result.skipped.map((item) => item.code), [
      "REBAR_REQUIRES_MODEL_EVIDENCE",
      "FORMWORK_REQUIRES_MODEL_EVIDENCE",
    ]);
  });

  it("transfers rebar and formwork as needs_review estimates when includeDerivedEstimates is enabled", () => {
    const result = buildIfcEstimateQuoteItems({
      beamCount: 2,
      beamVolumeM3: 10,
      totalRebarTon: 1.1,
      totalFormworkM2: 65,
    }, {
      includeDerivedEstimates: true,
      idFactory: (() => {
        let next = 0;
        return () => `derived-${++next}`;
      })(),
    });

    assert.equal(result.items.length, 3);
    assert.deepEqual(result.items.map((item) => item.unit), ["m3", "ton", "m2"]);
    assert.deepEqual(result.items.map((item) => item.verificationStatus), ["needs_review", "needs_review", "needs_review"]);
    assert.deepEqual(result.items.map((item) => item.unitPrice), [0, 0, 0]);
    assert.equal(result.skipped.length, 0);
  });

  it("applies both Turkish (beton/donati/kalip) and English unit price keys without assigning formwork price to IfcCovering", () => {
    const result = buildIfcEstimateQuoteItems({
      beamCount: 2,
      beamVolumeM3: 10,
      coveringCount: 4,
      coveringAreaM2: 80,
      totalRebarTon: 2,
      totalFormworkM2: 50,
    }, {
      includeDerivedEstimates: true,
      idFactory: (() => {
        let next = 0;
        return () => `priced-${++next}`;
      })(),
    });

    const priced = applyIfcTransferredUnitPrices(result.items, {
      beton: 2450,
      donati: 24500,
      kalip: 1250,
    });

    assert.deepEqual(priced.map((item) => item.unitPrice), [2450, 0, 24500, 1250]);
    assert.deepEqual(priced.map((item) => item.total), [24500, 0, 49000, 62500]);
  });
});

