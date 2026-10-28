import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeIfcQuantityEvidence, isIfcConcreteQuantityAdmissible, summarizeIfcEvidencePolicy } from "./evidence-policy";
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
  it("does not call QTO or property accepted without an attributable source path", () => {
    for (const source of ["qto", "property"] as const) {
      for (const path of [undefined, "", "  "]) {
        const missing = element({ quantitySource: source, quantitySourcePath: path });
        assert.equal(isIfcConcreteQuantityAdmissible(missing), false);
        assert.equal(describeIfcQuantityEvidence(missing).admittedToSmartCheck, false);
        assert.match(describeIfcQuantityEvidence(missing).label, /Kaynak.*Eksik/);
        assert.equal(summarizeIfcEvidencePolicy([missing]).admissibleQuantityCount, 0);
      }
    }
  });
  it("does not display legacy geometry paths as accepted properties", () => {
    const legacy = element({ quantitySource: "property", quantitySourcePath: "#1/#2:IfcShapeRepresentation/GeometryVolume" });
    assert.equal(describeIfcQuantityEvidence(legacy).admittedToSmartCheck, false);
    assert.equal(summarizeIfcEvidencePolicy([legacy]).blockedGeometryCount, 1);
  });
  it("summarizes admitted and blocked quantity sources for UI cards", () => {
    const summary = summarizeIfcEvidencePolicy([
      element({ id: "qto", quantitySource: "qto", quantitySourcePath: "#1/Qto/NetVolume" }),
      element({ id: "property", quantitySource: "property", quantitySourcePath: "#2/Attributes/Hacim" }),
      element({ id: "estimate", quantitySource: "estimate", formworkM2: 4 }),
      element({ id: "geometry", quantitySource: "geometry" }),
      element({ id: "rebar", type: "IfcReinforcingBar", quantitySource: "qto", rebarKg: 50, quantitySourcePath: "#1/Qto_ReinforcingElementBaseQuantities/Weight" }),
      element({ id: "zero-rebar", type: "IfcReinforcingBar", quantitySource: "qto", rebarKg: 0, quantitySourcePath: "#2/Qto_ReinforcingElementBaseQuantities/Weight" }),
    ]);

    assert.equal(summary.acceptedQtoCount, 2);
    assert.equal(summary.acceptedPropertyCount, 1);
    assert.equal(summary.admissibleQuantityCount, 3);
    assert.equal(summary.blockedEstimateCount, 1);
    assert.equal(summary.blockedGeometryCount, 1);
    assert.equal(summary.blockedRebarCount, 1);
    assert.equal(summary.blockedFormworkEstimateCount, 1);
  });

  it("labels each quantity source with its SmartCheck admission status", () => {
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "qto", quantitySourcePath: "#1/Qto/NetVolume" })).label, "Kabul Edilen Metraj (QTO)");
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "property", quantitySourcePath: "#2/Attributes/Hacim" })).label, "Kabul Edilen Nitelik");
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "geometry" })).label, "Geometri Uyumsuz");
    assert.equal(describeIfcQuantityEvidence(element({ quantitySource: "estimate" })).label, "Tahmin Askıda");
    assert.equal(describeIfcQuantityEvidence(element({ type: "IfcReinforcingBar", quantitySource: "qto", rebarKg: 50, quantitySourcePath: "#1/Qto_ReinforcingElementBaseQuantities/Weight" })).label, "Kabul Edilen Donatı Kütlesi");
    assert.equal(describeIfcQuantityEvidence(element({ type: "IfcReinforcingBar", quantitySource: "qto", rebarKg: 0, quantitySourcePath: "#2/Qto_ReinforcingElementBaseQuantities/Weight" })).label, "Donatı Askıda");
  });
});
