import { createStorageAdapter } from './storage';
import { detectAndValidateFile } from './file-security';
import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { withAppTenant, withAppTenantTransaction } from '../../db/app-tenant';
import { adminAuditLogs, documents, documentProcessingRuns, plans, smartcheckAuditLogs, subscriptions, usageRecords } from '../../db/schema';
import { processingIdempotencyKey } from './processor';
import type { ColumnMapping } from './normalize';
import { isProcessingRunStale } from './run-health';
import { fetchTenantIfcLimits, graphileWorkerSchema } from './config';
import { quotaWindow } from '../../services/billing/quota-policy';
import { assertGraphileWorkerSchemaRevision } from './queue-readiness';
const graphileSchema = () => graphileWorkerSchema();

export class ProcessingConflict extends Error {
  constructor(public readonly code: string, public readonly status = 409, message?: string) {
    super(message || code);
  }
}

let readiness: { key: string; promise: Promise<void> } | undefined;
export async function ensureQueueSchema() {
  const schema = graphileSchema();
  const key = schema;
  if (readiness?.key !== key) {
    const promise = (async () => {
      const queueSchema = sql.identifier(schema);
      const result = await db.execute<{ latest: number | null }>(sql`select max(id)::int as latest from ${queueSchema}.migrations`);
      assertGraphileWorkerSchemaRevision(result.rows[0]?.latest);
    })();
    readiness = { key, promise };
    promise.catch(() => { if (readiness?.promise === promise) readiness = undefined; });
  }
  await readiness.promise;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function removePendingJob(tx: Transaction, runId: string) {
  const schema = sql.identifier(graphileSchema());
  // remove_job locks/mutates atomically. Roll back even its key clearing if a worker owns the job.
  const result = await tx.execute<{ locked_at: Date | null }>(sql`select locked_at from ${schema}.bimmetraj_remove_smartcheck_job(${`smartcheck:${runId}`})`);
  if (result.rows[0]?.locked_at) throw new ProcessingConflict('PROCESSING_JOB_ACTIVE');
}

export async function enqueueSmartCheckProcessing(tx: Transaction, kind: 'ifc' | 'xlsx' | 'csv' | 'pdf', payload: any, runId: string) {
  const taskName = kind === 'ifc' || kind === 'pdf' ? 'process_smartcheck_ifc_document' : 'process_smartcheck_document';
  await tx.execute(sql`select ${sql.identifier(graphileSchema())}.bimmetraj_enqueue_smartcheck(${taskName}, ${JSON.stringify(payload)}::json, ${`smartcheck:${runId}`}, 3, ${kind === 'pdf' ? 10 : 0})`);
}

export async function changeProcessingRun(input: {
  companyId: string;
  userId: string;
  documentId: string;
  action: 'process' | 'retry' | 'recover';
  isAdmin?: boolean;
  targetRunId?: string;
  impersonatedBy?: string;
}) {
  await ensureQueueSchema();
  const { companyId, userId, documentId, action, isAdmin, targetRunId } = input;

  let kind: "ifc" | "xlsx" | "csv" | "pdf" = "ifc";
  if (action !== "recover") {
    const docInfo = await withAppTenant(
      { companyId, userId },
      (tenantDb) => tenantDb.select({ storageKey: documents.storageKey, originalFileName: documents.originalFileName, mimeType: documents.mimeType, checksumSha256: documents.checksumSha256 }).from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId))).then(rows => rows[0]),
      { readOnly: true },
    );
    if (!docInfo) throw new ProcessingConflict("DOCUMENT_NOT_FOUND", 404);
    if (docInfo.checksumSha256 === "pending") throw new ProcessingConflict("UPLOAD_INCOMPLETE");

    const storage = createStorageAdapter();
    const sample = await storage.get(docInfo.storageKey, { prefixBytes: 8192 });
    kind = detectAndValidateFile(sample, docInfo.originalFileName, docInfo.mimeType);
  }

  return withAppTenantTransaction({ companyId, userId }, async (tx) => {
    // Advisory locks at the VERY BEGINNING of the transaction, before document row lock.
    // 1. Company-level advisory lock (serializes tenant processing runs & IFC concurrency checks)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('smartcheck_company'), hashtext(${companyId}))`);
    // 2. Document-level advisory lock (serializes state changes for this specific document)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('smartcheck_document'), hashtext(${documentId}))`);

    // 3. Document row lock to serialize request-side state changes for this tenant document
    const [document] = await tx.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId))).for('update');
    if (!document) throw new ProcessingConflict('DOCUMENT_NOT_FOUND', 404);
    if (document.checksumSha256 === 'pending') throw new ProcessingConflict('UPLOAD_INCOMPLETE');
    const runs = await tx.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.documentId, documentId), eq(documentProcessingRuns.companyId, companyId))).orderBy(desc(documentProcessingRuns.createdAt));
    const latest = runs[0];

    if (targetRunId && latest?.id !== targetRunId) {
      throw new ProcessingConflict('PROCESSING_RUN_SUPERSEDED', 409, 'Yalnızca dokümanın en son işlemi için yeniden deneme yapılabilir.');
    }

    const baseKey = processingIdempotencyKey(document.checksumSha256, document.importMappingJson as ColumnMapping);
    if (action === 'process') {
      const existing = runs.find(run => run.idempotencyKey === baseKey);
      if (existing) return { status: 200, run: existing };
      if (runs.some(run => run.status === 'queued' || run.status === 'running')) throw new ProcessingConflict('PROCESSING_RUN_ACTIVE');
    }
    if (action === 'recover' && (!latest || !isProcessingRunStale(latest))) throw new ProcessingConflict('PROCESSING_RUN_NOT_STALE');
    if (action === 'retry') {
      if (runs.some(run => run.status === 'queued' || run.status === 'running')) {
        throw new ProcessingConflict('PROCESSING_RUN_ACTIVE', 409, 'Dokümana ait aktif bir işlem varken yeniden deneme yapılamaz.');
      }
      if (latest?.status !== 'failed') {
        throw new ProcessingConflict('PROCESSING_RUN_NOT_FAILED', 409, 'Yalnızca başarısız işler yeniden denenebilir.');
      }
    }

    if (kind === 'ifc' && (action === 'process' || action === 'retry')) {
      const limits = await fetchTenantIfcLimits(companyId, tx);
      const activeIfcRuns = await tx.select({ id: documentProcessingRuns.id })
        .from(documentProcessingRuns)
        .innerJoin(documents, eq(documents.id, documentProcessingRuns.documentId))
        .where(
          and(
            eq(documentProcessingRuns.companyId, companyId),
            sql`${documentProcessingRuns.status} IN ('queued', 'running')`,
            sql`(${documents.originalFileName} ILIKE '%.ifc' OR ${documents.mimeType} = 'application/ifc')`
          )
        );
      if (activeIfcRuns.length >= limits.maxConcurrent) {
        throw new ProcessingConflict('TENANT_IFC_CONCURRENCY_LIMIT_EXCEEDED');
      }

      if (limits.monthlyLimit !== null) {
        const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
        const [plan] = subscription?.planId ? await tx.select().from(plans).where(eq(plans.id, subscription.planId)) : [];
        const { period } = quotaWindow(subscription, plan, new Date());
        const counters = await tx.select({ ifcCount: usageRecords.ifcCount })
          .from(usageRecords)
          .where(and(eq(usageRecords.companyId, companyId), eq(usageRecords.period, period)));
        const completedThisPeriod = counters.reduce((sum, row) => sum + (row.ifcCount ?? 0), 0);
        if (completedThisPeriod + activeIfcRuns.length >= limits.monthlyLimit) {
          throw new ProcessingConflict('IFC_QUOTA_EXCEEDED', 403, 'Bu dönemdeki IFC işleme kotanız dolmuştur.');
        }
      }
    }

    if (kind === 'pdf' && (action === 'process' || action === 'retry')) {
      const activePdfRuns = await tx.select({ id: documentProcessingRuns.id })
        .from(documentProcessingRuns)
        .innerJoin(documents, and(eq(documents.id, documentProcessingRuns.documentId), eq(documents.companyId, companyId)))
        .where(and(eq(documentProcessingRuns.companyId, companyId), sql`${documentProcessingRuns.status} IN ('queued', 'running')`, sql`${documents.originalFileName} ILIKE '%.pdf'`));
      if (activePdfRuns.length >= 2) throw new ProcessingConflict('TENANT_PDF_CONCURRENCY_LIMIT_EXCEEDED', 429, 'Aynı anda en fazla iki PDF/A ön kontrolü yapılabilir.');

      const [subPlan] = await tx.select({
        monthlyRegulationLimit: plans.monthlyRegulationLimit,
        monthlyPdfLimit: plans.monthlyPdfLimit,
      })
        .from(subscriptions)
        .leftJoin(plans, eq(plans.id, subscriptions.planId))
        .where(eq(subscriptions.companyId, companyId));
      const pdfMonthlyLimit = subPlan?.monthlyPdfLimit ?? subPlan?.monthlyRegulationLimit ?? 100;

      const monthStart = new Date();
      monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
      const completed = await tx.select({ id: documentProcessingRuns.id })
        .from(documentProcessingRuns)
        .innerJoin(documents, and(eq(documents.id, documentProcessingRuns.documentId), eq(documents.companyId, companyId)))
        .where(and(eq(documentProcessingRuns.companyId, companyId), eq(documentProcessingRuns.status, 'succeeded'), sql`${documents.originalFileName} ILIKE '%.pdf'`, sql`${documentProcessingRuns.completedAt} >= ${monthStart}`));
      if (completed.length + activePdfRuns.length >= pdfMonthlyLimit) throw new ProcessingConflict('TENANT_PDF_MONTHLY_LIMIT_EXCEEDED', 429, 'Aylık PDF/A ön kontrol sınırına ulaşıldı.');
    }

    // Retire previous automatic retries before creating a successor. Active jobs require operator investigation.
    for (const run of runs) await removePendingJob(tx, run.id);
    const now = new Date();
    let run: typeof documentProcessingRuns.$inferSelect;
    if (action === 'recover') {
      [run] = await tx.update(documentProcessingRuns).set({ status: 'failed', currentStage: 'failed', errorCode: 'WORKER_STALE', errorMessage: 'Worker heartbeat expired; operator retry required.', progressMessage: 'Worker stale; retry required', workerJobId: null, workerLeaseToken: null, completedAt: now, updatedAt: now }).where(eq(documentProcessingRuns.id, latest.id)).returning();
    } else {
      const idempotencyKey = action === 'retry' ? `${baseKey}:retry:${crypto.randomUUID()}` : baseKey;
      const progressMessage = isAdmin ? 'Süper admin tarafından yeniden kuyruğa alındı' : 'Kuyruga alindi';
      [run] = await tx.insert(documentProcessingRuns).values({ companyId, documentId, idempotencyKey, pipelineVersion: latest?.pipelineVersion ?? 1, progressMessage }).returning();
      
      await enqueueSmartCheckProcessing(tx, kind, { companyId, documentId, processingRunId: run.id }, run.id);

    }
    await tx.update(documents).set({ status: action === 'recover' ? 'failed' : 'queued', updatedAt: now }).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));
    
    if (isAdmin) {
      await tx.insert(adminAuditLogs).values({
        adminId: userId,
        targetCompanyId: companyId,
        action: action === 'recover' ? 'processing_stale_recovered' : 'processing_retried',
        details: { oldRunId: latest?.id, newRunId: run.id, documentId },
      });
    } else {
      await tx.insert(smartcheckAuditLogs).values({
        companyId,
        userId,
        action: action === 'recover' ? 'processing_stale_recovered' : action === 'retry' ? 'processing_retried' : 'processing_queued',
        entityType: 'processing_run',
        entityId: run.id,
        metadataJson: {
          documentId,
          previousRunId: latest?.id,
          ...(input.impersonatedBy ? { impersonatedBy: input.impersonatedBy } : {}),
        },
      });
    }

    return { status: action === 'recover' ? 200 : 202, run };
  });
}
