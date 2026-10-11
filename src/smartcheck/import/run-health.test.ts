import assert from "node:assert/strict";
import test from "node:test";
import {
  isProcessingRunStale,
  processingStaleMinutes,
  processingRunningStaleMinutes,
  processingQueuedStaleMinutes,
} from "./run-health";

test("processing run health marks only old queued/running runs as stale", () => {
  const now = new Date("2026-07-24T12:00:00Z");
  assert.equal(isProcessingRunStale({ status: "running", updatedAt: new Date("2026-07-24T11:45:01Z") }, now, 15), false);
  assert.equal(isProcessingRunStale({ status: "running", updatedAt: new Date("2026-07-24T11:45:00Z") }, now, 15), true);
  assert.equal(isProcessingRunStale({ status: "failed", updatedAt: new Date("2026-07-24T10:00:00Z") }, now, 15), false);
});

test("processing run health distinguishes running (10m) and queued (60m) default timeouts", () => {
  const now = new Date("2026-07-24T12:00:00Z");
  // 15 dakikadır kuyrukta bekleyen iş stale DEĞİL (queued timeout 60m)
  assert.equal(
    isProcessingRunStale({ status: "queued", updatedAt: new Date("2026-07-24T11:45:00Z") }, now),
    false,
    "15 min queued job should NOT be stale",
  );

  // 15 dakikadır çalışan iş stale (running timeout 10m)
  assert.equal(
    isProcessingRunStale({ status: "running", updatedAt: new Date("2026-07-24T11:45:00Z") }, now),
    true,
    "15 min running job should be stale",
  );

  // 65 dakikadır kuyrukta bekleyen iş stale (queued timeout 60m)
  assert.equal(
    isProcessingRunStale({ status: "queued", updatedAt: new Date("2026-07-24T10:55:00Z") }, now),
    true,
    "65 min queued job should be stale",
  );
});

test("processing run health falls back for unsafe stale thresholds", () => {
  assert.equal(processingStaleMinutes({ SMARTCHECK_PROCESSING_STALE_MINUTES: "4" }), 15);
  assert.equal(processingStaleMinutes({ SMARTCHECK_PROCESSING_STALE_MINUTES: "241" }), 15);
  assert.equal(processingStaleMinutes({ SMARTCHECK_PROCESSING_STALE_MINUTES: "30" }), 30);

  // Running
  assert.equal(processingRunningStaleMinutes({ SMARTCHECK_PROCESSING_RUNNING_STALE_MINUTES: "0" }), 10);
  assert.equal(processingRunningStaleMinutes({ IFC_RUNNING_STALE_MS: "600000" }), 10);
  assert.equal(processingRunningStaleMinutes({ SMARTCHECK_PROCESSING_RUNNING_STALE_MINUTES: "20" }), 20);

  // Queued
  assert.equal(processingQueuedStaleMinutes({ SMARTCHECK_PROCESSING_QUEUED_STALE_MINUTES: "3" }), 60);
  assert.equal(processingQueuedStaleMinutes({ IFC_QUEUED_STALE_MS: "7200000" }), 120);
  assert.equal(processingQueuedStaleMinutes({ SMARTCHECK_PROCESSING_QUEUED_STALE_MINUTES: "45" }), 45);
});
