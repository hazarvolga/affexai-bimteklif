import crypto from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import express from "express";
import { and, desc, eq } from "drizzle-orm";
import { quickAddJob } from "graphile-worker";
import { db } from "../../db";
import { companies, documents, documentProcessingRuns, normalizedQuantityRows, quotationItems, quotations, smartcheckAuditLogs } from "../../db/schema";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { SMARTCHECK_MAX_FILE_BYTES, smartcheckImportEnabled } from "../../smartcheck/import/config";
import { createStorageAdapter, LocalStorageAdapter } from "../../smartcheck/import/storage";
import { detectAndValidateFile, sha256, validateXlsxArchive } from "../../smartcheck/import/file-security";
import { processingIdempotencyKey } from "../../smartcheck/import/processor";
import { validateRows, type ColumnMapping, type ParsedQuantityRow } from "../../smartcheck/import/normalize";
import { calculateLineItemTotal, calculateQuotationTotals } from "../../lib/calculations";

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
    if (status !== "approved" && status !== "rejected" && status !== "accepted_exception") return res.status(400).json({ error: "Review kararı approved, accepted_exception veya rejected olmalıdır." });
    const [current] = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.id, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId)));
    if (!current) return res.status(404).json({ error: "Satır bulunamadı." });
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 2000) : null;
    if ((status === "rejected" || status === "accepted_exception") && !notes) return res.status(400).json({ error: `${status === "rejected" ? "Red" : "İstisna"} gerekçesi zorunludur.` });
    const patch = req.body?.correction && typeof req.body.correction === "object" ? req.body.correction as Record<string, unknown> : {};
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
    const quotationId = typeof req.body?.quotationId === "string" ? req.body.quotationId : "";
    const rowIds = Array.isArray(req.body?.rowIds) ? req.body.rowIds.filter((id: unknown): id is string => typeof id === "string") : [];
    if (!quotationId || rowIds.length === 0 || rowIds.length > 5000) return res.status(400).json({ error: "quotationId ve en az bir rowId zorunludur." });
    const [quotation] = await db.select().from(quotations).where(and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId), eq(quotations.status, "draft")));
    if (!quotation) return res.status(404).json({ error: "Aktarım için taslak teklif bulunamadı." });
    const documentRows = await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.documentId, req.params.id), eq(normalizedQuantityRows.companyId, req.user.companyId)));
    const selected = documentRows.filter((row) => rowIds.includes(row.id));
    if (selected.length !== new Set(rowIds).size) return res.status(404).json({ error: "Bir veya daha fazla satır bu şirkete/dokümana ait değil." });
    if (selected.some((row) => row.reviewStatus !== "approved" && row.reviewStatus !== "accepted_exception")) return res.status(409).json({ error: "Yalnız onaylı veya gerekçeli istisna satırlar teklife aktarılabilir." });
    const overrides = typeof req.body?.overrides === "object" && req.body.overrides ? req.body.overrides as Record<string, Record<string, unknown>> : {};
    const transferResult = await db.transaction(async (tx) => {
      const inserts = selected.map((row) => {
        const override = overrides[row.id] ?? {};
        const quantity = Number(override.quantity ?? row.normalizedQuantity);
        const unitPrice = Number(override.unitPrice ?? row.normalizedPrice);
        const costUnitPrice = Number(override.costUnitPrice ?? row.normalizedPrice);
        const wastePercent = Number(override.wastePercent ?? row.normalizedWastePercent ?? 0);
        const vatPercent = Number(override.vatPercent ?? 20);
        if (![quantity, unitPrice, costUnitPrice, wastePercent, vatPercent].every(Number.isFinite) || quantity <= 0 || unitPrice < 0 || costUnitPrice < 0 || wastePercent < 0 || vatPercent < 0 || vatPercent > 100) throw new Error("INVALID_TRANSFER_VALUES");
        const idempotencyKey = crypto.createHash("sha256").update(`${req.user.companyId}:${quotation.id}:${row.id}`).digest("hex");
        const item = { quantity, unitPrice, discountPercent: 0, vatPercent };
        return {
          companyId: req.user.companyId, quotationId: quotation.id, description: row.normalizedDescription ?? row.rawDescription ?? "Metraj kalemi",
          unit: row.normalizedUnit ?? row.rawUnit ?? "adet", quantity: String(quantity), unitPrice: String(unitPrice), costUnitPrice: String(costUnitPrice),
          wastePercent: String(wastePercent), costCategory: "material", quantitySource: "document", priceSource: "document",
          sourceReference: `${row.sheetName}!${row.sourceCellRange}`, verificationStatus: "verified", discountPercent: "0", vatPercent: String(vatPercent), total: String(calculateLineItemTotal(item)),
          sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceCellRange: row.sourceCellRange,
          sourceRuleVersion: "pilot-integrity-v1", transferIdempotencyKey: idempotencyKey,
        };
      });
      let insertedCount = 0;
      for (const insert of inserts) insertedCount += (await tx.insert(quotationItems).values(insert).onConflictDoNothing().returning({ id: quotationItems.id })).length;
      const allItems = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotation.id), eq(quotationItems.companyId, req.user.companyId)));
      const totals = calculateQuotationTotals(allItems);
      await tx.update(quotations).set({ subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal), vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal), updatedAt: new Date() }).where(and(eq(quotations.id, quotation.id), eq(quotations.companyId, req.user.companyId)));
      return { insertedCount, items: allItems.filter((item) => rowIds.includes(item.sourceQuantityRowId ?? "")) };
    });
    await audit(req, "rows_transferred", "quotation", quotation.id, { documentId: req.params.id, rowIds, transferredCount: transferResult.insertedCount });
    res.json({ quotationId: quotation.id, transferredCount: transferResult.insertedCount, items: transferResult.items });
  });
}
