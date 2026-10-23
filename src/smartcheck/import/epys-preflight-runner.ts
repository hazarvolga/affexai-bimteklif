import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { resolvePythonBin } from "./ifc-python-runner";

const FindingSchema = z.object({
  kod: z.string().max(128),
  seviye: z.enum(["hata", "uyari", "bilgi", "elle"]),
  mesaj: z.string().max(4096),
  madde: z.string().max(256),
  ek9: z.number().nullable(),
  varliklar: z.array(z.string().max(256)).max(10_000),
  sayi: z.number().nullable(),
});

const Ek9RowSchema = z.object({
  no: z.number(),
  kaynakNo: z.number().optional(),
  bolum: z.string(),
  kategori: z.string(),
  baslik: z.string(),
  soru: z.string(),
  karar: z.string(),
  elleNotu: z.string(),
  bulgu: z.number(),
  evaluationMode: z.enum(["automatic", "manual", "not_applicable"]).default("manual"),
  status: z.enum(["passed", "failed", "not_evaluated", "manual_review_required", "not_applicable"]).default("not_evaluated"),
  sourceRefs: z.array(z.string().max(256)).max(100).default([]),
  evidenceRefs: z.array(z.string().max(256)).max(10_000).default([]),
  missingInputs: z.array(z.string().max(256)).max(100).default(["schema-v2-evidence"]),
});

const Ek9TableSchema = z.object({
  tablo: z.string(),
  baslik: z.string(),
  disiplin: z.string(),
  disiplinAdi: z.string(),
  satirSayisi: z.number(),
});

export const EpysPreflightReportSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  kind: z.literal("epys_preflight"),
  ruleSource: z.object({
    regulation: z.record(z.string(), z.string()),
    engine: z.object({ name: z.string(), version: z.string(), upstreamCommit: z.string() }),
    dataVerification: z.string(),
  }),
  model: z.object({ fileName: z.string(), schema: z.string(), sizeBytes: z.number(), discipline: z.string().optional() }),
  summary: z.object({ hata: z.number(), uyari: z.number(), bilgi: z.number(), elle: z.number() }),
  evaluationStatus: z.enum(["failed", "not_evaluated", "manual_review_required"]).default("not_evaluated"),
  sourceVerificationStatus: z.literal("identity_pending").default("identity_pending"),
  ek9Table: Ek9TableSchema.optional(),
  ek9: z.array(Ek9RowSchema),
  findings: z.array(FindingSchema),
  disclaimer: z.string(),
});

export type EpysPreflightReport = z.infer<typeof EpysPreflightReportSchema>;

export class EpysPreflightError extends Error {
  constructor(readonly code: "EPYS_PREFLIGHT_FAILED" | "EPYS_PREFLIGHT_TIMEOUT" | "EPYS_PREFLIGHT_INVALID_OUTPUT", message: string) {
    super(message);
    this.name = "EpysPreflightError";
  }
}

const MAX_STDERR = 64 * 1024;

/** Runs workers/ifc/epys_preflight.py (RG 33331 pre-check) and validates its JSON report. */
export async function runEpysPreflight(options: {
  inputPath: string;
  fileName: string;
  timeoutMs?: number;
  pythonBin?: string;
  scriptPath?: string;
}): Promise<EpysPreflightReport> {
  const timeoutMs = options.timeoutMs ?? parseInt(process.env.SMARTCHECK_IFC_TIMEOUT_SEC || "600", 10) * 1000;
  const scriptPath = options.scriptPath ?? path.resolve(process.cwd(), "workers/ifc/epys_preflight.py");
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bimmetraj-epys-"));
  const outputPath = path.join(tmpDir, "report.json");
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(options.pythonBin ?? resolvePythonBin(),
        [scriptPath, "--input", options.inputPath, "--output", outputPath, "--file-name", options.fileName],
        { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < MAX_STDERR) stderr += chunk.toString("utf8"); });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new EpysPreflightError("EPYS_PREFLIGHT_TIMEOUT", `e-PYS pre-check timed out after ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);
      child.on("error", error => { clearTimeout(timer); reject(new EpysPreflightError("EPYS_PREFLIGHT_FAILED", error.message)); });
      child.on("close", code => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new EpysPreflightError("EPYS_PREFLIGHT_FAILED", stderr.trim().split("\n").at(-1) || `exit ${code}`));
      });
    });
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(outputPath, "utf8"));
    } catch {
      throw new EpysPreflightError("EPYS_PREFLIGHT_INVALID_OUTPUT", "Report is not valid JSON");
    }
    const parsed = EpysPreflightReportSchema.safeParse(raw);
    if (!parsed.success) throw new EpysPreflightError("EPYS_PREFLIGHT_INVALID_OUTPUT", parsed.error.message);
    return parsed.data;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Compact, storable view: summary and EK-9 rows in full, findings capped (full list stays in storage). */
export function summarizeEpysPreflight(report: EpysPreflightReport, maxFindings = 200) {
  return {
    kind: report.kind,
    ruleSource: report.ruleSource,
    model: report.model,
    summary: report.summary,
    evaluationStatus: report.evaluationStatus,
    sourceVerificationStatus: report.sourceVerificationStatus,
    ek9Table: report.ek9Table,
    ek9: report.ek9,
    findings: report.findings.filter(finding => finding.seviye !== "bilgi").slice(0, maxFindings),
    findingsTruncated: report.findings.length > maxFindings,
    disclaimer: report.disclaimer,
  };
}
