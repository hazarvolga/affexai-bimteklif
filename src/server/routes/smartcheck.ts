import crypto from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import express from "express";
import { and, desc, eq } from "drizzle-orm";
import { quickAddJob } from "graphile-worker";
import { db } from "../../db";
import { documents, documentProcessingRuns, normalizedQuantityRows, smartcheckAuditLogs } from "../../db/schema";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { SMARTCHECK_MAX_FILE_BYTES, smartcheckImportEnabled } from "../../smartcheck/import/config";
import { createStorageAdapter, LocalStorageAdapter } from "../../smartcheck/import/storage";
import { detectAndValidateFile, sha256, validateXlsxArchive } from "../../smartcheck/import/file-security";
import { processingIdempotencyKey } from "../../smartcheck/import/processor";
import type { ColumnMapping } from "../../smartcheck/import/normalize";

const canReview = checkRole(["owner", "admin", "manager"]);
const uploadBody = express.raw({ type: ["text/csv", "text/plain", "application/csv", "application/octet-stream", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"], limit: SMARTCHECK_MAX_FILE_BYTES });

const featureGate: RequestHandler = (req, res, next) => {
  if (!smartcheckImportEnabled(req.user.companyId)) return res.status(404).json({ error: "SmartCheck import pilot kapsamında etkin değil.", code: "SMARTCHECK_IMPORT_DISABLED" });
  next();
};

const rateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`smartcheck:${req.user.companyId}:${req.user.userId}`, 60, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla istek." });
  next();
};

async function audit(req: Request, action: string, entityType: string, entityId?: string, metadataJson: Record<string, unknown> = {}) {
  await db.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson });
}

export function registerSmartCheckRoutes(app: Express) {
  const protectedStack = [authenticate, requireVerifiedEmail, featureGate, rateLimit, canReview];

  app.post("/api/smartcheck/documents/uploads", ...protectedStack, async (req, res) => {
    const originalFileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.trim().toLowerCase() : "";
    const fileSizeBytes = Number(req.body?.fileSizeBytes);
    if (!originalFileName || originalFileName.length > 255 || !Number.isInteger(fileSizeBytes) || fileSizeBytes < 1 || fileSizeBytes > SMARTCHECK_MAX_FILE_BYTES) {
      return res.status(400).json({ error: "Geçersiz dosya bilgisi." });
    }
    if (!/\.(xlsx|csv)$/i.test(originalFileName)) return res.status(415).json({ error: "Yalnız XLSX ve CSV kabul edilir." });
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
    res.status(201).json({ documentId: document.id, ...target, maxFileSizeBytes: SMARTCHECK_MAX_FILE_BYTES });
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
    const checksum = typeof req.body?.checksumSha256 === "string" ? req.body.checksumSha256.toLowerCase() : "";
    if (!/^[a-f0-9]{64}$/.test(checksum)) return res.status(400).json({ error: "Geçersiz SHA-256 checksum." });
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const storage = createStorageAdapter();
    const content = await storage.get(document.storageKey);
    if (content.length !== document.fileSizeBytes || sha256(content) !== checksum) return res.status(422).json({ error: "Dosya bütünlüğü doğrulanamadı." });
    const kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
    if (kind === "xlsx") {
      await validateXlsxArchive(content);
    }
    const [updated] = await db.update(documents).set({ checksumSha256: checksum, updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, req.user.companyId))).returning();
    await audit(req, "upload_completed", "document", document.id, { checksum, kind });
    res.json(updated);
  });

  app.get("/api/smartcheck/documents/:id/status", authenticate, featureGate, rateLimit, async (req, res) => {
    const [document] = await db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const [run] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.documentId, document.id), eq(documentProcessingRuns.companyId, req.user.companyId))).orderBy(desc(documentProcessingRuns.createdAt)).limit(1);
    res.json({ document, run: run ?? null });
  });

  app.patch("/api/smartcheck/documents/:id/mapping", ...protectedStack, async (req, res) => {
    const allowed = ["sheet", "positionCode", "description", "unit", "quantity", "price", "wastePercent"] as const;
    const mapping: ColumnMapping = {};
    for (const key of allowed) {
      const value = req.body?.[key];
      if (value !== undefined && (typeof value !== "string" || value.length > 120)) return res.status(400).json({ error: `Geçersiz eşleme alanı: ${key}` });
      if (value) mapping[key] = value.trim();
    }
    if (req.body?.headerRow !== undefined) {
      const headerRow = Number(req.body.headerRow);
      if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow > 100) return res.status(400).json({ error: "Geçersiz başlık satırı." });
      mapping.headerRow = headerRow;
    }
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

  app.get("/api/smartcheck/documents/:id/rows", authenticate, featureGate, rateLimit, async (req, res) => {
    const [document] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, req.params.id), eq(documents.companyId, req.user.companyId)));
    if (!document) return res.status(404).json({ error: "Doküman bulunamadı." });
    const rows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, document.id), eq(normalizedQuantityRows.companyId, req.user.companyId))).orderBy(normalizedQuantityRows.sheetName, normalizedQuantityRows.sourceRowNumber);
    res.json(rows);
  });

  app.patch("/api/smartcheck/rows/:id/review", ...protectedStack, async (req, res) => {
    const status = req.body?.status;
    if (status !== "approved" && status !== "rejected") return res.status(400).json({ error: "Review kararı approved veya rejected olmalıdır." });
    const [current] = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.id, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId)));
    if (!current) return res.status(404).json({ error: "Satır bulunamadı." });
    if (status === "approved" && current.findingsJson.length > 0) return res.status(409).json({ error: "Açık bulgular çözülmeden satır onaylanamaz.", findings: current.findingsJson });
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 2000) : null;
    if (status === "rejected" && !notes) return res.status(400).json({ error: "Red gerekçesi zorunludur." });
    const [updated] = await db.update(normalizedQuantityRows).set({ reviewStatus: status, reviewerUserId: req.user.userId, reviewedAt: new Date(), reviewerNotes: notes, updatedAt: new Date() }).where(and(eq(normalizedQuantityRows.id, current.id), eq(normalizedQuantityRows.companyId, req.user.companyId))).returning();
    await audit(req, `row_${status}`, "normalized_quantity_row", current.id, { documentId: current.documentId });
    res.json(updated);
  });
}
