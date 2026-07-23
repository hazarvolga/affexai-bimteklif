import fs from "node:fs";

type PilotFile = {
  fileId?: string;
  customerName?: string;
  projectName?: string;
  discipline?: string;
  permissionReference?: string;
  permissionGrantedAt?: string;
  retentionUntil?: string;
  sha256?: string;
  baselinePreparationMinutes?: number;
};

type ReviewerDecision = "approved" | "pending" | "rejected";

type Reviewer = {
  userId?: string;
  fullName?: string;
  role?: string;
  competencyEvidenceReference?: string;
  scope?: string;
  appointedAt?: string;
  decision?: ReviewerDecision;
  decisionReference?: string;
  decisionAt?: string;
};

type PilotAdmission = {
  pilotId?: string;
  companyId?: string;
  files?: PilotFile[];
  technicalReviewers?: Reviewer[];
  storage?: {
    provider?: string;
    bucket?: string;
    region?: string;
    prefix?: string;
    encryptionVerified?: boolean;
    leastPrivilegeVerified?: boolean;
    retentionVerified?: boolean;
    smokeTestEvidenceReference?: string;
  };
};

export type PilotAdmissionValidationOptions = {
  /** Pin the validation date for repeatable admission evidence. */
  asOf?: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER = /(MUSTERI|PROJE_ADI|YAZILI_IZIN|REVIEWER_ADI|PILOT_BUCKET|REGION|PREFIX|KARAKTER_SHA256)/i;
const SAFE_PREFIX = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*\/$/;
const MEP_DISCIPLINES = new Set(["mep", "mechanical", "electrical", "plumbing", "hvac", "fire_protection"]);

function present(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !PLACEHOLDER.test(value);
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day ? null : parsed;
}

function isMepDiscipline(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replaceAll("-", "_");
  return normalized === "mep" || normalized.split(/[+,/\s]+/).some((token) => MEP_DISCIPLINES.has(token));
}

function utcDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function validatePilotAdmission(input: PilotAdmission, options: PilotAdmissionValidationOptions = {}): string[] {
  const errors: string[] = [];
  const asOf = utcDateOnly(options.asOf ?? new Date());
  if (!present(input.pilotId)) errors.push("pilotId is required.");
  if (!input.companyId || !UUID.test(input.companyId)) errors.push("companyId must be a valid UUID.");

  const files = input.files ?? [];
  if (files.length !== 5) errors.push("Exactly five customer-authorized MEP files are required.");
  const fileIds = new Set<string>();
  const checksums = new Set<string>();
  files.forEach((file, index) => {
    const label = `files[${index}]`;
    if (!present(file.fileId)) errors.push(`${label}.fileId is required.`);
    else if (fileIds.has(file.fileId)) errors.push(`${label}.fileId must be unique.`);
    else fileIds.add(file.fileId);
    for (const field of ["customerName", "projectName", "discipline", "permissionReference"] as const) {
      if (!present(file[field])) errors.push(`${label}.${field} is required.`);
    }
    if (!isMepDiscipline(file.discipline)) errors.push(`${label}.discipline must identify an MEP discipline.`);
    const permissionGrantedAt = parseIsoDate(file.permissionGrantedAt);
    const retentionUntil = parseIsoDate(file.retentionUntil);
    if (!permissionGrantedAt) errors.push(`${label}.permissionGrantedAt must use a real YYYY-MM-DD date.`);
    if (!retentionUntil) errors.push(`${label}.retentionUntil must use a real YYYY-MM-DD date.`);
    if (permissionGrantedAt && permissionGrantedAt > asOf) errors.push(`${label}.permissionGrantedAt cannot be in the future.`);
    if (permissionGrantedAt && retentionUntil && retentionUntil < permissionGrantedAt) errors.push(`${label}.retentionUntil cannot precede permissionGrantedAt.`);
    if (retentionUntil && retentionUntil < asOf) errors.push(`${label}.retentionUntil must cover the admission date.`);
    if (!file.sha256 || !SHA256.test(file.sha256)) errors.push(`${label}.sha256 must be a real SHA-256.`);
    else if (checksums.has(file.sha256)) errors.push(`${label}.sha256 must be unique.`);
    else checksums.add(file.sha256);
    if (!Number.isFinite(file.baselinePreparationMinutes) || Number(file.baselinePreparationMinutes) <= 0) {
      errors.push(`${label}.baselinePreparationMinutes must be greater than zero.`);
    }
  });

  const reviewers = input.technicalReviewers ?? [];
  if (reviewers.length === 0) errors.push("At least one technical reviewer is required.");
  const reviewerIds = new Set<string>();
  reviewers.forEach((reviewer, index) => {
    const label = `technicalReviewers[${index}]`;
    if (!reviewer.userId || !UUID.test(reviewer.userId)) errors.push(`${label}.userId must be a valid membership UUID.`);
    else if (reviewerIds.has(reviewer.userId)) errors.push(`${label}.userId must be unique.`);
    else reviewerIds.add(reviewer.userId);
    for (const field of ["fullName", "role", "competencyEvidenceReference", "scope"] as const) {
      if (!present(reviewer[field])) errors.push(`${label}.${field} is required.`);
    }
    const appointedAt = parseIsoDate(reviewer.appointedAt);
    const decisionAt = parseIsoDate(reviewer.decisionAt);
    if (!appointedAt) errors.push(`${label}.appointedAt must use a real YYYY-MM-DD date.`);
    else if (appointedAt > asOf) errors.push(`${label}.appointedAt cannot be in the future.`);
    if (reviewer.decision !== "approved") errors.push(`${label}.decision must be approved.`);
    if (!present(reviewer.decisionReference)) errors.push(`${label}.decisionReference is required.`);
    if (!decisionAt) errors.push(`${label}.decisionAt must use a real YYYY-MM-DD date.`);
    else if (decisionAt > asOf) errors.push(`${label}.decisionAt cannot be in the future.`);
    if (appointedAt && decisionAt && decisionAt < appointedAt) errors.push(`${label}.decisionAt cannot precede appointedAt.`);
  });

  const storage = input.storage;
  if (!storage) errors.push("storage evidence is required.");
  else {
    for (const field of ["provider", "bucket", "region", "prefix", "smokeTestEvidenceReference"] as const) {
      if (!present(storage[field])) errors.push(`storage.${field} is required.`);
    }
    for (const field of ["encryptionVerified", "leastPrivilegeVerified", "retentionVerified"] as const) {
      if (storage[field] !== true) errors.push(`storage.${field} must be verified.`);
    }
    if (storage.provider?.trim().toLowerCase() !== "s3-compatible") errors.push("storage.provider must be S3-compatible.");
    if (!storage.prefix || !SAFE_PREFIX.test(storage.prefix) || storage.prefix.includes("..")) errors.push("storage.prefix must be a safe tenant-scoped path ending with '/'.");
  }

  return errors;
}

export function readPilotAdmission(filePath: string): PilotAdmission {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PilotAdmission;
}
