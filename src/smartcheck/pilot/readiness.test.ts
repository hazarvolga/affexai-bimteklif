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
  }],
  storage: {
    provider: "S3-compatible",
    bucket: "teklifpro-pilot",
    region: "eu-central-1",
    prefix: "company-id/smartcheck",
    encryptionVerified: true,
    leastPrivilegeVerified: true,
    retentionVerified: true,
    smokeTestEvidenceReference: "SMOKE-2026-07-23-01",
  },
};

test("pilot admission passes only with five permissioned files, reviewer and storage evidence", () => {
  assert.deepEqual(validatePilotAdmission(valid), []);
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
