import { describe, it } from "node:test";
import assert from "node:assert";
import { validateEpysRules, IfcElementData } from "./epys";

describe("e-PYS Validation Rules", () => {
  it("should fail if no compliance data is provided and warn if CSBPozNo is missing", () => {
    const result = validateEpysRules({
      complianceData: { source: null },
      pozExtraction: { pozNoByStepId: new Map() },
      totalElementsCount: 100
    });
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes("TREpys_ParselOzellikSeti")));
    assert.ok(result.warnings.some(w => w.includes("CSBPozNo")));
  });

  it("should catch material names longer than 15 characters and check m.13(3) Malzeme İsmi_Dayanım format", () => {
    const result = validateEpysRules({
      complianceData: { source: "ifc_site", taks: 0.4, kaks: 1.5, cekmeOn: 5, cekmeYan: 3, cekmeArka: 3 },
      pozExtraction: { pozNoByStepId: new Map() },
      totalElementsCount: 0,
      materialNames: ["KısaMalzeme", "BuMalzemeIsmiOnBesKarakterdenUzun_C30"]
    });
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes("15 karakter")));
    assert.ok(result.warnings.some(w => w.includes("Malzeme İsmi_Dayanım")));
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
    assert.equal(result.label, "Hızlı e-PYS ön kontrolü (sınırlı kapsam)");
    assert.equal(result.rulePackVersion, "epys-quick-2026-10-v2");
    assert.ok(result.sourceCitation.includes("33331"));
  });

  it("cites EK-6 Tablo 6.55 and requires all three setback distances from the final annex", () => {
    const result = validateEpysRules({
      complianceData: { source: "ifc_site", taks: 0.4, kaks: 1.5, cekmeOn: 5, cekmeYan: 3 },
      pozExtraction: { pozNoByStepId: new Map() },
      totalElementsCount: 0,
    });
    assert.ok(result.errors.some(e => e.includes("CekmeArka") && e.includes("Tablo 6.55")));
    assert.ok(result.errors.every(e => !e.includes("EK-7")));
  });

  it("declares its limited scope instead of implying full compliance", () => {
    const result = validateEpysRules({ complianceData: { source: null }, totalElementsCount: 0 });
    assert.ok(result.scope.checked.length > 0);
    assert.ok(result.scope.notChecked.some(item => /EK-9/.test(item)));
  });
});
