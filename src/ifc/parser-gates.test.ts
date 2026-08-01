import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseIfcText } from "./parser/legacy-parser";

interface EProjeManifest {
  relativePath: string;
  sha256: string;
  expectedLegacyParser: {
    totalElements: number;
    beamCount: number;
    columnCount: number;
    slabCount: number;
    wallCount: number;
    rebarCount: number;
    parseStatus: "succeeded";
    extractionMode: "demo_estimate";
    quoteTransferStatus: "needs_review";
  };
}

const manifestPath = resolve("src/ifc/fixtures/e-proje_4x3.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as EProjeManifest;
const samplePath = resolve(manifest.relativePath);

describe("IFC parser safety gates", () => {
  it("fails closed instead of generating synthetic data for unsupported real IFC text", () => {
    const result = parseIfcText("ISO-10303-21;\nDATA;\n#1=IFCPROJECT('0JTESTPROJECT0000000000',$,$,$,$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;");

    assert.equal(result.summary.parseStatus, "failed");
    assert.equal(result.summary.totalElements, 0);
    assert.equal(result.elements.length, 0);
    assert.match(result.summary.unsupportedReasons.join("\n"), /Synthetic demo quantities are disabled/);
  });

  it("keeps parsed IFC output explicitly classified as demo_estimate", () => {
    const result = parseIfcText("#42=IFCBEAM('0JTESTBEAM00000000000',$,'Beam A',$,$,$,$,$,$);");

    assert.equal(result.summary.parseStatus, "succeeded");
    assert.equal(result.summary.extractionMode, "demo_estimate");
    assert.equal(result.summary.quantitySource, "estimate");
    assert.equal(result.summary.quoteTransferStatus, "needs_review");
    assert.equal(result.summary.totalElements, 1);
  });

  it("matches the local e-proje_4x3 golden manifest when the sample IFC is present", { skip: !existsSync(samplePath) }, () => {
    const sample = readFileSync(samplePath, "utf8");
    const sha256 = createHash("sha256").update(sample).digest("hex");
    const result = parseIfcText(sample);

    assert.equal(sha256, manifest.sha256);
    assert.equal(result.summary.parseStatus, manifest.expectedLegacyParser.parseStatus);
    assert.equal(result.summary.extractionMode, manifest.expectedLegacyParser.extractionMode);
    assert.equal(result.summary.quoteTransferStatus, manifest.expectedLegacyParser.quoteTransferStatus);
    assert.equal(result.summary.totalElements, manifest.expectedLegacyParser.totalElements);
    assert.equal(result.summary.beamCount, manifest.expectedLegacyParser.beamCount);
    assert.equal(result.summary.columnCount, manifest.expectedLegacyParser.columnCount);
    assert.equal(result.summary.slabCount, manifest.expectedLegacyParser.slabCount);
    assert.equal(result.summary.wallCount, manifest.expectedLegacyParser.wallCount);
    assert.equal(result.summary.rebarCount, manifest.expectedLegacyParser.rebarCount);
  });
});
