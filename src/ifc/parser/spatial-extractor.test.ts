import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseIfcText } from "./legacy-parser";
import { extractIfcStoreyContainment } from "./spatial-extractor";

const manifest = JSON.parse(readFileSync(resolve("src/ifc/fixtures/e-proje_4x3.manifest.json"), "utf8")) as {
  relativePath: string;
  expectedIfcEntityCounts: {
    IfcBuildingStorey: number;
  };
};
const samplePath = resolve(manifest.relativePath);

describe("IFC spatial containment extraction", () => {
  it("maps contained elements to their IfcBuildingStorey", () => {
    const result = extractIfcStoreyContainment([
      "#94=IFCBUILDINGSTOREY('1Kr_GNHGP4YuGM2mWADG7e',#5,'B01',$,$,#97,$,$,.ELEMENT.,-1.9);",
      "#95=IFCRELCONTAINEDINSPATIALSTRUCTURE('3cmzo87jn4Of1vd5qzEqZQ',#5,$,$,(#2250,#2296),#94);",
    ].join("\n"));

    assert.equal(result.summary.storeyCount, 1);
    assert.equal(result.summary.assignedElementCount, 2);
    assert.equal(result.elementStoreys[0].elementStepId, "2250");
    assert.equal(result.elementStoreys[0].storeyName, "B01 (-1.9 m)");
    assert.equal(result.elementStoreys[0].sourcePath, "#95/#94:IfcRelContainedInSpatialStructure/IfcBuildingStorey");
  });

  it("uses IFC spatial containment instead of modulo storey estimates", () => {
    const parsed = parseIfcText([
      "#94=IFCBUILDINGSTOREY('1Kr_GNHGP4YuGM2mWADG7e',#5,'B01',$,$,#97,$,$,.ELEMENT.,-1.9);",
      "#95=IFCRELCONTAINEDINSPATIALSTRUCTURE('3cmzo87jn4Of1vd5qzEqZQ',#5,$,$,(#2250),#94);",
      "#2250=IFCSLAB('3uKl6XxnD728DtNh4imxAX',#5,'Beton C25/30',$,$,#2235,#2236,$,.NOTDEFINED.);",
    ].join("\n"));

    assert.equal(parsed.elements[0].storey, "B01 (-1.9 m)");
    assert.equal(parsed.elements[0].storeySource, "ifc_spatial");
  });

  it("matches the local e-proje_4x3 storey manifest when the sample IFC is present", { skip: !existsSync(samplePath) }, () => {
    const sample = readFileSync(samplePath, "utf8");
    const spatial = extractIfcStoreyContainment(sample);
    const parsed = parseIfcText(sample);
    const slab2250 = parsed.elements.find((element) => element.id === "2250");

    assert.equal(spatial.summary.storeyCount, manifest.expectedIfcEntityCounts.IfcBuildingStorey);
    assert.equal(slab2250?.storeySource, "ifc_spatial");
    assert.equal(slab2250?.storey, "2025-00-MM-BETO-CP-MMP-B01-01-00 (-1.9 m)");
  });
});
