import assert from "node:assert/strict";
import test from "node:test";
import { calculatePilotMetrics, summarizePilotMeasurements } from "./metrics";

test("pilot metrics calculate parse, correction and provenance rates deterministically", () => {
  const metrics = calculatePilotMetrics({
    rows: [
      { id: "r1", normalizedDescription: "Pompa", normalizedUnit: "adet", normalizedQuantity: "2", normalizedPrice: "100", reviewStatus: "approved", findingsCount: 0 },
      { id: "r2", normalizedDescription: "Vana", normalizedUnit: "adet", normalizedQuantity: "1", normalizedPrice: "45", reviewStatus: "accepted_exception", findingsCount: 1 },
      { id: "r3", normalizedDescription: null, normalizedUnit: "adet", normalizedQuantity: null, normalizedPrice: null, reviewStatus: "rejected", findingsCount: 2 },
    ],
    transfers: [
      { sourceQuantityRowId: "r1", sourceDocumentId: "d1", sourceProcessingRunId: "run1", sourceCellRange: "A2:F2", sourceReference: "Teklif!A2:F2" },
      { sourceQuantityRowId: "r2", sourceDocumentId: "d1", sourceProcessingRunId: "run1", sourceCellRange: null, sourceReference: "Teklif!A3:F3" },
    ],
    manuallyCorrectedRowIds: new Set(["r2"]),
    processingRun: { id: "run1", startedAt: new Date("2026-07-23T10:00:00Z"), completedAt: new Date("2026-07-23T10:01:30Z") },
    workflowStartedAt: new Date("2026-07-23T09:00:00Z"),
    workflowCompletedAt: new Date("2026-07-23T09:10:00Z"),
  });
  assert.deepEqual(metrics, { totalRows: 3, parsedRows: 2, manuallyCorrectedRows: 1, findingCount: 3, approvedRows: 2, transferredRows: 2, provenanceCompleteRows: 1, processingDurationSeconds: 90, workflowDurationSeconds: 600, parseRate: 0.6667, manualReentryFreeRate: 0.3333, provenanceCoverage: 0.5 });
});

test("pilot metric summaries aggregate rows instead of averaging percentages", () => {
  const summary = summarizePilotMeasurements([
    { totalRows: 10, parsedRows: 9, manuallyCorrectedRows: 1, findingCount: 2, approvedRows: 9, transferredRows: 8, provenanceCompleteRows: 8, processingDurationSeconds: 20, workflowDurationSeconds: 100 },
    { totalRows: 2, parsedRows: 1, manuallyCorrectedRows: 0, findingCount: 1, approvedRows: 1, transferredRows: 1, provenanceCompleteRows: 0, processingDurationSeconds: 40, workflowDurationSeconds: 200 },
  ]);
  assert.equal(summary.caseCount, 2);
  assert.equal(summary.parseRate, 0.8333);
  assert.equal(summary.manualReentryFreeRate, 0.75);
  assert.equal(summary.provenanceCoverage, 0.8889);
  assert.equal(summary.averageProcessingDurationSeconds, 30);
});
