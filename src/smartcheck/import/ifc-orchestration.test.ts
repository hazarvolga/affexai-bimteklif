import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { IfcExtractorOutputSchema, IfcWorkerError, resolveIfcMaxOutputBytes, resolvePythonBin, runPythonIfcExtractor, sanitizeIfcErrorMessage } from "./ifc-python-runner";

test("resolvePythonBin finds Python executable", () => {
  const bin = resolvePythonBin();
  assert.ok(bin.length > 0);
});

test("resolveIfcMaxOutputBytes uses a bounded default for invalid or unsafe env values", () => {
  const safeDefault = resolveIfcMaxOutputBytes({});
  assert.equal(safeDefault, 128 * 1024 * 1024);
  assert.equal(resolveIfcMaxOutputBytes({ SMARTCHECK_IFC_MAX_OUTPUT_MB: "invalid" }), safeDefault);
  assert.equal(resolveIfcMaxOutputBytes({ SMARTCHECK_IFC_MAX_OUTPUT_MB: "1" }), safeDefault);
  assert.equal(resolveIfcMaxOutputBytes({ SMARTCHECK_IFC_MAX_OUTPUT_MB: "999999" }), safeDefault);
  assert.equal(resolveIfcMaxOutputBytes({ SMARTCHECK_IFC_MAX_OUTPUT_MB: "8" }), 8 * 1024 * 1024);
  assert.equal(resolveIfcMaxOutputBytes({ SMARTCHECK_IFC_MAX_OUTPUT_MB: "256" }), 256 * 1024 * 1024);
});

test("runPythonIfcExtractor successfully parses valid IFC file via IfcOpenShell", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-test-ifc-"));
  const sampleIfcPath = path.join(tmpDir, "sample.ifc");

  const ifcContent = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    "FILE_NAME('sample.ifc','2026-10-10T12:00:00',('TeklifPro'),('Platform'),'','','');",
    "FILE_SCHEMA(('IFC2X3'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCPROJECT('0000000000000000000001',$,'Test Project',$,$,$,$,$,$);",
    "#2=IFCSITE('0000000000000000000002',$,'Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);",
    "#3=IFCBUILDING('0000000000000000000003',$,'Building',$,$,$,$,$,.ELEMENT.,$,$,$);",
    "#4=IFCBUILDINGSTOREY('0000000000000000000004',$,'Kat 1',$,$,$,$,$,.ELEMENT.,3.2);",
    "#5=IFCSLAB('3uKl6XxnD728DtNh4imxAX',$,'Döşeme D-101',$,$,$,$,$,.FLOOR.);",
    "#6=IFCRELCONTAINEDINSPATIALSTRUCTURE('2222222222222222222222',$,$,$,(#5),#4);",
    "#11=IFCQUANTITYVOLUME('NetVolume',$,$,15.4,$);",
    "#12=IFCELEMENTQUANTITY('0QTO4StCj7L8hBtpAcrRP4',$,'Qto_SlabBaseQuantities',$,$,(#11));",
    "#13=IFCRELDEFINESBYPROPERTIES('2LTCbz1ln0cBIf0n979fWN',$,$,$,(#5),#12);",
    "ENDSEC;",
    "END-ISO-10303-21;",
  ].join("\n");

  await fs.writeFile(sampleIfcPath, ifcContent, "utf8");

  try {
    const result = await runPythonIfcExtractor({
      inputPath: sampleIfcPath,
      fileName: "sample.ifc",
      runId: "11111111-1111-4111-8111-111111111111",
    });

    assert.equal(result.elements.length, 1);
    assert.equal(result.elements[0].type, "IfcSlab");
    assert.equal(result.elements[0].volumeM3, 15.4);
    assert.equal(result.elements[0].quantitySource, "qto");
    assert.equal(result.elements[0].storey, "Kat 1 (3.2 m)");
    assert.equal(result.summary.parseStatus, "succeeded");
    assert.equal(result.summary.totalVolumeM3, 15.4);
    assert.equal(result.summary.parserContract?.runId, "11111111-1111-4111-8111-111111111111");
    assert.equal(result.summary.parserContract?.fileSha256.length, 64);
    assert.equal(result.elements[0].sourceIdentity?.runId, "11111111-1111-4111-8111-111111111111");
    assert.equal(result.elements[0].sourceIdentity?.stepId, "5");
    assert.match(result.elements[0].sourceIdentity?.elementKey ?? "", /:11111111-1111-4111-8111-111111111111:#5$/);
    const tampered = structuredClone({ elements: result.elements, summary: result.summary });
    tampered.elements[0].sourceIdentity!.elementKey = "tampered";
    assert.equal(IfcExtractorOutputSchema.safeParse(tampered).success, false);

    const negativeQuantity = structuredClone({ elements: result.elements, summary: result.summary });
    const negativeElement = negativeQuantity.elements[0];
    const positiveOffset = structuredClone(negativeElement);
    negativeElement.volumeM3 = -1;
    positiveOffset.id = "6";
    positiveOffset.guid = "3uKl6XxnD728DtNh4imxAY";
    positiveOffset.volumeM3 = 2;
    positiveOffset.sourceIdentity!.stepId = "6";
    positiveOffset.sourceIdentity!.globalId = positiveOffset.guid;
    positiveOffset.sourceIdentity!.elementKey = `${positiveOffset.sourceIdentity!.fileSha256}:${positiveOffset.sourceIdentity!.runId}:#6`;
    negativeQuantity.elements.push(positiveOffset);
    negativeQuantity.summary.parserContract!.qualityGate.measuredElementCount = 2;
    negativeQuantity.summary.parserContract!.qualityGate.unmeasuredElementCount = 0;
    negativeQuantity.summary.parserContract!.qualityGate.dimensionTotals.volumeM3 = 1;
    negativeQuantity.summary.parserContract!.qualityGate.dimensionTotals.formworkAreaM2 = negativeElement.formworkM2 + positiveOffset.formworkM2;
    negativeQuantity.summary.parserContract!.qualityGate.invalidQuantityElementKeys = [];
    negativeQuantity.summary.parserContract!.qualityGate.passed = true;
    assert.equal(IfcExtractorOutputSchema.safeParse(negativeQuantity).success, false, "negative quantities must be derived and rejected even when positive values offset the total");

    const fabricatedInvalidKeys = structuredClone({ elements: result.elements, summary: result.summary });
    fabricatedInvalidKeys.summary.parserContract!.qualityGate.invalidQuantityElementKeys = ["fabricated-key"];
    fabricatedInvalidKeys.summary.parserContract!.qualityGate.passed = false;
    assert.equal(IfcExtractorOutputSchema.safeParse(fabricatedInvalidKeys).success, false, "invalid quantity keys must be derived from the element values");

    const mismatchedFinding = structuredClone({ elements: result.elements, summary: result.summary });
    mismatchedFinding.summary.consistencyReport!.findings.push({
      code: "MISSING_MATERIAL",
      severity: "medium",
      globalId: "WRONG_GLOBAL_ID",
      ifcClass: "IfcSlab",
      storey: "Kat 1 (3.2 m)",
      message: "Material missing",
      sourceIdentity: structuredClone(mismatchedFinding.elements[0].sourceIdentity!),
    });
    assert.equal(IfcExtractorOutputSchema.safeParse(mismatchedFinding).success, false, "finding GlobalId must match its source identity");

    const fakeStep = structuredClone({ elements: result.elements, summary: result.summary });
    fakeStep.elements[0].id = "not-a-step";
    fakeStep.elements[0].sourceIdentity!.stepId = "not-a-step";
    fakeStep.elements[0].sourceIdentity!.elementKey = `${fakeStep.elements[0].sourceIdentity!.fileSha256}:${fakeStep.elements[0].sourceIdentity!.runId}:#not-a-step`;
    assert.equal(IfcExtractorOutputSchema.safeParse(fakeStep).success, false, "STEP identities must be positive decimal identifiers");

    const duplicateIdentity = structuredClone({ elements: result.elements, summary: result.summary });
    duplicateIdentity.elements.push(structuredClone(duplicateIdentity.elements[0]));
    duplicateIdentity.summary.parserContract!.qualityGate.measuredElementCount = 2;
    duplicateIdentity.summary.parserContract!.qualityGate.unmeasuredElementCount = 0;
    duplicateIdentity.summary.parserContract!.qualityGate.dimensionTotals.volumeM3 *= 2;
    duplicateIdentity.summary.parserContract!.qualityGate.dimensionTotals.areaM2 *= 2;
    duplicateIdentity.summary.parserContract!.qualityGate.dimensionTotals.lengthM *= 2;
    duplicateIdentity.summary.parserContract!.qualityGate.dimensionTotals.massKg *= 2;
    duplicateIdentity.summary.parserContract!.qualityGate.dimensionTotals.formworkAreaM2 *= 2;
    assert.equal(IfcExtractorOutputSchema.safeParse(duplicateIdentity).success, false, "elementKey must be unique within a worker result");
    assert.equal(result.parserVersion, "ifcopenshell-0.8.4-evidence-v1");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("runPythonIfcExtractor maps empty model to IFC_EMPTY_MODEL error", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-test-empty-"));
  const emptyIfcPath = path.join(tmpDir, "empty.ifc");

  const ifcContent = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    "FILE_NAME('empty.ifc','2026-10-10T12:00:00',('TeklifPro'),('Platform'),'','','');",
    "FILE_SCHEMA(('IFC2X3'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCPROJECT('0000000000000000000001',$,'Empty Project',$,$,$,$,$,$);",
    "ENDSEC;",
    "END-ISO-10303-21;",
  ].join("\n");

  await fs.writeFile(emptyIfcPath, ifcContent, "utf8");

  try {
    await assert.rejects(
      async () => {
        await runPythonIfcExtractor({
          inputPath: emptyIfcPath,
          fileName: "empty.ifc",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof IfcWorkerError);
        assert.equal(err.code, "IFC_EMPTY_MODEL");
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("runPythonIfcExtractor maps corrupt file to IFC_PARSE_FAILED error", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-test-corrupt-"));
  const corruptPath = path.join(tmpDir, "corrupt.ifc");
  await fs.writeFile(corruptPath, "INVALID IFC DATA", "utf8");

  try {
    await assert.rejects(
      async () => {
        await runPythonIfcExtractor({
          inputPath: corruptPath,
          fileName: "corrupt.ifc",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof IfcWorkerError);
        assert.equal(err.code, "IFC_PARSE_FAILED");
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("runPythonIfcExtractor enforces timeout with IFC_TIMEOUT error", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-test-timeout-"));
  const dummyPath = path.join(tmpDir, "dummy.ifc");
  await fs.writeFile(dummyPath, "dummy", "utf8");

  // Create a mock python script that sleeps for 5 seconds
  const slowScriptPath = path.join(tmpDir, "slow.py");
  await fs.writeFile(slowScriptPath, "import time; time.sleep(5)", "utf8");

  try {
    await assert.rejects(
      async () => {
        await runPythonIfcExtractor({
          inputPath: dummyPath,
          cliScriptPath: slowScriptPath,
          timeoutMs: 150, // 150ms timeout
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof IfcWorkerError);
        assert.equal(err.code, "IFC_TIMEOUT");
        assert.match(err.sanitizedMessage, /İşlem zaman aşımına uğradı/);
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("runPythonIfcExtractor rejects oversized worker output before reading JSON into memory", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-test-output-limit-"));
  const dummyPath = path.join(tmpDir, "dummy.ifc");
  const largeOutputScript = path.join(tmpDir, "large-output.py");
  await fs.writeFile(dummyPath, "dummy", "utf8");
  await fs.writeFile(largeOutputScript, [
    "import argparse",
    "p = argparse.ArgumentParser()",
    "p.add_argument('--input')",
    "p.add_argument('--output')",
    "p.add_argument('--file-name')",
    "p.add_argument('--run-id')",
    "a = p.parse_args()",
    "with open(a.output, 'wb') as f: f.truncate(9 * 1024 * 1024)",
  ].join("\n"), "utf8");

  const previousLimit = process.env.SMARTCHECK_IFC_MAX_OUTPUT_MB;
  process.env.SMARTCHECK_IFC_MAX_OUTPUT_MB = "8";
  try {
    await assert.rejects(
      runPythonIfcExtractor({ inputPath: dummyPath, cliScriptPath: largeOutputScript }),
      (error: unknown) => {
        assert.ok(error instanceof IfcWorkerError);
        assert.equal(error.code, "IFC_OUTPUT_TOO_LARGE");
        assert.equal(error.sanitizedMessage, "IFC işleme çıktısı güvenli boyut sınırını aştı.");
        assert.doesNotMatch(error.sanitizedMessage, /output-limit|\.py|\/tmp/i);
        return true;
      },
    );
  } finally {
    if (previousLimit === undefined) delete process.env.SMARTCHECK_IFC_MAX_OUTPUT_MB;
    else process.env.SMARTCHECK_IFC_MAX_OUTPUT_MB = previousLimit;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("sanitizeIfcErrorMessage sanitizes internal paths and provides clean Turkish messages", () => {
  const timeoutMsg = sanitizeIfcErrorMessage("IFC_TIMEOUT", undefined, 120);
  assert.equal(timeoutMsg, "İşlem zaman aşımına uğradı (120 saniye). Dosya çok karmaşık olabilir.");
  assert.ok(!timeoutMsg.includes("/app") && !timeoutMsg.includes(".py"));

  const oomMsg = sanitizeIfcErrorMessage("IFC_OOM", "Killed process 1234 (python3) total-vm:2097152kB");
  assert.equal(oomMsg, "Yetersiz bellek. Dosya boyutu veya eleman sayısı sistem sınırını aştı.");

  const schemaMsg = sanitizeIfcErrorMessage("IFC_SCHEMA_UNSUPPORTED", "Unsupported schema IFC4X3_ADD2 in file /app/test.ifc");
  assert.ok(schemaMsg.includes("Desteklenmeyen IFC şeması"));
  assert.ok(!schemaMsg.includes("/app"));

  const emptyMsg = sanitizeIfcErrorMessage("IFC_EMPTY_MODEL", "No elements in /root/model.ifc");
  assert.equal(emptyMsg, "IFC dosyasında desteklenen yapısal eleman bulunamadı.");

  const parseFailMsg = sanitizeIfcErrorMessage("IFC_PARSE_FAILED", 'Traceback: File "/var/task/workers/ifc/ifc_extract.py", line 42');
  assert.equal(parseFailMsg, "IFC dosyası okunamadı veya dosya bozuk.");
  assert.ok(!parseFailMsg.includes("Traceback") && !parseFailMsg.includes("/var/task"));

  const crashMsg = sanitizeIfcErrorMessage("IFC_WORKER_CRASH", "Segmentation fault at 0x00007fff");
  assert.equal(crashMsg, "IFC işlenirken beklenmeyen bir hata oluştu.");
});

test("IfcWorkerError attaches sanitizedMessage and avoids leaking stack or paths", () => {
  const err = new IfcWorkerError(
    "IFC_PARSE_FAILED",
    'Crash details: File "/var/app/workers/ifc/ifc_extract.py", line 99, in main',
    'Traceback (most recent call last):\n  File "/var/app/workers/ifc/ifc_extract.py", line 99',
  );

  assert.equal(err.code, "IFC_PARSE_FAILED");
  assert.equal(err.sanitizedMessage, "IFC dosyası okunamadı veya dosya bozuk.");
  assert.ok(!err.sanitizedMessage.includes("/var/app"));
  assert.ok(!err.sanitizedMessage.includes("Traceback"));
});
