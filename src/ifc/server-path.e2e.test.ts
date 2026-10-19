import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { IfcExtractorOutputSchema } from "../smartcheck/import/ifc-python-runner";
import { buildCalmIfcDatasetFromArtifact } from "./calm-icmal";
import { buildIfcSmartCheckEvidenceArtifact } from "./smartcheck-evidence";

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
    assert.ok(parsed.summary.consistencyReport, "consistencyReport Zod şemasından sonra korunmalı");
    assert.equal(parsed.summary.consistencyReport.totalElementCount, 3);
    assert.equal(parsed.summary.consistencyReport.suppressedAssemblyPartCount, 5);
    assert.equal(parsed.summary.totalVolumeM3, 9.3);

    const artifact = buildIfcSmartCheckEvidenceArtifact(parsed.elements as never, parsed.summary as never, {
      fileName: "assembly_double_count.ifc",
    } as never);
    assert.equal(artifact.summary.consistencyReport?.suppressedAssemblyPartCount, 5);

    const dataset = buildCalmIfcDatasetFromArtifact(artifact);
    assert.equal(dataset.consistencyReport?.totalElementCount, 3);
    assert.equal(dataset.consistencyReport?.suppressedAssemblyPartCount, 5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

