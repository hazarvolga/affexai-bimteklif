import assert from "node:assert/strict";
import test from "node:test";
import { isProcessingRunStale, processingStaleMinutes } from "./run-health";

test("processing run health marks only old queued/running runs as stale", () => {
  const now = new Date("2026-07-24T12:00:00Z");
  assert.equal(isProcessingRunStale({ status: "running", updatedAt: new Date("2026-07-24T11:45:01Z") }, now, 15), false);
  assert.equal(isProcessingRunStale({ status: "running", updatedAt: new Date("2026-07-24T11:45:00Z") }, now, 15), true);
  assert.equal(isProcessingRunStale({ status: "failed", updatedAt: new Date("2026-07-24T10:00:00Z") }, now, 15), false);
});

test("processing run health falls back for unsafe stale thresholds", () => {
  assert.equal(processingStaleMinutes({ SMARTCHECK_PROCESSING_STALE_MINUTES: "4" }), 15);
  assert.equal(processingStaleMinutes({ SMARTCHECK_PROCESSING_STALE_MINUTES: "241" }), 15);
  assert.equal(processingStaleMinutes({ SMARTCHECK_PROCESSING_STALE_MINUTES: "30" }), 30);
});
