import crypto from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import express from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { quickAddJob } from "graphile-worker";
import { db } from "../../db";
import { clients, companies, documents, documentProcessingRuns, normalizedQuantityRows, priceSnapshots, quotationItemEvidence, quotationItems, quotations, smartcheckAuditLogs } from "../../db/schema";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { SMARTCHECK_MAX_FILE_BYTES, smartcheckImportEnabled } from "../../smartcheck/import/config";
import { createStorageAdapter, LocalStorageAdapter } from "../../smartcheck/import/storage";
import { detectAndValidateFile, maxBytesForSmartCheckFileName, sha256, validateXlsxArchive } from "../../smartcheck/import/file-security";
import { inspectDocument, processingIdempotencyKey } from "../../smartcheck/import/processor";
import { validateRows, type ColumnMapping, type ParsedQuantityRow } from "../../smartcheck/import/normalize";
import { getMappingProfile } from "../../smartcheck/import/mapping-profiles";
import { calculateLineItemTotal, calculateQuotationTotals } from "../../lib/calculations";
import { sha256Payload } from "../../smartcheck/pricing/snapshots";
import { isProcessingRunStale } from "../../smartcheck/import/run-health";
import {
  smartcheckCompleteRequestSchema,
  smartcheckMappingRequestSchema,
  smartcheckRowReviewRequestSchema,
  smartcheckTransferRequestSchema,
  smartcheckTransferToNewQuotationRequestSchema,
  smartcheckUploadRequestSchema,
} from "../../contracts/smartcheck";

const canReview = checkRole(["owner", "admin", "manager"]);
const uploadBody = express.raw({ type: ["text/csv", "text/plain", "application/csv", "application/octet-stream", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "model/ifc", "application/ifc"], limit: SMARTCHECK_MAX_FILE_BYTES });

const featureGate: RequestHandler = (req, res, next) => {
  if (!smartcheckImportEnabled(req.user.companyId)) return res.status(404).json({ error: "SmartCheck import pilot kapsamında etkin değil.", code: "SMARTCHECK_IMPORT_DISABLED" });
  next();
};

const rateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`smartcheck:${req.user.companyId}:${req.user.userId}`, 60, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla istek." });
  next();
};

// Status/queue/preview reads are polled by the workspace while a worker runs.
// Keep their abuse budget separate from mutation/upload operations so a normal
// long-running import cannot consume the write bucket and surface false 429s.
const readRateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`smartcheck:read:${req.user.companyId}:${req.user.userId}`, 240, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "SmartCheck okuma limiti aşıldı." });
  next();
};

async function audit(req: Request, action: string, entityType: string, entityId?: string, metadataJson: Record<string, unknown> = {}) {
  await db.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson });
}

function smartcheckQuoteNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `SC-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function registerSmartCheckRoutes(app: Express) {
  const protectedStack = [authenticate, requireVerifiedEmail, featureGate, rateLimit, canReview];

  app.post("/api/smartcheck/documents/uploads", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckUploadRequestSchema.safeParse(req.body);
    if (!parsedRequest.success || parsedRequest.data.fileSizeBytes > maxBytesForSmartCheckFileName(parsedRequest.data.fileName)) {
      return res.status(400).json({ error: "Geçersiz dosya bilgisi." });
    }
    const { fileName: originalFileName, mimeType, fileSizeBytes } = parsedRequest.data;
    if (!/\.(xlsx|csv|ifc)$/i.test(originalFileName)) return res.status(415).json({ error: "Yalnız XLSX, CSV ve IFC kabul edilir." });
    const storageKey = `${req.user.companyId}/${crypto.randomUUID()}/original`;
    const [document] = await db.insert(documents).values({
      companyId: req.user.companyId,
      uploadedByUserId: req.user.userId,
      originalFileName,
      displayName: originalFileName,
      mimeType,
      fileSizeBytes,
      storageKey,
      checksumSha256: "pending",
      status: "uploaded",
    }).returning();
    const storage = createStorageAdapter();
    const target = storage instanceof LocalStorageAdapter
      ? { uploadUrl: `/api/smartcheck/documents/${document.id}/content`, method: "PUT" as const, headers: { "content-type": mimeType } }
      : await storage.createUploadTarget(storageKey, mimeType);
    await audit(req, "upload_created", "document", document.id, { fileName: originalFileName, fileSizeBytes });
    res.status(201).json({ documentId: document.id, ...target, maxFileSizeBytes: maxBytesForSmartCheckFileName(originalFileName) });
  });

  app.put("/api/smartcheck/documents/:id/content", authenticate, requireVerifiedEmail, featureGate, rateLimit, canReview, uploadBody, async (req, res) => {
    if (process.env.NODE_ENV === "production") return res.status(404).end();
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const content = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (content.length !== document.fileSizeBytes) return res.status(400).json({ error: "Dosya boyutu yükleme kaydıyla eşleşmiyor." });
    detectAndValidateFile(content, document.originalFileName, document.mimeType);
    await createStorageAdapter().put(document.storageKey, content, document.mimeType);
    await audit(req, "content_uploaded", "document", document.id, { bytes: content.length });
    res.status(204).end();
  });

  app.post("/api/smartcheck/documents/:id/complete", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckCompleteRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "Geçersiz SHA-256 checksum." });
    const checksum = parsedRequest.data.checksumSha256;
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const storage = createStorageAdapter();
    const content = await storage.get(document.storageKey);
    if (content.length !== document.fileSizeBytes || sha256(content) !== checksum) return res.status(422).json({ error: "Dosya bütünlüğü doğrulanamadı." });
    const kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
    if (kind === "xlsx") {
      await validateXlsxArchive(content);
    }
    if (kind === "ifc") {
      await audit(req, "upload_completed", "document", document.id, { checksum, kind, processingStatus: "ifc_worker_enabled" });
    }
    const [updated] = await db.update(documents).set({ checksumSha256: checksum, updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId))).returning();
    if (kind !== "ifc") await audit(req, "upload_completed", "document", document.id, { checksum, kind });
    res.json(updated);
  });

  app.get("/api/smartcheck/documents/:id/preview", authenticate, featureGate, readRateLimit, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    if (document.checksumSha256 === "pending") return res.status(409).json({ error: "Önizleme için yükleme tamamlanmalı." });
    try {
      const content = await createStorageAdapter().get(document.storageKey);
      if (content.length !== document.fileSizeBytes || sha256(content) !== document.checksumSha256) return res.status(422).json({ error: "Dosya bütünlüğü doğrulanamadı." });
      const kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
      if (kind === "ifc") return res.status(409).json({ error: "IFC önizleme için işleme kuyruğunu başlatın; kanıt artifact'i run sonunda oluşur.", code: "IFC_PREVIEW_USES_PROCESSING_ARTIFACT" });
      const preview = await inspectDocument(content, kind);
      res.json({ document: { id: document.id, fileName: document.originalFileName, fileSizeBytes: document.fileSizeBytes, checksumSha256: document.checksumSha256, mapping: document.importMappingJson }, preview });
    } catch (error) {
      const code = error instanceof Error ? error.message : "PREVIEW_FAILED";
      res.status(422).json({ error: "Dosya önizlemesi oluşturulamadı.", code });
    }
  });

  app.get("/api/smartcheck/documents/:id/status", authenticate, featureGate, readRateLimit, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const [run] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.documentId, document.id), eq(documentProcessingRuns.companyId, req.user.companyId))).orderBy(desc(documentProcessingRuns.createdAt)).limit(1);
    res.json({ document, run: run ?? null });
  });

  app.patch("/api/smartcheck/documents/:id/mapping", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckMappingRequestSchema.safeParse(req.body ?? {});
    if (!parsedRequest.success) return res.status(400).json({ error: "Geçersiz eşleme gövdesi." });
    const mappingRequest = parsedRequest.data;
    const allowed = ["profileId", "sheet", "positionCode", "description", "unit", "quantity", "price", "wastePercent"] as const;
    const mapping: ColumnMapping = {};
    for (const key of allowed) {
      const value = mappingRequest[key];
      if (value) mapping[key] = value.trim();
    }
    if (mapping.profileId && !getMappingProfile(mapping.profileId)) return res.status(400).json({ error: "Bilinmeyen MEP eşleme profili." });
    if (mappingRequest.headerRow !== undefined) mapping.headerRow = mappingRequest.headerRow;
    const [document] = await db.update(documents).set({ importMappingJson: mapping, updatedAt: new Date() }).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId))).returning();
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    await audit(req, "mapping_updated", "document", document.id, { mapping });
    res.json({ mapping });
  });

  app.post("/api/smartcheck/documents/:id/process", ...protectedStack, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    if (document.checksumSha256 === "pending") return res.status(409).json({ error: "Yükleme henüz tamamlanmadı." });
    const idempotencyKey = processingIdempotencyKey(document.checksumSha256, document.importMappingJson as ColumnMapping);
    const [existing] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.companyId, req.user.companyId), eq(documentProcessingRuns.documentId, document.id), eq(documentProcessingRuns.idempotencyKey, idempotencyKey)));
    if (existing) return res.status(200).json(existing);
    const [run] = await db.insert(documentProcessingRuns).values({ companyId: req.user.companyId, documentId: document.id, idempotencyKey, pipelineVersion: 1, progressMessage: "Kuyruğa alındı" }).returning();
    await db.update(documents).set({ status: "queued", updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId)));
    await quickAddJob({ connectionString: process.env.DATABASE_URL! }, "process_smartcheck_document", { companyId: req.user.companyId, documentId: document.id, processingRunId: run.id }, { jobKey: `smartcheck:${run.id}`, maxAttempts: 3 });
    await audit(req, "processing_queued", "processing_run", run.id, { documentId: document.id, idempotencyKey });
    res.status(202).json(run);
  });

  app.post("/api/smartcheck/documents/:id/retry", ...protectedStack, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    if (document.checksumSha256 === "pending") return res.status(409).json({ error: "Yükleme henüz tamamlanmadı." });
    const [latestRun] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.documentId, document.id), eq(documentProcessingRuns.companyId, req.user.companyId))).orderBy(desc(documentProcessingRuns.createdAt)).limit(1);
    if (!latestRun || latestRun.status !== "failed") return res.status(409).json({ error: "Yalnızca başarısız son işlem tekrar kuyruğa alınabilir." });
    const idempotencyKey = `${processingIdempotencyKey(document.checksumSha256, document.importMappingJson as ColumnMapping)}:retry:${crypto.randomUUID()}`;
    const [run] = await db.insert(documentProcessingRuns).values({ companyId: req.user.companyId, documentId: document.id, idempotencyKey, pipelineVersion: latestRun.pipelineVersion, progressMessage: "Tekrar kuyruğa alındı" }).returning();
    await db.update(documents).set({ status: "queued", updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId)));
    await quickAddJob({ connectionString: process.env.DATABASE_URL! }, "process_smartcheck_document", { companyId: req.user.companyId, documentId: document.id, processingRunId: run.id }, { jobKey: `smartcheck:${run.id}`, maxAttempts: 3 });
    await audit(req, "processing_retried", "processing_run", run.id, { documentId: document.id, previousRunId: latestRun.id });
    res.status(202).json(run);
  });

  app.post("/api/smartcheck/documents/:id/recover-stale", ...protectedStack, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const [latestRun] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.documentId, document.id), eq(documentProcessingRuns.companyId, req.user.companyId))).orderBy(desc(documentProcessingRuns.createdAt)).limit(1);
    if (!latestRun || !isProcessingRunStale(latestRun)) return res.status(409).json({ error: "Yalnız stale queued/running işlem kurtarılabilir.", code: "PROCESSING_RUN_NOT_STALE" });
    const recoveredAt = new Date();
    const [recovered] = await db.update(documentProcessingRuns).set({ status: "failed", currentStage: "failed", progressMessage: "Worker stale; operatör kurtarma kararı bekleniyor", errorCode: "WORKER_STALE", errorMessage: "Worker heartbeat eşiği aşıldı; işlem operatör kararıyla yeniden kuyruğa alınmalı.", completedAt: recoveredAt, updatedAt: recoveredAt }).where(and(eq(documentProcessingRuns.id, latestRun.id), eq(documentProcessingRuns.companyId, req.user.companyId))).returning();
    await db.update(documents).set({ status: "failed", updatedAt: recoveredAt }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId)));
    await audit(req, "processing_stale_recovered", "processing_run", latestRun.id, { documentId: document.id, errorCode: "WORKER_STALE" });
    res.json(recovered);
  });

  app.get("/api/smartcheck/queue", authenticate, featureGate, readRateLimit, canReview, async (req, res) => {
    const queue = await db.select({
      id: documentProcessingRuns.id,
      documentId: documentProcessingRuns.documentId,
      status: documentProcessingRuns.status,
      currentStage: documentProcessingRuns.currentStage,
      progressPercent: documentProcessingRuns.progressPercent,
      progressMessage: documentProcessingRuns.progressMessage,
      errorCode: documentProcessingRuns.errorCode,
      errorMessage: documentProcessingRuns.errorMessage,
      createdAt: documentProcessingRuns.createdAt,
      updatedAt: documentProcessingRuns.updatedAt,
      fileName: documents.originalFileName,
    }).from(documentProcessingRuns).leftJoin(documents, and(eq(documents.id, documentProcessingRuns.documentId), eq(documents.companyId, req.user.companyId))).where(eq(documentProcessingRuns.companyId, req.user.companyId)).orderBy(desc(documentProcessingRuns.createdAt)).limit(25);
    res.json(queue.map((run) => ({ ...run, isStale: isProcessingRunStale(run) })));
  });

  app.get("/api/smartcheck/documents/:id/rows", authenticate, featureGate, readRateLimit, async (req, res) => {
    const [document] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const rows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, document.id), eq(normalizedQuantityRows.companyId, req.user.companyId))).orderBy(normalizedQuantityRows.sheetName, normalizedQuantityRows.sourceRowNumber);
    res.json(rows);
  });

  app.patch("/api/smartcheck/rows/:id/review", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckRowReviewRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "Review kararı approved, accepted_exception veya rejected olmalıdır." });
    const { status } = parsedRequest.data;
    const [current] = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.id, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId)));
    if (!current) return res.status(404).json({ error: "Satır bulunamadı." });
    const notes = parsedRequest.data.notes ?? null;
    if ((status === "rejected" || status === "accepted_exception") && !notes) return res.status(400).json({ error: `${status === "rejected" ? "Red" : "İstisna"} gerekçesi zorunludur.` });
    const patch = parsedRequest.data.correction ?? {};
    const allowedCorrection = ["positionCode", "description", "unit", "quantity", "price", "wastePercent"] as const;
    if (Object.keys(patch).some((key) => !allowedCorrection.includes(key as typeof allowedCorrection[number]))) return res.status(400).json({ error: "Geçersiz düzeltme alanı." });
    const allRows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, current.documentId), eq(normalizedQuantityRows.companyId, req.user.companyId)));
    const corrected: ParsedQuantityRow = {
      sheetName: current.sheetName, sourceRowNumber: current.sourceRowNumber, sourceCellRange: current.sourceCellRange,
      rawDescription: String(patch.description ?? current.rawDescription ?? ""), rawPositionCode: String(patch.positionCode ?? current.rawPositionCode ?? ""),
      rawUnit: String(patch.unit ?? current.rawUnit ?? ""), rawQuantity: String(patch.quantity ?? current.rawQuantity ?? ""),
      rawPrice: String(patch.price ?? current.rawPrice ?? ""), rawWastePercent: String(patch.wastePercent ?? current.rawWastePercent ?? ""), formulaJson: current.formulaJson,
    };
    const validationRows = allRows.map((row) => row.id === current.id ? corrected : {
      sheetName: row.sheetName, sourceRowNumber: row.sourceRowNumber, sourceCellRange: row.sourceCellRange,
      rawDescription: row.rawDescription ?? "", rawPositionCode: row.rawPositionCode ?? "", rawUnit: row.rawUnit ?? "", rawQuantity: row.rawQuantity ?? "", rawPrice: row.rawPrice ?? "", rawWastePercent: row.rawWastePercent ?? "", formulaJson: row.formulaJson,
    });
    const [company] = await db.select({ maxWaste: companies.smartcheckMaxWastePercent }).from(companies).where(eq(companies.id, req.user.companyId));
    const [validated] = validateRows(validationRows, Number(company?.maxWaste ?? 20)).filter((result) => result.row.sourceRowNumber === current.sourceRowNumber && result.row.sheetName === current.sheetName);
    if (!validated) return res.status(500).json({ error: "Satır yeniden doğrulanamadı." });
    if (status === "approved" && validated.findings.length > 0) return res.status(409).json({ error: "Açık bulgular çözülmeden satır onaylanamaz.", findings: validated.findings });
    const [updated] = await db.update(normalizedQuantityRows).set({
      rawDescription: corrected.rawDescription, rawPositionCode: corrected.rawPositionCode, rawUnit: corrected.rawUnit, rawQuantity: corrected.rawQuantity, rawPrice: corrected.rawPrice, rawWastePercent: corrected.rawWastePercent,
      normalizedDescription: validated.normalized.description, normalizedPositionCode: validated.normalized.positionCode, normalizedUnit: validated.normalized.unit, normalizedQuantity: validated.normalized.quantity?.toString(), normalizedPrice: validated.normalized.price?.toString(), normalizedWastePercent: validated.normalized.wastePercent.toString(), findingsJson: validated.findings,
      reviewStatus: status, reviewerUserId: req.user.userId, reviewedAt: new Date(), reviewerNotes: notes, updatedAt: new Date(),
    }).where(and(eq(normalizedQuantityRows.id, current.id), eq(normalizedQuantityRows.companyId, req.user.companyId))).returning();
    await audit(req, `row_${status}`, "normalized_quantity_row", current.id, { documentId: current.documentId, correction: patch, findingCodes: validated.findings.map((finding) => finding.code) });
    res.json(updated);
  });

  app.post("/api/smartcheck/documents/:id/transfer-to-quotation", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckTransferRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "quotationId ve en az bir rowId zorunludur." });
    const { quotationId, rowIds } = parsedRequest.data;
    const [quotation] = await db.select().from(quotations).where(and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId), eq(quotations.status, "draft")));
    if (!quotation) return res.status(404).json({ error: "Aktarım için taslak teklif bulunamadı." });
    const documentRows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId)));
    const selected = documentRows.filter((row) => rowIds.includes(row.id));
    if (selected.length !== new Set(rowIds).size) return res.status(404).json({ error: "Bir veya daha fazla satır bu şirkete/dokümana ait değil." });
    if (selected.some((row) => row.reviewStatus !== "approved" && row.reviewStatus !== "accepted_exception")) return res.status(409).json({ error: "Yalnız onaylı veya gerekçeli istisna satırlar teklife aktarılabilir." });
    const overrides = parsedRequest.data.overrides ?? {};
    const requestedSnapshotIds = selected.map((row) => typeof overrides[row.id]?.priceSnapshotId === "string" ? String(overrides[row.id].priceSnapshotId) : null).filter((id): id is string => Boolean(id));
    const snapshots = requestedSnapshotIds.length ? await db.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.id, requestedSnapshotIds))) : [];
    if (snapshots.length !== new Set(requestedSnapshotIds).size || snapshots.some((snapshot) => snapshot.reviewStatus === "rejected")) return res.status(409).json({ error: "Geçersiz veya reddedilmiş fiyat snapshot seçildi.", code: "INVALID_PRICE_SNAPSHOT" });
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    const sourceDocuments = await db.select({ id: documents.id, checksumSha256: documents.checksumSha256 }).from(documents).where(and(eq(documents.companyId, req.user.companyId), inArray(documents.id, [...new Set(selected.map((row) => row.documentId))])));
    const documentHashById = new Map(sourceDocuments.map((document) => [document.id, document.checksumSha256]));
    const transferResult = await db.transaction(async (tx) => {
      const inserts = selected.map((row) => {
        const override = overrides[row.id] ?? {};
        const priceSnapshotId = typeof override.priceSnapshotId === "string" ? override.priceSnapshotId : null;
        const priceSnapshot = priceSnapshotId ? snapshotById.get(priceSnapshotId) : undefined;
        const quantity = Number(override.quantity ?? row.normalizedQuantity);
        const unitPrice = Number(override.unitPrice ?? priceSnapshot?.amount ?? row.normalizedPrice);
        const costUnitPrice = Number(override.costUnitPrice ?? priceSnapshot?.amount ?? row.normalizedPrice ?? unitPrice);
        const wastePercent = Number(override.wastePercent ?? row.normalizedWastePercent ?? 0);
        const vatPercent = Number(override.vatPercent ?? 20);
        if (![quantity, unitPrice, costUnitPrice, wastePercent, vatPercent].every(Number.isFinite) || quantity <= 0 || unitPrice < 0 || costUnitPrice < 0 || wastePercent < 0 || vatPercent < 0 || vatPercent > 100) throw new Error("INVALID_TRANSFER_VALUES");
        const idempotencyKey = crypto.createHash("sha256").update(`${req.user.companyId}:${quotation.id}:${row.id}`).digest("hex");
        const item = { quantity, unitPrice, discountPercent: 0, vatPercent };
        return {
          companyId: req.user.companyId, quotationId: quotation.id, description: row.normalizedDescription ?? row.rawDescription ?? "Metraj kalemi",
          unit: row.normalizedUnit ?? row.rawUnit ?? "adet", quantity: String(quantity), unitPrice: String(unitPrice), costUnitPrice: String(costUnitPrice),
          wastePercent: String(wastePercent), costCategory: "material", quantitySource: "document", priceSource: priceSnapshot ? "snapshot" : "document",
          sourceReference: `${row.sheetName}!${row.sourceCellRange}`, verificationStatus: "verified", discountPercent: "0", vatPercent: String(vatPercent), total: String(calculateLineItemTotal(item)),
          sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange,
          sourceRuleVersion: "pilot-integrity-v1", transferIdempotencyKey: idempotencyKey,
          priceSnapshotId: priceSnapshot?.id ?? null, priceSnapshotStatus: priceSnapshot ? "attached" : "missing",
        };
      });
      let insertedCount = 0;
      for (const insert of inserts) insertedCount += (await tx.insert(quotationItems).values(insert).onConflictDoNothing().returning({ id: quotationItems.id })).length;
      const allItems = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotation.id), eq(quotationItems.companyId, req.user.companyId)));
      for (const row of selected) {
        const item = allItems.find((candidate) => candidate.sourceQuantityRowId === row.id);
        if (!item) continue;
        const override = overrides[row.id] ?? {};
        const priceSnapshotId = typeof override.priceSnapshotId === "string" ? override.priceSnapshotId : null;
        const priceSnapshot = priceSnapshotId ? snapshotById.get(priceSnapshotId) : undefined;
        const evidenceValue = { quantity: item.quantity, unit: item.unit, price: item.unitPrice, priceSnapshotId: priceSnapshot?.id ?? null };
        await tx.insert(quotationItemEvidence).values([
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "quantity", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "quantity" }), sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange, sourceDocumentHash: documentHashById.get(row.documentId) ?? null, capturedValueJson: evidenceValue, status: "current", createdByUserId: req.user.userId },
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "price", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "price", priceSnapshotId }), priceSnapshotId: priceSnapshot?.id ?? null, sourceDocumentHash: priceSnapshot?.sourceDocumentHash ?? documentHashById.get(row.documentId) ?? null, capturedValueJson: { ...evidenceValue, source: priceSnapshot ? "price_snapshot" : row.rawPrice }, status: "current", createdByUserId: req.user.userId },
        ]).onConflictDoNothing();
      }
      const totals = calculateQuotationTotals(allItems);
      await tx.update(quotations).set({ subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal), vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal), updatedAt: new Date() }).where(and(eq(quotations.id, quotation.id), eq(quotations.companyId, req.user.companyId)));
      return { insertedCount, items: allItems.filter((item) => rowIds.includes(item.sourceQuantityRowId ?? "")) };
    });
    await audit(req, "rows_transferred", "quotation", quotation.id, { documentId: req.params.id, rowIds, transferredCount: transferResult.insertedCount });
    res.json({ quotationId: quotation.id, transferredCount: transferResult.insertedCount, items: transferResult.items });
  });

  app.post("/api/smartcheck/documents/:id/transfer-to-new-quotation", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckTransferToNewQuotationRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "clientName/clientId ve en az bir rowId zorunludur." });
    try {
      const { rowIds } = parsedRequest.data;
      const overrides = parsedRequest.data.overrides ?? {};
      const documentRows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId)));
      const selected = documentRows.filter((row) => rowIds.includes(row.id));
      if (selected.length !== new Set(rowIds).size) return res.status(404).json({ error: "Bir veya daha fazla satır bu şirkete/dokümana ait değil." });
      if (selected.some((row) => row.reviewStatus !== "approved" && row.reviewStatus !== "accepted_exception")) return res.status(409).json({ error: "Yalnız onaylı veya gerekçeli istisna satırlar teklife aktarılabilir." });

      const requestedSnapshotIds = selected.map((row) => typeof overrides[row.id]?.priceSnapshotId === "string" ? String(overrides[row.id].priceSnapshotId) : null).filter((id): id is string => Boolean(id));
      const snapshots = requestedSnapshotIds.length ? await db.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.id, requestedSnapshotIds))) : [];
      if (snapshots.length !== new Set(requestedSnapshotIds).size || snapshots.some((snapshot) => snapshot.reviewStatus === "rejected")) return res.status(409).json({ error: "Geçersiz veya reddedilmiş fiyat snapshot seçildi.", code: "INVALID_PRICE_SNAPSHOT" });
      const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
      const sourceDocuments = await db.select({ id: documents.id, checksumSha256: documents.checksumSha256, originalFileName: documents.originalFileName }).from(documents).where(and(eq(documents.companyId, req.user.companyId), inArray(documents.id, [...new Set(selected.map((row) => row.documentId))])));
      const documentHashById = new Map(sourceDocuments.map((document) => [document.id, document.checksumSha256]));
      const sourceFileName = sourceDocuments[0]?.originalFileName ?? "SmartCheck dosyası";

    const transferResult = await db.transaction(async (tx) => {
      const client = parsedRequest.data.clientId
        ? (await tx.select().from(clients).where(and(eq(clients.id, parsedRequest.data.clientId), eq(clients.companyId, req.user.companyId)))).at(0)
        : (await tx.insert(clients).values({
            companyId: req.user.companyId,
            name: parsedRequest.data.clientName!.trim(),
            type: "company",
            notes: `SmartCheck aktarımı için oluşturuldu. Kaynak: ${sourceFileName}`,
          }).returning()).at(0);
      if (!client) throw new Error("SMARTCHECK_CLIENT_NOT_FOUND");

      const now = new Date();
      const expiryDays = parsedRequest.data.expiryDays ?? 30;
      const [quotation] = await tx.insert(quotations).values({
        companyId: req.user.companyId,
        clientId: client.id,
        quoteNumber: parsedRequest.data.quoteNumber?.trim() || smartcheckQuoteNumber(),
        projectName: parsedRequest.data.projectName?.trim() || `SmartCheck IFC aktarımı · ${sourceFileName}`,
        date: now,
        expiryDate: new Date(now.getTime() + expiryDays * 86400000),
        currency: parsedRequest.data.currency ?? "TRY",
        notes: "SmartCheck insan onaylı/istisna satırlarından oluşturulan taslak teklif.",
        status: "draft",
        subtotal: "0",
        discountTotal: "0",
        vatTotal: "0",
        grandTotal: "0",
        revisionVersion: 1,
        isLatest: true,
      }).returning();

      const inserts = selected.map((row) => {
        const override = overrides[row.id] ?? {};
        const priceSnapshotId = typeof override.priceSnapshotId === "string" ? override.priceSnapshotId : null;
        const priceSnapshot = priceSnapshotId ? snapshotById.get(priceSnapshotId) : undefined;
        const quantity = Number(override.quantity ?? row.normalizedQuantity);
        const unitPrice = Number(override.unitPrice ?? priceSnapshot?.amount ?? row.normalizedPrice);
        const costUnitPrice = Number(override.costUnitPrice ?? priceSnapshot?.amount ?? row.normalizedPrice ?? unitPrice);
        const wastePercent = Number(override.wastePercent ?? row.normalizedWastePercent ?? 0);
        const vatPercent = Number(override.vatPercent ?? 20);
        if (![quantity, unitPrice, costUnitPrice, wastePercent, vatPercent].every(Number.isFinite) || quantity <= 0 || unitPrice < 0 || costUnitPrice < 0 || wastePercent < 0 || vatPercent < 0 || vatPercent > 100) throw new Error("INVALID_TRANSFER_VALUES");
        const idempotencyKey = crypto.createHash("sha256").update(`${req.user.companyId}:${quotation.id}:${row.id}`).digest("hex");
        const item = { quantity, unitPrice, discountPercent: 0, vatPercent };
        return {
          companyId: req.user.companyId, quotationId: quotation.id, description: row.normalizedDescription ?? row.rawDescription ?? "Metraj kalemi",
          unit: row.normalizedUnit ?? row.rawUnit ?? "adet", quantity: String(quantity), unitPrice: String(unitPrice), costUnitPrice: String(costUnitPrice),
          wastePercent: String(wastePercent), costCategory: "material", quantitySource: "document", priceSource: priceSnapshot ? "snapshot" : "document",
          sourceReference: `${row.sheetName}!${row.sourceCellRange}`, verificationStatus: "verified", discountPercent: "0", vatPercent: String(vatPercent), total: String(calculateLineItemTotal(item)),
          sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange,
          sourceRuleVersion: "pilot-integrity-v1", transferIdempotencyKey: idempotencyKey,
          priceSnapshotId: priceSnapshot?.id ?? null, priceSnapshotStatus: priceSnapshot ? "attached" : "missing",
        };
      });

      let insertedCount = 0;
      for (const insert of inserts) insertedCount += (await tx.insert(quotationItems).values(insert).onConflictDoNothing().returning({ id: quotationItems.id })).length;
      const allItems = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotation.id), eq(quotationItems.companyId, req.user.companyId)));
      for (const row of selected) {
        const item = allItems.find((candidate) => candidate.sourceQuantityRowId === row.id);
        if (!item) continue;
        const override = overrides[row.id] ?? {};
        const priceSnapshotId = typeof override.priceSnapshotId === "string" ? override.priceSnapshotId : null;
        const priceSnapshot = priceSnapshotId ? snapshotById.get(priceSnapshotId) : undefined;
        const evidenceValue = { quantity: item.quantity, unit: item.unit, price: item.unitPrice, priceSnapshotId: priceSnapshot?.id ?? null };
        await tx.insert(quotationItemEvidence).values([
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "quantity", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "quantity" }), sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange, sourceDocumentHash: documentHashById.get(row.documentId) ?? null, capturedValueJson: evidenceValue, status: "current", createdByUserId: req.user.userId },
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "price", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "price", priceSnapshotId }), priceSnapshotId: priceSnapshot?.id ?? null, sourceDocumentHash: priceSnapshot?.sourceDocumentHash ?? documentHashById.get(row.documentId) ?? null, capturedValueJson: { ...evidenceValue, source: priceSnapshot ? "price_snapshot" : row.rawPrice }, status: "current", createdByUserId: req.user.userId },
        ]).onConflictDoNothing();
      }
      const totals = calculateQuotationTotals(allItems);
      await tx.update(quotations).set({ subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal), vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal), updatedAt: new Date() }).where(and(eq(quotations.id, quotation.id), eq(quotations.companyId, req.user.companyId)));
      return { quotation, client, insertedCount, items: allItems.filter((item) => rowIds.includes(item.sourceQuantityRowId ?? "")) };
    });

      await audit(req, "quotation_created_from_smartcheck", "quotation", transferResult.quotation.id, { documentId: req.params.id, rowIds, transferredCount: transferResult.insertedCount, clientId: transferResult.client.id });
      res.status(201).json({ quotationId: transferResult.quotation.id, clientId: transferResult.client.id, transferredCount: transferResult.insertedCount, items: transferResult.items });
    } catch (error) {
      if (error instanceof Error && error.message === "SMARTCHECK_CLIENT_NOT_FOUND") return res.status(404).json({ error: "Seçili müşteri bulunamadı." });
      if (error instanceof Error && error.message === "INVALID_TRANSFER_VALUES") return res.status(409).json({ error: "Aktarım miktar/fiyat değerleri geçersiz veya eksik.", code: "INVALID_TRANSFER_VALUES" });
      console.error("SmartCheck new quotation transfer failed", error);
      return res.status(500).json({ error: "Yeni taslak teklif oluşturulamadı.", code: "SMARTCHECK_NEW_QUOTATION_TRANSFER_FAILED" });
    }
  });
}
