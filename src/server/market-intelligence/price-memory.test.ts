import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSupplierPrice, median, summarizePriceMemory } from "./price-memory";

test("price memory median and summary are deterministic", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 2]), 3);
  assert.deepEqual(summarizePriceMemory([{ amount: 100, positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" }, { amount: 120, positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" }]), { count: 2, median: 110, average: 110, min: 100, max: 120 });
});
test("supplier quote is insufficiently grounded with fewer than three comparable samples", () => {
  const result = evaluateSupplierPrice(110, { positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" }, [
    { amount: 100, positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" },
    { amount: 120, positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" },
  ], 0.2);
  assert.equal(result.outlierStatus, "insufficient_data");
  assert.equal(result.baselineCount, 2);
  assert.equal(result.confidence, 0.55);
});

test("supplier quote flags a robust outlier without changing the baseline", () => {
  const samples = [100, 101, 99, 102].map((amount) => ({ amount, positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" }));
  const result = evaluateSupplierPrice(180, { positionCode: "M-1", description: "Pompa", unit: "adet", region: "İstanbul" }, samples, 0.3);
  assert.equal(result.outlierStatus, "outlier");
  assert.equal(result.baselineMedian, 100.5);
  assert.ok((result.outlierScore ?? 0) > 3.5);
  assert.ok((result.relativeDelta ?? 0) > 0.7);
});
