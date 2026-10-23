import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalProgressRequestHash, createProgressPeriodSchema, progressTransitionSchema } from "./progress-payment";

describe("progress payment boundary contracts", () => {
  it("rejects inverted periods and reasonless cancellation", () => {
    assert.equal(createProgressPeriodSchema.safeParse({ paymentNumber: 1, periodStart: "2026-02-02", periodEnd: "2026-01-01" }).success, false);
    assert.equal(progressTransitionSchema.safeParse({ action: "cancel", expectedVersion: 0 }).success, false);
  });

  it("hashes requests canonically", () => {
    assert.equal(canonicalProgressRequestHash({ b: 2, a: 1 }), canonicalProgressRequestHash({ a: 1, b: 2 }));
    assert.notEqual(canonicalProgressRequestHash({ reviewedAt: new Date("2026-01-01T00:00:00.000Z") }), canonicalProgressRequestHash({ reviewedAt: new Date("2026-01-02T00:00:00.000Z") }));
  });
});
