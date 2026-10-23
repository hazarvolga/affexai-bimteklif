import assert from "node:assert/strict";
import test from "node:test";
import { priceSnapshotMatchesQuotationItem, verifiedPayloadHash } from "./integrity";
import { sha256Payload } from "./snapshots";

const reason = (result: ReturnType<typeof priceSnapshotMatchesQuotationItem>) => "reason" in result ? result.reason : null;

test("source authorization hashes the actual payload and rejects caller hash drift", () => {
  const payload = { supplier: "A", lines: [{ code: "P-1", amount: 10 }] };
  assert.equal(verifiedPayloadHash(payload), sha256Payload(payload));
  assert.equal(verifiedPayloadHash(payload, sha256Payload(payload).toUpperCase()), sha256Payload(payload));
  assert.throws(() => verifiedPayloadHash(undefined), /SOURCE_DOCUMENT_PAYLOAD_REQUIRED/);
  assert.throws(() => verifiedPayloadHash(payload, "a".repeat(64)), /SOURCE_DOCUMENT_HASH_MISMATCH/);
});

test("quote lock requires exact unit, currency, amount and poz equivalence", () => {
  const item = { description: "VRF dış ünite", unit: "Ad.", unitPrice: "525.00", sourceReference: "M-001" };
  const snapshot = { description: "VRF dış ünite", unit: "adet", amount: 525, currency: "TRY", positionCode: "M 001" };
  assert.deepEqual(priceSnapshotMatchesQuotationItem(item, snapshot, "TRY"), { eligible: true });
  assert.equal(reason(priceSnapshotMatchesQuotationItem(item, { ...snapshot, unit: "m" }, "TRY")), "UNIT_MISMATCH");
  assert.equal(reason(priceSnapshotMatchesQuotationItem(item, snapshot, "EUR")), "CURRENCY_MISMATCH");
  assert.equal(reason(priceSnapshotMatchesQuotationItem(item, { ...snapshot, amount: 526 }, "TRY")), "AMOUNT_MISMATCH");
  assert.equal(reason(priceSnapshotMatchesQuotationItem(item, { ...snapshot, positionCode: "M-002" }, "TRY")), "POSITION_CODE_MISMATCH");
});

test("quote lock falls back to exact description only when neither side has a poz", () => {
  const item = { description: "Bakır boru", unit: "m", unitPrice: 12 };
  const snapshot = { description: "Bakır boru", unit: "m", amount: 12, currency: "TRY" };
  assert.deepEqual(priceSnapshotMatchesQuotationItem(item, snapshot, "TRY"), { eligible: true });
  assert.equal(reason(priceSnapshotMatchesQuotationItem(item, { ...snapshot, description: "Bakır tesisat borusu" }, "TRY")), "DESCRIPTION_MISMATCH");
});
