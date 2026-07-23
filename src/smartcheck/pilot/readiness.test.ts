import assert from "node:assert/strict";
import test from "node:test";
import { validatePilotAdmission } from "./readiness";

const valid = {
  pilotId: "mep-pilot-2026-07",
  companyId: "11111111-1111-4111-8111-111111111111",
  files: Array.from({ length: 5 }, (_, index) => ({
    fileId: `MEP-0${index + 1}`,
    customerName: `Customer ${index + 1}`,
    projectName: `Project ${index + 1}`,
    discipline: index % 2 ? "electrical" : "mechanical",
    permissionReference: `CONSENT-${index + 1}`,
    permissionGrantedAt: "2026-07-23",
    retentionUntil: "2026-10-23",
    sha256: String(index + 1).repeat(64),
    baselinePreparationMinutes: 120,
  })),
  technicalReviewers: [{
    userId: "22222222-2222-4222-8222-222222222222",
    fullName: "Pilot Reviewer",
    role: "MEP Quantity Surveyor",
    competencyEvidenceReference: "HR-APPOINTMENT-01",
    scope: "unit quantity duplicate source cost integrity",
    appointedAt: "2026-07-23",
    decision: "approved" as const,
    decisionReference: "REVIEW-APPROVAL-01",
    decisionAt: "2026-07-23",
  }],
  storage: {
    provider: "S3-compatible",
    bucket: "teklifpro-pilot",
    region: "eu-central-1",
    prefix: "company-id/smartcheck/",
    encryptionVerified: true,
    leastPrivilegeVerified: true,
    retentionVerified: true,
    smokeTestEvidenceReference: "SMOKE-2026-07-23-01",
  },
};

test("pilot admission passes only with five permissioned files, reviewer and storage evidence", () => {
  assert.deepEqual(validatePilotAdmission(valid, { asOf: new Date("2026-07-23T12:00:00Z") }), []);
});

test("pilot admission rejects placeholders and incomplete external evidence", () => {
  const errors = validatePilotAdmission({
    ...valid,
    files: valid.files.slice(0, 1),
    technicalReviewers: [],
    storage: { ...valid.storage, bucket: "PILOT_BUCKET", encryptionVerified: false },
  });
  assert.ok(errors.includes("Exactly five customer-authorized MEP files are required."));
  assert.ok(errors.includes("At least one technical reviewer is required."));
  assert.ok(errors.includes("storage.bucket is required."));
  assert.ok(errors.includes("storage.encryptionVerified must be verified."));
});

test("pilot admission rejects stale or temporally inconsistent consent evidence", () => {
  const errors = validatePilotAdmission({
    ...valid,
    files: valid.files.map((file, index) => index === 0 ? {
      ...file,
      permissionGrantedAt: "2026-07-25",
      retentionUntil: "2026-07-23",
    } : file),
  }, { asOf: new Date("2026-07-24T12:00:00Z") });
  assert.ok(errors.includes("files[0].permissionGrantedAt cannot be in the future."));
  assert.ok(errors.includes("files[0].retentionUntil cannot precede permissionGrantedAt."));
  assert.ok(errors.includes("files[0].retentionUntil must cover the admission date."));
});

test("pilot admission requires an approved, unique technical reviewer and safe storage prefix", () => {
  const errors = validatePilotAdmission({
    ...valid,
    technicalReviewers: [
      { ...valid.technicalReviewers[0], decision: "pending" },
      { ...valid.technicalReviewers[0] },
    ],
    storage: { ...valid.storage, prefix: "../shared" },
  }, { asOf: new Date("2026-07-23T12:00:00Z") });
  assert.ok(errors.includes("technicalReviewers[0].decision must be approved."));
  assert.ok(errors.includes("technicalReviewers[1].userId must be unique."));
  assert.ok(errors.includes("storage.prefix must be a safe tenant-scoped path ending with '/'."));
});
