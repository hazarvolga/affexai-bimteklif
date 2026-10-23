import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  VeraPdfValidationReportSchema,
  type VeraPdfValidationReport,
} from "./verapdf-report";

const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const PROFILE_NAMES = {
  "1a": "PDF/A-1a validation profile", "1b": "PDF/A-1b validation profile",
  "2a": "PDF/A-2a validation profile", "2b": "PDF/A-2b validation profile", "2u": "PDF/A-2u validation profile",
  "3a": "PDF/A-3a validation profile", "3b": "PDF/A-3b validation profile", "3u": "PDF/A-3u validation profile",
  "4": "PDF/A-4 validation profile", "4e": "PDF/A-4e validation profile", "4f": "PDF/A-4f validation profile",
} as const;

export type VeraPdfProfile = keyof typeof PROFILE_NAMES;

export interface VeraPdfRunnerOptions {
  executablePath?: string;
  profile?: VeraPdfProfile;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export class VeraPdfRunnerError extends Error {
  constructor(public readonly code: string, message = code) {
    super(message);
    this.name = "VeraPdfRunnerError";
  }
}

interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

interface ParsedXmlReport {
  profileName: string;
  statement: string | null;
  isCompliant: boolean;
  scanComplete: boolean;
  passedRules: number;
  failedRules: number;
  passedChecks: number;
  failedChecks: number;
}

function resolveLimit(value: number | undefined, fallback: number, maximum: number, code: string): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1 || resolved > maximum) throw new VeraPdfRunnerError(code);
  return resolved;
}

function xmlAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return match ? decodeXml(match[1] ?? match[2] ?? "") : null;
}

function decodeXml(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'",
  })[entity] ?? entity);
}

function nonNegativeInteger(value: string | null, field: string): number {
  if (value === null || !/^\d+$/.test(value)) throw new VeraPdfRunnerError("VERAPDF_INVALID_XML", `Missing or invalid ${field}.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new VeraPdfRunnerError("VERAPDF_INVALID_XML", `Invalid ${field}.`);
  return parsed;
}

function normalizedOfficialProfileName(value: string): string | null {
  const match = value.match(/^PDF\/A-(1[ab]|2[abu]|3[abu]|4[ef]?) validation profile$/i);
  return match ? `PDF/A-${match[1].toLowerCase()} validation profile` : null;
}

export function parseVeraPdfXml(xml: string): ParsedXmlReport {
  if (!xml.trim().startsWith("<?xml") || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new VeraPdfRunnerError("VERAPDF_INVALID_XML");
  if (!/<report(?:\s|>)/i.test(xml) || !/<\/report\s*>/i.test(xml)) throw new VeraPdfRunnerError("VERAPDF_INVALID_XML");
  const reports = xml.match(/<validationReport\b[^>]*>/gi) ?? [];
  const details = xml.match(/<details\b[^>]*>/gi) ?? [];
  const summaries = xml.match(/<batchSummary\b[^>]*>/gi) ?? [];
  const validationSummaries = xml.match(/<validationReports\b[^>]*>/gi) ?? [];
  if (reports.length !== 1 || details.length !== 1 || summaries.length !== 1 || validationSummaries.length !== 1) {
    throw new VeraPdfRunnerError("VERAPDF_INVALID_XML", "Expected one veraPDF validation job.");
  }

  const report = reports[0];
  const detail = details[0];
  const summary = summaries[0];
  const validationSummary = validationSummaries[0];
  const compliantText = xmlAttribute(report, "isCompliant");
  if (compliantText !== "true" && compliantText !== "false") throw new VeraPdfRunnerError("VERAPDF_INVALID_XML");

  const totalJobs = nonNegativeInteger(xmlAttribute(summary, "totalJobs"), "totalJobs");
  const failedToParse = nonNegativeInteger(xmlAttribute(summary, "failedToParse"), "failedToParse");
  const encrypted = nonNegativeInteger(xmlAttribute(summary, "encrypted"), "encrypted");
  const outOfMemory = nonNegativeInteger(xmlAttribute(summary, "outOfMemory"), "outOfMemory");
  const veraExceptions = nonNegativeInteger(xmlAttribute(summary, "veraExceptions"), "veraExceptions");
  const failedJobs = nonNegativeInteger(xmlAttribute(validationSummary, "failedJobs"), "failedJobs");
  const compliant = nonNegativeInteger(xmlAttribute(validationSummary, "compliant"), "compliant");
  const nonCompliant = nonNegativeInteger(xmlAttribute(validationSummary, "nonCompliant"), "nonCompliant");
  const summaryMatchesReport = compliantText === "true"
    ? compliant === 1 && nonCompliant === 0
    : compliant === 0 && nonCompliant === 1;
  const passedRules = nonNegativeInteger(xmlAttribute(detail, "passedRules"), "passedRules");
  const failedRules = nonNegativeInteger(xmlAttribute(detail, "failedRules"), "failedRules");
  const passedChecks = nonNegativeInteger(xmlAttribute(detail, "passedChecks"), "passedChecks");
  const failedChecks = nonNegativeInteger(xmlAttribute(detail, "failedChecks"), "failedChecks");
  const detailsMatchReport = compliantText === "true"
    ? failedRules === 0 && failedChecks === 0
    : failedRules > 0 || failedChecks > 0;
  const scanComplete = totalJobs === 1 && failedToParse === 0 && encrypted === 0 && outOfMemory === 0 && veraExceptions === 0 && failedJobs === 0 && summaryMatchesReport && detailsMatchReport;

  return {
    profileName: xmlAttribute(report, "profileName") ?? "",
    statement: xmlAttribute(report, "statement"),
    isCompliant: compliantText === "true",
    scanComplete,
    passedRules,
    failedRules,
    passedChecks,
    failedChecks,
  };
}

async function runBoundedProcess(executablePath: string, args: string[], timeoutMs: number, maxOutputBytes: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let outputBytes = 0;
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill("SIGKILL");
      reject(error);
    };
    const append = (current: Buffer, chunk: Buffer): Buffer => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        finishReject(new VeraPdfRunnerError("VERAPDF_OUTPUT_TOO_LARGE"));
        return current;
      }
      return Buffer.concat([current, chunk]);
    };
    child.stdout.on("data", (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); });
    child.once("error", error => finishReject(Object.assign(new VeraPdfRunnerError("VERAPDF_EXECUTABLE_UNAVAILABLE"), { cause: error })));
    child.once("close", exitCode => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ exitCode, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") });
    });
    timer = setTimeout(() => finishReject(new VeraPdfRunnerError("VERAPDF_TIMEOUT")), timeoutMs);
    timer.unref();
  });
}

async function sourceEvidence(inputPath: string, fileName: string) {
  const source = await fs.readFile(inputPath);
  return {
    fileName,
    checksumSha256: createHash("sha256").update(source).digest("hex"),
    sizeBytes: source.length,
    preserved: true as const,
  };
}

function unavailableReport(source: Awaited<ReturnType<typeof sourceEvidence>>, profile: VeraPdfProfile, reason: "not_configured" | "executable_unavailable" | "version_unavailable"): VeraPdfValidationReport {
  return VeraPdfValidationReportSchema.parse({
    schemaVersion: 1, kind: "verapdf_validation", status: "unavailable",
    tool: { name: "veraPDF", version: null, status: "unavailable" },
    profile: { code: profile, name: PROFILE_NAMES[profile] }, source,
    validation: { isCompliant: null, scanComplete: false, passedRules: null, failedRules: null, passedChecks: null, failedChecks: null, statement: null },
    conversion: { status: "disabled_requires_licensed_provider", outputCreated: false, sourceOverwritten: false },
    unavailableReason: reason,
  });
}

export async function runVeraPdfValidation(inputPath: string, fileName: string, options: VeraPdfRunnerOptions = {}): Promise<VeraPdfValidationReport> {
  const timeoutMs = resolveLimit(options.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, "VERAPDF_INVALID_TIMEOUT");
  const maxOutputBytes = resolveLimit(options.maxOutputBytes, DEFAULT_MAX_OUTPUT_BYTES, MAX_OUTPUT_BYTES, "VERAPDF_INVALID_OUTPUT_LIMIT");
  const profile = options.profile ?? "2b";
  if (!(profile in PROFILE_NAMES)) throw new VeraPdfRunnerError("VERAPDF_INVALID_PROFILE");
  const source = await sourceEvidence(inputPath, fileName);
  const executablePath = options.executablePath ?? process.env.VERAPDF_CLI_PATH;
  if (!executablePath) return unavailableReport(source, profile, "not_configured");
  if (!path.isAbsolute(executablePath)) throw new VeraPdfRunnerError("VERAPDF_INVALID_CONFIGURATION", "VERAPDF_CLI_PATH must be absolute.");

  let versionResult: ProcessResult;
  try {
    versionResult = await runBoundedProcess(executablePath, ["--version"], Math.min(timeoutMs, 10_000), maxOutputBytes);
  } catch (error) {
    if (error instanceof VeraPdfRunnerError && error.code === "VERAPDF_EXECUTABLE_UNAVAILABLE") return unavailableReport(source, profile, "executable_unavailable");
    throw error;
  }
  const version = `${versionResult.stdout}\n${versionResult.stderr}`.match(/\b\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?\b/)?.[0] ?? null;
  if (versionResult.exitCode !== 0 || version === null) return unavailableReport(source, profile, "version_unavailable");

  const result = await runBoundedProcess(executablePath, [
    "--format", "xml", "--flavour", profile, "--loglevel", "0", "--maxfailuresdisplayed", "100", inputPath,
  ], timeoutMs, maxOutputBytes);
  if (result.exitCode !== 0 && result.exitCode !== 1) throw new VeraPdfRunnerError("VERAPDF_PROCESS_FAILED");
  const parsed = parseVeraPdfXml(result.stdout);
  const expectedExitCode = parsed.isCompliant ? 0 : 1;
  if (result.exitCode !== expectedExitCode) throw new VeraPdfRunnerError("VERAPDF_EXIT_REPORT_MISMATCH");
  if (!parsed.scanComplete) throw new VeraPdfRunnerError("VERAPDF_INCOMPLETE_SCAN");
  if (normalizedOfficialProfileName(parsed.profileName) !== PROFILE_NAMES[profile]) throw new VeraPdfRunnerError("VERAPDF_PROFILE_MISMATCH");
  const sourceAfterValidation = await sourceEvidence(inputPath, fileName);
  if (sourceAfterValidation.checksumSha256 !== source.checksumSha256 || sourceAfterValidation.sizeBytes !== source.sizeBytes) {
    throw new VeraPdfRunnerError("VERAPDF_SOURCE_CHANGED");
  }

  return VeraPdfValidationReportSchema.parse({
    schemaVersion: 1, kind: "verapdf_validation", status: "completed",
    tool: { name: "veraPDF", version, status: "available" },
    profile: { code: profile, name: parsed.profileName }, source,
    validation: {
      isCompliant: parsed.isCompliant, scanComplete: true,
      passedRules: parsed.passedRules, failedRules: parsed.failedRules,
      passedChecks: parsed.passedChecks, failedChecks: parsed.failedChecks,
      statement: parsed.statement,
    },
    conversion: { status: "disabled_requires_licensed_provider", outputCreated: false, sourceOverwritten: false },
    unavailableReason: null,
  });
}
