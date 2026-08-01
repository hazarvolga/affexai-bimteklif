import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseIfcText } from "./legacy-parser";
import { extractAllplanVolumeQuantities } from "./quantity-extractor";

const manifest = JSON.parse(readFileSync(resolve("src/ifc/fixtures/e-proje_4x3.manifest.json"), "utf8")) as {
  relativePath: string;
  knownQuantityEvidence: {
    allplanHacimPropertyCount: number;
    recognizedSlabMatches: number;
    recognizedSlabVolumeSumM3: number;
  };
};
const samplePath = resolve(manifest.relativePath);

describe("IFC Allplan property quantity extraction", () => {
  it("extracts Hacim from AllplanAttributes through RelDefinesByProperties", () => {
    const ifcText = [
      "#10=IFCSLAB('3uKl6XxnD728DtNh4imxAX',#5,'Beton C25/30',$,$,#1,#2,$,.NOTDEFINED.);",
      "#11=IFCPROPERTYSINGLEVALUE('Hacim',$,IFCREAL(12.5),$);",
      "#12=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'AllplanAttributes',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
    ].join("\n");

    const result = extractAllplanVolumeQuantities(ifcText);

    assert.equal(result.summary.allplanVolumePropertyCount, 1);
    assert.equal(result.summary.recognizedVolumeQuantityCount, 1);
    assert.equal(result.quantities[0].stepId, "10");
    assert.equal(result.quantities[0].entityType, "IfcSlab");
    assert.equal(result.quantities[0].normalizedValue, 12.5);
    assert.equal(result.quantities[0].sourcePath, "#13/#12/#11:AllplanAttributes/Hacim");
  });

  it("accepts exported Pset_SlabCommon Hacim values as lower-confidence property evidence", () => {
    const result = extractAllplanVolumeQuantities([
      "#10=IFCSLAB('0z1KFWgIn2iQ5yGGyHaDQ3',#5,'Beton C25/30',$,$,#1,#2,$,.FLOOR.);",
      "#11=IFCPROPERTYSINGLEVALUE('Hacim',$,IFCREAL(1.47471886058699),$);",
      "#12=IFCPROPERTYSET('1lKfGGZRnCIubaEqsReKHx',#5,'Pset_SlabCommon',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('31XdBfuQ962B2KAj9nq8oW',#5,$,$,(#10),#12);",
    ].join("\n"));

    assert.equal(result.summary.recognizedSlabVolumeCount, 1);
    assert.equal(result.quantities[0].normalizedValue, 1.474718860587);
    assert.equal(result.quantities[0].sourcePath, "#13/#12/#11:Pset_SlabCommon/Hacim");
    assert.equal(result.quantities[0].confidence, 0.8);
  });

  it("uses Allplan Hacim as the parsed volume source when available", () => {
    const result = parseIfcText([
      "#10=IFCSLAB('3uKl6XxnD728DtNh4imxAX',#5,'Beton C25/30',$,$,#1,#2,$,.NOTDEFINED.);",
      "#11=IFCPROPERTYSINGLEVALUE('Hacim',$,IFCREAL(12.5),$);",
      "#12=IFCPROPERTYSET('0_JX4StCj7L8hBtpAcrRP4',#5,'AllplanAttributes',$,(#11));",
      "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',#5,$,$,(#10),#12);",
    ].join("\n"));

    assert.equal(result.elements[0].volumeM3, 12.5);
    assert.equal(result.elements[0].quantitySource, "property");
    assert.equal(result.elements[0].quantityConfidence, 0.9);
    assert.equal(result.summary.totalVolumeM3, 12.5);
  });

  it("matches the e-proje_4x3 Allplan Hacim golden manifest when the sample IFC is present", { skip: !existsSync(samplePath) }, () => {
    const sample = readFileSync(samplePath, "utf8");
    const result = extractAllplanVolumeQuantities(sample);

    assert.equal(result.summary.allplanVolumePropertyCount, manifest.knownQuantityEvidence.allplanHacimPropertyCount);
    assert.equal(result.summary.recognizedSlabVolumeCount, manifest.knownQuantityEvidence.recognizedSlabMatches);
    assert.ok(
      Math.abs(result.summary.recognizedSlabVolumeSumM3 - manifest.knownQuantityEvidence.recognizedSlabVolumeSumM3) < 1e-9,
      `expected ${result.summary.recognizedSlabVolumeSumM3} to match ${manifest.knownQuantityEvidence.recognizedSlabVolumeSumM3}`,
    );
  });
});
