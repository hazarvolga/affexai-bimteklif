import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { IfcParseSummary, ParsedIfcElement } from "../../ifc/types";

export const IfcSourceIdentitySchema = z.object({
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  runId: z.string().min(1).max(200),
  stepId: z.string().regex(/^[1-9]\d*$/, "STEP identity must be a positive decimal identifier"),
  globalId: z.string().min(1),
  elementKey: z.string().min(1),
});

export const IfcConsistencyFindingSchema = z.object({
  code: z.enum([
    "DUPLICATE_GLOBAL_ID",
    "ORPHAN_OPENING_ELEMENT",
    "NEGATIVE_NET_QUANTITY",
    "ZERO_NET_QUANTITY",
    "MISSING_NET_QUANTITY",
    "MISSING_SPATIAL_STOREY",
    "UNCOVERED_PROXY_ELEMENT",
    "UNMAPPED_POZ_ELEMENT",
    "MISSING_MATERIAL",
    "CONCRETE_CLASS_DIFFERS",
  ]),
  severity: z.enum(["high", "medium"]),
  globalId: z.string(),
  ifcClass: z.string(),
  storey: z.string(),
  elementName: z.string().optional(),
  message: z.string(),
  sourceIdentity: IfcSourceIdentitySchema,
});

export const IfcUncoveredElementRecordSchema = z.object({
  globalId: z.string(),
  ifcClass: z.string(),
  name: z.string(),
  storey: z.string(),
  reason: z.string(),
  scope: z.enum(["in_takeoff", "out_of_scope"]).optional(),
  quantity: z.object({ value: z.number().nonnegative(), unit: z.enum(["m³", "m²", "mtül"]) }).optional(),
  sourceIdentity: IfcSourceIdentitySchema,
});

export const IfcSuppressedAssemblyPartRecordSchema = z.object({
  globalId: z.string(),
  ifcClass: z.string(),
  name: z.string(),
  parentGlobalId: z.string(),
  parentIfcClass: z.string(),
  storey: z.string(),
  sourceIdentity: IfcSourceIdentitySchema,
});

export const IfcConsistencyReportSchema = z.object({
  totalElementCount: z.number().int().nonnegative(),
  measuredElementCount: z.number().int().nonnegative(),
  unmeasuredElementCount: z.number().int().nonnegative(),
  pozMatchedElementCount: z.number().int().nonnegative(),
  pozMatchedRatio: z.number().min(0).max(1).nullable(),
  uncoveredElementCount: z.number().int().nonnegative(),
  outOfScopeElementCount: z.number().int().nonnegative().optional(),
  typeInheritedElementCount: z.number().int().nonnegative(),
  suppressedAssemblyPartCount: z.number().int().nonnegative(),
  highSeverityCount: z.number().int().nonnegative(),
  mediumSeverityCount: z.number().int().nonnegative(),
  findings: z.array(IfcConsistencyFindingSchema),
  uncoveredElements: z.array(IfcUncoveredElementRecordSchema),
  suppressedAssemblyParts: z.array(IfcSuppressedAssemblyPartRecordSchema),
});

export const ParsedIfcElementSchema = z.object({
  id: z.string(),
  guid: z.string(),
  type: z.enum(["IfcBeam", "IfcColumn", "IfcSlab", "IfcWall", "IfcReinforcingBar", "IfcCovering"]),
  ifcClass: z.string().optional(),
  name: z.string(),
  storey: z.string(),
  storeySource: z.enum(["estimate", "ifc_spatial"]),
  storeySourcePath: z.string().optional(),
  volumeM3: z.number().nonnegative(),
  areaM2: z.number().nonnegative().optional(),
  grossAreaM2: z.number().nonnegative().optional(),
  openingAreaM2: z.number().nonnegative().optional(),
  lengthM: z.number().nonnegative().optional(),
  materialLayers: z.array(z.string()).optional(),
  coveringPredefinedType: z.string().optional(),
  spaceCode: z.string().optional(),
  spaceName: z.string().optional(),
  zoneName: z.string().optional(),
  formworkM2: z.number().nonnegative(),
  rebarKg: z.number().nonnegative(),
  rebarDiameterMm: z.number().nonnegative().optional(),
  quantitySource: z.enum(["estimate", "property", "qto", "geometry"]),
  quantitySourcePath: z.string().optional(),
  quantityConfidence: z.number().min(0).max(1).optional(),
  smartCheckStatus: z.enum(["pass", "warning", "review"]),
  smartCheckNote: z.string().optional(),
  pozNo: z.string().optional(),
  pozNoSourcePath: z.string().optional(),
  formworkBasis: z.string().optional(),
  formworkNote: z.string().optional(),
  reviewNotes: z.array(z.string()).optional(),
  loadBearing: z.boolean().optional(),
  exposure: z.enum(["interior", "exterior"]).optional(),
  surfaceCondition: z.enum(["interior", "exterior", "soil_contact", "unknown"]).optional(),
  exposureClass: z.string().optional(),
  coverMm: z.number().nonnegative().optional(),
  discipline: z.string().optional(),
  expectedQuantity: z.number().nonnegative().optional(),
  measured: z.boolean().optional(),
  measurementStatus: z.enum(["ölçüldü", "ölçülemedi"]).optional(),
  matchedPozCode: z.string().nullable().optional(),
  isUncovered: z.boolean().optional(),
  uncoveredReason: z.string().optional(),
  inheritedFromType: z.boolean().optional(),
  sourceIdentity: IfcSourceIdentitySchema,
});

export const IfcParserContractSchema = z.object({
  version: z.literal("IFC-NORMALIZED-1"),
  engine: z.literal("worker"),
  schema: z.string().min(1),
  schemaFamily: z.enum(["IFC2X3", "IFC4", "IFC4X3"]),
  fileName: z.string(),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  runId: z.string().min(1).max(200),
  capabilities: z.object({
    qtoPriority: z.literal(true),
    independentUnits: z.literal(true),
    typeInheritance: z.literal(true),
    aggregateSuppression: z.literal(true),
    materialLayers: z.literal(true),
    geometryFallback: z.literal(true),
  }),
  qualityGate: z.object({
    passed: z.boolean(),
    invalidQuantityElementKeys: z.array(z.string()),
    blockingFindingCodes: z.array(z.string()),
    measuredElementCount: z.number().int().nonnegative(),
    unmeasuredElementCount: z.number().int().nonnegative(),
    excludedElementCount: z.number().int().nonnegative(),
    suppressedAssemblyPartCount: z.number().int().nonnegative(),
    dimensionTotals: z.object({
      volumeM3: z.number().nonnegative(),
      areaM2: z.number().nonnegative(),
      lengthM: z.number().nonnegative(),
      massKg: z.number().nonnegative(),
      formworkAreaM2: z.number().nonnegative(),
    }),
  }),
});

export const ApartmentRoomScheduleItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  storey: z.string(),
  netAreaM2: z.number().nonnegative(),
  floorFinish: z.string(),
  isBalcony: z.boolean().optional(),
});

export const ApartmentUnitScheduleItemSchema = z.object({
  unitCode: z.string(),
  unitLabel: z.string(),
  storey: z.string(),
  roomCount: z.number().int().nonnegative(),
  netSweepableM2: z.number().nonnegative(),
  balconyM2: z.number().nonnegative(),
  totalNetM2: z.number().nonnegative(),
  unitGrossM2: z.number().nonnegative().nullable(),
  generalGrossM2: z.number().nonnegative().nullable(),
  rooms: z.array(ApartmentRoomScheduleItemSchema),
});

export const ParsedOpeningSchema = z.object({
  id: z.string(),
  kind: z.enum(["door", "window"]),
  name: z.string().nullable().optional(),
  widthM: z.number().nonnegative().nullable(),
  heightM: z.number().nonnegative().nullable(),
  hostElementId: z.string().nullable().optional(),
  hostGlobalId: z.string().nullable().optional(),
  targetLineId: z.string().nullable().optional(),
  targetFinishLayer: z.string().nullable().optional(),
  quantityBasis: z.enum(["gross_before_openings", "net_after_openings", "unknown"]).optional(),
});

export const IfcParseSummarySchema = z.object({
  parseStatus: z.enum(["succeeded", "failed"]),
  extractionMode: z.string(),
  quantitySource: z.string(),
  quoteTransferStatus: z.enum(["needs_review"]),
  warnings: z.array(z.string()),
  unsupportedReasons: z.array(z.string()),
  totalElements: z.number().int().nonnegative(),
  totalVolumeM3: z.number().nonnegative(),
  totalFormworkM2: z.number().nonnegative(),
  totalRebarKg: z.number().nonnegative(),
  totalRebarTon: z.number().nonnegative(),
  beamCount: z.number().int().nonnegative(),
  beamVolumeM3: z.number().nonnegative(),
  columnCount: z.number().int().nonnegative(),
  columnVolumeM3: z.number().nonnegative(),
  slabCount: z.number().int().nonnegative(),
  slabVolumeM3: z.number().nonnegative(),
  wallCount: z.number().int().nonnegative(),
  wallVolumeM3: z.number().nonnegative(),
  coveringCount: z.number().int().nonnegative().optional(),
  coveringAreaM2: z.number().nonnegative().optional(),
  rebarCount: z.number().int().nonnegative(),
  rebarByDiameter: z.record(z.string(), z.object({ lengthM: z.number().nonnegative(), weightKg: z.number().nonnegative() })),
  trPsetCsb: z.object({
    taks: z.number().nonnegative().nullable().optional(),
    kaks: z.number().nonnegative().nullable().optional(),
    cekmeOn: z.number().nonnegative().nullable().optional(),
    cekmeYan: z.number().nonnegative().nullable().optional(),
    cekmeArka: z.number().nonnegative().nullable().optional(),
    emsalDahilM2: z.number().nonnegative().nullable().optional(),
    emsalHaricM2: z.number().nonnegative().nullable().optional(),
    emsalYuzde30M2: z.number().nonnegative().nullable().optional(),
    source: z.enum(["ifc_site", "ifc_building"]).nullable(),
    sourcePath: z.string().nullable().optional(),
  }),
  apartmentSchedule: z.array(ApartmentUnitScheduleItemSchema).optional(),
  elementsWithPozNoCount: z.number().int().nonnegative(),
  elementsMissingPozNoCount: z.number().int().nonnegative(),
  // Not: z.object bilinmeyen alanları siler; yeni worker alanları burada tanımlanmalıdır.
  authoringSoftwareRaw: z
    .object({
      originatingSystem: z.string().nullable(),
      preprocessorVersion: z.string().nullable(),
      applicationNames: z.array(z.string()),
    })
    .optional(),
  openings: z.array(ParsedOpeningSchema).optional(),
  consistencyReport: IfcConsistencyReportSchema,
  parserContract: IfcParserContractSchema,
});

export const IfcExtractorOutputSchema = z.object({
  elements: z.array(ParsedIfcElementSchema),
  summary: IfcParseSummarySchema,
}).superRefine((output, ctx) => {
  const contract = output.summary.parserContract;
  const report = output.summary.consistencyReport;
  const gate = contract.qualityGate;
  const verifyIdentity = (identity: z.infer<typeof IfcSourceIdentitySchema>, path: Array<string | number>) => {
    const expectedKey = `${contract.fileSha256}:${contract.runId}:#${identity.stepId}`;
    if (identity.fileSha256 !== contract.fileSha256) ctx.addIssue({ code: "custom", path: [...path, "fileSha256"], message: "sourceIdentity file hash does not match parserContract" });
    if (identity.runId !== contract.runId) ctx.addIssue({ code: "custom", path: [...path, "runId"], message: "sourceIdentity runId does not match parserContract" });
    if (identity.elementKey !== expectedKey) ctx.addIssue({ code: "custom", path: [...path, "elementKey"], message: "sourceIdentity elementKey is inconsistent" });
  };
  const elementByKey = new Map<string, (typeof output.elements)[number]>();
  output.elements.forEach((element, index) => {
    verifyIdentity(element.sourceIdentity, ["elements", index, "sourceIdentity"]);
    if (element.sourceIdentity.stepId !== element.id) ctx.addIssue({ code: "custom", path: ["elements", index, "sourceIdentity", "stepId"], message: "sourceIdentity stepId does not match element id" });
    if (element.sourceIdentity.globalId !== element.guid) ctx.addIssue({ code: "custom", path: ["elements", index, "sourceIdentity", "globalId"], message: "sourceIdentity globalId does not match element guid" });
    if (elementByKey.has(element.sourceIdentity.elementKey)) {
      ctx.addIssue({ code: "custom", path: ["elements", index, "sourceIdentity", "elementKey"], message: "sourceIdentity elementKey must be unique within elements" });
    } else {
      elementByKey.set(element.sourceIdentity.elementKey, element);
    }
  });
  const verifyReportRecord = (
    record: { globalId?: string; sourceIdentity?: z.infer<typeof IfcSourceIdentitySchema> },
    path: Array<string | number>,
  ) => {
    // Base schemas emit their own required-field issues; cross-field checks only run
    // when both sides are present so malformed payloads still fail as one result.
    if (!record.sourceIdentity || typeof record.globalId !== "string" || typeof record.sourceIdentity.elementKey !== "string") return;
    verifyIdentity(record.sourceIdentity, [...path, "sourceIdentity"]);
    if (record.globalId !== record.sourceIdentity.globalId) {
      ctx.addIssue({ code: "custom", path: [...path, "sourceIdentity", "globalId"], message: "record GlobalId does not match sourceIdentity" });
    }
    const element = elementByKey.get(record.sourceIdentity.elementKey);
    if (element && (element.id !== record.sourceIdentity.stepId || element.guid !== record.globalId)) {
      ctx.addIssue({ code: "custom", path: [...path, "sourceIdentity"], message: "record sourceIdentity does not match the referenced element" });
    }
  };
  output.summary.consistencyReport.findings.forEach((finding, index) => verifyReportRecord(finding, ["summary", "consistencyReport", "findings", index]));
  output.summary.consistencyReport.uncoveredElements.forEach((record, index) => verifyReportRecord(record, ["summary", "consistencyReport", "uncoveredElements", index]));
  output.summary.consistencyReport.suppressedAssemblyParts.forEach((record, index) => verifyReportRecord(record, ["summary", "consistencyReport", "suppressedAssemblyParts", index]));

  const expectedBlockingCodes = [...new Set(report.findings.filter((finding) => finding.severity === "high").map((finding) => finding.code))].sort();
  if (JSON.stringify([...gate.blockingFindingCodes].sort()) !== JSON.stringify(expectedBlockingCodes)) {
    ctx.addIssue({ code: "custom", path: ["summary", "parserContract", "qualityGate", "blockingFindingCodes"], message: "quality gate blocking codes do not match high-severity findings" });
  }
  const measuredCount = output.elements.filter((element) => element.measured === true).length;
  const expectedInvalidQuantityKeys = [...new Set(output.elements.flatMap((element) => {
    const quantities = [element.volumeM3, element.areaM2 ?? 0, element.lengthM ?? 0, element.rebarKg, element.formworkM2];
    return quantities.some((value) => !Number.isFinite(value) || value < 0) ? [element.sourceIdentity.elementKey] : [];
  }))].sort();
  if (JSON.stringify([...gate.invalidQuantityElementKeys].sort()) !== JSON.stringify(expectedInvalidQuantityKeys)) {
    ctx.addIssue({ code: "custom", path: ["summary", "parserContract", "qualityGate", "invalidQuantityElementKeys"], message: "quality gate invalid quantity keys do not match element quantities" });
  }
  const expectedCounts = {
    measuredElementCount: measuredCount,
    unmeasuredElementCount: output.elements.length - measuredCount,
    excludedElementCount: report.outOfScopeElementCount ?? 0,
    suppressedAssemblyPartCount: report.suppressedAssemblyParts.length,
  };
  for (const [field, expected] of Object.entries(expectedCounts)) {
    if (gate[field as keyof typeof expectedCounts] !== expected) {
      ctx.addIssue({ code: "custom", path: ["summary", "parserContract", "qualityGate", field], message: `quality gate ${field} does not match extracted records` });
    }
  }
  const totals = output.elements.reduce<{ volumeM3: number; areaM2: number; lengthM: number; massKg: number; formworkAreaM2: number }>((sum, element) => ({
    volumeM3: sum.volumeM3 + element.volumeM3,
    areaM2: sum.areaM2 + (element.areaM2 ?? 0),
    lengthM: sum.lengthM + (element.lengthM ?? 0),
    massKg: sum.massKg + element.rebarKg,
    formworkAreaM2: sum.formworkAreaM2 + element.formworkM2,
  }), { volumeM3: 0, areaM2: 0, lengthM: 0, massKg: 0, formworkAreaM2: 0 });
  for (const [field, expected] of Object.entries(totals)) {
    const actual = gate.dimensionTotals[field as keyof typeof totals];
    if (Math.abs(actual - expected) > 1e-9) {
      ctx.addIssue({ code: "custom", path: ["summary", "parserContract", "qualityGate", "dimensionTotals", field], message: `quality gate ${field} total does not match elements` });
    }
  }
  const expectedPassed = expectedBlockingCodes.length === 0 && gate.invalidQuantityElementKeys.length === 0;
  if (gate.passed !== expectedPassed) {
    ctx.addIssue({ code: "custom", path: ["summary", "parserContract", "qualityGate", "passed"], message: "quality gate pass state contradicts validated findings" });
  }
});


export type IfcExtractorOutput = z.infer<typeof IfcExtractorOutputSchema>;

const MEBIBYTE = 1024 * 1024;
const DEFAULT_IFC_MAX_OUTPUT_MB = 128;
const MIN_IFC_MAX_OUTPUT_MB = 8;
const MAX_IFC_MAX_OUTPUT_MB = 256;

export function resolveIfcMaxOutputBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.SMARTCHECK_IFC_MAX_OUTPUT_MB;
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_IFC_MAX_OUTPUT_MB * MEBIBYTE;
  const megabytes = Number(raw);
  if (!Number.isSafeInteger(megabytes) || megabytes < MIN_IFC_MAX_OUTPUT_MB || megabytes > MAX_IFC_MAX_OUTPUT_MB) {
    return DEFAULT_IFC_MAX_OUTPUT_MB * MEBIBYTE;
  }
  return megabytes * MEBIBYTE;
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export interface PythonIfcExtractOptions {
  inputPath: string;
  fileName?: string;
  timeoutMs?: number;
  pythonBin?: string;
  cliScriptPath?: string;
  runId?: string;
}

export function sanitizeIfcErrorMessage(
  code: "IFC_PARSE_FAILED" | "IFC_SCHEMA_UNSUPPORTED" | "IFC_EMPTY_MODEL" | "IFC_TIMEOUT" | "IFC_OOM" | "IFC_OUTPUT_TOO_LARGE" | "IFC_WORKER_CRASH",
  rawDetails?: string,
  timeoutSec?: number,
): string {
  switch (code) {
    case "IFC_TIMEOUT":
      return `İşlem zaman aşımına uğradı (${timeoutSec ?? 600} saniye). Dosya çok karmaşık olabilir.`;
    case "IFC_OOM":
      return "Yetersiz bellek. Dosya boyutu veya eleman sayısı sistem sınırını aştı.";
    case "IFC_OUTPUT_TOO_LARGE":
      return "IFC işleme çıktısı güvenli boyut sınırını aştı.";
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
    public readonly code: "IFC_PARSE_FAILED" | "IFC_SCHEMA_UNSUPPORTED" | "IFC_EMPTY_MODEL" | "IFC_TIMEOUT" | "IFC_OOM" | "IFC_OUTPUT_TOO_LARGE" | "IFC_WORKER_CRASH",
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
  const { inputPath, fileName = path.basename(inputPath), runId } = options;
  const effectiveRunId = runId ?? `standalone:${randomUUID()}`;
  const timeoutMs = options.timeoutMs ?? parseInt(process.env.SMARTCHECK_IFC_TIMEOUT_SEC || "600", 10) * 1000;
  const maxOutputBytes = resolveIfcMaxOutputBytes();
  const pythonBin = options.pythonBin ?? resolvePythonBin();
  const cliScriptPath = options.cliScriptPath ?? path.resolve(process.cwd(), "workers/ifc/ifc_extract.py");
  const actualFileSha256 = await sha256File(inputPath);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-ifc-out-"));
  const outputPath = path.join(tmpDir, "extracted.json");

  try {
    const args = [cliScriptPath, "--input", inputPath, "--output", outputPath, "--file-name", fileName];
    args.push("--run-id", effectiveRunId);

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

    const outputStat = await fs.stat(outputPath).catch(() => null);
    if (!outputStat?.isFile()) {
      throw new IfcWorkerError("IFC_PARSE_FAILED", "Python worker did not produce an output file");
    }
    if (outputStat.size > maxOutputBytes) {
      throw new IfcWorkerError("IFC_OUTPUT_TOO_LARGE", `IFC worker output exceeded ${maxOutputBytes} bytes`);
    }

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

    if (validated.data.summary.parserContract.runId !== effectiveRunId) {
      throw new IfcWorkerError("IFC_PARSE_FAILED", "IFC parser contract run identity mismatch");
    }
    if (validated.data.summary.parserContract.fileSha256 !== actualFileSha256) {
      throw new IfcWorkerError("IFC_PARSE_FAILED", "IFC parser contract file hash mismatch");
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
