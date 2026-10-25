import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildPdfProcessingArtifacts } from "./processor";

const structuralReport = {
  schemaVersion: 2 as const,
  kind: "pdf_preflight" as const,
  file: { fileName: "source.pdf", pageCount: 1 },
  pdfa: { claimed: { part: "2", conformance: "B" }, note: "Kimlik beyanı yapısal olarak bulundu." },
  eSignature: {
    signatureFieldPresent: false,
    fieldStatus: "absent" as const,
    signedValueCount: 0,
    emptyFieldCount: 0,
    malformedFieldCount: 0,
    scanComplete: true,
    pagesScanned: 1,
    pagesTotal: 1,
    objectsScanned: 3,
    verification: {
      cryptographic: { status: "not_checked" as const, note: "Kontrol edilmedi." },
      trust: { status: "not_checked" as const, note: "Kontrol edilmedi." },
      revocation: { status: "not_checked" as const, note: "Kontrol edilmedi." },
      timestamp: { status: "not_checked" as const, note: "Kontrol edilmedi." },
    },
    note: "Yapısal tarama.",
  },
  summary: { hata: 0, uyari: 0, elle: 1 },
  findings: [],
  disclaimer: "Yapısal ön kontrol; PDF/A uygunluk doğrulaması değildir.",
};

test("PDF processor produces separate structural and indeterminate veraPDF artifacts with source lineage", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-artifacts-"));
  const inputPath = path.join(directory, "source.pdf");
  const source = Buffer.from("%PDF-1.7 deterministic source");
  const checksumSha256 = createHash("sha256").update(source).digest("hex");
  await fs.writeFile(inputPath, source);

  try {
    const artifacts = await buildPdfProcessingArtifacts({
      inputPath,
      fileName: "source.pdf",
      expectedSourceChecksum: checksumSha256,
    }, {
      runStructuralPreflight: async () => structuralReport,
      runPdfaValidation: async () => ({ rawReportXml: null, report: {
        schemaVersion: 1,
        kind: "verapdf_validation",
        status: "unavailable",
        tool: { name: "veraPDF", version: null, status: "unavailable" },
        profile: { code: "2b", name: "PDF/A-2b validation profile" },
        source: { fileName: "source.pdf", checksumSha256, sizeBytes: source.length, preserved: true },
        validation: { isCompliant: null, scanComplete: false, passedRules: null, failedRules: null, passedChecks: null, failedChecks: null, statement: null },
        conversion: { status: "disabled_requires_licensed_provider", outputCreated: false, sourceOverwritten: false },
        unavailableReason: "not_configured",
      } }),
    });

    assert.deepEqual(artifacts.map((artifact) => artifact.artifactType), ["pdf_preflight", "verapdf_validation"]);
    assert.equal(artifacts[0].metadataJson.kind, "pdf_preflight");
    assert.equal(artifacts[1].metadataJson.kind, "verapdf_validation");
    assert.equal(artifacts[1].metadataJson.status, "unavailable");
    assert.equal((artifacts[1].metadataJson.validation as { isCompliant: boolean | null }).isCompliant, null);
    assert.equal(artifacts[1].metadataJson.rawReport, null);
    for (const artifact of artifacts) {
      assert.deepEqual(artifact.metadataJson.lineage, {
        relation: "validated_from_original",
        sourceFileName: "source.pdf",
        sourceChecksumSha256: checksumSha256,
        originalPreserved: true,
      });
    }
    assert.deepEqual(await fs.readFile(inputPath), source);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("PDF processor rejects a validator that changes the original", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-artifacts-"));
  const inputPath = path.join(directory, "source.pdf");
  const source = Buffer.from("%PDF-1.7 immutable source");
  const checksumSha256 = createHash("sha256").update(source).digest("hex");
  await fs.writeFile(inputPath, source);

  try {
    await assert.rejects(buildPdfProcessingArtifacts({
      inputPath,
      fileName: "source.pdf",
      expectedSourceChecksum: checksumSha256,
    }, {
      runStructuralPreflight: async () => {
        await fs.writeFile(inputPath, Buffer.from("changed"));
        return structuralReport;
      },
      runPdfaValidation: async () => { throw new Error("must not run after source mutation"); },
    }), /PDF_SOURCE_CHANGED/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

function completedReport(checksumSha256: string, sizeBytes: number, isCompliant: boolean) {
  return {
    schemaVersion: 1,
    kind: "verapdf_validation",
    status: "completed",
    tool: { name: "veraPDF", version: "1.30.3", status: "available" },
    profile: { code: "2b", name: "PDF/A-2b validation profile" },
    source: { fileName: "source.pdf", checksumSha256, sizeBytes, preserved: true },
    validation: { isCompliant, scanComplete: true, passedRules: 143, failedRules: isCompliant ? 0 : 1, passedChecks: 234, failedChecks: isCompliant ? 0 : 1, statement: null },
    conversion: { status: "disabled_requires_licensed_provider", outputCreated: false, sourceOverwritten: false },
    unavailableReason: null,
  };
}

test("PDF processor stores the raw veraPDF XML as its own artifact linked by checksum", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-artifacts-"));
  const inputPath = path.join(directory, "source.pdf");
  const source = Buffer.from("%PDF-1.7 raw report source");
  const checksumSha256 = createHash("sha256").update(source).digest("hex");
  const rawReportXml = "<?xml version=\"1.0\"?><report>raw</report>";
  await fs.writeFile(inputPath, source);

  try {
    const artifacts = await buildPdfProcessingArtifacts({ inputPath, fileName: "source.pdf", expectedSourceChecksum: checksumSha256 }, {
      runStructuralPreflight: async () => structuralReport,
      runPdfaValidation: async () => ({ report: completedReport(checksumSha256, source.length, false), rawReportXml }),
    });

    assert.deepEqual(artifacts.map((artifact) => [artifact.artifactType, artifact.fileName, artifact.contentType]), [
      ["pdf_preflight", "pdf-preflight.json", "application/json"],
      ["verapdf_validation", "verapdf-validation.json", "application/json"],
      ["verapdf_report_xml", "verapdf-report.xml", "application/xml"],
    ]);
    assert.equal(artifacts[2].content.toString("utf8"), rawReportXml);
    assert.deepEqual(artifacts[1].metadataJson.rawReport, {
      fileName: "verapdf-report.xml",
      checksumSha256: createHash("sha256").update(rawReportXml).digest("hex"),
      sizeBytes: Buffer.byteLength(rawReportXml),
      contentType: "application/xml",
    });
    assert.equal((artifacts[2].metadataJson.lineage as { sourceChecksumSha256: string }).sourceChecksumSha256, checksumSha256);
    assert.deepEqual(await fs.readFile(inputPath), source);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("PDF processor rejects a completed validation without its raw report", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-artifacts-"));
  const inputPath = path.join(directory, "source.pdf");
  const source = Buffer.from("%PDF-1.7 missing raw report");
  const checksumSha256 = createHash("sha256").update(source).digest("hex");
  await fs.writeFile(inputPath, source);

  try {
    await assert.rejects(buildPdfProcessingArtifacts({ inputPath, fileName: "source.pdf", expectedSourceChecksum: checksumSha256 }, {
      runStructuralPreflight: async () => structuralReport,
      runPdfaValidation: async () => ({ report: completedReport(checksumSha256, source.length, true), rawReportXml: null }),
    }), /VERAPDF_RAW_REPORT_MISMATCH/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
