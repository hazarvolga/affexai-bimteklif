import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseIfcText } from "./legacy-parser";
import { extractIfcQtoVolumeQuantities } from "./qto-extractor";

const manifest = JSON.parse(readFileSync(resolve("src/ifc/fixtures/e-proje_4x3.manifest.json"), "utf8")) as {
  relativePath: string;
  expectedIfcEntityCounts: {
    IfcElementQuantity: number;
    IfcQuantityVolume: number;
  };
};
const samplePath = resolve(manifest.relativePath);

describe("IFC QTO volume extraction", () => {
  it("extracts IfcQuantityVolume through IfcElementQuantity relations", () => {
    const ifcText = [
      "#10=IFCSLAB('3uKl6XxnD728DtNh4imxAX',#5,'Beton C25/30',$,$,#1,#2,$,.NOTDEFINED.);",
      "#11=IFCQUANTITYVOLUME('NetVolume',$,$,12.5,$);",
      "#12=IFCELEMENTQUANTITY('0QTO4StCj7L8hBtpAcrRP4',#5,'Qto_SlabBaseQuantities',$,$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
    ].join("\n");

    const result = extractIfcQtoVolumeQuantities(ifcText);

    assert.equal(result.summary.elementQuantitySetCount, 1);
    assert.equal(result.summary.recognizedVolumeQuantityCount, 1);
    assert.equal(result.quantities[0].stepId, "10");
    assert.equal(result.quantities[0].entityType, "IfcSlab");
    assert.equal(result.quantities[0].normalizedValue, 12.5);
    assert.equal(result.quantities[0].sourcePath, "#13/#12/#11:Qto_SlabBaseQuantities/NetVolume");
    assert.equal(result.quantities[0].confidence, 0.95);
  });

  it("uses QTO volume before Allplan property fallback when both are available", () => {
    const result = parseIfcText([
      "#10=IFCSLAB('3uKl6XxnD728DtNh4imxAX',#5,'Beton C25/30',$,$,#1,#2,$,.NOTDEFINED.);",
      "#11=IFCQUANTITYVOLUME('NetVolume',$,$,12.5,$);",
      "#12=IFCELEMENTQUANTITY('0QTO4StCj7L8hBtpAcrRP4',#5,'Qto_SlabBaseQuantities',$,$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
      "#21=IFCPROPERTYSINGLEVALUE('Hacim',$,IFCREAL(9.25),$);",
      "#22=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'AllplanAttributes',$,(#21));",
      "#23=IFCRELDEFINESBYPROPERTIES('1PROPbz1ln0cBIf0n979f',#5,$,$,(#10),#22);",
    ].join("\n"));

    assert.equal(result.elements[0].volumeM3, 12.5);
    assert.equal(result.elements[0].quantitySource, "qto");
    assert.equal(result.elements[0].quantityConfidence, 0.95);
    assert.equal(result.summary.totalVolumeM3, 12.5);
  });

  it("confirms the e-proje_4x3 sample has no QTO volume evidence yet", { skip: !existsSync(samplePath) }, () => {
    const sample = readFileSync(samplePath, "utf8");
    const result = extractIfcQtoVolumeQuantities(sample);

    assert.equal(result.summary.elementQuantitySetCount, manifest.expectedIfcEntityCounts.IfcElementQuantity);
    assert.equal(result.summary.recognizedVolumeQuantityCount, manifest.expectedIfcEntityCounts.IfcQuantityVolume);
  });
});
