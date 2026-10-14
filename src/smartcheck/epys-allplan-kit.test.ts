import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAllplanEpysKitV1 } from "./epys-allplan-kit";

describe("ALLPLAN 2026 e-PYS Kiti v1", () => {
  it("builds a complete RG 33331 EK-1..EK-10 kit with valid 15-char materials and SHA-256 seal", () => {
    const kit = buildAllplanEpysKitV1();

    assert.equal(kit.kitMeta.kitId, "allplan-2026-epys-kit-v1");
    assert.equal(kit.kitMeta.ifcSchema, "IFC4X3_ADD2");
    assert.match(kit.kitMeta.checksumSha256, /^[a-f0-9]{64}$/);

    // TREpys_* Psets
    const psetNames = kit.trepysPsetCatalog.map((p) => p.psetName);
    assert.ok(psetNames.includes("TREpys_ParselOzellikSeti"));
    assert.ok(psetNames.includes("TREpys_EmsalOzellikSeti"));
    assert.ok(psetNames.includes("TREpys_PozOzellikSeti"));

    // EK-2 & EK-3 dictionaries
    assert.equal(kit.ek2FileNamingTemplate.disiplinler.MM, "Mimari");
    assert.equal(kit.ek2FileNamingTemplate.altDisiplinler.DUVA, "Duvar");
    assert.ok(kit.ek3SpaceCatalog.mahalCount >= 120);
    assert.equal(kit.ek3SpaceCatalog.mahaller.YTO, "Yatak Odası");

    // EK-5 15-char materials constraint
    assert.ok(kit.ek5ElementNamingAndMaterials.approved15CharMaterials.length >= 15);
    for (const mat of kit.ek5ElementNamingAndMaterials.approved15CharMaterials) {
      assert.equal(mat.code.length, mat.charCount);
      assert.ok(mat.code.length <= 15, `${mat.code} exceeds 15 chars`);
      assert.ok(mat.code.includes("_"), `${mat.code} must follow Malzeme_Dayanim format`);
    }

    // EK-7 TUREF CRS
    assert.deepEqual(kit.ek7GeoreferenceTemplate.crsOptions, [
      "EPSG:5253",
      "EPSG:5254",
      "EPSG:5255",
      "EPSG:5256",
      "EPSG:5257",
      "EPSG:5258",
      "EPSG:5259",
    ]);
    assert.equal(kit.ek7GeoreferenceTemplate.geometricContext.CoordinateSpaceDimension, 3);
  });
});
