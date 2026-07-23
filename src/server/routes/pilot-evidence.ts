import type { Express, Request, RequestHandler } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  documents,
  documentProcessingRuns,
  normalizedQuantityRows,
  quotationItems,
  smartcheckAuditLogs,
  smartcheckPilotCases,
  smartcheckPilotMeasurements,
} from "../../db/schema";
import { smartcheckImportEnabled } from "../../smartcheck/import/config";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { calculatePilotMetrics, summarizePilotMeasurements } from "../smartcheck/pilot/metrics";

const canOperatePilot = checkRole(["owner", "admin", "manager"]);
const featureGate: RequestHandler = (req, res, next) => {
  if (!smartcheckImportEnabled(req.user.companyId)) return res.status(404).json({ error: "SmartCheck pilot kapsamında etkin değil.", code: "SMARTCHECK_IMPORT_DISABLED" });
  next();
};
const rateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`smartcheck-pilot:${req.user.companyId}:${req.user.userId}`, 60, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla pilot ölçüm isteği." });
  next();
};
const readStack = [authenticate, featureGate, rateLimit, canOperatePilot];
const mutateStack = [authenticate, requireVerifiedEmail, featureGate, rateLimit, canOperatePilot];

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function integerValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

async function audit(req: Request, action: string, entityType: string, entityId: string, metadataJson: Record<string, unknown> = {}) {
  await db.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson });
}

async function findCase(companyId: string, id: string) {
  const [pilotCase] = await db.select().from(smartcheckPilotCases).where(and(eq(smartcheckPilotCases.id, id), eq(smartcheckPilotCases.companyId, companyId)));
  return pilotCase;
}

async function buildMeasurement(companyId: string, userId: string, pilotCase: typeof smartcheckPilotCases.$inferSelect, input: { measurementKey: string; complete: boolean; notes: string | null; workflowCompletedAt: Date | null }) {
  const rows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.companyId, companyId), eq(normalizedQuantityRows.documentId, pilotCase.documentId)));
  const rowIds = rows.map((row) => row.id);
  const transfers = rowIds.length ? await db.select({ sourceQuantityRowId: quotationItems.sourceQuantityRowId, sourceDocumentId: quotationItems.sourceDocumentId, sourceProcessingRunId: quotationItems.sourceProcessingRunId, sourceCellRange: quotationItems.sourceCellRange, sourceReference: quotationItems.sourceReference }).from(quotationItems).where(and(eq(quotationItems.companyId, companyId), inArray(quotationItems.sourceQuantityRowId, rowIds))) : [];
  const audits = rowIds.length ? await db.select({ entityId: smartcheckAuditLogs.entityId, metadataJson: smartcheckAuditLogs.metadataJson }).from(smartcheckAuditLogs).where(and(eq(smartcheckAuditLogs.companyId, companyId), eq(smartcheckAuditLogs.entityType, "normalized_quantity_row"), inArray(smartcheckAuditLogs.entityId, rowIds))) : [];
  const manuallyCorrectedRowIds = new Set(audits.filter((entry) => entry.entityId && Object.keys((entry.metadataJson?.correction as Record<string, unknown> | undefined) ?? {}).length > 0).map((entry) => entry.entityId!));
  const [processingRun] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.companyId, companyId), eq(documentProcessingRuns.documentId, pilotCase.documentId))).orderBy(desc(documentProcessingRuns.createdAt)).limit(1);
  const metrics = calculatePilotMetrics({
    rows: rows.map((row) => ({ id: row.id, normalizedDescription: row.normalizedDescription, normalizedUnit: row.normalizedUnit, normalizedQuantity: row.normalizedQuantity, normalizedPrice: row.normalizedPrice, reviewStatus: row.reviewStatus, findingsCount: row.findingsJson.length })),
    transfers,
    manuallyCorrectedRowIds,
    processingRun: processingRun ? { id: processingRun.id, startedAt: processingRun.startedAt, completedAt: processingRun.completedAt } : null,
    workflowStartedAt: pilotCase.workflowStartedAt,
    workflowCompletedAt: input.workflowCompletedAt ?? pilotCase.workflowCompletedAt,
  });
  const values = {
    companyId,
    pilotCaseId: pilotCase.id,
    processingRunId: processingRun?.id ?? null,
    measuredByUserId: userId,
    measurementKey: input.measurementKey,
    totalRows: metrics.totalRows,
    parsedRows: metrics.parsedRows,
    manuallyCorrectedRows: metrics.manuallyCorrectedRows,
    findingCount: metrics.findingCount,
    approvedRows: metrics.approvedRows,
    transferredRows: metrics.transferredRows,
    provenanceCompleteRows: metrics.provenanceCompleteRows,
    processingDurationSeconds: metrics.processingDurationSeconds,
    workflowDurationSeconds: metrics.workflowDurationSeconds,
    parseRate: metrics.parseRate === null ? null : String(metrics.parseRate),
    manualReentryFreeRate: metrics.manualReentryFreeRate === null ? null : String(metrics.manualReentryFreeRate),
    provenanceCoverage: metrics.provenanceCoverage === null ? null : String(metrics.provenanceCoverage),
    notes: input.notes,
  };
  const [created] = await db.insert(smartcheckPilotMeasurements).values(values).onConflictDoNothing({ target: [smartcheckPilotMeasurements.companyId, smartcheckPilotMeasurements.pilotCaseId, smartcheckPilotMeasurements.measurementKey] }).returning();
  const [measurement] = created ? [created] : await db.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, companyId), eq(smartcheckPilotMeasurements.pilotCaseId, pilotCase.id), eq(smartcheckPilotMeasurements.measurementKey, input.measurementKey)));
  const nextStatus = input.complete ? "completed" : processingRun?.status === "running" || processingRun?.status === "queued" ? "processing" : "review";
  const [updatedCase] = await db.update(smartcheckPilotCases).set({ status: nextStatus, workflowCompletedAt: input.workflowCompletedAt ?? pilotCase.workflowCompletedAt, updatedAt: new Date() }).where(and(eq(smartcheckPilotCases.id, pilotCase.id), eq(smartcheckPilotCases.companyId, companyId))).returning();
  return { pilotCase: updatedCase, measurement, metrics };
}

export function registerPilotEvidenceRoutes(app: Express) {
  app.get("/api/smartcheck/pilot-cases", ...readStack, async (req, res) => {
    const cases = await db.select().from(smartcheckPilotCases).where(eq(smartcheckPilotCases.companyId, req.user.companyId)).orderBy(desc(smartcheckPilotCases.createdAt)).limit(100);
    const ids = cases.map((pilotCase) => pilotCase.id);
    const measurements = ids.length ? await db.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, req.user.companyId), inArray(smartcheckPilotMeasurements.pilotCaseId, ids))).orderBy(desc(smartcheckPilotMeasurements.measuredAt)) : [];
    const latest = new Map<string, typeof measurements[number]>();
    for (const measurement of measurements) if (!latest.has(measurement.pilotCaseId)) latest.set(measurement.pilotCaseId, measurement);
    res.json(cases.map((pilotCase) => ({ ...pilotCase, latestMeasurement: latest.get(pilotCase.id) ?? null })));
  });

  app.post("/api/smartcheck/pilot-cases", ...mutateStack, async (req, res) => {
    const documentId = textValue(req.body?.documentId, 80);
    const pilotId = textValue(req.body?.pilotId, 120);
    const customerReference = textValue(req.body?.customerReference, 255);
    const projectReference = textValue(req.body?.projectReference, 255);
    const discipline = textValue(req.body?.discipline, 80) || "MEP";
    const permissionReference = textValue(req.body?.permissionReference, 255);
    const permissionGrantedAt = parseDate(req.body?.permissionGrantedAt);
    const retentionUntil = parseDate(req.body?.retentionUntil);
    const expectedRowCount = integerValue(req.body?.expectedRowCount);
    const workflowStartedAt = parseDate(req.body?.workflowStartedAt) ?? new Date();
    if (!documentId || !pilotId || !customerReference || !projectReference || !permissionReference || !permissionGrantedAt || !retentionUntil || expectedRowCount === undefined) return res.status(400).json({ error: "Pilot kimliği, kaynak doküman, izin, retention ve beklenen satır sayısı zorunludur." });
    if (retentionUntil < permissionGrantedAt) return res.status(400).json({ error: "Retention tarihi izin tarihinden önce olamaz." });
    const [document] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Pilot kaynak dokümanı bulunamadı." });
    if (document.checksumSha256 === "pending") return res.status(409).json({ error: "Pilot case için kaynak yüklemesi tamamlanmalı." });
    const [existing] = await db.select().from(smartcheckPilotCases).where(and(eq(smartcheckPilotCases.companyId, req.user.companyId), eq(smartcheckPilotCases.pilotId, pilotId), eq(smartcheckPilotCases.documentId, documentId)));
    if (existing) return res.status(409).json({ error: "Bu pilot ve doküman için case zaten kayıtlı.", caseId: existing.id });
    const [pilotCase] = await db.insert(smartcheckPilotCases).values({ companyId: req.user.companyId, documentId, pilotId, customerReference, projectReference, discipline, permissionReference, permissionGrantedAt, retentionUntil, expectedRowCount, workflowStartedAt, createdByUserId: req.user.userId }).returning();
    await audit(req, "pilot_case_admitted", "smartcheck_pilot_case", pilotCase.id, { documentId, pilotId, permissionReference, retentionUntil });
    res.status(201).json({ ...pilotCase, latestMeasurement: null });
  });

  app.get("/api/smartcheck/pilot-cases/:id", ...readStack, async (req, res) => {
    const pilotCase = await findCase(req.user.companyId, req.params.id);
    if (!pilotCase) return res.status(404).json({ error: "Pilot case bulunamadı." });
    const measurements = await db.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, req.user.companyId), eq(smartcheckPilotMeasurements.pilotCaseId, pilotCase.id))).orderBy(desc(smartcheckPilotMeasurements.measuredAt));
    res.json({ ...pilotCase, measurements });
  });

  app.post("/api/smartcheck/pilot-cases/:id/measure", ...mutateStack, async (req, res) => {
    const pilotCase = await findCase(req.user.companyId, req.params.id);
    if (!pilotCase) return res.status(404).json({ error: "Pilot case bulunamadı." });
    const measurementKey = textValue(req.body?.measurementKey, 120) || `run:${pilotCase.documentId}:${new Date().toISOString().slice(0, 10)}`;
    const complete = req.body?.complete === true;
    const requestedCompletion = parseDate(req.body?.workflowCompletedAt);
    if (requestedCompletion === undefined) return res.status(400).json({ error: "Geçersiz workflow tamamlanma zamanı." });
    const result = await buildMeasurement(req.user.companyId, req.user.userId, pilotCase, { measurementKey, complete, notes: textValue(req.body?.notes, 2000) || null, workflowCompletedAt: complete ? (requestedCompletion ?? new Date()) : requestedCompletion });
    await audit(req, "pilot_case_measured", "smartcheck_pilot_case", pilotCase.id, { measurementId: result.measurement.id, measurementKey, complete, metrics: result.metrics });
    res.status(201).json(result);
  });

  app.patch("/api/smartcheck/pilot-cases/:id/review", ...mutateStack, async (req, res) => {
    const decision = textValue(req.body?.decision, 30);
    if (!['approved', 'rejected', 'accepted_exception'].includes(decision)) return res.status(400).json({ error: "Reviewer kararı approved, rejected veya accepted_exception olabilir." });
    const notes = textValue(req.body?.notes, 2000);
    if ((decision === "rejected" || decision === "accepted_exception") && !notes) return res.status(400).json({ error: "Red veya istisna kararında gerekçe zorunludur." });
    const pilotCase = await findCase(req.user.companyId, req.params.id);
    if (!pilotCase) return res.status(404).json({ error: "Pilot case bulunamadı." });
    const [latestMeasurement] = await db.select({ id: smartcheckPilotMeasurements.id }).from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, req.user.companyId), eq(smartcheckPilotMeasurements.pilotCaseId, pilotCase.id))).orderBy(desc(smartcheckPilotMeasurements.measuredAt)).limit(1);
    if (!latestMeasurement) return res.status(409).json({ error: "Reviewer kararı öncesi en az bir pilot ölçümü alınmalı.", code: "PILOT_MEASUREMENT_REQUIRED" });
    const [updated] = await db.update(smartcheckPilotCases).set({ status: decision === "rejected" ? "rejected" : "completed", reviewerUserId: req.user.userId, reviewerRole: req.user.role, reviewedAt: new Date(), reviewerDecision: decision, reviewerNotes: notes || null, workflowCompletedAt: pilotCase.workflowCompletedAt ?? new Date(), updatedAt: new Date() }).where(and(eq(smartcheckPilotCases.id, pilotCase.id), eq(smartcheckPilotCases.companyId, req.user.companyId))).returning();
    await audit(req, `pilot_case_${decision}`, "smartcheck_pilot_case", pilotCase.id, { measurementId: latestMeasurement.id, decision, reviewerRole: req.user.role });
    res.json(updated);
  });

  app.get("/api/smartcheck/pilot-metrics", ...readStack, async (req, res) => {
    const cases = await db.select().from(smartcheckPilotCases).where(eq(smartcheckPilotCases.companyId, req.user.companyId)).orderBy(desc(smartcheckPilotCases.createdAt)).limit(100);
    const ids = cases.map((pilotCase) => pilotCase.id);
    const measurements = ids.length ? await db.select().from(smartcheckPilotMeasurements).where(and(eq(smartcheckPilotMeasurements.companyId, req.user.companyId), inArray(smartcheckPilotMeasurements.pilotCaseId, ids))).orderBy(desc(smartcheckPilotMeasurements.measuredAt)) : [];
    const latest = new Map<string, typeof measurements[number]>();
    for (const measurement of measurements) if (!latest.has(measurement.pilotCaseId)) latest.set(measurement.pilotCaseId, measurement);
    const latestMeasurements = [...latest.values()];
    const summary = summarizePilotMeasurements(latestMeasurements);
    res.json({ summary, reviewedCaseCount: cases.filter((pilotCase) => pilotCase.reviewedAt).length, requiredCaseCount: 5, gates: { fiveCases: cases.length >= 5, parseRateAtLeast90: (summary.parseRate ?? 0) >= 0.9, manualReentryFreeAtLeast90: (summary.manualReentryFreeRate ?? 0) >= 0.9, provenanceCompleteForTransfers: summary.transferredRows > 0 && summary.provenanceCoverage === 1 } });
  });
}
