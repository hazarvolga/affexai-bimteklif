import assert from "node:assert/strict";
import test from "node:test";
import { canonicalPriceUnit, suggestPriceSnapshotsForRow, type PriceSnapshotMatchCandidate } from "./matching";
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
  assert.equal(isPriceSnapshotStale({ validFrom: "2026-07-24T00:00:00.000Z", validUntil: null }, new Date("2026-07-23T00:00:00.000Z")), true);
  assert.equal(isPriceSnapshotStale({ validFrom: "2026-07-22T00:00:00.000Z", validUntil: null }, new Date("2026-07-23T00:00:00.000Z")), false);
  const items = [{ quotationItemId: "b", priceSnapshotId: "s2", priceSnapshotStatus: "locked", amount: "20", currency: "TRY", unit: "m" }, { quotationItemId: "a", priceSnapshotId: "s1", priceSnapshotStatus: "locked", amount: "10", currency: "TRY", unit: "adet" }];
  assert.equal(computePricingLockHash(items), computePricingLockHash([...items].reverse()));
});

test("price snapshot suggestions are advisory and unit-aware", () => {
  const candidates: PriceSnapshotMatchCandidate[] = [
    {
      snapshot: {
        id: "vrf-snapshot",
        sourceDocumentHash: "a".repeat(64),
        positionCode: "M-CSV-001",
        description: "VRF dış ünite",
        unit: "adet",
        amount: "12500.50",
        currency: "TRY",
        reviewStatus: "advisory",
        validUntil: "2026-12-31T00:00:00.000Z",
        region: "İstanbul",
        capturedAt: "2026-08-01T00:00:00.000Z",
      },
      source: { id: "supplier-source", name: "Tedarikçi CSV", sourceType: "supplier_quote", licenseStatus: "not_applicable", region: "İstanbul" },
    },
    {
      snapshot: {
        id: "copper-snapshot",
        sourceDocumentHash: "b".repeat(64),
        positionCode: "M-CSV-002",
        description: "Bakır boru",
        unit: "m",
        amount: 245,
        currency: "TRY",
        reviewStatus: "approved",
        validUntil: "2026-12-31T00:00:00.000Z",
        region: null,
        capturedAt: "2026-08-01T00:00:00.000Z",
      },
      source: { id: "actual-source", name: "Son teklif hafızası", sourceType: "company_actual", licenseStatus: "not_applicable" },
    },
  ];

  const exact = suggestPriceSnapshotsForRow({ rowId: "exact-row", positionCode: "M CSV 001", description: "VRF Dış Ünite", unit: "Ad.", region: "İstanbul" }, candidates, { now: new Date("2026-08-02T00:00:00.000Z") })[0];
  assert.equal(exact.snapshot.id, "vrf-snapshot");
  assert.equal(exact.matchType, "position_unit_exact");
  assert.equal(exact.warnings.length, 0);
  assert.ok(exact.score >= 0.9);

  const fuzzy = suggestPriceSnapshotsForRow({ rowId: "fuzzy-row", description: "Bakır tesisat borusu", unit: "mt" }, candidates, { now: new Date("2026-08-02T00:00:00.000Z") })[0];
  assert.equal(fuzzy.snapshot.id, "copper-snapshot");
  assert.match(fuzzy.matchType, /^description_unit_/);

  const mismatch = suggestPriceSnapshotsForRow({ rowId: "unit-warning-row", positionCode: "M-CSV-001", description: "VRF dış ünite", unit: "m" }, candidates, { now: new Date("2026-08-02T00:00:00.000Z") })[0];
  assert.equal(mismatch.snapshot.id, "vrf-snapshot");
  assert.equal(mismatch.matchType, "position_only_unit_mismatch");
  assert.ok(mismatch.warnings.includes("UNIT_MISMATCH"));

  assert.equal(canonicalPriceUnit("m²"), "m2");
  assert.equal(canonicalPriceUnit("m^3"), "m3");
});
