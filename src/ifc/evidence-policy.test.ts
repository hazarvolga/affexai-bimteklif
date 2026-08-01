import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeIfcQuantityEvidence, summarizeIfcEvidencePolicy } from "./evidence-policy";
import type { ParsedIfcElement } from "./types";

function element(overrides: Partial<ParsedIfcElement>): ParsedIfcElement {
  return {
    id: "1",
    guid: "GUID",
    type: "IfcSlab",
    name: "Element",
    storey: "Kat 1",
    storeySource: "estimate",
    volumeM3: 1,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "estimate",
    smartCheckStatus: "review",
    ...overrides,
  };
}

describe("IFC evidence policy display", () => {
  it("summarizes admitted and blocked quantity sources for UI cards", () => {
    const summary = summarizeIfcEvidencePolicy([
      element({ id: "qto", quantitySource: "qto" }),
      element({ id: "property", quantitySource: "property" }),
      element({ id: "estimate", quantitySource: "estimate", formworkM2: 4 }),
      element({ id: "geometry", quantitySource: "geometry" }),
      element({ id: "rebar", type: "IfcReinforcingBar", quantitySource: "qto", rebarKg: 50 }),
    ]);

    assert.equal(summary.acceptedQtoCount, 1);
    assert.equal(summary.acceptedPropertyCount, 1);
    assert.equal(summary.admissibleQuantityCount, 2);
    assert.equal(summary.blockedEstimateCount, 1);
    assert.equal(summary.blockedGeometryCount, 1);
    assert.equal(summary.blockedRebarCount, 1);
    assert.equal(summary.blockedFormworkEstimateCount, 1);
  });

  it("labels each quantity source with its SmartCheck admission status", () => {
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "qto" })).label, "QTO accepted");
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "property" })).label, "Property accepted");
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "geometry" })).label, "Geometry blocked");
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "estimate" })).label, "Estimate blocked");
    assert.equal(describeIfcQuantityEvidence(element({ type: "IfcReinforcingBar", quantitySource: "qto" })).label, "Rebar blocked");
  });
});
