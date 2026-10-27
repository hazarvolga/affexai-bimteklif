import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { resolvePythonBin } from "./ifc-python-runner";

const Finding = z.object({
  kod: z.string(), seviye: z.enum(["hata", "uyari", "elle"]), mesaj: z.string(), madde: z.string(),
  sayfalar: z.array(z.number()).optional(),
});

const ReportBase = {
  kind: z.literal("pdf_preflight"),
  file: z.object({ fileName: z.string(), pageCount: z.number() }),
  pdfa: z.object({ claimed: z.object({ part: z.string(), conformance: z.string() }).nullable(), note: z.string() }),
  summary: z.object({ hata: z.number(), uyari: z.number(), elle: z.number() }),
  findings: z.array(Finding), disclaimer: z.string(),
};

const VerificationResult = z.object({
  status: z.enum(["not_checked", "indeterminate"]),
  note: z.string(),
});

const LegacyPdfPreflightReportSchema = z.object({
  schemaVersion: z.literal(1),
  ...ReportBase,
  eSignature: z.object({ present: z.boolean(), note: z.string() }).optional(),
});

const PdfPreflightReportV2Schema = z.object({
  schemaVersion: z.literal(2),
  ...ReportBase,
  eSignature: z.object({
    signatureFieldPresent: z.boolean(),
    fieldStatus: z.enum(["absent", "empty", "signed", "malformed", "indeterminate"]),
    signedValueCount: z.number().int().nonnegative(),
    emptyFieldCount: z.number().int().nonnegative(),
    malformedFieldCount: z.number().int().nonnegative(),
    scanComplete: z.boolean(),
    pagesScanned: z.number().int().nonnegative(),
    pagesTotal: z.number().int().nonnegative(),
    objectsScanned: z.number().int().nonnegative(),
    verification: z.object({
      cryptographic: VerificationResult,
      trust: VerificationResult,
      revocation: VerificationResult,
      timestamp: VerificationResult,
    }),
    note: z.string(),
  }),
});

export const PdfPreflightReportSchema = z.discriminatedUnion("schemaVersion", [
  LegacyPdfPreflightReportSchema,
  PdfPreflightReportV2Schema,
]);
export type PdfPreflightReport = z.infer<typeof PdfPreflightReportSchema>;

export async function runPdfPreflight(inputPath: string, fileName: string, options: { timeoutMs?: number; pythonBin?: string; scriptPath?: string } = {}): Promise<PdfPreflightReport> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bimmetraj-pdfa-"));
  const outputPath = path.join(directory, "report.json");
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(options.pythonBin ?? resolvePythonBin(), [options.scriptPath ?? path.resolve("workers/ifc/pdf_preflight.py"), "--input", inputPath, "--output", outputPath, "--file-name", fileName], {
        stdio: "ignore",
        env: {
          PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
          HOME: os.tmpdir(),
          TMPDIR: os.tmpdir(),
          LANG: process.env.LANG ?? "C.UTF-8",
          PYTHONIOENCODING: "utf-8",
        },
      });
      const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("PDF_PREFLIGHT_TIMEOUT")); }, timeoutMs);
      child.once("error", () => { clearTimeout(timer); reject(new Error("PDF_PREFLIGHT_FAILED")); });
      child.once("close", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error("PDF_PREFLIGHT_FAILED")); });
    });
    let parsed: unknown;
    try { parsed = JSON.parse(await fs.readFile(outputPath, "utf8")); }
    catch { throw new Error("PDF_PREFLIGHT_INVALID_OUTPUT"); }
    const report = PdfPreflightReportSchema.safeParse(parsed);
    if (!report.success) throw new Error("PDF_PREFLIGHT_INVALID_OUTPUT");
    return report.data;
  } finally {
    await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}
