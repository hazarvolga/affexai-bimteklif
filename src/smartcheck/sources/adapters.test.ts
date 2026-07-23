import assert from "node:assert/strict";
import test from "node:test";
import { assertAllowedSourceUrl, diffSourcePayload, normalizeOfficialPayload, sourcePayloadHash } from "./adapters";

test("official adapter normalization is bounded and advisory", () => {
  const payload = normalizeOfficialPayload("yfk", {
    sourceDocumentIdentifier: "YFK-2026-07",
    sourceVersion: "2026.07",
    entries: [{ positionCode: "M-001", description: "VRF dış ünite", unit: "adet", amount: "125000", currency: "TRY", confidence: 0.9 }, { description: "geçersiz", amount: -1, unit: "adet" }],
    changes: [{ title: "ignored", summary: "ignored", sourceText: "ignored" }],
  });
  assert.equal(payload.entries.length, 1);
  assert.equal(payload.entries[0].amount, 125000);
  assert.equal(payload.changes.length, 0);
  assert.match(sourcePayloadHash(payload), /^[a-f0-9]{64}$/);
});

test("official source host allowlist rejects SSRF-like URLs", () => {
  assert.equal(assertAllowedSourceUrl("resmi_gazete", "https://www.resmigazete.gov.tr/eskiler/2026/07/20260723.htm"), "https://www.resmigazete.gov.tr/eskiler/2026/07/20260723.htm");
  assert.throws(() => assertAllowedSourceUrl("resmi_gazete", "http://www.resmigazete.gov.tr/feed"), /SOURCE_HOST_NOT_ALLOWED/);
  assert.throws(() => assertAllowedSourceUrl("resmi_gazete", "https://evil.example.test/feed"), /SOURCE_HOST_NOT_ALLOWED/);
});

test("source diff is deterministic and identifies additions, changes, removals", () => {
  const previous = normalizeOfficialPayload("tuik", { sourceDocumentIdentifier: "TUIK-1", entries: [{ positionCode: "I-1", description: "Endeks", unit: "%", amount: 100 }] });
  const next = normalizeOfficialPayload("tuik", { sourceDocumentIdentifier: "TUIK-2", entries: [{ positionCode: "I-1", description: "Endeks", unit: "%", amount: 107 }, { positionCode: "I-2", description: "Yeni", unit: "%", amount: 4 }] });
  const diff = diffSourcePayload(previous, next);
  assert.equal(diff.changed, true);
  assert.equal(diff.added, 1);
  assert.equal(diff.changedCount, 1);
  assert.equal(diff.removed, 0);
});
