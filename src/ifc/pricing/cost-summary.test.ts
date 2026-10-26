import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCost } from "./cost-summary";

const groups = [
  { key: "kaba", title: "Kaba İnşaat", items: [{ id: "a", netQuantity: 10 }, { id: "b", netQuantity: 5 }] },
  { key: "ince", title: "İnce İşler", items: [{ id: "c", netQuantity: 2 }] },
];

test("a missing price is unknown, not zero: totals cover priced items only and say so", () => {
  const summary = summarizeCost({ groups, unitPrices: { a: 100 }, overheadPercent: 10, residentialUnitCount: 4, grossM2: 200 });
  assert.equal(summary.pricedItemCount, 1);
  assert.equal(summary.itemCount, 3);
  assert.equal(summary.missingItemCount, 2);
  assert.equal(summary.status, "partial");
  assert.deepEqual(summary.groupTotals.map(g => [g.key, g.pricedSubtotal, g.missingItemCount]), [["kaba", 1000, 1], ["ince", 0, 1]]);
  assert.equal(summary.pricedDirectTotal, 1000);
  assert.equal(summary.pricedGrandTotal, 1100);
  assert.equal(summary.perApartment, null, "per-unit figures are withheld while any item lacks a price");
  assert.equal(summary.perGrossM2, null);
});

test("an explicit zero price counts as priced", () => {
  const summary = summarizeCost({ groups, unitPrices: { a: 0, b: 0, c: 0 }, overheadPercent: 0, residentialUnitCount: 2, grossM2: null });
  assert.equal(summary.status, "complete");
  assert.equal(summary.pricedGrandTotal, 0);
  assert.equal(summary.perApartment, 0);
});

test("with no priced item the total is not calculated at all", () => {
  const summary = summarizeCost({ groups, unitPrices: {}, overheadPercent: 10, residentialUnitCount: 4, grossM2: 200 });
  assert.equal(summary.status, "none");
  assert.equal(summary.pricedItemCount, 0);
  assert.equal(summary.perApartment, null);
});

test("complete pricing yields per-apartment and per-m² figures", () => {
  const summary = summarizeCost({ groups, unitPrices: { a: 100, b: 20, c: 50 }, overheadPercent: 10, residentialUnitCount: 4, grossM2: 220 });
  assert.equal(summary.status, "complete");
  assert.equal(summary.pricedDirectTotal, 1200);
  assert.equal(summary.overheadAmount, 120);
  assert.equal(summary.pricedGrandTotal, 1320);
  assert.equal(summary.perApartment, 330);
  assert.equal(summary.perGrossM2, 6);
});

test("an unknown apartment count never turns the grand total into a per-apartment figure", () => {
  const summary = summarizeCost({ groups, unitPrices: { a: 100, b: 20, c: 50 }, overheadPercent: 0, residentialUnitCount: 0, grossM2: 0 });
  assert.equal(summary.perApartment, null);
  assert.equal(summary.perGrossM2, null);
});

test("an empty dataset has nothing to price", () => {
  const summary = summarizeCost({ groups: [], unitPrices: {}, overheadPercent: 0, residentialUnitCount: 0, grossM2: null });
  assert.equal(summary.status, "empty");
  assert.equal(summary.itemCount, 0);
});

test("non-finite prices are treated as missing", () => {
  const summary = summarizeCost({ groups, unitPrices: { a: Number.NaN, b: Number.POSITIVE_INFINITY, c: 10 }, overheadPercent: 0, residentialUnitCount: 1, grossM2: null });
  assert.equal(summary.pricedItemCount, 1);
  assert.equal(summary.pricedDirectTotal, 20);
});
