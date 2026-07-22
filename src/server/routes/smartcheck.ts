import crypto from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import express from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { documents, documentProcessingRuns, smartcheckAuditLogs } from "../../db/schema";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { SMARTCHECK_MAX_FILE_BYTES, smartcheckImportEnabled } from "../../smartcheck/import/config";
import { createStorageAdapter, LocalStorageAdapter } from "../../smartcheck/import/storage";
import { detectAndValidateFile, sha256, validateXlsxArchive } from "../../smartcheck/import/file-security";

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
}
