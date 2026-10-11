import crypto from "node:crypto";
import { pipeline } from 'node:stream/promises';
import type { Express, Request, RequestHandler } from "express";
import express from "express";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { changeProcessingRun, ProcessingConflict } from "../../smartcheck/import/service";
import { db } from "../../db";
import { clients, companies, documents, documentProcessingRuns, normalizedQuantityRows, priceSnapshots, quotationItemEvidence, quotationItems, quotations, smartcheckAuditLogs } from "../../db/schema";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { fetchTenantIfcLimits, IfcNotAvailableError, IfcLimitsUnavailableError, SMARTCHECK_MAX_FILE_BYTES, SMARTCHECK_MAX_IFC_FILE_BYTES, smartcheckImportEnabled } from "../../smartcheck/import/config";
import { createStorageAdapter, LocalStorageAdapter } from "../../smartcheck/import/storage";
import { detectAndValidateFile, maxBytesForSmartCheckFileName, sha256, validateXlsxArchive } from "../../smartcheck/import/file-security";
import { inspectDocument } from "../../smartcheck/import/processor";
import { validateRows, type ColumnMapping, type ParsedQuantityRow } from "../../smartcheck/import/normalize";
import { getMappingProfile } from "../../smartcheck/import/mapping-profiles";
import { calculateLineItemTotal, calculateQuotationTotals } from "../../lib/calculations";
import { sha256Payload } from "../../smartcheck/pricing/snapshots";
import { isProcessingRunStale } from "../../smartcheck/import/run-health";
import { consumeQuotationQuota, QuotaError } from "../../services/billing/quota";
import { recordUsage } from "../../services/billing/usage-audit";
import { transferReviewEvidence } from "../../smartcheck/import/transfer-evidence";
import {
  smartcheckBulkReviewRequestSchema,
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
    if (!parsedRequest.success) {
      return res.status(400).json({ error: "Geçersiz dosya bilgisi." });
    }
    const isIfc = Boolean(parsedRequest.data?.fileName?.toLowerCase().endsWith(".ifc"));
    let maxAllowedBytes = maxBytesForSmartCheckFileName(parsedRequest.data?.fileName || "");
    if (isIfc) {
      try {
        const limits = await fetchTenantIfcLimits(req.user.companyId);
        maxAllowedBytes = limits.maxFileBytes;
      } catch (error) {
        if (error instanceof IfcNotAvailableError) {
          return res.status(error.status).json({ error: error.message, code: error.code });
        }
        if (error instanceof IfcLimitsUnavailableError) {
          return res.status(error.status).json({ error: error.message, code: error.code });
        }
        throw error;
      }
    }
    if (parsedRequest.data.fileSizeBytes > maxAllowedBytes) {
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
    res.status(201).json({ documentId: document.id, ...target, maxFileSizeBytes: maxAllowedBytes });
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
    let activeStream: any = null;
    try {
      let kind: "ifc" | "xlsx" | "csv" = "ifc";
      if (document.originalFileName.toLowerCase().endsWith('.ifc')) {
        if (!storage.getStream) {
          throw new Error("STORAGE_STREAM_UNSUPPORTED");
        }
        const stream = await storage.getStream(document.storageKey);
        activeStream = stream;
        const hash = crypto.createHash('sha256');
        let size = 0;
        const headChunks: Buffer[] = [];
        let headSize = 0;
        const limits = await fetchTenantIfcLimits(document.companyId);
        const maxIfcBytes = limits.maxFileBytes;
        for await (const chunk of stream) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          if (headSize < 8192) {
            headChunks.push(buf);
            headSize += buf.length;
          }
          hash.update(buf);
          size += buf.length;
          if (size > maxIfcBytes) throw new Error('FILE_SIZE_INVALID');
        }
        if (size === 0) throw new Error('FILE_SIZE_INVALID');
        if (size !== document.fileSizeBytes || hash.digest('hex') !== checksum) {
          throw new Error('CHECKSUM_MISMATCH');
        }
        const headBuffer = Buffer.concat(headChunks);
        kind = detectAndValidateFile(headBuffer, document.originalFileName, document.mimeType);
      } else {
        const content = await storage.get(document.storageKey);
        if (content.length === 0) throw new Error('FILE_SIZE_INVALID');
        if (content.length !== document.fileSizeBytes || sha256(content) !== checksum) {
          throw new Error('CHECKSUM_MISMATCH');
        }
        kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
        if (kind === "xlsx") {
          await validateXlsxArchive(content);
        }
      }

      if (kind === "ifc") {
        await audit(req, "upload_completed", "document", document.id, { checksum, kind, processingStatus: "ifc_worker_enabled" });
      }
      const [updated] = await db.update(documents).set({ checksumSha256: checksum, updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId))).returning();
      if (kind !== "ifc") await audit(req, "upload_completed", "document", document.id, { checksum, kind });
      return res.json(updated);
    } catch (error: unknown) {
      if (activeStream && typeof activeStream.destroy === 'function') {
        activeStream.destroy();
      }

      await Promise.allSettled([
        storage.delete(document.storageKey),
        db.update(documents).set({ status: 'failed', updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId)))
      ]);

      if (error instanceof IfcNotAvailableError) {
        return res.status(error.status).json({ error: error.message, code: error.code, message: error.message });
      }
      if (error instanceof IfcLimitsUnavailableError) {
        return res.status(error.status).json({ error: error.message, code: error.code, message: error.message });
      }

      const code = error instanceof Error ? error.message : String(error);

      switch (code) {
        case 'FILE_SIZE_INVALID':
          return res.status(400).json({ error: "Dosya boyutu geçersiz.", code: "FILE_SIZE_INVALID", message: "Dosya boyutu geçersiz." });
        case 'FILE_SIGNATURE_MISMATCH':
          return res.status(400).json({ error: "Dosya formatı veya imzası geçersiz.", code: "FILE_SIGNATURE_MISMATCH", message: "Dosya formatı veya imzası geçersiz." });
        case 'UNSUPPORTED_FILE_TYPE':
          return res.status(415).json({ error: "Desteklenmeyen dosya türü.", code: "UNSUPPORTED_FILE_TYPE", message: "Desteklenmeyen dosya türü." });
        case 'CHECKSUM_MISMATCH':
          return res.status(422).json({ error: "Dosya bütünlüğü doğrulanamadı.", code: "CHECKSUM_MISMATCH", message: "Dosya bütünlüğü doğrulanamadı." });
        case 'XLSX_CORRUPT':
          return res.status(400).json({ error: "XLSX arşiv yapısı bozuk veya okunamıyor.", code: "XLSX_CORRUPT", message: "XLSX arşiv yapısı bozuk veya okunamıyor." });
        case 'XLSX_ENCRYPTED':
          return res.status(400).json({ error: "Şifreli XLSX dosyaları desteklenmez.", code: "XLSX_ENCRYPTED", message: "Şifreli XLSX dosyaları desteklenmez." });
        case 'XLSX_ZIP_BOMB_RISK':
        case 'XLSX_ENTRY_COUNT_EXCEEDED':
        case 'XLSX_TOTAL_UNCOMPRESSED_EXCEEDED':
          return res.status(400).json({ error: "XLSX arşiv sınırları aşıldı.", code: "XLSX_ZIP_BOMB_RISK", message: "XLSX arşiv sınırları aşıldı." });
        default:
          console.error(`[SmartCheck /complete] Unexpected error for document ${document.id}:`, error);
          return res.status(500).json({ error: "Dosya doğrulama işlemi sırasında beklenmeyen bir hata oluştu.", code: "INTERNAL_SERVER_ERROR", message: "Dosya doğrulama işlemi sırasında beklenmeyen bir hata oluştu." });
      }
    }
  });

  app.get("/api/smartcheck/documents/:id/preview", authenticate, featureGate, readRateLimit, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    if (document.checksumSha256 === "pending") return res.status(409).json({ error: "Önizleme için yükleme tamamlanmalı." });
    if (document.originalFileName.toLowerCase().endsWith(".ifc") || document.mimeType === "application/ifc") {
      return res.status(409).json({ error: "IFC önizleme için işleme kuyruğunu başlatın; kanıt artifact'i run sonunda oluşur.", code: "IFC_PREVIEW_USES_PROCESSING_ARTIFACT" });
    }
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

  for (const [path, action] of [["process", "process"], ["retry", "retry"], ["recover-stale", "recover"]] as const) {
    app.post(`/api/smartcheck/documents/:id/${path}`, ...protectedStack, async (req, res, next) => {
      try {
        const result = await changeProcessingRun({ companyId: req.user.companyId, userId: req.user.userId, documentId: req.params.id, action });
        res.status(result.status).json(result.run);
      } catch (error) {
        if (error instanceof ProcessingConflict) {
          const defaultMessage = error.code === 'IFC_QUOTA_EXCEEDED'
            ? 'Aylık IFC işleme kotanız dolmuştur.'
            : 'İşlem mevcut durumda gerçekleştirilemiyor.';
          return res.status(error.status).json({
            error: error.message && error.message !== error.code ? error.message : defaultMessage,
            code: error.code,
          });
        }
        if (error instanceof IfcNotAvailableError) return res.status(error.status).json({ error: error.message, code: error.code });
        if (error instanceof IfcLimitsUnavailableError) return res.status(error.status).json({ error: error.message, code: error.code });
        next(error);
      }
    });
  }

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
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 1000, 1), 2000);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const rows = await db.select()
      .from(normalizedQuantityRows)
      .where(and(eq(normalizedQuantityRows.documentId, document.id), eq(normalizedQuantityRows.companyId, req.user.companyId)))
      .orderBy(normalizedQuantityRows.sheetName, normalizedQuantityRows.sourceRowNumber)
      .limit(limit)
      .offset(offset);
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
    const corrected: ParsedQuantityRow = {
      sheetName: current.sheetName, sourceRowNumber: current.sourceRowNumber, sourceCellRange: current.sourceCellRange,
      rawDescription: String(patch.description ?? current.rawDescription ?? ""), rawPositionCode: String(patch.positionCode ?? current.rawPositionCode ?? ""),
      rawUnit: String(patch.unit ?? current.rawUnit ?? ""), rawQuantity: String(patch.quantity ?? current.rawQuantity ?? ""),
      rawPrice: String(patch.price ?? current.rawPrice ?? ""), rawWastePercent: String(patch.wastePercent ?? current.rawWastePercent ?? ""), formulaJson: current.formulaJson,
    };
    const targetPositionCode = corrected.rawPositionCode.trim();
    let isDuplicate = false;
    if (targetPositionCode) {
      const [dup] = await db.select({ count: sql<number>`count(*)::int` })
        .from(normalizedQuantityRows)
        .where(and(
          eq(normalizedQuantityRows.documentId, current.documentId),
          eq(normalizedQuantityRows.companyId, req.user.companyId),
          eq(normalizedQuantityRows.rawPositionCode, targetPositionCode),
          ne(normalizedQuantityRows.id, current.id)
        ));
      isDuplicate = (dup?.count ?? 0) > 0;
    }
    const [company] = await db.select({ maxWaste: companies.smartcheckMaxWastePercent }).from(companies).where(eq(companies.id, req.user.companyId));
    const [validated] = validateRows([corrected], Number(company?.maxWaste ?? 20));
    if (!validated) return res.status(500).json({ error: "Satır yeniden doğrulanamadı." });
    if (isDuplicate && !validated.findings.some((f) => f.code === "DUPLICATE_POSITION_CODE")) {
      validated.findings.push({ code: "DUPLICATE_POSITION_CODE", severity: "medium", message: "Poz kodu dosyada tekrarlanıyor.", ruleVersion: "pilot-integrity-v1", suggestion: "Mükerrerliğin kapsam farkından kaynaklandığını doğrulayın." });
    }
    if (status === "approved" && validated.findings.length > 0) return res.status(409).json({ error: "Açık bulgular çözülmeden satır onaylanamaz.", findings: validated.findings });
    const [updated] = await db.update(normalizedQuantityRows).set({
      rawDescription: corrected.rawDescription, rawPositionCode: corrected.rawPositionCode, rawUnit: corrected.rawUnit, rawQuantity: corrected.rawQuantity, rawPrice: corrected.rawPrice, rawWastePercent: corrected.rawWastePercent,
      normalizedDescription: validated.normalized.description, normalizedPositionCode: validated.normalized.positionCode, normalizedUnit: validated.normalized.unit, normalizedQuantity: validated.normalized.quantity?.toString(), normalizedPrice: validated.normalized.price?.toString(), normalizedWastePercent: validated.normalized.wastePercent.toString(), findingsJson: validated.findings,
      reviewStatus: status, reviewerUserId: req.user.userId, reviewedAt: new Date(), reviewerNotes: notes, updatedAt: new Date(),
    }).where(and(eq(normalizedQuantityRows.id, current.id), eq(normalizedQuantityRows.companyId, req.user.companyId))).returning();
    await audit(req, `row_${status}`, "normalized_quantity_row", current.id, { documentId: current.documentId, correction: patch, findingCodes: validated.findings.map((finding) => finding.code) });
    res.json(updated);
  });

  app.patch("/api/smartcheck/documents/:id/bulk-review", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckBulkReviewRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "Toplu review için status=approved ve en az bir rowId zorunludur." });
    const { rowIds, notes } = parsedRequest.data;
    const uniqueRowIds = [...new Set(rowIds)];
    if (uniqueRowIds.length !== rowIds.length) return res.status(400).json({ error: "Tekrarlı satır seçimi yapılamaz." });
    const [document] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const rows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, document.id), eq(normalizedQuantityRows.companyId, req.user.companyId), inArray(normalizedQuantityRows.id, uniqueRowIds)));
    if (rows.length !== uniqueRowIds.length) return res.status(404).json({ error: "Bir veya daha fazla satır bu şirkete/dokümana ait değil." });
    if (rows.some((row) => row.reviewStatus !== "pending_review")) return res.status(409).json({ error: "Yalnız inceleme bekleyen satırlar toplu onaylanabilir.", code: "BULK_REVIEW_STATUS_NOT_PENDING" });
    const blockedRows = rows.filter((row) => Array.isArray(row.findingsJson) && row.findingsJson.length > 0);
    if (blockedRows.length) {
      return res.status(409).json({
        error: "Açık bulgusu olan satırlar toplu onaylanamaz; düzeltme veya gerekçeli istisna gerekir.",
        code: "BULK_REVIEW_FINDINGS_PRESENT",
        blockedRowIds: blockedRows.map((row) => row.id),
      });
    }
    const now = new Date();
    const updated = await db.update(normalizedQuantityRows).set({
      reviewStatus: "approved",
      reviewerUserId: req.user.userId,
      reviewedAt: now,
      reviewerNotes: notes ?? "Bulgusuz satırlar toplu onaylandı.",
      updatedAt: now,
    }).where(and(eq(normalizedQuantityRows.documentId, document.id), eq(normalizedQuantityRows.companyId, req.user.companyId), inArray(normalizedQuantityRows.id, uniqueRowIds))).returning();
    await audit(req, "rows_bulk_approved", "document", document.id, { rowIds: uniqueRowIds, approvedCount: updated.length });
    res.json({ approvedCount: updated.length, rows: updated });
  });

  app.post("/api/smartcheck/documents/:id/transfer-to-quotation", ...protectedStack, async (req, res, next) => {
    try {
    const parsedRequest = smartcheckTransferRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "quotationId ve en az bir rowId zorunludur." });
    const { quotationId, rowIds } = parsedRequest.data;
    if (rowIds.length > 1000) return res.status(400).json({ error: "Tek seferde en fazla 1000 satır aktarılabilir." });
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
      // Use the revision series lock before inspecting the current draft/items.
      await tx.select({ id: quotations.id }).from(quotations).where(and(eq(quotations.id, quotation.parentId ?? quotation.id), eq(quotations.companyId, req.user.companyId))).for("update");
      const [currentQuote] = await tx.select().from(quotations).where(and(eq(quotations.id, quotation.id), eq(quotations.companyId, req.user.companyId))).for("update");
      if (!currentQuote?.isLatest || currentQuote.status !== "draft" || currentQuote.pricingSnapshotLockStatus === "locked") throw new Error("TRANSFER_QUOTE_CHANGED");
      const selected = await tx.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId), inArray(normalizedQuantityRows.id, rowIds))).for("share");
      if (selected.length !== new Set(rowIds).size || selected.some(row => !["approved", "accepted_exception"].includes(row.reviewStatus))) throw new Error("TRANSFER_REVIEW_CHANGED");
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
          sourceReference: `${row.sheetName}!${row.sourceCellRange}`, verificationStatus: transferReviewEvidence(row, quantity, row.normalizedUnit ?? row.rawUnit ?? "adet").verificationStatus, discountPercent: "0", vatPercent: String(vatPercent), total: String(calculateLineItemTotal(item)),
          sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange,
          sourceRuleVersion: null, transferIdempotencyKey: idempotencyKey,
          priceSnapshotId: priceSnapshot?.id ?? null, priceSnapshotStatus: priceSnapshot ? "attached" : "missing",
        };
      });
      let insertedCount = 0;
      for (let i = 0; i < inserts.length; i += 500) {
        const chunk = inserts.slice(i, i + 500);
        const res = await tx.insert(quotationItems).values(chunk).onConflictDoNothing().returning({ id: quotationItems.id });
        insertedCount += res.length;
      }
      const allItems = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotation.id), eq(quotationItems.companyId, req.user.companyId)));
      const itemBySourceRowId = new Map(allItems.filter((it) => it.sourceQuantityRowId).map((it) => [it.sourceQuantityRowId!, it]));
      const allEvidences: any[] = [];
      for (const row of selected) {
        const item = itemBySourceRowId.get(row.id);
        if (!item) continue;
        const override = overrides[row.id] ?? {};
        const priceSnapshotId = typeof override.priceSnapshotId === "string" ? override.priceSnapshotId : null;
        const priceSnapshot = priceSnapshotId ? snapshotById.get(priceSnapshotId) : undefined;
        const evidenceValue = { quantity: item.quantity, unit: item.unit, price: item.unitPrice, priceSnapshotId: priceSnapshot?.id ?? null, review: transferReviewEvidence(row, Number(item.quantity), item.unit).review };
        allEvidences.push(
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "quantity", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "quantity" }), sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange, sourceDocumentHash: documentHashById.get(row.documentId) ?? null, capturedValueJson: evidenceValue, status: "current", createdByUserId: req.user.userId },
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "price", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "price", priceSnapshotId }), priceSnapshotId: priceSnapshot?.id ?? null, sourceDocumentHash: priceSnapshot?.sourceDocumentHash ?? documentHashById.get(row.documentId) ?? null, capturedValueJson: { ...evidenceValue, source: priceSnapshot ? "price_snapshot" : row.rawPrice }, status: "current", createdByUserId: req.user.userId },
        );
      }
      for (let i = 0; i < allEvidences.length; i += 500) {
        await tx.insert(quotationItemEvidence).values(allEvidences.slice(i, i + 500)).onConflictDoNothing();
      }
      const totals = calculateQuotationTotals(allItems);
      await tx.update(quotations).set({ subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal), vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal), updatedAt: new Date() }).where(and(eq(quotations.id, quotation.id), eq(quotations.companyId, req.user.companyId)));
      return { insertedCount, items: allItems.filter((item) => rowIds.includes(item.sourceQuantityRowId ?? "")) };
    });
    await audit(req, "rows_transferred", "quotation", quotation.id, { documentId: req.params.id, rowIds, transferredCount: transferResult.insertedCount });
    res.json({ quotationId: quotation.id, transferredCount: transferResult.insertedCount, items: transferResult.items });
    } catch (error) {
      if (error instanceof Error && ["TRANSFER_QUOTE_CHANGED", "TRANSFER_REVIEW_CHANGED", "INVALID_TRANSFER_VALUES"].includes(error.message)) return res.status(409).json({ error: "Aktarım kaynağı veya taslak değişti; yeniden inceleyin.", code: error.message });
      next(error);
    }
  });

  app.post("/api/smartcheck/documents/:id/transfer-to-new-quotation", ...protectedStack, async (req, res) => {
    const parsedRequest = smartcheckTransferToNewQuotationRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) return res.status(400).json({ error: "clientName/clientId ve en az bir rowId zorunludur." });
    try {
      const { rowIds } = parsedRequest.data;
      if (rowIds.length > 1000) return res.status(400).json({ error: "Tek seferde en fazla 1000 satır aktarılabilir." });
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
      await consumeQuotationQuota(tx, req.user.companyId);
      const selected = await tx.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId), inArray(normalizedQuantityRows.id, rowIds))).for("share");
      if (selected.length !== new Set(rowIds).size || selected.some(row => !["approved", "accepted_exception"].includes(row.reviewStatus))) throw new Error("TRANSFER_REVIEW_CHANGED");
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
          sourceReference: `${row.sheetName}!${row.sourceCellRange}`, verificationStatus: transferReviewEvidence(row, quantity, row.normalizedUnit ?? row.rawUnit ?? "adet").verificationStatus, discountPercent: "0", vatPercent: String(vatPercent), total: String(calculateLineItemTotal(item)),
          sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange,
          sourceRuleVersion: null, transferIdempotencyKey: idempotencyKey,
          priceSnapshotId: priceSnapshot?.id ?? null, priceSnapshotStatus: priceSnapshot ? "attached" : "missing",
        };
      });

      let insertedCount = 0;
      for (let i = 0; i < inserts.length; i += 500) {
        const chunk = inserts.slice(i, i + 500);
        const res = await tx.insert(quotationItems).values(chunk).onConflictDoNothing().returning({ id: quotationItems.id });
        insertedCount += res.length;
      }
      const allItems = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotation.id), eq(quotationItems.companyId, req.user.companyId)));
      const itemBySourceRowId = new Map(allItems.filter((it) => it.sourceQuantityRowId).map((it) => [it.sourceQuantityRowId!, it]));
      const allEvidences: any[] = [];
      for (const row of selected) {
        const item = itemBySourceRowId.get(row.id);
        if (!item) continue;
        const override = overrides[row.id] ?? {};
        const priceSnapshotId = typeof override.priceSnapshotId === "string" ? override.priceSnapshotId : null;
        const priceSnapshot = priceSnapshotId ? snapshotById.get(priceSnapshotId) : undefined;
        const evidenceValue = { quantity: item.quantity, unit: item.unit, price: item.unitPrice, priceSnapshotId: priceSnapshot?.id ?? null, review: transferReviewEvidence(row, Number(item.quantity), item.unit).review };
        allEvidences.push(
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "quantity", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "quantity" }), sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange, sourceDocumentHash: documentHashById.get(row.documentId) ?? null, capturedValueJson: evidenceValue, status: "current", createdByUserId: req.user.userId },
          { companyId: req.user.companyId, quotationId: quotation.id, quotationItemId: item.id, evidenceType: "price", evidenceKey: sha256Payload({ itemId: item.id, rowId: row.id, type: "price", priceSnapshotId }), priceSnapshotId: priceSnapshot?.id ?? null, sourceDocumentHash: priceSnapshot?.sourceDocumentHash ?? documentHashById.get(row.documentId) ?? null, capturedValueJson: { ...evidenceValue, source: priceSnapshot ? "price_snapshot" : row.rawPrice }, status: "current", createdByUserId: req.user.userId },
        );
      }
      for (let i = 0; i < allEvidences.length; i += 500) {
        await tx.insert(quotationItemEvidence).values(allEvidences.slice(i, i + 500)).onConflictDoNothing();
      }
      const totals = calculateQuotationTotals(allItems);
      await tx.update(quotations).set({ subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal), vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal), updatedAt: new Date() }).where(and(eq(quotations.id, quotation.id), eq(quotations.companyId, req.user.companyId)));
      return { quotation, client, insertedCount, items: allItems.filter((item) => rowIds.includes(item.sourceQuantityRowId ?? "")) };
    });

      void audit(req, "quotation_created_from_smartcheck", "quotation", transferResult.quotation.id, { documentId: req.params.id, rowIds, transferredCount: transferResult.insertedCount, clientId: transferResult.client.id })
        .catch(() => console.error("SmartCheck quotation audit persistence failed", { companyId: req.user.companyId }));
      void recordUsage(req.user.companyId, req.user.userId, "QUOTATION_CREATED")
        .catch(() => console.error("Usage audit persistence failed", { companyId: req.user.companyId, feature: "QUOTATION_CREATED" }));
      res.status(201).json({ quotationId: transferResult.quotation.id, clientId: transferResult.client.id, transferredCount: transferResult.insertedCount, items: transferResult.items });
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      if (error instanceof Error && error.message === "TRANSFER_REVIEW_CHANGED") return res.status(409).json({ error: "İnceleme kararı değişti; yeniden yükleyin.", code: error.message });
      if (error instanceof Error && error.message === "SMARTCHECK_CLIENT_NOT_FOUND") return res.status(404).json({ error: "Seçili müşteri bulunamadı." });
      if (error instanceof Error && error.message === "INVALID_TRANSFER_VALUES") return res.status(409).json({ error: "Aktarım miktar/fiyat değerleri geçersiz veya eksik.", code: "INVALID_TRANSFER_VALUES" });
      console.error("SmartCheck new quotation transfer failed", error);
      return res.status(500).json({ error: "Yeni taslak teklif oluşturulamadı.", code: "SMARTCHECK_NEW_QUOTATION_TRANSFER_FAILED" });
    }
  });
}
