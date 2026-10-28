import crypto from "node:crypto";
import type { Express, RequestHandler } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tenantOf, withAppTenant, withAppTenantTransaction } from "../../db/app-tenant";
import {
  documents,
  normalizedQuantityRows,
  priceSnapshots,
  priceSources,
  smartcheckAuditLogs,
  supplierQuoteEntries,
  supplierQuoteSubmissions,
} from "../../db/schema";
import { buildPriceSnapshotKey, sha256Payload } from "../../smartcheck/pricing/snapshots";
import { evaluateSupplierPrice, summarizePriceMemory, type PriceMemorySample } from "../market-intelligence/price-memory";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";

const currencies = new Set(["TRY", "USD", "EUR"]);
const vatStatuses = new Set(["included", "excluded", "unknown"]);
const freightStatuses = new Set(["included", "excluded", "unknown"]);
const mutableRoles = checkRole(["owner", "admin", "manager"]);
const rateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`market-intelligence:${req.user.companyId}:${req.user.userId}`, 90, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla piyasa verisi isteği." });
  next();
};
const mutateStack = [authenticate, requireVerifiedEmail, rateLimit, mutableRoles];

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: unknown) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{16,128}$/i.test(value);
}

function bodyObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function completeness(submission: typeof supplierQuoteSubmissions.$inferSelect, entry: { region: string | null; vatStatus: string; freightStatus: string }) {
  let score = 0;
  if (submission.supplierContact) score += 0.05;
  if (entry.region || submission.region) score += 0.1;
  if (submission.deliveryTerms) score += 0.1;
  if (entry.vatStatus !== "unknown") score += 0.05;
  return score;
}

async function audit(req: any, action: string, entityType: string, entityId: string, metadataJson: Record<string, unknown> = {}) {
  await withAppTenant(tenantOf(req.user), tx => tx.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson }).then(() => undefined));
}

async function approvedSamples(actor: { companyId: string; userId: string }, currency: string) {
  return withAppTenant(actor, (tenantDb) =>
    tenantDb.select({ snapshot: priceSnapshots, sourceType: priceSources.sourceType })
      .from(priceSnapshots)
      .innerJoin(priceSources, and(eq(priceSnapshots.priceSourceId, priceSources.id), eq(priceSnapshots.companyId, priceSources.companyId)))
      .where(and(eq(priceSnapshots.companyId, actor.companyId), eq(priceSnapshots.reviewStatus, "approved"), eq(priceSnapshots.currency, currency as "TRY" | "USD" | "EUR"), inArray(priceSources.sourceType, ["supplier_quote", "company_actual"])))
      .orderBy(desc(priceSnapshots.capturedAt)).limit(2000)
  , { readOnly: true });
}

export function registerMarketIntelligenceRoutes(app: Express) {
  app.get("/api/market-intelligence/supplier-quotes", authenticate, rateLimit, async (req, res) => {
    const status = typeof req.query.status === "string" ? textValue(req.query.status, 30) : "";
    const conditions = [eq(supplierQuoteSubmissions.companyId, req.user.companyId)];
    if (["draft", "awaiting_review", "approved", "rejected", "expired"].includes(status)) conditions.push(eq(supplierQuoteSubmissions.status, status));
    const { submissions, entries } = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
      const submissions = await tenantDb.select().from(supplierQuoteSubmissions).where(and(...conditions)).orderBy(desc(supplierQuoteSubmissions.createdAt)).limit(200);
      const ids = submissions.map((submission) => submission.id);
      const entries = ids.length ? await tenantDb.select().from(supplierQuoteEntries).where(and(eq(supplierQuoteEntries.companyId, req.user.companyId), inArray(supplierQuoteEntries.submissionId, ids))).orderBy(supplierQuoteEntries.createdAt) : [];
      return { submissions, entries };
    }, { readOnly: true });
    const entriesBySubmission = new Map<string, typeof entries>();
    for (const entry of entries) entriesBySubmission.set(entry.submissionId, [...(entriesBySubmission.get(entry.submissionId) ?? []), entry]);
    res.json(submissions.map((submission) => ({ ...submission, entries: entriesBySubmission.get(submission.id) ?? [] })));
  });

  app.post("/api/market-intelligence/supplier-quotes", ...mutateStack, async (req, res) => {
    const body = bodyObject(req.body);
    const supplierName = textValue(body.supplierName, 200);
    const documentId = textValue(body.documentId, 80) || null;
    let document: typeof documents.$inferSelect | undefined;
    if (documentId) {
      [document] = await withAppTenant(
        tenantOf(req.user),
        (tenantDb) => tenantDb.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, req.user.companyId))),
        { readOnly: true },
      );
      if (!document) return res.status(404).json({ error: "Kaynak doküman bulunamadı." });
      if (document.checksumSha256 === "pending") return res.status(409).json({ error: "Kaynak doküman yüklemesi tamamlanmalı." });
    }
    if (document && body.sourceDocumentHash !== undefined && body.sourceDocumentHash !== null && body.sourceDocumentHash !== "") {
      if (!validHash(body.sourceDocumentHash) || String(body.sourceDocumentHash).toLowerCase() !== document.checksumSha256.toLowerCase()) {
        return res.status(409).json({ error: "Kaynak hash'i yüklenen belgenin doğrulanmış checksum değeriyle eşleşmiyor.", code: "SOURCE_DOCUMENT_HASH_MISMATCH" });
      }
    }
    const sourceDocumentHash = document?.checksumSha256.toLowerCase() ?? (validHash(body.sourceDocumentHash) ? String(body.sourceDocumentHash).toLowerCase() : body.sourceDocumentPayload === undefined ? "" : sha256Payload(body.sourceDocumentPayload));
    const sourceDocumentIdentifier = textValue(body.sourceDocumentIdentifier, 255) || document?.originalFileName || textValue(body.quoteNumber, 120);
    const currency = textValue(body.currency, 3).toUpperCase() || "TRY";
    const quoteDate = parseDate(body.quoteDate);
    const validUntil = parseDate(body.validUntil);
    const vatStatus = textValue(body.vatStatus, 20) || "unknown";
    const freightStatus = textValue(body.freightStatus, 20) || "unknown";
    if (!supplierName || !sourceDocumentIdentifier || !validHash(sourceDocumentHash) || !currencies.has(currency) || quoteDate === undefined || validUntil === undefined || !vatStatuses.has(vatStatus) || !freightStatuses.has(freightStatus)) return res.status(400).json({ error: "Tedarikçi, kaynak hash'i, belge kimliği, para birimi ve geçerli ticari alanlar zorunludur." });
    if (quoteDate && validUntil && validUntil < quoteDate) return res.status(400).json({ error: "Teklif geçerlilik tarihi teklif tarihinden önce olamaz." });
    const confidence = numberValue(body.confidence);
    if (confidence !== null && (confidence < 0 || confidence > 1)) return res.status(400).json({ error: "Confidence 0 ile 1 arasında olmalıdır." });
    const [submission] = await withAppTenant(tenantOf(req.user), (tenantDb) => tenantDb.insert(supplierQuoteSubmissions).values({
      companyId: req.user.companyId,
      documentId,
      sourceDocumentHash,
      sourceDocumentIdentifier,
      sourceUrl: textValue(body.sourceUrl, 2000) || null,
      supplierName,
      supplierContact: textValue(body.supplierContact, 255) || null,
      quoteNumber: textValue(body.quoteNumber, 120) || null,
      quoteDate,
      validUntil,
      currency: currency as "TRY" | "USD" | "EUR",
      region: textValue(body.region, 120) || null,
      deliveryTerms: textValue(body.deliveryTerms, 200) || null,
      deliveryLocation: textValue(body.deliveryLocation, 200) || null,
      vatStatus,
      vatPercent: numberValue(body.vatPercent) === null ? null : String(numberValue(body.vatPercent)),
      freightStatus,
      confidence: String(confidence ?? 0),
      status: "awaiting_review",
      createdByUserId: req.user.userId,
    }).returning());
    await audit(req, "supplier_quote_created", "supplier_quote_submission", submission.id, { supplierName, sourceDocumentHash, documentId });
    res.status(201).json({ ...submission, entries: [] });
  });

  app.get("/api/market-intelligence/supplier-quotes/:id", authenticate, rateLimit, async (req, res) => {
    const detail = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
      const [submission] = await tenantDb.select().from(supplierQuoteSubmissions).where(and(eq(supplierQuoteSubmissions.id, req.params.id), eq(supplierQuoteSubmissions.companyId, req.user.companyId)));
      if (!submission) return null;
      const entries = await tenantDb.select().from(supplierQuoteEntries).where(and(eq(supplierQuoteEntries.submissionId, submission.id), eq(supplierQuoteEntries.companyId, req.user.companyId))).orderBy(supplierQuoteEntries.createdAt);
      return { ...submission, entries };
    }, { readOnly: true });
    if (!detail) return res.status(404).json({ error: "Tedarikçi teklifi bulunamadı." });
    res.json(detail);
  });

  app.post("/api/market-intelligence/supplier-quotes/:id/entries", ...mutateStack, async (req, res) => {
    const [submission] = await withAppTenant(tenantOf(req.user), (tenantDb) => tenantDb.select().from(supplierQuoteSubmissions).where(and(eq(supplierQuoteSubmissions.id, req.params.id), eq(supplierQuoteSubmissions.companyId, req.user.companyId))));
    if (!submission) return res.status(404).json({ error: "Tedarikçi teklifi bulunamadı." });
    if (submission.status === "approved" || submission.status === "rejected") return res.status(409).json({ error: "Karara bağlanmış tedarikçi teklifine satır eklenemez." });
    const rawEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (!rawEntries.length || rawEntries.length > 1000) return res.status(400).json({ error: "1 ile 1000 arasında tedarikçi satırı zorunludur." });
    const baselineRows = await approvedSamples(tenantOf(req.user), submission.currency);
    const inserts = [];
    const evaluations = [];
    for (let index = 0; index < rawEntries.length; index += 1) {
      const raw = bodyObject(rawEntries[index]);
      const description = textValue(raw.description, 500);
      const unit = textValue(raw.unit, 40);
      const quantity = numberValue(raw.quantity) ?? 1;
      const unitPrice = numberValue(raw.unitPrice);
      const currency = textValue(raw.currency, 3).toUpperCase() || submission.currency;
      const region = textValue(raw.region, 120) || submission.region;
      const vatStatus = textValue(raw.vatStatus, 20) || submission.vatStatus;
      const freightStatus = textValue(raw.freightStatus, 20) || submission.freightStatus;
      if (!description || !unit || quantity <= 0 || unitPrice === null || unitPrice < 0 || !currencies.has(currency) || !vatStatuses.has(vatStatus) || !freightStatuses.has(freightStatus)) return res.status(400).json({ error: `Geçersiz tedarikçi satırı: ${index + 1}` });
      const positionCode = textValue(raw.positionCode, 120) || null;
      const sourceRowKey = textValue(raw.sourceRowKey, 120) || crypto.createHash("sha256").update(`${index}:${positionCode ?? ""}:${description}:${unit}:${unitPrice}`).digest("hex");
      const samples: PriceMemorySample[] = baselineRows.filter((row) => row.snapshot.currency === currency).map((row) => ({ amount: Number(row.snapshot.amount), positionCode: row.snapshot.positionCode, description: row.snapshot.description, unit: row.snapshot.unit, region: row.snapshot.region }));
      const evaluation = evaluateSupplierPrice(unitPrice, { positionCode, description, unit, region }, samples, completeness(submission, { region, vatStatus, freightStatus }));
      evaluations.push({ sourceRowKey, ...evaluation });
      inserts.push({ companyId: req.user.companyId, submissionId: submission.id, sourceRowKey, positionCode, description, unit, quantity: String(quantity), unitPrice: String(unitPrice), currency: currency as "TRY" | "USD" | "EUR", vatStatus, vatPercent: numberValue(raw.vatPercent) === null ? submission.vatPercent : String(numberValue(raw.vatPercent)), freightStatus, region, validFrom: parseDate(raw.validFrom) ?? submission.quoteDate, validUntil: parseDate(raw.validUntil) ?? submission.validUntil, sourceCellRange: textValue(raw.sourceCellRange, 120) || null, baselineCount: evaluation.baselineCount, outlierStatus: evaluation.outlierStatus, outlierScore: evaluation.outlierScore === null ? null : String(evaluation.outlierScore), confidence: String(evaluation.confidence), reviewStatus: "pending" });
    }
    const inserted = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
      const inserted = await tenantDb.insert(supplierQuoteEntries).values(inserts).onConflictDoNothing({ target: [supplierQuoteEntries.companyId, supplierQuoteEntries.submissionId, supplierQuoteEntries.sourceRowKey] }).returning();
      const averageConfidence = inserted.length ? inserted.reduce((sum, entry) => sum + Number(entry.confidence), 0) / inserted.length : Number(submission.confidence);
      await tenantDb.update(supplierQuoteSubmissions).set({ confidence: String(Math.min(1, Number(averageConfidence.toFixed(2)))), status: "awaiting_review", updatedAt: new Date() }).where(and(eq(supplierQuoteSubmissions.id, submission.id), eq(supplierQuoteSubmissions.companyId, req.user.companyId)));
      return inserted;
    });
    await audit(req, "supplier_quote_entries_created", "supplier_quote_submission", submission.id, { insertedCount: inserted.length, evaluations });
    res.status(inserted.length ? 201 : 200).json({ submissionId: submission.id, insertedCount: inserted.length, evaluations, entries: inserted });
  });

  app.post("/api/market-intelligence/supplier-quotes/:id/import-smartcheck-rows", ...mutateStack, async (req, res) => {
    const [submission] = await withAppTenant(tenantOf(req.user), (tenantDb) => tenantDb.select().from(supplierQuoteSubmissions).where(and(eq(supplierQuoteSubmissions.id, req.params.id), eq(supplierQuoteSubmissions.companyId, req.user.companyId))));
    if (!submission) return res.status(404).json({ error: "Tedarikçi teklifi bulunamadı." });
    if (!submission.documentId) return res.status(409).json({ error: "Bu teklif SmartCheck kaynak dokümanına bağlı değil.", code: "SMARTCHECK_SOURCE_REQUIRED" });
    if (submission.status === "approved" || submission.status === "rejected") return res.status(409).json({ error: "Karara bağlanmış tedarikçi teklifine satır aktarılamaz." });
    const requestedRowIds = Array.isArray(req.body?.rowIds) ? req.body.rowIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
    if (requestedRowIds.length > 5000) return res.status(400).json({ error: "En fazla 5000 SmartCheck satırı aktarılabilir." });
    const rows = await withAppTenant(
      tenantOf(req.user),
      (tenantDb) => tenantDb.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.companyId, req.user.companyId), eq(normalizedQuantityRows.documentId, submission.documentId))),
      { readOnly: true },
    );
    const rowById = new Map(rows.map((row) => [row.id, row]));
    if (requestedRowIds.some((id) => !rowById.has(id))) return res.status(404).json({ error: "Bir veya daha fazla SmartCheck satırı bu şirkete/kaynağa ait değil." });
    const selected = (requestedRowIds.length ? requestedRowIds.map((id) => rowById.get(id)!) : rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception"));
    if (!selected.length) return res.status(409).json({ error: "Aktarılabilir onaylı SmartCheck satırı bulunamadı.", code: "SMARTCHECK_ROWS_NOT_APPROVED" });
    const notApproved = selected.filter((row) => row.reviewStatus !== "approved" && row.reviewStatus !== "accepted_exception");
    if (notApproved.length) return res.status(409).json({ error: "Piyasa hafızasına yalnız onaylı veya gerekçeli istisna SmartCheck satırları aktarılabilir.", code: "SMARTCHECK_ROWS_NOT_APPROVED", rowIds: notApproved.map((row) => row.id) });
    const baselineRows = await approvedSamples(tenantOf(req.user), submission.currency);
    const baselineSamples = baselineRows.map((row) => ({ amount: Number(row.snapshot.amount), positionCode: row.snapshot.positionCode, description: row.snapshot.description, unit: row.snapshot.unit, region: row.snapshot.region }));
    const inserts = [];
    const evaluations = [];
    for (const row of selected) {
      const description = textValue(row.normalizedDescription ?? row.rawDescription, 500);
      const unit = textValue(row.normalizedUnit ?? row.rawUnit, 40);
      const quantity = numberValue(row.normalizedQuantity);
      const unitPrice = numberValue(row.normalizedPrice);
      if (!description || !unit || quantity === null || quantity <= 0 || unitPrice === null || unitPrice < 0) return res.status(409).json({ error: "Onaylı SmartCheck satırında aktarılabilir miktar/fiyat bulunamadı.", code: "SMARTCHECK_ROW_VALUES_MISSING", rowId: row.id });
      const region = submission.region;
      const evaluation = evaluateSupplierPrice(unitPrice, { positionCode: row.normalizedPositionCode ?? row.rawPositionCode, description, unit, region }, baselineSamples, completeness(submission, { region, vatStatus: submission.vatStatus, freightStatus: submission.freightStatus }));
      const sourceRowKey = `smartcheck:${row.id}`;
      evaluations.push({ sourceRowKey, normalizedQuantityRowId: row.id, ...evaluation });
      inserts.push({ companyId: req.user.companyId, submissionId: submission.id, sourceProcessingRunId: row.processingRunId, sourceQuantityRowId: row.id, sourceRowKey, positionCode: row.normalizedPositionCode ?? row.rawPositionCode ?? null, description, unit, quantity: String(quantity), unitPrice: String(unitPrice), currency: submission.currency, vatStatus: submission.vatStatus, vatPercent: submission.vatPercent, freightStatus: submission.freightStatus, region, validFrom: submission.quoteDate, validUntil: submission.validUntil, sourceCellRange: row.sourceCellRange, baselineCount: evaluation.baselineCount, outlierStatus: evaluation.outlierStatus, outlierScore: evaluation.outlierScore === null ? null : String(evaluation.outlierScore), confidence: String(evaluation.confidence), reviewStatus: "pending" as const });
    }
    const inserted = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
      const inserted = await tenantDb.insert(supplierQuoteEntries).values(inserts).onConflictDoNothing({ target: [supplierQuoteEntries.companyId, supplierQuoteEntries.submissionId, supplierQuoteEntries.sourceRowKey] }).returning();
      const averageConfidence = inserted.length ? inserted.reduce((sum, entry) => sum + Number(entry.confidence), 0) / inserted.length : Number(submission.confidence);
      await tenantDb.update(supplierQuoteSubmissions).set({ confidence: String(Math.min(1, Number(averageConfidence.toFixed(2)))), status: "awaiting_review", updatedAt: new Date() }).where(and(eq(supplierQuoteSubmissions.id, submission.id), eq(supplierQuoteSubmissions.companyId, req.user.companyId)));
      return inserted;
    });
    await audit(req, "supplier_quote_smartcheck_rows_imported", "supplier_quote_submission", submission.id, { selectedCount: selected.length, insertedCount: inserted.length, sourceDocumentId: submission.documentId, evaluations });
    res.status(inserted.length ? 201 : 200).json({ submissionId: submission.id, sourceDocumentId: submission.documentId, selectedCount: selected.length, insertedCount: inserted.length, evaluations, entries: inserted });
  });

  app.patch("/api/market-intelligence/supplier-quote-entries/:id/review", ...mutateStack, async (req, res) => {
    const status = textValue(req.body?.status, 20);
    if (status !== "approved" && status !== "rejected") return res.status(400).json({ error: "Review durumu approved veya rejected olabilir." });
    const reviewerNotes = textValue(req.body?.notes, 2000) || null;
    if (status === "approved" && !reviewerNotes) {
      return res.status(400).json({ error: "Onay kararı için inceleme notu zorunludur.", code: "REVIEW_NOTES_REQUIRED" });
    }
    const actor = tenantOf(req.user);
    const { entry, submission } = await withAppTenant(actor, async (tenantDb) => {
      const [entry] = await tenantDb.select().from(supplierQuoteEntries).where(and(eq(supplierQuoteEntries.id, req.params.id), eq(supplierQuoteEntries.companyId, req.user.companyId)));
      const [submission] = entry ? await tenantDb.select().from(supplierQuoteSubmissions).where(and(eq(supplierQuoteSubmissions.id, entry.submissionId), eq(supplierQuoteSubmissions.companyId, req.user.companyId))) : [];
      return { entry, submission };
    }, { readOnly: true });
    if (!entry) return res.status(404).json({ error: "Tedarikçi teklif satırı bulunamadı." });
    if (entry.reviewStatus !== "pending") return res.status(409).json({ error: "Satır daha önce karara bağlandı." });
    if (!submission) return res.status(404).json({ error: "Tedarikçi teklifi bulunamadı." });
    if (status === "approved" && submission.createdByUserId === req.user.userId) {
      return res.status(409).json({
        error: "Tedarikçi teklifini oluşturan kullanıcı aynı teklif satırını kendi başına onaylayamaz (Maker-Checker kuralı).",
        code: "SUPPLIER_QUOTE_TWO_PERSON_REVIEW_REQUIRED",
      });
    }
    const reviewedAt = new Date();
    let priceSnapshotId: string | null = entry.priceSnapshotId;
    try {
      await withAppTenantTransaction(actor, async (tx) => {
        if (status === "approved") {
          let [source] = await tx.select().from(priceSources).where(and(eq(priceSources.companyId, req.user.companyId), eq(priceSources.sourceType, "supplier_quote"), eq(priceSources.sourceDocumentHash, submission.sourceDocumentHash), eq(priceSources.sourceDocumentIdentifier, submission.sourceDocumentIdentifier))).limit(1);
          if (source && source.authorizationStatus === "restricted") {
            throw new Error("PRICE_SOURCE_RESTRICTED");
          }
          if (!source) {
            [source] = await tx.insert(priceSources).values({ companyId: req.user.companyId, sourceType: "supplier_quote", name: `${submission.supplierName}${submission.quoteNumber ? ` · ${submission.quoteNumber}` : ""}`, authority: submission.supplierName, sourceUrl: submission.sourceUrl, sourceDocumentIdentifier: submission.sourceDocumentIdentifier, sourceDocumentHash: submission.sourceDocumentHash, licenseStatus: "not_applicable", jurisdiction: "TR", region: submission.region, createdByUserId: submission.createdByUserId ?? req.user.userId, metadataJson: { supplierQuoteSubmissionId: submission.id, deliveryTerms: submission.deliveryTerms, deliveryLocation: submission.deliveryLocation } }).returning();
          }
          const capturedAt = submission.quoteDate ?? reviewedAt;
          const snapshotKey = buildPriceSnapshotKey({ sourceDocumentHash: submission.sourceDocumentHash, positionCode: entry.positionCode, description: entry.description, unit: entry.unit, amount: entry.unitPrice, currency: entry.currency, capturedAt });
          const [snapshot] = await tx.insert(priceSnapshots).values({ companyId: req.user.companyId, priceSourceId: source.id, snapshotKey, positionCode: entry.positionCode, description: entry.description, unit: entry.unit, amount: entry.unitPrice, currency: entry.currency, vatStatus: entry.vatStatus, vatPercent: entry.vatPercent, freightStatus: entry.freightStatus, region: entry.region ?? submission.region, validFrom: entry.validFrom, validUntil: entry.validUntil, capturedAt, sourceDocumentHash: submission.sourceDocumentHash, sourceVersion: submission.quoteNumber, confidence: entry.confidence, reviewStatus: "approved", reviewedByUserId: req.user.userId, reviewedAt, reviewerNotes, createdByUserId: submission.createdByUserId ?? req.user.userId, metadataJson: { supplierQuoteSubmissionId: submission.id, supplierQuoteEntryId: entry.id, outlierStatus: entry.outlierStatus, baselineCount: entry.baselineCount } }).onConflictDoNothing({ target: [priceSnapshots.companyId, priceSnapshots.priceSourceId, priceSnapshots.snapshotKey] }).returning({ id: priceSnapshots.id });
          priceSnapshotId = snapshot?.id ?? (await tx.select({ id: priceSnapshots.id }).from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), eq(priceSnapshots.priceSourceId, source.id), eq(priceSnapshots.snapshotKey, snapshotKey))))[0]?.id ?? null;
          if (!priceSnapshotId) throw new Error("SUPPLIER_SNAPSHOT_CREATE_FAILED");
        }
        await tx.update(supplierQuoteEntries).set({ reviewStatus: status, reviewerUserId: req.user.userId, reviewedAt, reviewerNotes, priceSnapshotId, updatedAt: reviewedAt }).where(and(eq(supplierQuoteEntries.id, entry.id), eq(supplierQuoteEntries.companyId, req.user.companyId)));
        const allEntries = await tx.select({ reviewStatus: supplierQuoteEntries.reviewStatus }).from(supplierQuoteEntries).where(and(eq(supplierQuoteEntries.submissionId, submission.id), eq(supplierQuoteEntries.companyId, req.user.companyId)));
        if (allEntries.length > 0 && allEntries.every((row) => row.reviewStatus !== "pending")) {
          await tx.update(supplierQuoteSubmissions).set({ status: allEntries.some((row) => row.reviewStatus === "rejected") ? "rejected" : "approved", reviewedByUserId: req.user.userId, reviewedAt, reviewerNotes, updatedAt: reviewedAt }).where(and(eq(supplierQuoteSubmissions.id, submission.id), eq(supplierQuoteSubmissions.companyId, req.user.companyId)));
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PRICE_SOURCE_RESTRICTED") {
        return res.status(409).json({ error: "Kısıtlanmış (restricted) fiyat kaynağı onaylanamaz.", code: "PRICE_SOURCE_NOT_AUTHORIZED" });
      }
      throw error;
    }
    const [updated] = await withAppTenant(actor, (tenantDb) => tenantDb.select().from(supplierQuoteEntries).where(and(eq(supplierQuoteEntries.id, entry.id), eq(supplierQuoteEntries.companyId, req.user.companyId))));
    await audit(req, `supplier_quote_entry_${status}`, "supplier_quote_entry", entry.id, { submissionId: submission.id, priceSnapshotId, outlierStatus: entry.outlierStatus, canonicalPromotion: false });
    res.json(updated);
  });

  app.get("/api/market-intelligence/price-memory", authenticate, rateLimit, async (req, res) => {
    const currency = textValue(req.query.currency, 3).toUpperCase() || "TRY";
    if (!currencies.has(currency)) return res.status(400).json({ error: "Geçersiz para birimi." });
    const positionCode = textValue(req.query.positionCode, 120) || null;
    const unit = textValue(req.query.unit, 40) || null;
    const region = textValue(req.query.region, 120) || null;
    if (!positionCode || !unit) return res.status(400).json({ error: "Fiyat karşılaştırması için poz kodu ve birim zorunludur.", code: "PRICE_MEMORY_SCOPE_REQUIRED" });
    const conditions = [eq(priceSnapshots.companyId, req.user.companyId), eq(priceSnapshots.reviewStatus, "approved"), eq(priceSnapshots.currency, currency as "TRY" | "USD" | "EUR"), inArray(priceSources.sourceType, ["supplier_quote", "company_actual"] as string[])];
    if (positionCode) conditions.push(eq(priceSnapshots.positionCode, positionCode));
    if (unit) conditions.push(eq(priceSnapshots.unit, unit));
    if (region) conditions.push(eq(priceSnapshots.region, region));
    const rows = await withAppTenant(tenantOf(req.user), (tenantDb) =>
      tenantDb.select({ snapshot: priceSnapshots, source: priceSources }).from(priceSnapshots).innerJoin(priceSources, and(eq(priceSnapshots.priceSourceId, priceSources.id), eq(priceSnapshots.companyId, priceSources.companyId))).where(and(...conditions)).orderBy(desc(priceSnapshots.capturedAt)).limit(500)
    , { readOnly: true });
    const samples: PriceMemorySample[] = rows.map((row) => ({ amount: Number(row.snapshot.amount), positionCode: row.snapshot.positionCode, description: row.snapshot.description, unit: row.snapshot.unit, region: row.snapshot.region }));
    res.json({ currency, positionCode, unit, region, summary: summarizePriceMemory(samples), samples: rows.map(({ snapshot, source }) => ({ ...snapshot, sourceType: source.sourceType, sourceName: source.name })).slice(0, 100) });
  });
}
