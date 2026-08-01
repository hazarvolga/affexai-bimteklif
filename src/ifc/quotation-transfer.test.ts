import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIfcEstimateQuoteItems } from "./quotation-transfer";

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
});
