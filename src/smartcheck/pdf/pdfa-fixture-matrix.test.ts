import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compareWithExpectation, PdfaMatrixManifestSchema, type PdfaMatrixObservation } from "./pdfa-fixture-matrix";
import { listFailedVeraPdfRules } from "./verapdf-runner";

const fixturesRoot = path.resolve("fixtures");

async function loadManifest() {
  return PdfaMatrixManifestSchema.parse(JSON.parse(await fs.readFile(path.join(fixturesRoot, "phase-5/pdfa-matrix/manifest.json"), "utf8")));
}

const compliantObservation: PdfaMatrixObservation = {
  validationStatus: "completed",
  toolVersion: "1.30.3",
  isCompliant: true,
  failedRules: [],
  structuralClaim: "2B",
  signedValueCount: 0,
  rawReport: { checksumSha256: "a".repeat(64), sizeBytes: 10 },
  sourcePreserved: true,
};

test("PDF/A matrix manifest covers the T32 acceptance cases and pins every fixture hash", async () => {
  const manifest = await loadManifest();
  const ids = manifest.cases.map(entry => entry.id);
  for (const id of ["valid-pdfa2b", "plain", "xmp-label-only", "multipage-pdfa2b", "multipage-last-page-invalid", "missing-font", "signed-pdfa2b"]) {
    assert.ok(ids.includes(id), `missing case ${id}`);
  }
  const xmpOnly = manifest.cases.find(entry => entry.id === "xmp-label-only")!;
  assert.equal(xmpOnly.expected.structuralClaim, "2B");
  assert.equal(xmpOnly.expected.isCompliant, false);
  for (const entry of manifest.cases) {
    const content = await fs.readFile(path.join(fixturesRoot, entry.path));
    assert.equal(createHash("sha256").update(content).digest("hex"), entry.sha256, entry.id);
  }
});

test("PDF/A matrix never accepts an XMP label without a compliant veraPDF verdict", () => {
  const expected = { isCompliant: true, failedRules: [], structuralClaim: "2B", signedValueCount: 0 };
  const labelOnly = { ...compliantObservation, isCompliant: false, failedRules: ["6.2.4.3-4"] };
  assert.ok(compareWithExpectation(expected, labelOnly, "1.30.3").some(message => message.startsWith("isCompliant")));
  const validatorMissing = { ...compliantObservation, validationStatus: "unavailable", toolVersion: null, isCompliant: null, rawReport: null };
  const mismatches = compareWithExpectation(expected, validatorMissing, "1.30.3");
  assert.ok(mismatches.includes("validator status unavailable"));
  assert.ok(mismatches.includes("raw veraPDF report not stored"));
});

test("PDF/A matrix flags rule, signature, version and source-preservation drift", () => {
  const expected = { isCompliant: true, failedRules: [], structuralClaim: "2B", signedValueCount: 1 };
  assert.deepEqual(compareWithExpectation(expected, { ...compliantObservation, signedValueCount: 1 }, "1.30.3"), []);
  const drifted = { ...compliantObservation, toolVersion: "1.28.2", failedRules: ["6.3.3-1"], sourcePreserved: false };
  const mismatches = compareWithExpectation(expected, drifted, "1.30.3");
  assert.equal(mismatches.length, 4);
});

test("failed veraPDF rules are extracted from the raw XML report", () => {
  const xml = `<?xml version="1.0"?><report><rule specification="ISO 19005-2:2011" clause="6.3.3" testNumber="1" status="failed" failedChecks="1"></rule>
<rule clause="6.2.11.4.1" testNumber="1" status="failed"></rule><rule clause="6.3.3" testNumber="1" status="failed"></rule><rule clause="6.1.2" testNumber="1" status="passed"></rule></report>`;
  assert.deepEqual(listFailedVeraPdfRules(xml), ["6.2.11.4.1-1", "6.3.3-1"]);
});
