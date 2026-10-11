export const DEFAULT_PROCESSING_STALE_MINUTES = 15;
export const DEFAULT_RUNNING_STALE_MINUTES = 10;
export const DEFAULT_QUEUED_STALE_MINUTES = 60;

export type ProcessingRunHealthInput = {
  status: string;
  updatedAt: Date | null;
  startedAt?: Date | null;
  createdAt?: Date | null;
};

export function processingRunningStaleMinutes(env: Record<string, string | undefined> = process.env): number {
  if (env.IFC_RUNNING_STALE_MS) {
    const ms = Number(env.IFC_RUNNING_STALE_MS);
    if (Number.isFinite(ms) && ms > 0) return ms / 60_000;
  }
  const configured = Number(env.SMARTCHECK_PROCESSING_RUNNING_STALE_MINUTES ?? DEFAULT_RUNNING_STALE_MINUTES);
  return Number.isFinite(configured) && configured >= 1 && configured <= 240 ? configured : DEFAULT_RUNNING_STALE_MINUTES;
}

export function processingQueuedStaleMinutes(env: Record<string, string | undefined> = process.env): number {
  if (env.IFC_QUEUED_STALE_MS) {
    const ms = Number(env.IFC_QUEUED_STALE_MS);
    if (Number.isFinite(ms) && ms > 0) return ms / 60_000;
  }
  const configured = Number(env.SMARTCHECK_PROCESSING_QUEUED_STALE_MINUTES ?? DEFAULT_QUEUED_STALE_MINUTES);
  return Number.isFinite(configured) && configured >= 5 && configured <= 1440 ? configured : DEFAULT_QUEUED_STALE_MINUTES;
}

export function processingStaleMinutes(env: Record<string, string | undefined> = process.env): number {
  const configured = Number(env.SMARTCHECK_PROCESSING_STALE_MINUTES ?? DEFAULT_PROCESSING_STALE_MINUTES);
  return Number.isFinite(configured) && configured >= 5 && configured <= 240 ? configured : DEFAULT_PROCESSING_STALE_MINUTES;
}

export function isProcessingRunStale(
  run: ProcessingRunHealthInput,
  now = new Date(),
  customThresholds?: { runningMinutes?: number; queuedMinutes?: number } | number,
): boolean {
  if (run.status !== "queued" && run.status !== "running") return false;

  let staleMinutes: number;
  if (typeof customThresholds === "number") {
    staleMinutes = customThresholds;
  } else if (run.status === "running") {
    staleMinutes = customThresholds?.runningMinutes ?? processingRunningStaleMinutes();
  } else {
    staleMinutes = customThresholds?.queuedMinutes ?? processingQueuedStaleMinutes();
  }

  const heartbeat = run.status === "running"
    ? (run.updatedAt ?? run.startedAt ?? run.createdAt)
    : (run.updatedAt ?? run.createdAt);

  if (!heartbeat || Number.isNaN(heartbeat.getTime()) || Number.isNaN(now.getTime())) return false;
  return now.getTime() - heartbeat.getTime() >= staleMinutes * 60_000;
}
