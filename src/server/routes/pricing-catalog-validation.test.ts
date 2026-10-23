import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalogVatPercent } from "./pricing";

test("catalog VAT percent accepts absent and database-scale values", () => {
  assert.deepEqual(parseCatalogVatPercent(undefined), { ok: true, value: null });
  assert.deepEqual(parseCatalogVatPercent(""), { ok: true, value: null });
  assert.deepEqual(parseCatalogVatPercent(0), { ok: true, value: "0" });
  assert.deepEqual(parseCatalogVatPercent("20.25"), { ok: true, value: "20.25" });
  assert.deepEqual(parseCatalogVatPercent(100), { ok: true, value: "100" });
});

test("catalog VAT percent rejects non-finite, out-of-range and overprecision input", () => {
  for (const input of [Number.NaN, Number.POSITIVE_INFINITY, "NaN", -0.01, "-1", 100.01, "101", "20.001", 20.123, "1e2"]) {
    assert.deepEqual(parseCatalogVatPercent(input), { ok: false, value: null }, `input ${String(input)}`);
  }
});
