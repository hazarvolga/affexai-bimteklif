import assert from "node:assert/strict";
import test from "node:test";
import { hasSelectedBankAccount } from "./billing-transfer-state";

test("payment submission requires a currently listed active bank selection", () => {
  assert.equal(hasSelectedBankAccount([], ""), false);
  assert.equal(hasSelectedBankAccount([{ id: "bank-1" }], ""), false);
  assert.equal(hasSelectedBankAccount([{ id: "bank-1" }], "removed-bank"), false);
  assert.equal(hasSelectedBankAccount([{ id: "bank-1" }], "bank-1"), true);
});
