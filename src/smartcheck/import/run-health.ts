export const DEFAULT_PROCESSING_STALE_MINUTES = 15;

export type ProcessingRunHealthInput = {
  status: string;
  updatedAt: Date | null;
  startedAt?: Date | null;
};

export function processingStaleMinutes(env: Record<string, string | undefined> = process.env): number {
  const configured = Number(env.SMARTCHECK_PROCESSING_STALE_MINUTES ?? DEFAULT_PROCESSING_STALE_MINUTES);
  return Number.isFinite(configured) && configured >= 5 && configured <= 240 ? configured : DEFAULT_PROCESSING_STALE_MINUTES;
}

export function isProcessingRunStale(
  run: ProcessingRunHealthInput,
  now = new Date(),
  staleMinutes = processingStaleMinutes(),
): boolean {
  if (run.status !== "queued" && run.status !== "running") return false;
  const heartbeat = run.updatedAt ?? run.startedAt;
  if (!heartbeat || Number.isNaN(heartbeat.getTime()) || Number.isNaN(now.getTime())) return false;
  return now.getTime() - heartbeat.getTime() >= staleMinutes * 60_000;
}
