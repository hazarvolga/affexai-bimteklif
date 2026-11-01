import assert from "node:assert/strict";
import test from "node:test";
import { summarizeOpeningsOverview } from "./openings-overview";

const openings = [
  { id: "1", kind: "door", widthM: 0.9, heightM: 2.1 },
  { id: "2", kind: "door", widthM: 0.9, heightM: 2.1 },
  { id: "3", kind: "door", widthM: 1.0, heightM: 2.2 },
  { id: "4", kind: "window", widthM: 1.2, heightM: 1.4 },
  { id: "5", kind: "window", widthM: null, heightM: null },
] as never[];

test("doors and windows are counted apart, with the area of those that have a size", () => {
  const overview = summarizeOpeningsOverview(openings);
  assert.deepEqual([overview.door.count, overview.door.measuredCount, overview.door.areaM2], [3, 3, 5.98]);
  assert.deepEqual([overview.window.count, overview.window.measuredCount, overview.window.areaM2], [2, 1, 1.68]);
  assert.equal(overview.unmeasuredCount, 1);
});

test("equal sizes are grouped and the most frequent comes first", () => {
  const sizes = summarizeOpeningsOverview(openings).door.sizes;
  assert.deepEqual(sizes.map(size => [size.widthM, size.heightM, size.count]), [[0.9, 2.1, 2], [1, 2.2, 1]]);
});

test("a model without doors or windows gives empty groups", () => {
  const overview = summarizeOpeningsOverview([]);
  assert.deepEqual([overview.door.count, overview.window.count, overview.unmeasuredCount], [0, 0, 0]);
});
