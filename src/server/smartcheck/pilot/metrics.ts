export type PilotMetricRow = {
  id: string;
  normalizedDescription: string | null;
  normalizedUnit: string | null;
  normalizedQuantity: string | null;
  normalizedPrice: string | null;
  reviewStatus: string;
  findingsCount: number;
};

export type PilotMetricTransfer = {
  sourceQuantityRowId: string | null;
  sourceDocumentId: string | null;
  sourceProcessingRunId: string | null;
  sourceCellRange: string | null;
  sourceReference: string | null;
};

export type PilotMetricRun = {
  id: string;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type PilotMetrics = {
  totalRows: number;
  parsedRows: number;
  manuallyCorrectedRows: number;
  findingCount: number;
  approvedRows: number;
  transferredRows: number;
  provenanceCompleteRows: number;
  processingDurationSeconds: number | null;
  workflowDurationSeconds: number | null;
  parseRate: number | null;
  manualReentryFreeRate: number | null;
  provenanceCoverage: number | null;
};

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null;
}

function durationSeconds(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start || !end) return null;
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
  return seconds >= 0 ? seconds : null;
}

export function calculatePilotMetrics(input: {
  rows: PilotMetricRow[];
  transfers: PilotMetricTransfer[];
  manuallyCorrectedRowIds?: Set<string>;
  processingRun?: PilotMetricRun | null;
  workflowStartedAt?: Date | null;
  workflowCompletedAt?: Date | null;
}): PilotMetrics {
  const totalRows = input.rows.length;
  const parsedRows = input.rows.filter((row) => Boolean(row.normalizedDescription && row.normalizedUnit && row.normalizedQuantity !== null && row.normalizedPrice !== null && Number(row.normalizedQuantity) > 0 && Number(row.normalizedPrice) >= 0)).length;
  const manuallyCorrectedRows = Math.min(parsedRows, input.manuallyCorrectedRowIds?.size ?? 0);
  const findingCount = input.rows.reduce((sum, row) => sum + Math.max(0, row.findingsCount), 0);
  const approvedRows = input.rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception").length;
  const transferred = input.transfers.filter((transfer) => Boolean(transfer.sourceQuantityRowId));
  const provenanceCompleteRows = transferred.filter((transfer) => Boolean(transfer.sourceQuantityRowId && transfer.sourceDocumentId && transfer.sourceProcessingRunId && transfer.sourceCellRange && transfer.sourceReference)).length;
  const processingDurationSeconds = durationSeconds(input.processingRun?.startedAt, input.processingRun?.completedAt);
  const workflowDurationSeconds = durationSeconds(input.workflowStartedAt, input.workflowCompletedAt);
  return {
    totalRows,
    parsedRows,
    manuallyCorrectedRows,
    findingCount,
    approvedRows,
    transferredRows: transferred.length,
    provenanceCompleteRows,
    processingDurationSeconds,
    workflowDurationSeconds,
    parseRate: ratio(parsedRows, totalRows),
    manualReentryFreeRate: ratio(Math.max(0, parsedRows - manuallyCorrectedRows), totalRows),
    provenanceCoverage: ratio(provenanceCompleteRows, transferred.length),
  };
}

export function summarizePilotMeasurements(measurements: Array<Pick<PilotMetrics, "totalRows" | "parsedRows" | "manuallyCorrectedRows" | "findingCount" | "approvedRows" | "transferredRows" | "provenanceCompleteRows" | "processingDurationSeconds" | "workflowDurationSeconds">>) {
  const totals = measurements.reduce((sum, measurement) => ({
    totalRows: sum.totalRows + measurement.totalRows,
    parsedRows: sum.parsedRows + measurement.parsedRows,
    manuallyCorrectedRows: sum.manuallyCorrectedRows + measurement.manuallyCorrectedRows,
    findingCount: sum.findingCount + measurement.findingCount,
    approvedRows: sum.approvedRows + measurement.approvedRows,
    transferredRows: sum.transferredRows + measurement.transferredRows,
    provenanceCompleteRows: sum.provenanceCompleteRows + measurement.provenanceCompleteRows,
    processingDurationSeconds: sum.processingDurationSeconds + (measurement.processingDurationSeconds ?? 0),
    workflowDurationSeconds: sum.workflowDurationSeconds + (measurement.workflowDurationSeconds ?? 0),
  }), { totalRows: 0, parsedRows: 0, manuallyCorrectedRows: 0, findingCount: 0, approvedRows: 0, transferredRows: 0, provenanceCompleteRows: 0, processingDurationSeconds: 0, workflowDurationSeconds: 0 });
  return {
    caseCount: measurements.length,
    ...totals,
    parseRate: ratio(totals.parsedRows, totals.totalRows),
    manualReentryFreeRate: ratio(Math.max(0, totals.parsedRows - totals.manuallyCorrectedRows), totals.totalRows),
    provenanceCoverage: ratio(totals.provenanceCompleteRows, totals.transferredRows),
    averageProcessingDurationSeconds: measurements.length ? Math.round(totals.processingDurationSeconds / measurements.length) : null,
    averageWorkflowDurationSeconds: measurements.length ? Math.round(totals.workflowDurationSeconds / measurements.length) : null,
  };
}
