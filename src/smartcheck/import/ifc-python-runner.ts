import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { IfcParseSummary, ParsedIfcElement } from "../../ifc/types";

export const ParsedIfcElementSchema = z.object({
  id: z.string(),
  guid: z.string(),
  type: z.enum(["IfcBeam", "IfcColumn", "IfcSlab", "IfcWall", "IfcReinforcingBar"]),
  name: z.string(),
  storey: z.string(),
  storeySource: z.enum(["estimate", "ifc_spatial"]),
  storeySourcePath: z.string().optional(),
  volumeM3: z.number(),
  formworkM2: z.number(),
  rebarKg: z.number(),
  rebarDiameterMm: z.number().optional(),
  quantitySource: z.enum(["estimate", "property", "qto", "geometry"]),
  quantitySourcePath: z.string().optional(),
  quantityConfidence: z.number().optional(),
  smartCheckStatus: z.enum(["pass", "warning", "review"]),
  smartCheckNote: z.string().optional(),
  pozNo: z.string().optional(),
  pozNoSourcePath: z.string().optional(),
});

export const IfcParseSummarySchema = z.object({
  parseStatus: z.enum(["succeeded", "failed"]),
  extractionMode: z.string(),
  quantitySource: z.string(),
  quoteTransferStatus: z.enum(["needs_review"]),
  warnings: z.array(z.string()),
  unsupportedReasons: z.array(z.string()),
  totalElements: z.number(),
  totalVolumeM3: z.number(),
  totalFormworkM2: z.number(),
  totalRebarKg: z.number(),
  totalRebarTon: z.number(),
  beamCount: z.number(),
  beamVolumeM3: z.number(),
  columnCount: z.number(),
  columnVolumeM3: z.number(),
  slabCount: z.number(),
  slabVolumeM3: z.number(),
  wallCount: z.number(),
  wallVolumeM3: z.number(),
  rebarCount: z.number(),
  rebarByDiameter: z.record(z.string(), z.object({ lengthM: z.number(), weightKg: z.number() })),
  trPsetCsb: z.object({
    taks: z.number().nullable().optional(),
    kaks: z.number().nullable().optional(),
    cekmeOn: z.number().nullable().optional(),
    cekmeYan: z.number().nullable().optional(),
    cekmeArka: z.number().nullable().optional(),
    source: z.enum(["ifc_site", "ifc_building"]).nullable(),
    sourcePath: z.string().nullable().optional(),
  }),
  elementsWithPozNoCount: z.number(),
  elementsMissingPozNoCount: z.number(),
});

export const IfcExtractorOutputSchema = z.object({
  elements: z.array(ParsedIfcElementSchema),
  summary: IfcParseSummarySchema,
});

export type IfcExtractorOutput = z.infer<typeof IfcExtractorOutputSchema>;

export interface PythonIfcExtractOptions {
  inputPath: string;
  fileName?: string;
  timeoutMs?: number;
  pythonBin?: string;
  cliScriptPath?: string;
}

export function sanitizeIfcErrorMessage(
  code: "IFC_PARSE_FAILED" | "IFC_SCHEMA_UNSUPPORTED" | "IFC_EMPTY_MODEL" | "IFC_TIMEOUT" | "IFC_OOM" | "IFC_WORKER_CRASH",
  rawDetails?: string,
  timeoutSec?: number,
): string {
  switch (code) {
    case "IFC_TIMEOUT":
      return `İşlem zaman aşımına uğradı (${timeoutSec ?? 600} saniye). Dosya çok karmaşık olabilir.`;
    case "IFC_OOM":
      return "Yetersiz bellek. Dosya boyutu veya eleman sayısı sistem sınırını aştı.";
    case "IFC_SCHEMA_UNSUPPORTED": {
      const match = rawDetails?.match(/schema\s*[:=]?\s*([A-Za-z0-9_]+)/i) || rawDetails?.match(/(IFC[A-Z0-9]+)/i);
      const schemaName = match ? match[1] : "";
      return schemaName
        ? `Desteklenmeyen IFC şeması (${schemaName}). Yalnız IFC2X3, IFC4 ve IFC4X3 desteklenir; RG 33331 teslimi IFC 4.3 (IFC4X3) bekler.`
        : "Desteklenmeyen IFC şeması. Yalnız IFC2X3, IFC4 ve IFC4X3 desteklenir; RG 33331 teslimi IFC 4.3 (IFC4X3) bekler.";
    }
    case "IFC_EMPTY_MODEL":
      return "IFC dosyasında desteklenen yapısal eleman bulunamadı.";
    case "IFC_PARSE_FAILED":
      return "IFC dosyası okunamadı veya dosya bozuk.";
    case "IFC_WORKER_CRASH":
    default:
      return "IFC işlenirken beklenmeyen bir hata oluştu.";
  }
}

export class IfcWorkerError extends Error {
  public readonly sanitizedMessage: string;

  constructor(
    public readonly code: "IFC_PARSE_FAILED" | "IFC_SCHEMA_UNSUPPORTED" | "IFC_EMPTY_MODEL" | "IFC_TIMEOUT" | "IFC_OOM" | "IFC_WORKER_CRASH",
    message: string,
    public readonly stderr?: string,
    sanitizedMessage?: string,
  ) {
    super(message);
    this.name = "IfcWorkerError";
    this.sanitizedMessage = sanitizedMessage ?? sanitizeIfcErrorMessage(code, stderr ?? message);
  }
}

export function resolvePythonBin(): string {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const localVenvPython = path.resolve(process.cwd(), "workers/ifc/.venv/bin/python3");
  if (existsSync(localVenvPython)) return localVenvPython;
  return "python3";
}

export async function runPythonIfcExtractor(options: PythonIfcExtractOptions): Promise<{
  elements: ParsedIfcElement[];
  summary: IfcParseSummary;
  parserVersion: string;
}> {
  const { inputPath, fileName = path.basename(inputPath) } = options;
  const timeoutMs = options.timeoutMs ?? parseInt(process.env.SMARTCHECK_IFC_TIMEOUT_SEC || "600", 10) * 1000;
  const pythonBin = options.pythonBin ?? resolvePythonBin();
  const cliScriptPath = options.cliScriptPath ?? path.resolve(process.cwd(), "workers/ifc/ifc_extract.py");

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-ifc-out-"));
  const outputPath = path.join(tmpDir, "extracted.json");

  try {
    const args = [cliScriptPath, "--input", inputPath, "--output", outputPath, "--file-name", fileName];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(pythonBin, args, { stdio: ["ignore", "pipe", "pipe"] });

      let stdout = "";
      let stderr = "";
      const maxBuffer = 1024 * 1024; // 1 MB cap

      child.stdout.on("data", (chunk: Buffer) => {
        if (stdout.length < maxBuffer) stdout += chunk.toString("utf8");
      });

      child.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length < maxBuffer) stderr += chunk.toString("utf8");
      });

      let timer: NodeJS.Timeout | null = setTimeout(() => {
        timer = null;
        try {
          child.kill("SIGTERM");
          setTimeout(() => {
            try { child.kill("SIGKILL"); } catch {}
          }, 3000).unref();
        } catch {}
        const timeoutSec = Math.round(timeoutMs / 1000);
        reject(new IfcWorkerError("IFC_TIMEOUT", `IFC extraction timed out after ${timeoutSec}s`, stderr, sanitizeIfcErrorMessage("IFC_TIMEOUT", undefined, timeoutSec)));
      }, timeoutMs);

      child.on("error", (err) => {
        if (timer) clearTimeout(timer);
        reject(new IfcWorkerError("IFC_WORKER_CRASH", `Failed to spawn Python process: ${err.message}`, stderr));
      });

      child.on("close", (code, signal) => {
        if (timer) clearTimeout(timer);

        if (signal === "SIGKILL" || code === 137) {
          return reject(new IfcWorkerError("IFC_OOM", "IFC worker terminated due to out-of-memory or SIGKILL", stderr));
        }

        if (code === 0) {
          return resolve();
        }

        if (code === 2 || stderr.includes("IFC_SCHEMA_UNSUPPORTED")) {
          return reject(new IfcWorkerError("IFC_SCHEMA_UNSUPPORTED", "Unsupported IFC schema", stderr));
        }

        if (code === 3 || stderr.includes("IFC_EMPTY_MODEL")) {
          return reject(new IfcWorkerError("IFC_EMPTY_MODEL", "No supported structural entities found in IFC", stderr));
        }

        if (code === 1 || stderr.includes("IFC_PARSE_FAILED")) {
          return reject(new IfcWorkerError("IFC_PARSE_FAILED", `IFC parsing failed: ${stderr.trim()}`, stderr));
        }

        return reject(new IfcWorkerError("IFC_WORKER_CRASH", `Python process exited with code ${code}`, stderr));
      });
    });

    const jsonContent = await fs.readFile(outputPath, "utf8");
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(jsonContent);
    } catch (parseErr) {
      throw new IfcWorkerError("IFC_PARSE_FAILED", "Failed to parse Python worker JSON output");
    }

    const validated = IfcExtractorOutputSchema.safeParse(rawJson);
    if (!validated.success) {
      throw new IfcWorkerError("IFC_PARSE_FAILED", `Invalid IFC extractor output schema: ${validated.error.message}`);
    }

    return {
      elements: validated.data.elements as ParsedIfcElement[],
      summary: validated.data.summary as unknown as IfcParseSummary,
      parserVersion: "ifcopenshell-0.8.4-evidence-v1",
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
