import { createStorageAdapter } from './storage';
import { detectAndValidateFile } from './file-security';
import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { makeWorkerUtils } from 'graphile-worker';
import { db } from '../../db';
import { documents, documentProcessingRuns, smartcheckAuditLogs } from '../../db/schema';
import { processingIdempotencyKey } from './processor';
import type { ColumnMapping } from './normalize';
import { isProcessingRunStale } from './run-health';
import { graphileWorkerSchema } from './config';
const graphileSchema = () => graphileWorkerSchema();

export class ProcessingConflict extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}

let readiness: { key: string; promise: Promise<void> } | undefined;
export async function ensureQueueSchema() {
  const schema = graphileSchema();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const key = `${connectionString}:${schema}`;
  if (readiness?.key !== key) {
    const promise = (async () => {
      // WorkerUtils initializes/migrates its schema before returning. Never enqueue outside the application transaction.
      const utils = await makeWorkerUtils({ connectionString, schema });
      await utils.release();
    })();
    readiness = { key, promise };
    promise.catch(() => { if (readiness?.promise === promise) readiness = undefined; });
  }
  await readiness.promise;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function removePendingJob(tx: Transaction, runId: string) {
  const schema = sql.identifier(graphileSchema());
  // remove_job locks/mutates atomically. Roll back even its key clearing if a worker owns the job.
  const result = await tx.execute<{ locked_at: Date | null }>(sql`select locked_at from ${schema}.remove_job(${`smartcheck:${runId}`})`);
  if (result.rows[0]?.locked_at) throw new ProcessingConflict('PROCESSING_JOB_ACTIVE');
}

export async function enqueueSmartCheckProcessing(tx: Transaction, kind: 'ifc' | 'xlsx' | 'csv', payload: any, runId: string) {
  const taskName = kind === 'ifc' ? 'process_smartcheck_ifc_document' : 'process_smartcheck_document';
  await tx.execute(sql`select ${sql.identifier(graphileSchema())}.add_job(${taskName}, ${JSON.stringify(payload)}::json, job_key := ${`smartcheck:${runId}`}, max_attempts := 3)`);
}

export async function changeProcessingRun(input: { companyId: string; userId: string; documentId: string; action: 'process' | 'retry' | 'recover' }) {
  await ensureQueueSchema();
  const { companyId, userId, documentId, action } = input;

  let kind: "ifc" | "xlsx" | "csv" = "ifc";
  if (action !== "recover") {
    const docInfo = await db.select({ storageKey: documents.storageKey, originalFileName: documents.originalFileName, mimeType: documents.mimeType, checksumSha256: documents.checksumSha256 }).from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId))).then(rows => rows[0]);
    if (!docInfo) throw new ProcessingConflict("DOCUMENT_NOT_FOUND", 404);
    if (docInfo.checksumSha256 === "pending") throw new ProcessingConflict("UPLOAD_INCOMPLETE");

    const storage = createStorageAdapter();
    const sample = await storage.get(docInfo.storageKey, { prefixBytes: 8192 });
    kind = detectAndValidateFile(sample, docInfo.originalFileName, docInfo.mimeType);
  }

  return db.transaction(async (tx) => {
    // Serialize request-side state changes for this tenant document, including concurrent retries.
    const [document] = await tx.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId))).for('update');
    if (!document) throw new ProcessingConflict('DOCUMENT_NOT_FOUND', 404);
    if (document.checksumSha256 === 'pending') throw new ProcessingConflict('UPLOAD_INCOMPLETE');
    const runs = await tx.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.documentId, documentId), eq(documentProcessingRuns.companyId, companyId))).orderBy(desc(documentProcessingRuns.createdAt));
    const latest = runs[0];
    const baseKey = processingIdempotencyKey(document.checksumSha256, document.importMappingJson as ColumnMapping);
    if (action === 'process') {
      const existing = runs.find(run => run.idempotencyKey === baseKey);
      if (existing) return { status: 200, run: existing };
      if (runs.some(run => run.status === 'queued' || run.status === 'running')) throw new ProcessingConflict('PROCESSING_RUN_ACTIVE');
    }
    if (action === 'recover' && (!latest || !isProcessingRunStale(latest))) throw new ProcessingConflict('PROCESSING_RUN_NOT_STALE');
    if (action === 'retry' && latest?.status !== 'failed') throw new ProcessingConflict('PROCESSING_RUN_NOT_FAILED');
    // Retire previous automatic retries before creating a successor. Active jobs require operator investigation.
    for (const run of runs) await removePendingJob(tx, run.id);
    const now = new Date();
    let run: typeof documentProcessingRuns.$inferSelect;
    if (action === 'recover') {
      [run] = await tx.update(documentProcessingRuns).set({ status: 'failed', currentStage: 'failed', errorCode: 'WORKER_STALE', errorMessage: 'Worker heartbeat expired; operator retry required.', progressMessage: 'Worker stale; retry required', completedAt: now, updatedAt: now }).where(eq(documentProcessingRuns.id, latest.id)).returning();
    } else {
      const idempotencyKey = action === 'retry' ? `${baseKey}:retry:${crypto.randomUUID()}` : baseKey;
      [run] = await tx.insert(documentProcessingRuns).values({ companyId, documentId, idempotencyKey, pipelineVersion: latest?.pipelineVersion ?? 1, progressMessage: 'Kuyruga alindi' }).returning();
      
      await enqueueSmartCheckProcessing(tx, kind, { companyId, documentId, processingRunId: run.id }, run.id);

    }
    await tx.update(documents).set({ status: action === 'recover' ? 'failed' : 'queued', updatedAt: now }).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));
    await tx.insert(smartcheckAuditLogs).values({ companyId, userId, action: action === 'recover' ? 'processing_stale_recovered' : action === 'retry' ? 'processing_retried' : 'processing_queued', entityType: 'processing_run', entityId: run.id, metadataJson: { documentId, previousRunId: latest?.id } });
    return { status: action === 'recover' ? 200 : 202, run };
  });
}
