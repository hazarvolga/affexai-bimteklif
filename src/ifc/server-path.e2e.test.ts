import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { IfcExtractorOutputSchema } from "../smartcheck/import/ifc-python-runner";
import { buildCalmIfcDatasetFromArtifact } from "./calm-icmal";
import { buildIfcSmartCheckEvidenceArtifact } from "./smartcheck-evidence";
import { normalizeIfcElementsForParity } from "./parser/contract";
import { parseIfcText } from "./parser/legacy-parser";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PYTHON = path.join(ROOT, "workers/ifc/.venv/bin/python");
const CLI = path.join(ROOT, "workers/ifc/ifc_extract.py");

function runWorker(sample: string): { raw: unknown } | null {
  const input = path.join(ROOT, "harici-kaynaklar/klasorler-ve-ornekler/IfcSampleFiles-main", sample);
  if (!existsSync(PYTHON) || !existsSync(input)) return null;
  const dir = mkdtempSync(path.join(tmpdir(), "ifc-e2e-"));
  try {
    const out = path.join(dir, "out.json");
    execFileSync(PYTHON, [CLI, "--input", input, "--output", out, "--file-name", sample], { timeout: 120_000 });
    return { raw: JSON.parse(readFileSync(out, "utf8")) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("sunucu yolu uçtan uca: Python → zod şeması → kanıt → Calm veri seti (Revit IFC, başlıkta yazılım adı yok)", (t) => {
  const run = runWorker("Ifc4_Revit_STR.ifc");
  if (!run) return t.skip("Python venv veya örnek IFC yok");

  const parsed = IfcExtractorOutputSchema.parse(run.raw);
  // zod bilinmeyen alanı siler; alanın şemada tanımlı olduğunu kanıtlar.
  assert.ok(parsed.summary.authoringSoftwareRaw, "authoringSoftwareRaw şemadan sonra da var olmalı");

  const artifact = buildIfcSmartCheckEvidenceArtifact(parsed.elements as never, parsed.summary as never, {
    fileName: "Ifc4_Revit_STR.ifc",
  } as never);
  assert.equal(artifact.summary.authoringSoftware?.family, "revit");

  const dataset = buildCalmIfcDatasetFromArtifact(artifact);
  assert.equal(dataset.authoringAdvisory?.family, "revit");
  assert.equal(dataset.authoringAdvisory?.tone, "caution");
});

test("sunucu yolu uçtan uca: kapı/pencere ölçüleri Python'dan Calm veri setine ulaşır", (t) => {
  const run = runWorker("Ifc4_SampleHouse.ifc");
  if (!run) return t.skip("Python venv veya örnek IFC yok");

  const parsed = IfcExtractorOutputSchema.parse(run.raw);
  const openings = parsed.summary.openings ?? [];
  assert.equal(openings.filter((o) => o.kind === "door").length, 3);
  assert.equal(openings.filter((o) => o.kind === "window").length, 4);
  assert.ok(openings.every((o) => typeof o.widthM === "number" && typeof o.heightM === "number"));
  // Örnek ev: giriş kapısı 1,81 × 2,11 m
  assert.ok(openings.some((o) => o.widthM === 1.81 && o.heightM === 2.11));

  const artifact = buildIfcSmartCheckEvidenceArtifact(parsed.elements as never, parsed.summary as never, {
    fileName: "Ifc4_SampleHouse.ifc",
  } as never);
  const dataset = buildCalmIfcDatasetFromArtifact(artifact);
  assert.equal(dataset.openings?.length, 7);
});

test("sunucu yolu uçtan uca: consistencyReport (Tip özellik mirası ve montaj çift sayım koruması) Zod şemasından Calm veri setine ulaşır", (t) => {
  const fixturePath = path.join(ROOT, "workers/ifc/fixtures/assembly_double_count.ifc");
  if (!existsSync(PYTHON) || !existsSync(fixturePath)) return t.skip("Python venv veya fixture yok");
  const dir = mkdtempSync(path.join(tmpdir(), "ifc-e2e-consistency-"));
  try {
    const out = path.join(dir, "out.json");
    execFileSync(PYTHON, [CLI, "--input", fixturePath, "--output", out, "--file-name", "assembly_double_count.ifc"], {
      timeout: 60_000,
    });
    const raw = JSON.parse(readFileSync(out, "utf8"));
    const parsed = IfcExtractorOutputSchema.parse(raw);
    assert.ok(parsed.summary.parserContract, "parserContract Zod şemasından sonra korunmalı");
    assert.ok(parsed.elements.every((element) => element.sourceIdentity), "element sourceIdentity Zod şemasından sonra korunmalı");
    assert.ok(parsed.summary.consistencyReport, "consistencyReport Zod şemasından sonra korunmalı");
    assert.equal(parsed.summary.consistencyReport.totalElementCount, 3);
    assert.equal(parsed.summary.consistencyReport.suppressedAssemblyPartCount, 2);
    assert.equal(parsed.summary.totalVolumeM3, 8.0);

    const artifact = buildIfcSmartCheckEvidenceArtifact(parsed.elements as never, parsed.summary as never, {
      fileName: "assembly_double_count.ifc",
    } as never);
    assert.equal(artifact.summary.consistencyReport?.suppressedAssemblyPartCount, 2);
    assert.equal(artifact.summary.parserContract?.version, "IFC-NORMALIZED-1");
    assert.ok(artifact.rows.every((row) => row.sourceIdentity?.fileSha256 === parsed.summary.parserContract?.fileSha256));

    const dataset = buildCalmIfcDatasetFromArtifact(artifact);
    assert.equal(dataset.consistencyReport?.totalElementCount, 3);
    assert.equal(dataset.consistencyReport?.suppressedAssemblyPartCount, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("browser/worker parity: desteklenen QTO kesişimi aynı dosya, run ve STEP kimliğiyle eşleşir", (t) => {
  const fixturePath = path.join(ROOT, "workers/ifc/fixtures/duplicate_guid_and_orphan_opening.ifc");
  if (!existsSync(PYTHON) || !existsSync(fixturePath)) return t.skip("Python venv veya fixture yok");
  const text = readFileSync(fixturePath, "utf8");
  const fileSha256 = createHash("sha256").update(text).digest("hex");
  const runId = "22222222-2222-4222-8222-222222222222";
  const dir = mkdtempSync(path.join(tmpdir(), "ifc-e2e-parity-"));
  try {
    const out = path.join(dir, "out.json");
    execFileSync(PYTHON, [CLI, "--input", fixturePath, "--output", out, "--file-name", "duplicate.ifc", "--run-id", runId], { timeout: 60_000 });
    const worker = IfcExtractorOutputSchema.parse(JSON.parse(readFileSync(out, "utf8")));
    const browser = parseIfcText(text);
    const browserNormalized = normalizeIfcElementsForParity(browser.elements, { engine: "browser", fileSha256, runId });
    const workerNormalized = normalizeIfcElementsForParity(worker.elements as never, { engine: "worker", fileSha256, runId });

    assert.equal(browserNormalized.requiresWorker, true);
    assert.equal(workerNormalized.requiresWorker, false);
    const supported = (items: typeof browserNormalized.elements) => items.map((item) => ({
      stepId: item.identity.stepId,
      globalId: item.identity.globalId,
      elementKey: item.identity.elementKey,
      ifcClass: item.ifcClass,
      storey: item.storey,
      quantity: item.quantity,
    })).sort((a, b) => Number(a.stepId) - Number(b.stepId));
    assert.deepEqual(supported(browserNormalized.elements), supported(workerNormalized.elements));

    const artifact = buildIfcSmartCheckEvidenceArtifact(worker.elements as never, worker.summary as never, {
      fileName: "duplicate.ifc",
      checksumSha256: fileSha256,
    });
    assert.equal(worker.summary.parserContract.qualityGate.passed, false);
    assert.deepEqual(worker.summary.parserContract.qualityGate.blockingFindingCodes, ["DUPLICATE_GLOBAL_ID", "ORPHAN_OPENING_ELEMENT"]);
    assert.equal(artifact.rows.length, 0);
    assert.equal(artifact.blockedElements.length, worker.elements.length);
    assert.ok(artifact.blockedElements.every((element) => element.code === "IFC_QUALITY_GATE_BLOCKED"));
    const bypassAttempt = structuredClone({ elements: worker.elements, summary: worker.summary });
    bypassAttempt.summary.parserContract.qualityGate.passed = true;
    bypassAttempt.summary.parserContract.qualityGate.blockingFindingCodes = [];
    assert.equal(IfcExtractorOutputSchema.safeParse(bypassAttempt).success, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

