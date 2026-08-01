import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { buildIfcSmartCheckEvidenceFromContent } from "./smartcheck-processing";

interface EProjeManifest {
  fixtureName: string;
  relativePath: string;
  sha256: string;
  ifcSchema: string;
  knownQuantityEvidence: {
    recognizedSlabMatches: number;
    recognizedSlabVolumeSumM3: number;
  };
}

const manifestPath = resolve("src/ifc/fixtures/e-proje_4x3.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as EProjeManifest;
const samplePath = resolve(manifest.relativePath);

describe("IFC SmartCheck processing artifact", () => {
  it("builds a review-ready evidence artifact from the local IFC sample", { skip: !existsSync(samplePath) }, () => {
    const content = readFileSync(samplePath);
    const checksumSha256 = createHash("sha256").update(content).digest("hex");
    const artifact = buildIfcSmartCheckEvidenceFromContent({
      fileName: manifest.fixtureName,
      checksumSha256,
      content,
    });

    const totalQuantity = artifact.rows.reduce((sum, row) => sum + Number(row.normalizedQuantity), 0);

    assert.equal(checksumSha256, manifest.sha256);
    assert.equal(artifact.document.schemaName, manifest.ifcSchema);
    assert.equal(artifact.summary.evidenceRowCount, manifest.knownQuantityEvidence.recognizedSlabMatches);
    assert.ok(Math.abs(totalQuantity - manifest.knownQuantityEvidence.recognizedSlabVolumeSumM3) < 1e-9);
    assert.equal(artifact.rows.every((row) => row.reviewStatus === "pending_review"), true);
    assert.equal(artifact.rows.every((row) => row.quantitySource === "ifc_property"), true);
    assert.equal(artifact.rows.every((row) => row.sourceCellRange.startsWith("IFC#")), true);
  });
});
