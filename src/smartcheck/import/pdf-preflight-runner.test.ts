import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PdfPreflightReportSchema, runPdfPreflight } from "./pdf-preflight-runner";

test("PDF preflight runner passes the upload name and validates the worker report", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-runner-test-"));
  const script = path.join(directory, "fixture.py");
  const input = path.join(directory, "document.pdf");
  try {
    await fs.writeFile(input, "%PDF-1.7\n");
    await fs.writeFile(script, `import argparse, json\np=argparse.ArgumentParser()\np.add_argument('--input')\np.add_argument('--output')\np.add_argument('--file-name')\na=p.parse_args()\nwith open(a.output,'w') as out: json.dump({'schemaVersion':1,'kind':'pdf_preflight','file':{'fileName':a.file_name,'pageCount':1},'pdfa':{'claimed':None,'note':'Manual check'},'summary':{'hata':1,'uyari':0,'elle':1},'findings':[{'kod':'PDFA_KIMLIGI_YOK','seviye':'hata','mesaj':'Missing XMP','madde':'PDF/A'}],'disclaimer':'Preflight only'},out)\n`);
    const report = await runPdfPreflight(input, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf", { pythonBin: "python3", scriptPath: script });
    assert.equal(report.file.fileName, "260001_00_MM_GNEL_PL_MMC_K00_01_000.pdf");
    assert.equal(report.summary.hata, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("PDF preflight runner rejects malformed worker output", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-runner-test-"));
  const script = path.join(directory, "fixture.py");
  try {
    await fs.writeFile(script, "import sys\nopen(sys.argv[sys.argv.index('--output')+1], 'w').write('{}')\n");
    await assert.rejects(runPdfPreflight("unused.pdf", "report.pdf", { pythonBin: "python3", scriptPath: script }), /PDF_PREFLIGHT_INVALID_OUTPUT/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("PDF preflight schema accepts v2 signature evidence without inferring cryptographic validity", () => {
  const parsed = PdfPreflightReportSchema.parse({
    schemaVersion: 2,
    kind: "pdf_preflight",
    file: { fileName: "plan.pdf", pageCount: 21 },
    pdfa: { claimed: null, note: "Manual check" },
    eSignature: {
      signatureFieldPresent: true,
      fieldStatus: "signed",
      signedValueCount: 1,
      emptyFieldCount: 0,
      malformedFieldCount: 0,
      scanComplete: true,
      pagesScanned: 21,
      pagesTotal: 21,
      objectsScanned: 2,
      verification: {
        cryptographic: { status: "not_checked", note: "No cryptographic validation performed." },
        trust: { status: "not_checked", note: "No trust-chain validation performed." },
        revocation: { status: "not_checked", note: "No revocation validation performed." },
        timestamp: { status: "not_checked", note: "No timestamp validation performed." },
      },
      note: "Structural signature value only.",
    },
    summary: { hata: 0, uyari: 0, elle: 1 },
    findings: [],
    disclaimer: "Preflight only",
  });
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.eSignature.fieldStatus, "signed");
  assert.equal(parsed.eSignature.verification.cryptographic.status, "not_checked");
});

test("PDF preflight schema keeps legacy v1 reports safe and explicitly indeterminate", () => {
  const parsed = PdfPreflightReportSchema.parse({
    schemaVersion: 1,
    kind: "pdf_preflight",
    file: { fileName: "legacy.pdf", pageCount: 1 },
    pdfa: { claimed: null, note: "Legacy report" },
    eSignature: { present: true, note: "Legacy /Sig detection" },
    summary: { hata: 0, uyari: 0, elle: 1 },
    findings: [],
    disclaimer: "Preflight only",
  });
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.eSignature.present, true);
});
