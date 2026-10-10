import assert from "node:assert/strict";
import test from "node:test";
import { transferReviewEvidence } from "./transfer-evidence";

const row = {
  reviewStatus: "approved", reviewerUserId: "reviewer", reviewedAt: new Date("2026-10-08T10:00:00Z"),
  reviewerNotes: "Checked source", normalizedQuantity: "10.0000", normalizedUnit: "m",
  findingsJson: [{ code: "PRICE", ruleVersion: "pilot-cost-v1" }, { code: "UNIT", ruleVersion: "pilot-unit-v1" }],
};

test("exception retains its decision and is never promoted to verified", () => {
  const result = transferReviewEvidence({ ...row, reviewStatus: "accepted_exception" }, 10, "m");
  assert.equal(result.verificationStatus, "accepted_exception");
  assert.equal(result.review.status, "accepted_exception");
  assert.equal(result.review.reviewerUserId, "reviewer");
  assert.equal(result.review.notes, "Checked source");
  assert.deepEqual(result.review.findingRuleVersions, ["pilot-cost-v1", "pilot-unit-v1"]);
});

test("approved source requires unchanged quantity/unit and recorded human decision", () => {
  assert.equal(transferReviewEvidence(row, 10, "m").verificationStatus, "verified");
  assert.equal(transferReviewEvidence(row, 11, "m").verificationStatus, "unverified");
  assert.equal(transferReviewEvidence(row, 10, "m2").verificationStatus, "unverified");
  assert.equal(transferReviewEvidence({ ...row, reviewerUserId: null }, 10, "m").verificationStatus, "unverified");
  assert.equal(transferReviewEvidence({ ...row, reviewedAt: null }, 10, "m").verificationStatus, "unverified");
});

test("evidence states unknown rule execution and reviewer competence honestly", () => {
  const result = transferReviewEvidence({ ...row, findingsJson: [] }, 10, "m");
  assert.deepEqual(result.review.findingRuleVersions, []);
  assert.equal(result.review.executedRuleSet, null);
  assert.equal(result.review.competencyVerified, false);
  assert.equal(result.review.quantityChanged, false);
});

test("an exception does not authorize changed or unattributed quantities", () => {
  const exception = { ...row, reviewStatus: "accepted_exception" };
  for (const result of [
    transferReviewEvidence(exception, 11, "m"),
    transferReviewEvidence(exception, 10, "kg"),
    transferReviewEvidence({ ...exception, reviewerUserId: null }, 10, "m"),
    transferReviewEvidence({ ...exception, reviewedAt: null }, 10, "m"),
  ]) {
    assert.equal(result.verificationStatus, "unverified");
    assert.equal(result.review.status, "accepted_exception");
  }
});
