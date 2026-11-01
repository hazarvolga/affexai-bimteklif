import assert from "node:assert/strict";
import test from "node:test";
import { canChangeQuotationStatus } from "./status-transitions";

test("a quotation moves forward through the sales steps", () => {
  for (const [from, to] of [["draft", "sent"], ["sent", "negotiation"], ["negotiation", "won"], ["sent", "lost"], ["won", "archived"], ["lost", "archived"], ["draft", "won"]] as const) {
    assert.equal(canChangeQuotationStatus(from, to), true, `${from} -> ${to}`);
  }
});

test("a closed quotation cannot silently return to an open or opposite result", () => {
  for (const [from, to] of [["won", "draft"], ["won", "lost"], ["lost", "won"], ["lost", "draft"], ["sent", "draft"], ["archived", "draft"], ["archived", "won"]] as const) {
    assert.equal(canChangeQuotationStatus(from, to), false, `${from} -> ${to}`);
  }
});

test("a lost quotation can reopen into negotiation, and repeating a status is harmless", () => {
  assert.equal(canChangeQuotationStatus("lost", "negotiation"), true);
  assert.equal(canChangeQuotationStatus("won", "won"), true);
  assert.equal(canChangeQuotationStatus("archived", "archived"), true);
});
