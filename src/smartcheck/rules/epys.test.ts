import { describe, it } from "node:test";
import assert from "node:assert";
import { validateEpysRules, IfcElementData } from "./epys";

describe("e-PYS Validation Rules", () => {
  it("should fail if no compliance data is provided", () => {
    const result = validateEpysRules({
      complianceData: { source: null },
      pozExtraction: { pozNoByStepId: new Map() },
      totalElementsCount: 100
    });
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes("TREpys_ParselOzellikSeti")));
    assert.ok(result.errors.some(e => e.includes("CSBPozNo")));
  });

  it("should catch material names longer than 15 characters (Madde 12)", () => {
    const result = validateEpysRules({
      complianceData: { source: "ifc_site", taks: 0.4, kaks: 1.5 },
      pozExtraction: { pozNoByStepId: new Map() },
      totalElementsCount: 0,
      materialNames: ["KısaMalzeme", "BuMalzemeIsmiOnBesKarakterdenUzun_C30"]
    });
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes("15 karakter")));
  });

  it("should catch Ek-6 dictionary violations", () => {
    const mockElements: IfcElementData[] = [
      {
        id: "1",
        type: "IfcWall",
        properties: {
          "Pset_WallCommon.IsExternal": true
        }
      }
    ];

    const result = validateEpysRules({
      complianceData: { source: "ifc_site", taks: 0.4, kaks: 1.5 },
      pozExtraction: { pozNoByStepId: new Map() },
      totalElementsCount: 0,
      elementsData: mockElements
    });
    assert.ok(result.errors.some(e => e.includes("EK-6 İhlali")));
  });
});
