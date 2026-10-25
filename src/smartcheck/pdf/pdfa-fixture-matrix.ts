import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { buildPdfProcessingArtifacts, type PdfProcessingArtifact } from "../import/pdf-artifacts";
import { listFailedVeraPdfRules } from "./verapdf-runner";

const ManifestCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  path: z.string().min(1).refine(value => !path.isAbsolute(value) && !value.split("/").includes(".."), "Fixture path must stay inside the fixtures root."),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  purpose: z.string().min(1),
  expected: z.object({
    isCompliant: z.boolean(),
    failedRules: z.array(z.string()),
    structuralClaim: z.string().nullable(),
    signedValueCount: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export const PdfaMatrixManifestSchema = z.object({
  schemaVersion: z.literal(1),
  task: z.literal("T32"),
  profile: z.literal("2b"),
  validator: z.object({ name: z.literal("veraPDF"), version: z.string().min(1) }).strict(),
  generator: z.string(),
  derivedFrom: z.string(),
  cases: z.array(ManifestCaseSchema).min(1),
}).strict();

export type PdfaMatrixManifest = z.infer<typeof PdfaMatrixManifestSchema>;
type ManifestCase = PdfaMatrixManifest["cases"][number];

export interface PdfaMatrixObservation {
  validationStatus: string;
  toolVersion: string | null;
  isCompliant: boolean | null;
  failedRules: string[];
  structuralClaim: string | null;
  signedValueCount: number;
  rawReport: { checksumSha256: string; sizeBytes: number } | null;
  sourcePreserved: boolean;
}

export interface PdfaMatrixCaseResult {
  id: string;
  path: string;
  sha256: string;
  expected: ManifestCase["expected"];
  observed: PdfaMatrixObservation;
  passed: boolean;
  mismatches: string[];
}

function artifactOf(artifacts: PdfProcessingArtifact[], type: PdfProcessingArtifact["artifactType"]) {
  return artifacts.find(artifact => artifact.artifactType === type) ?? null;
}

/** Reduces the stored processor artifacts to the facts the fixture matrix asserts. */
export function observePdfaArtifacts(artifacts: PdfProcessingArtifact[], sourcePreserved: boolean): PdfaMatrixObservation {
  const preflight = artifactOf(artifacts, "pdf_preflight")?.metadataJson as {
    pdfa: { claimed: { part: string; conformance: string } | null };
    eSignature: { signedValueCount: number };
  } | undefined;
  const validation = artifactOf(artifacts, "verapdf_validation")?.metadataJson as {
    status: string;
    tool: { version: string | null };
    validation: { isCompliant: boolean | null };
    rawReport: { checksumSha256: string; sizeBytes: number } | null;
  } | undefined;
  if (!preflight || !validation) throw new Error("PDFA_MATRIX_ARTIFACT_MISSING");
  const raw = artifactOf(artifacts, "verapdf_report_xml");
  const claim = preflight.pdfa.claimed;
  return {
    validationStatus: validation.status,
    toolVersion: validation.tool.version,
    isCompliant: validation.validation.isCompliant,
    failedRules: raw ? listFailedVeraPdfRules(raw.content.toString("utf8")) : [],
    structuralClaim: claim ? `${claim.part}${claim.conformance}`.toUpperCase() : null,
    signedValueCount: preflight.eSignature.signedValueCount,
    rawReport: validation.rawReport ? { checksumSha256: validation.rawReport.checksumSha256, sizeBytes: validation.rawReport.sizeBytes } : null,
    sourcePreserved,
  };
}

/** Compares one observation with its pre-registered expectation; a structural claim never substitutes for veraPDF. */
export function compareWithExpectation(expected: ManifestCase["expected"], observed: PdfaMatrixObservation, validatorVersion: string): string[] {
  const mismatches: string[] = [];
  if (observed.validationStatus !== "completed") mismatches.push(`validator status ${observed.validationStatus}`);
  if (observed.toolVersion !== validatorVersion) mismatches.push(`validator version ${observed.toolVersion ?? "none"} != ${validatorVersion}`);
  if (observed.isCompliant !== expected.isCompliant) mismatches.push(`isCompliant ${String(observed.isCompliant)} != ${String(expected.isCompliant)}`);
  if (observed.rawReport === null) mismatches.push("raw veraPDF report not stored");
  const expectedRules = [...expected.failedRules].sort().join(",");
  if (observed.failedRules.join(",") !== expectedRules) mismatches.push(`failed rules [${observed.failedRules.join(",")}] != [${expectedRules}]`);
  if (observed.structuralClaim !== expected.structuralClaim) mismatches.push(`structural claim ${observed.structuralClaim ?? "none"} != ${expected.structuralClaim ?? "none"}`);
  if (observed.signedValueCount !== expected.signedValueCount) mismatches.push(`signed values ${observed.signedValueCount} != ${expected.signedValueCount}`);
  if (!observed.sourcePreserved) mismatches.push("source changed");
  return mismatches;
}

const sha256 = (content: Buffer) => createHash("sha256").update(content).digest("hex");

export async function runPdfaFixtureMatrix(
  fixturesRoot: string,
  manifest: PdfaMatrixManifest,
  build: typeof buildPdfProcessingArtifacts = buildPdfProcessingArtifacts,
): Promise<PdfaMatrixCaseResult[]> {
  const results: PdfaMatrixCaseResult[] = [];
  for (const entry of manifest.cases) {
    const inputPath = path.join(fixturesRoot, entry.path);
    const before = await fs.readFile(inputPath);
    if (sha256(before) !== entry.sha256) throw new Error(`PDFA_MATRIX_FIXTURE_HASH_MISMATCH:${entry.id}`);
    const artifacts = await build({ inputPath, fileName: path.basename(entry.path), expectedSourceChecksum: entry.sha256 });
    const sourcePreserved = sha256(await fs.readFile(inputPath)) === entry.sha256;
    const observed = observePdfaArtifacts(artifacts, sourcePreserved);
    const mismatches = compareWithExpectation(entry.expected, observed, manifest.validator.version);
    results.push({ id: entry.id, path: entry.path, sha256: entry.sha256, expected: entry.expected, observed, passed: mismatches.length === 0, mismatches });
  }
  return results;
}
