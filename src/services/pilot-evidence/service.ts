import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";
import { pool } from "../../db";
import * as schema from "../../db/schema";
import {
  companies, documents, documentProcessingRuns, normalizedQuantityRows, quotationItems,
  memberships, smartcheckAuditLogs, smartcheckPilotCases, smartcheckPilotMeasurements,
} from "../../db/schema";
import { withTenantTransaction, type TenantContext } from "../../db/tenant-context";
import { smartcheckImportEnabled } from "../../smartcheck/import/config";
import { calculatePilotMetrics, summarizePilotMeasurements } from "../../server/smartcheck/pilot/metrics";

type Actor = Readonly<{ companyId: string; userId: string; role: string }>;
type Executor = NodePgDatabase<typeof schema>;
export type PilotEvidenceTenantTransactionRunner = <T>(pool: pg.Pool, context: TenantContext, work: (client: pg.PoolClient) => Promise<T>) => Promise<T>;

export class PilotEvidenceServiceError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export type CreatePilotCaseInput = {
  documentId: string; pilotId: string; customerReference: string; projectReference: string; discipline: string;
  permissionReference: string; permissionGrantedAt: Date; retentionUntil: Date; expectedRowCount: number; workflowStartedAt: Date;
};
export type MeasurePilotCaseInput = { measurementKey: string; complete: boolean; notes: string | null; workflowCompletedAt: Date | null };
export type ReviewPilotCaseInput = { decision: "approved" | "rejected" | "accepted_exception"; notes: string | null };

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function canonicalPilotMeasurementRequestHash(input: MeasurePilotCaseInput): string {
  return createHash("sha256").update(canonicalJson({
    measurementKey: input.measurementKey.trim(), complete: input.complete, notes: input.notes?.trim() || null,
    workflowCompletedAt: input.workflowCompletedAt?.toISOString() ?? null,
  }), "utf8").digest("hex");
}

export class PilotEvidenceService {
  constructor(private readonly database: pg.Pool = pool, private readonly tenantTransaction: PilotEvidenceTenantTransactionRunner = withTenantTransaction) {}

  private transaction<T>(actor: Actor, work: (tx: Executor) => Promise<T>): Promise<T> {
    return this.tenantTransaction(this.database, actor, (client) => work(drizzle(client, { schema })));
  }

  async isEnabled(actor: Actor): Promise<boolean> {
    return this.transaction(actor, async (tx) => {
      const [company] = await tx.select({ enabled: companies.isSmartcheckEnabled }).from(companies)
        .where(eq(companies.id, actor.companyId)).limit(1);
      return smartcheckImportEnabled(actor.companyId, Boolean(company?.enabled));
    });
  }

  async list(actor: Actor) {
    return this.transaction(actor, async (tx) => {
      const cases = await tx.select().from(smartcheckPilotCases).where(eq(smartcheckPilotCases.companyId, actor.companyId)).orderBy(desc(smartcheckPilotCases.createdAt)).limit(100);
      const ids = cases.map((item) => item.id);
      const measurements = ids.length ? await tx.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, actor.companyId), inArray(smartcheckPilotMeasurements.pilotCaseId, ids))).orderBy(sql`${smartcheckPilotMeasurements.caseRevision} desc nulls last`, desc(smartcheckPilotMeasurements.measuredAt), desc(smartcheckPilotMeasurements.id)) : [];
      const latest = new Map<string, typeof measurements[number]>();
      for (const measurement of measurements) if (!latest.has(measurement.pilotCaseId)) latest.set(measurement.pilotCaseId, measurement);
      return cases.map((item) => ({ ...item, latestMeasurement: latest.get(item.id) ?? null }));
    });
  }

  async detail(actor: Actor, id: string) {
    return this.transaction(actor, async (tx) => {
      const [pilotCase] = await tx.select().from(smartcheckPilotCases).where(and(eq(smartcheckPilotCases.id, id), eq(smartcheckPilotCases.companyId, actor.companyId)));
      if (!pilotCase) throw new PilotEvidenceServiceError(404, "PILOT_CASE_NOT_FOUND", "Pilot case bulunamadı.");
      const measurements = await tx.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, actor.companyId), eq(smartcheckPilotMeasurements.pilotCaseId, id))).orderBy(sql`${smartcheckPilotMeasurements.caseRevision} desc nulls last`, desc(smartcheckPilotMeasurements.measuredAt), desc(smartcheckPilotMeasurements.id));
      return { ...pilotCase, measurements };
    });
  }

  async create(actor: Actor, input: CreatePilotCaseInput) {
    return this.transaction(actor, async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`pilot-case:${actor.companyId}:${input.pilotId}:${input.documentId}`}, 0))`);
      const [document] = await tx.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, actor.companyId)));
      if (!document) throw new PilotEvidenceServiceError(404, "PILOT_DOCUMENT_NOT_FOUND", "Pilot kaynak dokümanı bulunamadı.");
      if (document.checksumSha256 === "pending") throw new PilotEvidenceServiceError(409, "PILOT_UPLOAD_INCOMPLETE", "Pilot case için kaynak yüklemesi tamamlanmalı.");
      if (document.status !== "completed") throw new PilotEvidenceServiceError(409, "PILOT_DOCUMENT_NOT_COMPLETED", "Pilot case yalnız tamamlanmış dokümanla açılabilir.");
      const [existing] = await tx.select({ id: smartcheckPilotCases.id }).from(smartcheckPilotCases).where(and(eq(smartcheckPilotCases.companyId, actor.companyId), eq(smartcheckPilotCases.pilotId, input.pilotId), eq(smartcheckPilotCases.documentId, input.documentId)));
      if (existing) throw new PilotEvidenceServiceError(409, "PILOT_CASE_EXISTS", "Bu pilot ve doküman için case zaten kayıtlı.");
      const [pilotCase] = await tx.insert(smartcheckPilotCases).values({ ...input, companyId: actor.companyId, createdByUserId: actor.userId }).returning();
      return { ...pilotCase, latestMeasurement: null };
    });
  }

  async measure(actor: Actor, id: string, input: MeasurePilotCaseInput) {
    return this.transaction(actor, async (tx) => {
      await tx.execute(sql`select id from smartcheck_pilot_cases where id=${id} and company_id=${actor.companyId} for update`);
      const [pilotCase] = await tx.select().from(smartcheckPilotCases).where(and(eq(smartcheckPilotCases.id, id), eq(smartcheckPilotCases.companyId, actor.companyId)));
      if (!pilotCase) throw new PilotEvidenceServiceError(404, "PILOT_CASE_NOT_FOUND", "Pilot case bulunamadı.");
      const requestHash = canonicalPilotMeasurementRequestHash(input);
      const [existing] = await tx.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, actor.companyId), eq(smartcheckPilotMeasurements.pilotCaseId, id), eq(smartcheckPilotMeasurements.measurementKey, input.measurementKey)));
      if (existing) {
        const [entry] = await tx.select({ metadata: smartcheckAuditLogs.metadataJson }).from(smartcheckAuditLogs).where(and(eq(smartcheckAuditLogs.companyId, actor.companyId), eq(smartcheckAuditLogs.action, "pilot_case_measured"), eq(smartcheckAuditLogs.entityId, id), sql`${smartcheckAuditLogs.metadataJson}->>'measurementId' = ${existing.id}`, sql`${smartcheckAuditLogs.metadataJson}->>'measurementKey' = ${input.measurementKey}`, sql`${smartcheckAuditLogs.metadataJson}->>'requestHash' = ${existing.requestHash}`)).limit(1);
        const auditHash = typeof entry?.metadata?.requestHash === "string" ? entry.metadata.requestHash : null;
        if (!existing.requestHash || !auditHash || existing.requestHash !== auditHash) throw new PilotEvidenceServiceError(409, "MEASUREMENT_IDEMPOTENCY_UNVERIFIED", "Eski ölçümün istek özeti doğrulanamadı.");
        if (existing.requestHash !== requestHash) throw new PilotEvidenceServiceError(409, "MEASUREMENT_IDEMPOTENCY_CONFLICT", "Measurement key farklı bir istekle daha önce kullanılmış.");
        return { pilotCase, measurement: existing, replayed: true };
      }
      if (pilotCase.reviewerDecision || pilotCase.status === "completed" || pilotCase.status === "rejected") throw new PilotEvidenceServiceError(409, "PILOT_CASE_TERMINAL", "İncelenmiş pilot case için yeni ölçüm alınamaz.");
      const rows = await tx.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.companyId, actor.companyId), eq(normalizedQuantityRows.documentId, pilotCase.documentId)));
      const rowIds = rows.map((row) => row.id);
      const transfers = rowIds.length ? await tx.select({ sourceQuantityRowId: quotationItems.sourceQuantityRowId, sourceDocumentId: quotationItems.sourceDocumentId, sourceProcessingRunId: quotationItems.sourceProcessingRunId, sourceCellRange: quotationItems.sourceCellRange, sourceReference: quotationItems.sourceReference }).from(quotationItems).where(and(eq(quotationItems.companyId, actor.companyId), inArray(quotationItems.sourceQuantityRowId, rowIds))) : [];
      const corrections = rowIds.length ? await tx.select({ entityId: smartcheckAuditLogs.entityId, metadataJson: smartcheckAuditLogs.metadataJson }).from(smartcheckAuditLogs).where(and(eq(smartcheckAuditLogs.companyId, actor.companyId), eq(smartcheckAuditLogs.entityType, "normalized_quantity_row"), inArray(smartcheckAuditLogs.entityId, rowIds))) : [];
      const manuallyCorrectedRowIds = new Set(corrections.filter((entry) => entry.entityId && Object.keys((entry.metadataJson?.correction as Record<string, unknown> | undefined) ?? {}).length).map((entry) => entry.entityId!));
      const [processingRun] = await tx.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.companyId, actor.companyId), eq(documentProcessingRuns.documentId, pilotCase.documentId))).orderBy(desc(documentProcessingRuns.createdAt)).limit(1);
      const completion = input.complete ? (input.workflowCompletedAt ?? new Date()) : input.workflowCompletedAt;
      const metrics = calculatePilotMetrics({ rows: rows.map((row) => ({ id: row.id, normalizedDescription: row.normalizedDescription, normalizedUnit: row.normalizedUnit, normalizedQuantity: row.normalizedQuantity, normalizedPrice: row.normalizedPrice, reviewStatus: row.reviewStatus, findingsCount: row.findingsJson.length })), transfers, manuallyCorrectedRowIds, processingRun: processingRun ? { id: processingRun.id, startedAt: processingRun.startedAt, completedAt: processingRun.completedAt } : null, workflowStartedAt: pilotCase.workflowStartedAt, workflowCompletedAt: completion ?? pilotCase.workflowCompletedAt });
      const [revision] = await tx.select({ value: sql<number>`coalesce(max(${smartcheckPilotMeasurements.caseRevision}),0)::int + 1` }).from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, actor.companyId), eq(smartcheckPilotMeasurements.pilotCaseId, id)));
      const [measurement] = await tx.insert(smartcheckPilotMeasurements).values({ companyId: actor.companyId, pilotCaseId: id, processingRunId: processingRun?.id ?? null, measuredByUserId: actor.userId, measurementKey: input.measurementKey, requestHash, caseRevision: revision?.value ?? 1, measuredAt: new Date(), totalRows: metrics.totalRows, parsedRows: metrics.parsedRows, manuallyCorrectedRows: metrics.manuallyCorrectedRows, findingCount: metrics.findingCount, approvedRows: metrics.approvedRows, exceptionRows: metrics.exceptionRows, transferredRows: metrics.transferredRows, provenanceCompleteRows: metrics.provenanceCompleteRows, processingDurationSeconds: metrics.processingDurationSeconds, workflowDurationSeconds: metrics.workflowDurationSeconds, parseRate: metrics.parseRate === null ? null : String(metrics.parseRate), manualReentryFreeRate: metrics.manualReentryFreeRate === null ? null : String(metrics.manualReentryFreeRate), provenanceCoverage: metrics.provenanceCoverage === null ? null : String(metrics.provenanceCoverage), notes: input.notes }).returning();
      const [updated] = await tx.update(smartcheckPilotCases).set({ status: "review", workflowCompletedAt: completion ?? pilotCase.workflowCompletedAt, updatedAt: new Date() }).where(and(eq(smartcheckPilotCases.id, id), eq(smartcheckPilotCases.companyId, actor.companyId), sql`${smartcheckPilotCases.reviewerDecision} is null`)).returning();
      if (!updated) throw new PilotEvidenceServiceError(409, "PILOT_CASE_REVIEW_CONFLICT", "Pilot case eşzamanlı olarak incelendi.");
      return { pilotCase: updated, measurement, metrics, replayed: false };
    });
  }

  async review(actor: Actor, id: string, input: ReviewPilotCaseInput) {
    return this.transaction(actor, async (tx) => {
      await tx.execute(sql`select id from smartcheck_pilot_cases where id=${id} and company_id=${actor.companyId} for update`);
      const [pilotCase] = await tx.select().from(smartcheckPilotCases).where(and(eq(smartcheckPilotCases.id, id), eq(smartcheckPilotCases.companyId, actor.companyId)));
      if (!pilotCase) throw new PilotEvidenceServiceError(404, "PILOT_CASE_NOT_FOUND", "Pilot case bulunamadı.");
      const normalizedNotes = input.notes?.trim() || null;
      if (pilotCase.reviewerDecision) {
        if (pilotCase.reviewerUserId === actor.userId && pilotCase.reviewerDecision === input.decision && (pilotCase.reviewerNotes?.trim() || null) === normalizedNotes) return { ...pilotCase, replayed: true };
        throw new PilotEvidenceServiceError(409, "PILOT_REVIEW_CONFLICT", "Pilot case için farklı bir reviewer kararı zaten kaydedilmiş.");
      }
      const [measurement] = await tx.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, actor.companyId), eq(smartcheckPilotMeasurements.pilotCaseId, id))).orderBy(sql`${smartcheckPilotMeasurements.caseRevision} desc nulls last`, desc(smartcheckPilotMeasurements.measuredAt), desc(smartcheckPilotMeasurements.id)).limit(1);
      if (!measurement) throw new PilotEvidenceServiceError(409, "PILOT_MEASUREMENT_REQUIRED", "Reviewer kararı öncesi en az bir pilot ölçümü alınmalı.");
      if (!measurement.requestHash || !measurement.caseRevision) throw new PilotEvidenceServiceError(409, "PILOT_MEASUREMENT_UNVERIFIED", "Eski veya doğrulanmamış pilot ölçümü reviewer kararında kullanılamaz.");
      const [measurementAudit] = await tx.select({ id: smartcheckAuditLogs.id }).from(smartcheckAuditLogs).where(and(
        eq(smartcheckAuditLogs.companyId, actor.companyId), eq(smartcheckAuditLogs.action, "pilot_case_measured"), eq(smartcheckAuditLogs.entityId, id),
        sql`${smartcheckAuditLogs.metadataJson}->>'measurementId' = ${measurement.id}`,
        sql`${smartcheckAuditLogs.metadataJson}->>'requestHash' = ${measurement.requestHash}`,
      )).limit(1);
      if (!measurementAudit) throw new PilotEvidenceServiceError(409, "PILOT_MEASUREMENT_UNVERIFIED", "Pilot ölçümünün değişmez audit kanıtı doğrulanamadı.");
      if (measurement.measuredByUserId === actor.userId) throw new PilotEvidenceServiceError(409, "PILOT_MAKER_CHECKER_REQUIRED", "Ölçümü alan kullanıcı aynı pilot case için reviewer olamaz.");
      const [membership] = await tx.select({ role: memberships.role }).from(memberships).where(and(eq(memberships.companyId, actor.companyId), eq(memberships.userId, actor.userId))).limit(1);
      if (!membership || !["owner", "admin", "manager"].includes(membership.role)) throw new PilotEvidenceServiceError(403, "PILOT_REVIEW_ROLE_FORBIDDEN", "Pilot reviewer yetkisi bulunamadı.");
      const [updated] = await tx.update(smartcheckPilotCases).set({ status: input.decision === "rejected" ? "rejected" : "completed", reviewerUserId: actor.userId, reviewerRole: membership.role, reviewedAt: new Date(), reviewerDecision: input.decision, reviewerNotes: normalizedNotes, workflowCompletedAt: pilotCase.workflowCompletedAt ?? new Date(), updatedAt: new Date() }).where(and(eq(smartcheckPilotCases.id, id), eq(smartcheckPilotCases.companyId, actor.companyId), sql`${smartcheckPilotCases.reviewerDecision} is null`)).returning();
      if (!updated) throw new PilotEvidenceServiceError(409, "PILOT_REVIEW_CONFLICT", "Pilot case eşzamanlı olarak incelendi.");
      return { ...updated, replayed: false };
    });
  }

  async metrics(actor: Actor) {
    return this.transaction(actor, async (tx) => {
      const cases = await tx.select().from(smartcheckPilotCases).where(eq(smartcheckPilotCases.companyId, actor.companyId)).orderBy(desc(smartcheckPilotCases.createdAt)).limit(100);
      const ids = cases.map((item) => item.id);
      const measurements = ids.length ? await tx.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, actor.companyId), inArray(smartcheckPilotMeasurements.pilotCaseId, ids))).orderBy(sql`${smartcheckPilotMeasurements.caseRevision} desc nulls last`, desc(smartcheckPilotMeasurements.measuredAt), desc(smartcheckPilotMeasurements.id)) : [];
      const latest = new Map<string, typeof measurements[number]>();
      for (const measurement of measurements) if (!latest.has(measurement.pilotCaseId)) latest.set(measurement.pilotCaseId, measurement);
      const summary = summarizePilotMeasurements([...latest.values()]);
      return { summary, reviewedCaseCount: cases.filter((item) => item.reviewedAt).length, requiredCaseCount: 5, gates: { fiveCases: cases.length >= 5, parseRateAtLeast90: (summary.parseRate ?? 0) >= 0.9, manualReentryFreeAtLeast90: (summary.manualReentryFreeRate ?? 0) >= 0.9, provenanceCompleteForTransfers: summary.transferredRows > 0 && summary.provenanceCoverage === 1 } };
    });
  }
}
