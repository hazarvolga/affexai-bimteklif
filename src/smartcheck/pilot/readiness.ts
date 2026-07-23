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

type Reviewer = {
  userId?: string;
  fullName?: string;
  role?: string;
  competencyEvidenceReference?: string;
  scope?: string;
  appointedAt?: string;
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER = /(MUSTERI|PROJE_ADI|YAZILI_IZIN|REVIEWER_ADI|PILOT_BUCKET|REGION|PREFIX|KARAKTER_SHA256)/i;

function present(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !PLACEHOLDER.test(value);
}

export function validatePilotAdmission(input: PilotAdmission): string[] {
  const errors: string[] = [];
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
    if (!file.permissionGrantedAt || !ISO_DATE.test(file.permissionGrantedAt)) errors.push(`${label}.permissionGrantedAt must use YYYY-MM-DD.`);
    if (!file.retentionUntil || !ISO_DATE.test(file.retentionUntil)) errors.push(`${label}.retentionUntil must use YYYY-MM-DD.`);
    if (!file.sha256 || !SHA256.test(file.sha256)) errors.push(`${label}.sha256 must be a real SHA-256.`);
    else if (checksums.has(file.sha256)) errors.push(`${label}.sha256 must be unique.`);
    else checksums.add(file.sha256);
    if (!Number.isFinite(file.baselinePreparationMinutes) || Number(file.baselinePreparationMinutes) <= 0) {
      errors.push(`${label}.baselinePreparationMinutes must be greater than zero.`);
    }
  });

  const reviewers = input.technicalReviewers ?? [];
  if (reviewers.length === 0) errors.push("At least one technical reviewer is required.");
  reviewers.forEach((reviewer, index) => {
    const label = `technicalReviewers[${index}]`;
    if (!reviewer.userId || !UUID.test(reviewer.userId)) errors.push(`${label}.userId must be a valid membership UUID.`);
    for (const field of ["fullName", "role", "competencyEvidenceReference", "scope"] as const) {
      if (!present(reviewer[field])) errors.push(`${label}.${field} is required.`);
    }
    if (!reviewer.appointedAt || !ISO_DATE.test(reviewer.appointedAt)) errors.push(`${label}.appointedAt must use YYYY-MM-DD.`);
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
  }

  return errors;
}

export function readPilotAdmission(filePath: string): PilotAdmission {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PilotAdmission;
}
