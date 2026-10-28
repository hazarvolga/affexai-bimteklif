import assert from "node:assert/strict";
import test from "node:test";
import { removeBankAt } from "./bank-account-list";

test("an administrator can remove the final bank without mutating the old list", () => {
  const original = [{ id: "bank-a" }];
  assert.deepEqual(removeBankAt(original, 0), []);
  assert.deepEqual(original, [{ id: "bank-a" }]);
});
