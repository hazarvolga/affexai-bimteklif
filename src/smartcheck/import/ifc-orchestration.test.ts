import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { IfcWorkerError, resolvePythonBin, runPythonIfcExtractor } from "./ifc-python-runner";

test("resolvePythonBin finds Python executable", () => {
  const bin = resolvePythonBin();
  assert.ok(bin.length > 0);
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
    });

    assert.equal(result.elements.length, 1);
    assert.equal(result.elements[0].type, "IfcSlab");
    assert.equal(result.elements[0].volumeM3, 15.4);
    assert.equal(result.elements[0].quantitySource, "qto");
    assert.equal(result.elements[0].storey, "Kat 1 (3.2 m)");
    assert.equal(result.summary.parseStatus, "succeeded");
    assert.equal(result.summary.totalVolumeM3, 15.4);
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
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
