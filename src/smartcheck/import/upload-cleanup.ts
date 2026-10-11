import { and, eq, inArray, lt, notExists } from 'drizzle-orm';
import { documents, documentProcessingRuns } from '../../db/schema';
import { lockTenantUploads, UPLOAD_MAX_TTL_MS, UPLOAD_CLEANUP_GRACE_MS } from './upload-quota';
import type { StorageAdapter } from './storage';

/** Bounded retryable cleanup: only uncompleted pending uploads after URL TTL + grace. */
export async function cleanupExpiredPendingUploads(storage: Pick<StorageAdapter, 'delete'>, batchSize = 100) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('UPLOAD_CLEANUP_BATCH_INVALID');
  const { db } = await import('../../db');
  const cutoff = new Date(Date.now() - UPLOAD_MAX_TTL_MS - UPLOAD_CLEANUP_GRACE_MS);
  const eligible = and(eq(documents.checksumSha256, 'pending'), inArray(documents.status, ['uploaded', 'failed']),
    lt(documents.createdAt, cutoff), notExists(db.select({ id: documentProcessingRuns.id }).from(documentProcessingRuns)
      .where(eq(documentProcessingRuns.documentId, documents.id))));
  const candidates = await db.select({ id: documents.id, companyId: documents.companyId }).from(documents).where(eligible).limit(batchSize);
  let removed = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      removed += await db.transaction(async tx => {
        await lockTenantUploads(tx, candidate.companyId);
        const [document] = await tx.select().from(documents).where(and(eligible, eq(documents.id, candidate.id), eq(documents.companyId, candidate.companyId))).for('update');
        if (!document) return 0;
        if (!document.storageKey.startsWith(`${document.companyId}/`)) throw new Error('UPLOAD_STORAGE_SCOPE_INVALID');
        // Keep quota reserved if object deletion fails. Retrying deletion is idempotent.
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([storage.delete(document.storageKey), new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('UPLOAD_CLEANUP_STORAGE_TIMEOUT')), 15_000);
            timer.unref();
          })]);
        } finally { if (timer) clearTimeout(timer); }
        await tx.delete(documents).where(and(eq(documents.id, document.id), eq(documents.companyId, document.companyId), eq(documents.checksumSha256, 'pending')));
        return 1;
      });
    } catch { failed += 1; }
  }
  return { scanned: candidates.length, removed, failed };
}

/** Call at worker startup; stop the returned handle during graceful shutdown. */
export function startPendingUploadCleanup(run: () => Promise<unknown>, onError: (error: unknown) => void,
  intervalMs = 60 * 60 * 1000) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 60_000) throw new Error('UPLOAD_CLEANUP_INTERVAL_INVALID');
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try { await run(); } catch (error) { onError(error); } finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, intervalMs);
  timer.unref();
  void tick();
  return { stop() { stopped = true; clearInterval(timer); } };
}
