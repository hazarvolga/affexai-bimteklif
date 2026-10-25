import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { PdfPreflightReportSchema, runPdfPreflight } from "./pdf-preflight-runner";
import { runVeraPdfValidationWithRawReport } from "../pdf/verapdf-runner";
import { VeraPdfValidationReportSchema } from "../pdf/verapdf-report";

// Local hash keeps this module free of the DB-bound import config (used by the matrix CLI).
const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

type PdfArtifactType = "pdf_preflight" | "verapdf_validation" | "verapdf_report_xml";

export interface PdfProcessingArtifact {
  artifactType: PdfArtifactType;
  fileName: "pdf-preflight.json" | "verapdf-validation.json" | "verapdf-report.xml";
  contentType: "application/json" | "application/xml";
  content: Buffer;
  metadataJson: Record<string, unknown>;
}

interface PdfProcessingDependencies {
  runStructuralPreflight: (inputPath: string, fileName: string) => Promise<unknown>;
  runPdfaValidation: (inputPath: string, fileName: string) => Promise<{ report: unknown; rawReportXml: string | null }>;
}

/**
 * Builds independent structural-preflight and standards-validation evidence.
 * The original PDF is checksum-verified before and after each external tool. When veraPDF
 * ran, its raw XML report is stored as its own artifact and linked from the validation JSON.
 */
export async function buildPdfProcessingArtifacts(
  input: { inputPath: string; fileName: string; expectedSourceChecksum: string },
  dependencies: PdfProcessingDependencies = {
    runStructuralPreflight: runPdfPreflight,
    runPdfaValidation: runVeraPdfValidationWithRawReport,
  },
): Promise<PdfProcessingArtifact[]> {
  const assertOriginalPreserved = async () => {
    const source = await fs.readFile(input.inputPath);
    if (sha256(source) !== input.expectedSourceChecksum) throw new Error("PDF_SOURCE_CHANGED");
  };
  const lineage = {
    relation: "validated_from_original",
    sourceFileName: input.fileName,
    sourceChecksumSha256: input.expectedSourceChecksum,
    originalPreserved: true,
  } as const;

  await assertOriginalPreserved();
  const preflight = PdfPreflightReportSchema.parse(await dependencies.runStructuralPreflight(input.inputPath, input.fileName));
  await assertOriginalPreserved();
  const validationRun = await dependencies.runPdfaValidation(input.inputPath, input.fileName);
  const validation = VeraPdfValidationReportSchema.parse(validationRun.report);
  await assertOriginalPreserved();
  if (validation.source.checksumSha256 !== input.expectedSourceChecksum || !validation.source.preserved) {
    throw new Error("VERAPDF_SOURCE_LINEAGE_MISMATCH");
  }

  if ((validation.status === "completed") !== (validationRun.rawReportXml !== null)) throw new Error("VERAPDF_RAW_REPORT_MISMATCH");

  const rawReport = validationRun.rawReportXml === null ? null : Buffer.from(validationRun.rawReportXml, "utf8");
  const rawReportRef = rawReport === null
    ? null
    : { fileName: "verapdf-report.xml", checksumSha256: sha256(rawReport), sizeBytes: rawReport.length, contentType: "application/xml" } as const;
  const jsonArtifact = (artifactType: "pdf_preflight" | "verapdf_validation", fileName: "pdf-preflight.json" | "verapdf-validation.json", metadataJson: Record<string, unknown>): PdfProcessingArtifact => (
    { artifactType, fileName, contentType: "application/json", metadataJson, content: Buffer.from(JSON.stringify(metadataJson, null, 2)) }
  );
  const artifacts = [
    jsonArtifact("pdf_preflight", "pdf-preflight.json", { ...preflight, lineage }),
    jsonArtifact("verapdf_validation", "verapdf-validation.json", { ...validation, lineage, rawReport: rawReportRef }),
  ];
  return rawReport === null ? artifacts : [
    ...artifacts,
    { artifactType: "verapdf_report_xml", fileName: "verapdf-report.xml", contentType: "application/xml", content: rawReport, metadataJson: { kind: "verapdf_report_xml", toolVersion: validation.tool.version, profile: validation.profile, lineage } },
  ];
}
