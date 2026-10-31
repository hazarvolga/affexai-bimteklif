import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolvePythonBin } from "./ifc-python-runner";
import { EpysPreflightError, runEpysPreflight, summarizeEpysPreflight } from "./epys-preflight-runner";

const fixtures = path.resolve("workers/ifc/fixtures/epys");
// The worker image and CI install ifcopenshell + ifctester; plain dev machines may not.
const pythonReady = spawnSync(resolvePythonBin(), ["-c", "import ifcopenshell, ifctester"]).status === 0;
const skip = pythonReady ? false : "ifcopenshell/ifctester not installed for this Python";

test("runs the RG 33331 pre-check on a compliant sample and returns 21 EK-9 rows", { skip }, async () => {
  const report = await runEpysPreflight({ inputPath: path.join(fixtures, "123456_00_MM_XXXX_MD_MMC_NNN_01_000.ifc"), fileName: "123456_00_MM_XXXX_MD_MMC_NNN_01_000.ifc" });
  assert.equal(report.ek9.length, 21);
  assert.equal(report.summary.hata, 0);
  assert.match(report.ruleSource.regulation.resmiGazete, /33331/);
});

test("faulty sample reports errors, and the stored summary drops info rows and caps findings", { skip }, async () => {
  const report = await runEpysPreflight({ inputPath: path.join(fixtures, "hatali_ornek.ifc"), fileName: "hatali_ornek.ifc" });
  assert.ok(report.summary.hata > 0);
  const stored = summarizeEpysPreflight(report, 1);
  assert.equal(stored.findings.length, 1);
  assert.equal(stored.findingsTruncated, true);
  assert.ok(stored.findings.every(finding => finding.seviye !== "bilgi"));
});

test("a missing model fails with a coded error instead of a fake report", { skip }, async () => {
  await assert.rejects(runEpysPreflight({ inputPath: path.join(fixtures, "yok.ifc"), fileName: "yok.ifc" }),
    (error: unknown) => error instanceof EpysPreflightError && error.code === "EPYS_PREFLIGHT_FAILED");
});

test("limits OpenBLAS to one thread under the 2 GiB address limit", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bimmetraj-epys-env-"));
  try {
    const envProbePath = path.join(tmpDir, "openblas-threads.txt");
    const envProbeScript = path.join(tmpDir, "env-probe.py");
    await fs.writeFile(envProbeScript, [
      "import os",
      "import sys",
      `open(${JSON.stringify(envProbePath)}, "w").write(os.environ.get("OPENBLAS_NUM_THREADS", "unset"))`,
      "sys.exit(9)",
    ].join("\n"));

    await assert.rejects(runEpysPreflight({ inputPath: envProbeScript, fileName: "x.ifc", scriptPath: envProbeScript }), EpysPreflightError);

    assert.equal(await fs.readFile(envProbePath, "utf8"), "1");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
