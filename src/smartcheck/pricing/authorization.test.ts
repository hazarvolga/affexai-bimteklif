import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateManualSnapshotApproval,
  evaluatePriceSourceAuthorization,
  selectPriceCandidate,
  type PriceCandidate,
} from "./authorization";

test("manual snapshot approval requires a distinct attributable reviewer", () => {
  assert.deepEqual(evaluateManualSnapshotApproval({
    sourceCreatorUserId: "source-owner",
    snapshotCreatorUserId: "snapshot-owner",
    reviewerUserId: "snapshot-owner",
    reviewerNotes: "Kontrol edildi.",
  }), { eligible: false, reason: "snapshot_creator_is_reviewer" });
  assert.deepEqual(evaluateManualSnapshotApproval({
    sourceCreatorUserId: "source-owner",
    snapshotCreatorUserId: null,
    reviewerUserId: "reviewer",
    reviewerNotes: "Kontrol edildi.",
  }), { eligible: false, reason: "snapshot_creator_missing" });
  assert.deepEqual(evaluateManualSnapshotApproval({
    sourceCreatorUserId: "source-owner",
    snapshotCreatorUserId: "snapshot-owner",
    reviewerUserId: "reviewer",
    reviewerNotes: "Kontrol edildi.",
  }), { eligible: true, reason: null });
});

const candidate = (overrides: Partial<PriceCandidate> = {}): PriceCandidate => ({
  snapshotId: "snapshot-1",
  sourceId: "source-1",
  sourceType: "supplier_quote",
  authorizationStatus: "authorized",
  authorizationEvidenceHash: "a".repeat(64),
  reviewStatus: "approved",
  positionCode: "15.150.1006",
  unit: "m³",
  amount: 100,
  validFrom: "2026-01-01T00:00:00.000Z",
  validUntil: "2026-12-31T23:59:59.000Z",
  capturedAt: "2026-03-01T00:00:00.000Z",
  ...overrides,
});

test("commercial official reference is fail-closed without authorization evidence", () => {
  assert.deepEqual(
    evaluatePriceSourceAuthorization({
      sourceType: "official_reference",
      authorizationStatus: "pending",
      authorizationEvidenceHash: null,
    }),
    { eligible: false, reason: "authorization_pending" },
  );
});

test("authorized source still requires evidence hash", () => {
  assert.deepEqual(
    evaluatePriceSourceAuthorization({
      sourceType: "supplier_quote",
      authorizationStatus: "authorized",
      authorizationEvidenceHash: null,
    }),
    { eligible: false, reason: "authorization_evidence_missing" },
  );
});

test("resolver selects only exact unit, approved, current and authorized candidate", () => {
  const result = selectPriceCandidate({
    positionCode: "15.150.1006",
    unit: "m³",
    at: new Date("2026-06-01T00:00:00.000Z"),
    candidates: [
      candidate({ snapshotId: "pending", authorizationStatus: "pending" }),
      candidate({ snapshotId: "wrong-unit", unit: "m²" }),
      candidate({ snapshotId: "expired", validUntil: "2026-05-01T00:00:00.000Z" }),
      candidate({ snapshotId: "approved-current" }),
    ],
  });

  assert.equal(result.status, "selected");
  assert.equal(result.candidate?.snapshotId, "approved-current");
  assert.deepEqual(result.rejections.map((entry) => entry.reason).sort(), [
    "authorization_pending",
    "expired",
    "unit_mismatch",
  ]);
});

test("resolver refuses ambiguity instead of choosing a generic or arbitrary price", () => {
  const result = selectPriceCandidate({
    positionCode: "15.150.1006",
    unit: "m³",
    at: new Date("2026-06-01T00:00:00.000Z"),
    candidates: [candidate({ snapshotId: "a" }), candidate({ snapshotId: "b" })],
  });

  assert.equal(result.status, "review_required");
  assert.equal(result.reason, "ambiguous_candidates");
  assert.equal(result.candidate, null);
});

test("manual override is attributable and immutable evidence, otherwise rejected", () => {
  const result = selectPriceCandidate({
    positionCode: "MANUAL-01",
    unit: "adet",
    at: new Date("2026-06-01T00:00:00.000Z"),
    candidates: [candidate({
      snapshotId: "manual",
      positionCode: "MANUAL-01",
      unit: "adet",
      sourceType: "manual_override",
      reviewedByUserId: null,
      reviewedAt: null,
      reviewerNotes: null,
    })],
  });

  assert.equal(result.status, "review_required");
  assert.equal(result.rejections[0]?.reason, "manual_attribution_missing");
});
