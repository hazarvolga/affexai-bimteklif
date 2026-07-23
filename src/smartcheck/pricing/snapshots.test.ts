import assert from "node:assert/strict";
import test from "node:test";
import { buildPriceSnapshotKey, computePricingLockHash, isPriceSnapshotStale, sha256Payload } from "./snapshots";

test("price snapshot keys are stable and source-bound", () => {
  const first = buildPriceSnapshotKey({ sourceDocumentHash: "a".repeat(64), description: "Bakır boru", unit: "m", amount: "1245.00", currency: "TRY", capturedAt: "2026-07-23T00:00:00.000Z" });
  const second = buildPriceSnapshotKey({ sourceDocumentHash: "a".repeat(64), description: "Bakır boru", unit: "m", amount: "1245.00", currency: "TRY", capturedAt: new Date("2026-07-23T00:00:00.000Z") });
  const changedSource = buildPriceSnapshotKey({ sourceDocumentHash: "b".repeat(64), description: "Bakır boru", unit: "m", amount: "1245.00", currency: "TRY", capturedAt: "2026-07-23T00:00:00.000Z" });
  assert.equal(first, second);
  assert.notEqual(first, changedSource);
  assert.equal(sha256Payload({ b: 2, a: 1 }), sha256Payload({ a: 1, b: 2 }));
});

test("stale prices and lock hashes are deterministic", () => {
  assert.equal(isPriceSnapshotStale({ validUntil: "2026-07-22T23:59:59.000Z" }, new Date("2026-07-23T00:00:00.000Z")), true);
  assert.equal(isPriceSnapshotStale({ validUntil: "2026-07-24T00:00:00.000Z" }, new Date("2026-07-23T00:00:00.000Z")), false);
  const items = [{ quotationItemId: "b", priceSnapshotId: "s2", priceSnapshotStatus: "locked", amount: "20", currency: "TRY", unit: "m" }, { quotationItemId: "a", priceSnapshotId: "s1", priceSnapshotStatus: "locked", amount: "10", currency: "TRY", unit: "adet" }];
  assert.equal(computePricingLockHash(items), computePricingLockHash([...items].reverse()));
});
