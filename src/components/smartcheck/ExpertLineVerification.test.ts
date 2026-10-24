import assert from "node:assert/strict";
import test from "node:test";
import { parseExpertValue } from "./ExpertLineVerification";

test("uzman değeri Türkçe ve noktalı ondalık yazımla doğru okunur", () => {
  assert.equal(parseExpertValue("45,5"), 45.5);
  assert.equal(parseExpertValue("1.234,5"), 1234.5);
  assert.equal(parseExpertValue("12.5"), 12.5);
  assert.equal(parseExpertValue("100"), 100);
  assert.equal(parseExpertValue(""), null);
  assert.equal(parseExpertValue("-3"), null);
  assert.equal(parseExpertValue("abc"), null);
});
