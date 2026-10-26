import assert from "node:assert/strict";
import test from "node:test";
import { buildItemPricePayload, matchableCandidate, missingPriceAction, parseTurkishAmount, type PriceSuggestionResult } from "./missing-price";

const ITEM = { id: "calm-beton", title: "C30/37 Betonarme", pozCode: "15.150.1006", unit: "m³" };

function suggestion(overrides: Partial<PriceSuggestionResult["bestSuggestion"] & object> = {}, decision = "review_required"): PriceSuggestionResult {
  return {
    rowId: ITEM.id,
    decision,
    bestSuggestion: {
      snapshot: { id: "snap-1", amount: "3450", currency: "TRY", sourceDocumentHash: "h", positionCode: "15.150.1006", description: "Hazır beton C30", unit: "m3" },
      source: { id: "src-1", name: "Firma kataloğu" },
      warnings: ["LOW_CONFIDENCE"],
      ...overrides,
    },
  };
}

test("a same-poz, same-unit TRY price with only a description warning can be bound by the user", () => {
  assert.equal(matchableCandidate(ITEM, suggestion())?.snapshot.id, "snap-1", "m³ and m3 are the same unit");
});

test("prices the transfer would refuse are never offered for manual binding", () => {
  const base = suggestion().bestSuggestion!;
  assert.equal(matchableCandidate(ITEM, suggestion({}, "safe_candidate")), null, "safe candidates are applied automatically");
  assert.equal(matchableCandidate(ITEM, suggestion({}, "no_match")), null);
  assert.equal(matchableCandidate(ITEM, suggestion({ warnings: ["STALE_PRICE"] })), null);
  assert.equal(matchableCandidate(ITEM, suggestion({ warnings: ["UNIT_MISMATCH"] })), null);
  assert.equal(matchableCandidate(ITEM, suggestion({ snapshot: { ...base.snapshot, positionCode: "15.150.1007" } })), null);
  assert.equal(matchableCandidate(ITEM, suggestion({ snapshot: { ...base.snapshot, unit: "m2" } })), null);
  assert.equal(matchableCandidate(ITEM, suggestion({ snapshot: { ...base.snapshot, currency: "USD" } })), null);
  assert.equal(matchableCandidate({ ...ITEM, pozCode: "UNRESOLVED:x" }, suggestion()), null);
  assert.equal(matchableCandidate(ITEM, undefined), null);
});

test("an item without a poz number goes to review instead of price entry", () => {
  assert.equal(missingPriceAction(ITEM), "add_price");
  assert.equal(missingPriceAction({ ...ITEM, pozCode: "UNRESOLVED:IfcWall" }), "review_poz");
});

test("Turkish money input is read exactly and anything else is rejected", () => {
  assert.equal(parseTurkishAmount("3.450,50"), 3450.5);
  assert.equal(parseTurkishAmount("3450"), 3450);
  assert.equal(parseTurkishAmount("₺ 1.250"), 1250);
  assert.equal(parseTurkishAmount("1.250.000"), 1250000);
  assert.equal(parseTurkishAmount("12.5"), 12.5, "a dot without thousand groups stays a decimal point");
  assert.ok(Number.isNaN(parseTurkishAmount("abc")));
  assert.ok(Number.isNaN(parseTurkishAmount("-5")));
});

test("an owner-entered item price is a VAT-explicit company price approved on import", () => {
  const payload = buildItemPricePayload(ITEM, 3450, "20");
  assert.equal(payload.sourceType, "company_actual");
  assert.equal(payload.reviewDecision, "approved");
  assert.equal(payload.vatStatus, "excluded");
  assert.equal(payload.vatPercent, "20");
  assert.deepEqual(payload.rows, [{ positionCode: "15.150.1006", description: "C30/37 Betonarme", unit: "m³", amount: 3450, currency: "TRY", validUntil: undefined }]);
});
