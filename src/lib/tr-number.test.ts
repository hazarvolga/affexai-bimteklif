import assert from "node:assert/strict";
import test from "node:test";
import { parseTrNumber, parseTrNumberList } from "./tr-number";

test("Türkçe ve İngilizce biçimli sayılar okunur", () => {
  assert.equal(parseTrNumber("1.250.000,50"), 1250000.5);
  assert.equal(parseTrNumber("1250000,5"), 1250000.5);
  assert.equal(parseTrNumber("1 250 000"), 1250000);
  assert.equal(parseTrNumber("1250000.5"), 1250000.5);
  assert.equal(parseTrNumber("1.250.000"), 1250000);
  assert.equal(parseTrNumber("0,9"), 0.9);
  assert.equal(parseTrNumber("-3,5"), -3.5);
});

test("geçersiz girdi null döner", () => {
  for (const bad of ["", "  ", "abc", "1,2,3", "12a", "--1"]) assert.equal(parseTrNumber(bad), null, bad);
});

test("liste: satır/noktalı virgül ayrımı ve geçersiz öğe raporu", () => {
  const r = parseTrNumberList("1.000.000\n2.500.000,50;x;\n 3000000 ");
  assert.deepEqual(r.values, [1000000, 2500000.5, 3000000]);
  assert.deepEqual(r.invalid, ["x"]);
});
