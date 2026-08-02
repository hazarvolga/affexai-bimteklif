import type { Express, RequestHandler } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  priceSnapshots,
  priceSources,
  quotationItemEvidence,
  quotationItems,
  quotations,
  smartcheckAuditLogs,
} from "../../db/schema";
import { buildPriceSnapshotKey, computePricingLockHash, isPriceSnapshotStale, sha256Payload } from "../../smartcheck/pricing/snapshots";
import { suggestPriceSnapshotsForRow, type PriceMatchRowInput } from "../../smartcheck/pricing/matching";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";

const sourceTypes = new Set(["official_reference", "supplier_quote", "company_actual", "index_adjusted", "manual_override"]);
const licenseStatuses = new Set(["unknown", "verified", "restricted", "not_applicable"]);
const currencies = new Set(["TRY", "USD", "EUR"]);
const reviewStatuses = new Set(["draft", "advisory", "approved", "rejected"]);
const catalogImportSourceTypes = new Set(["supplier_quote", "company_actual", "manual_override"]);
const canReview = checkRole(["owner", "admin", "manager"]);
const canApprove = checkRole(["owner", "admin", "manager"]);

const rateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`pricing:${req.user.companyId}:${req.user.userId}`, 120, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla fiyat isteği." });
  next();
};

const mutateStack = [authenticate, requireVerifiedEmail, rateLimit, canReview];

function validHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{16,128}$/i.test(value);
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getUTCFullYear();
  return year < 1990 || year > 2200 ? undefined : date;
}

function trimText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | null {
  const text = trimText(value, max);
  return text || null;
}

function normalizeCurrency(value: unknown): "TRY" | "USD" | "EUR" | null {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : "TRY";
  return currencies.has(currency) ? currency as "TRY" | "USD" | "EUR" : null;
}

function parsePriceAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return Number.NaN;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  return Number(normalized);
}

function parseConfidence(value: unknown, fallback = 0.6): number {
  if (value === undefined || value === null || value === "") return fallback;
  const confidence = Number(value);
  return confidence;
}

async function audit(req: any, action: string, entityType: string, entityId: string, metadataJson: Record<string, unknown> = {}) {
  await db.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson });
}

export function registerPricingRoutes(app: Express) {
  app.get("/api/pricing/sources", authenticate, rateLimit, async (req, res) => {
    const rows = await db.select().from(priceSources).where(eq(priceSources.companyId, req.user.companyId)).orderBy(desc(priceSources.updatedAt)).limit(200);
    res.json(rows);
  });

  app.post("/api/pricing/sources", ...mutateStack, async (req, res) => {
    const sourceType = typeof req.body?.sourceType === "string" ? req.body.sourceType : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 200) : "";
    const sourceDocumentPayload = req.body?.sourceDocumentPayload;
    const sourceDocumentHash = validHash(req.body?.sourceDocumentHash)
      ? String(req.body.sourceDocumentHash).toLowerCase()
      : sourceDocumentPayload === undefined ? "" : sha256Payload(sourceDocumentPayload);
    const licenseStatus = typeof req.body?.licenseStatus === "string" ? req.body.licenseStatus : "unknown";
    if (!sourceTypes.has(sourceType) || !name || !validHash(sourceDocumentHash) || !licenseStatuses.has(licenseStatus)) return res.status(400).json({ error: "Kaynak tipi, isim, lisans durumu ve kaynak hash zorunludur." });
    const [source] = await db.insert(priceSources).values({
      companyId: req.user.companyId,
      sourceType,
      name,
      authority: typeof req.body?.authority === "string" ? req.body.authority.trim().slice(0, 200) : null,
      sourceUrl: typeof req.body?.sourceUrl === "string" ? req.body.sourceUrl.trim().slice(0, 2000) : null,
      sourceDocumentIdentifier: typeof req.body?.sourceDocumentIdentifier === "string" ? req.body.sourceDocumentIdentifier.trim().slice(0, 255) : null,
      sourceDocumentHash,
      licenseStatus,
      jurisdiction: typeof req.body?.jurisdiction === "string" ? req.body.jurisdiction.trim().slice(0, 120) : null,
      region: typeof req.body?.region === "string" ? req.body.region.trim().slice(0, 120) : null,
      createdByUserId: req.user.userId,
      metadataJson: req.body?.metadataJson && typeof req.body.metadataJson === "object" ? req.body.metadataJson : {},
    }).returning();
    await audit(req, "price_source_created", "price_source", source.id, { sourceType, sourceDocumentHash, licenseStatus });
    res.status(201).json(source);
  });

  app.get("/api/pricing/snapshots", authenticate, rateLimit, async (req, res) => {
    const status = typeof req.query.status === "string" && reviewStatuses.has(req.query.status) ? req.query.status : undefined;
    const positionCode = typeof req.query.positionCode === "string" ? req.query.positionCode.trim() : undefined;
    const conditions = [eq(priceSnapshots.companyId, req.user.companyId)];
    if (status) conditions.push(eq(priceSnapshots.reviewStatus, status));
    if (positionCode) conditions.push(eq(priceSnapshots.positionCode, positionCode));
    const rows = await db.select().from(priceSnapshots).where(and(...conditions)).orderBy(desc(priceSnapshots.capturedAt)).limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500));
    const now = new Date();
    res.json(rows.map((row) => ({ ...row, stale: isPriceSnapshotStale(row, now) })));
  });

  app.post("/api/pricing/snapshot-suggestions", authenticate, rateLimit, async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0 || rows.length > 100) return res.status(400).json({ error: "1-100 fiyat önerisi satırı zorunludur." });
    const requestRows: PriceMatchRowInput[] = [];
    for (const [index, row] of rows.entries()) {
      const rowId = trimText(row?.rowId, 120);
      const description = optionalText(row?.description, 500);
      const unit = optionalText(row?.unit, 40);
      if (!rowId || !description || !unit) return res.status(400).json({ error: `${index + 1}. öneri satırında rowId, açıklama ve birim zorunludur.`, rowIndex: index });
      requestRows.push({
        rowId,
        description,
        unit,
        positionCode: optionalText(row?.positionCode, 120),
        region: optionalText(row?.region, 120),
      });
    }
    const candidates = await db.select({ snapshot: priceSnapshots, source: priceSources })
      .from(priceSnapshots)
      .innerJoin(priceSources, and(eq(priceSnapshots.priceSourceId, priceSources.id), eq(priceSnapshots.companyId, priceSources.companyId)))
      .where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.reviewStatus, ["advisory", "approved"])))
      .orderBy(desc(priceSnapshots.capturedAt))
      .limit(500);
    const suggestions = requestRows.map((row) => {
      const matches = suggestPriceSnapshotsForRow(row, candidates, { limit: 3 });
      return {
        rowId: row.rowId,
        bestSuggestion: matches[0] ?? null,
        suggestions: matches,
        decision: matches[0] && matches[0].score >= 0.8 && matches[0].warnings.length === 0 ? "safe_candidate" : matches[0] ? "review_required" : "no_match",
      };
    });
    res.json({ suggestions });
  });

  app.post("/api/pricing/catalog/import", ...mutateStack, async (req, res) => {
    const sourceName = trimText(req.body?.sourceName, 200);
    const sourceType = typeof req.body?.sourceType === "string" ? req.body.sourceType : "supplier_quote";
    const licenseStatus = typeof req.body?.licenseStatus === "string" ? req.body.licenseStatus : "not_applicable";
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!sourceName || !catalogImportSourceTypes.has(sourceType) || !licenseStatuses.has(licenseStatus) || rows.length === 0 || rows.length > 500) {
      return res.status(400).json({ error: "Kaynak adı, izinli kaynak tipi ve 1-500 fiyat satırı zorunludur." });
    }
    const sourceDocumentPayload = req.body?.sourceDocumentPayload ?? {
      kind: "pricing_catalog_import",
      sourceName,
      sourceType,
      sourceDocumentIdentifier: req.body?.sourceDocumentIdentifier ?? null,
      rows,
    };
    const sourceDocumentHash = validHash(req.body?.sourceDocumentHash)
      ? String(req.body.sourceDocumentHash).toLowerCase()
      : sha256Payload(sourceDocumentPayload);
    if (!validHash(sourceDocumentHash)) return res.status(400).json({ error: "Kaynak hash geçersiz." });
    const capturedAt = parseDate(req.body?.capturedAt) ?? new Date();
    if (capturedAt === undefined) return res.status(400).json({ error: "Yakalama tarihi geçersiz." });
    const validFrom = parseDate(req.body?.validFrom);
    const globalValidUntil = parseDate(req.body?.validUntil);
    if (validFrom === undefined || globalValidUntil === undefined) return res.status(400).json({ error: "Geçerlilik tarihi geçersiz." });
    if (validFrom && globalValidUntil && globalValidUntil < validFrom) return res.status(400).json({ error: "Geçerlilik tarihleri tutarsız." });

    const parsedRows = rows.map((row, index) => {
      const description = trimText(row?.description, 500);
      const unit = trimText(row?.unit, 40);
      const amount = parsePriceAmount(row?.amount);
      const currency = normalizeCurrency(row?.currency);
      const confidence = parseConfidence(row?.confidence);
      const rowValidUntil = parseDate(row?.validUntil);
      const rowValidFrom = parseDate(row?.validFrom);
      if (!description || !unit || !Number.isFinite(amount) || amount <= 0 || !currency || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || rowValidUntil === undefined || rowValidFrom === undefined) {
        return { index, error: `${index + 1}. fiyat satırı geçersiz.` };
      }
      if ((rowValidFrom ?? validFrom) && (rowValidUntil ?? globalValidUntil) && (rowValidUntil ?? globalValidUntil)! < (rowValidFrom ?? validFrom)!) return { index, error: `${index + 1}. satırda geçerlilik tarihleri tutarsız.` };
      const externalReference = optionalText(row?.externalReference, 255);
      const positionCode = optionalText(row?.positionCode, 120);
      return {
        index,
        positionCode,
        description,
        unit,
        amount,
        currency,
        externalReference,
        validFrom: rowValidFrom ?? validFrom,
        validUntil: rowValidUntil ?? globalValidUntil,
        confidence,
        region: optionalText(row?.region, 120) ?? optionalText(req.body?.region, 120),
        metadataJson: row?.metadataJson && typeof row.metadataJson === "object" ? row.metadataJson : {},
      };
    });
    const invalidRow = parsedRows.find((row): row is { index: number; error: string } => "error" in row);
    if (invalidRow) return res.status(400).json({ error: invalidRow.error, rowIndex: invalidRow.index });

    const importedSnapshots: Array<typeof priceSnapshots.$inferSelect & { stale: boolean }> = [];
    let insertedCount = 0;
    let reusedCount = 0;
    try {
      const [source] = await db.transaction(async (tx) => {
        const [createdSource] = await tx.insert(priceSources).values({
          companyId: req.user.companyId,
          sourceType,
          name: sourceName,
          authority: optionalText(req.body?.authority, 200),
          sourceUrl: optionalText(req.body?.sourceUrl, 2000),
          sourceDocumentIdentifier: optionalText(req.body?.sourceDocumentIdentifier, 255),
          sourceDocumentHash,
          licenseStatus,
          jurisdiction: optionalText(req.body?.jurisdiction, 120),
          region: optionalText(req.body?.region, 120),
          createdByUserId: req.user.userId,
          metadataJson: req.body?.metadataJson && typeof req.body.metadataJson === "object" ? req.body.metadataJson : {},
        }).returning();

        for (const row of parsedRows) {
          if ("error" in row) continue;
          const snapshotKey = buildPriceSnapshotKey({
            sourceDocumentHash,
            externalReference: row.externalReference,
            positionCode: row.positionCode,
            description: row.description,
            unit: row.unit,
            amount: row.amount,
            currency: row.currency,
            capturedAt,
          });
          const [inserted] = await tx.insert(priceSnapshots).values({
            companyId: req.user.companyId,
            priceSourceId: createdSource.id,
            snapshotKey,
            externalReference: row.externalReference,
            positionCode: row.positionCode,
            description: row.description,
            unit: row.unit,
            amount: String(row.amount),
            currency: row.currency,
            vatStatus: req.body?.vatStatus === "included" || req.body?.vatStatus === "excluded" ? req.body.vatStatus : "unknown",
            vatPercent: req.body?.vatPercent === undefined || req.body.vatPercent === null || req.body.vatPercent === "" ? null : String(Number(req.body.vatPercent)),
            freightStatus: req.body?.freightStatus === "included" || req.body?.freightStatus === "excluded" ? req.body.freightStatus : "unknown",
            region: row.region,
            validFrom: row.validFrom,
            validUntil: row.validUntil,
            capturedAt,
            sourceDocumentHash,
            sourceVersion: optionalText(req.body?.sourceVersion, 120),
            confidence: String(row.confidence),
            reviewStatus: "advisory",
            metadataJson: { ...row.metadataJson, importRowIndex: row.index, source: "pricing_catalog_import" },
          }).onConflictDoNothing({ target: [priceSnapshots.companyId, priceSnapshots.priceSourceId, priceSnapshots.snapshotKey] }).returning();
          const snapshot = inserted ?? (await tx.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), eq(priceSnapshots.priceSourceId, createdSource.id), eq(priceSnapshots.snapshotKey, snapshotKey))))[0];
          if (!snapshot) throw new Error("Fiyat snapshot oluşturulamadı.");
          if (inserted) insertedCount += 1;
          else reusedCount += 1;
          importedSnapshots.push({ ...snapshot, stale: isPriceSnapshotStale(snapshot) });
        }
        return [createdSource] as const;
      });

      await audit(req, "price_catalog_imported", "price_source", source.id, { sourceType, sourceDocumentHash, insertedCount, reusedCount, rowCount: rows.length });
      res.status(201).json({ source, insertedCount, reusedCount, snapshots: importedSnapshots });
    } catch {
      res.status(500).json({ error: "Fiyat kataloğu içe aktarılırken beklenmeyen bir hata oluştu." });
    }
  });

  app.post("/api/pricing/sources/:sourceId/snapshots", ...mutateStack, async (req, res) => {
    const [source] = await db.select().from(priceSources).where(and(eq(priceSources.id, req.params.sourceId), eq(priceSources.companyId, req.user.companyId)));
    if (!source) return res.status(404).json({ error: "Fiyat kaynağı bulunamadı." });
    const description = typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 500) : "";
    const unit = typeof req.body?.unit === "string" ? req.body.unit.trim().slice(0, 40) : "";
    const amount = Number(req.body?.amount);
    const currency = typeof req.body?.currency === "string" ? req.body.currency : "TRY";
    const capturedAt = parseDate(req.body?.capturedAt) ?? new Date();
    const validFrom = parseDate(req.body?.validFrom);
    const validUntil = parseDate(req.body?.validUntil);
    const confidence = req.body?.confidence === undefined ? 0 : Number(req.body.confidence);
    if (!description || !unit || !Number.isFinite(amount) || amount < 0 || !currencies.has(currency) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || capturedAt === undefined || validFrom === undefined || validUntil === undefined) return res.status(400).json({ error: "Fiyat snapshot alanları geçersiz." });
    if (validFrom && validUntil && validUntil < validFrom) return res.status(400).json({ error: "Geçerlilik tarihleri tutarsız." });
    const sourceDocumentHash = validHash(req.body?.sourceDocumentHash) ? String(req.body.sourceDocumentHash).toLowerCase() : source.sourceDocumentHash;
    if (sourceDocumentHash !== source.sourceDocumentHash) return res.status(409).json({ error: "Snapshot kaynak hash'i, kaynak kaydıyla eşleşmiyor.", code: "SOURCE_HASH_MISMATCH" });
    const snapshotKey = buildPriceSnapshotKey({ sourceDocumentHash, externalReference: req.body?.externalReference, positionCode: req.body?.positionCode, description, unit, amount, currency, capturedAt });
    const requestedStatus = typeof req.body?.reviewStatus === "string" ? req.body.reviewStatus : "advisory";
    if (!reviewStatuses.has(requestedStatus) || requestedStatus === "approved") return res.status(400).json({ error: "Yeni snapshot yalnız draft veya advisory olarak oluşturulabilir." });
    const [snapshot] = await db.insert(priceSnapshots).values({
      companyId: req.user.companyId,
      priceSourceId: source.id,
      snapshotKey,
      externalReference: typeof req.body?.externalReference === "string" ? req.body.externalReference.trim().slice(0, 255) : null,
      positionCode: typeof req.body?.positionCode === "string" ? req.body.positionCode.trim().slice(0, 120) : null,
      description,
      unit,
      amount: String(amount),
      currency: currency as "TRY" | "USD" | "EUR",
      vatStatus: req.body?.vatStatus === "included" || req.body?.vatStatus === "excluded" ? req.body.vatStatus : "unknown",
      vatPercent: req.body?.vatPercent === undefined || req.body.vatPercent === null || req.body.vatPercent === "" ? null : String(Number(req.body.vatPercent)),
      freightStatus: req.body?.freightStatus === "included" || req.body?.freightStatus === "excluded" ? req.body.freightStatus : "unknown",
      region: typeof req.body?.region === "string" ? req.body.region.trim().slice(0, 120) : source.region,
      validFrom,
      validUntil,
      capturedAt,
      sourceDocumentHash,
      sourceVersion: typeof req.body?.sourceVersion === "string" ? req.body.sourceVersion.trim().slice(0, 120) : null,
      confidence: String(confidence),
      reviewStatus: requestedStatus as "draft" | "advisory",
      metadataJson: req.body?.metadataJson && typeof req.body.metadataJson === "object" ? req.body.metadataJson : {},
    }).onConflictDoNothing({ target: [priceSnapshots.companyId, priceSnapshots.priceSourceId, priceSnapshots.snapshotKey] }).returning();
    const result = snapshot ?? (await db.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), eq(priceSnapshots.priceSourceId, source.id), eq(priceSnapshots.snapshotKey, snapshotKey))))[0];
    if (!result) return res.status(500).json({ error: "Fiyat snapshot oluşturulamadı." });
    await audit(req, snapshot ? "price_snapshot_created" : "price_snapshot_reused", "price_snapshot", result.id, { sourceId: source.id, snapshotKey });
    res.status(snapshot ? 201 : 200).json({ ...result, stale: isPriceSnapshotStale(result) });
  });

  app.patch("/api/pricing/snapshots/:snapshotId/review", ...mutateStack, async (req, res) => {
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (status !== "advisory" && status !== "approved" && status !== "rejected") return res.status(400).json({ error: "Review durumu advisory, approved veya rejected olabilir." });
    const [snapshot] = await db.update(priceSnapshots).set({ reviewStatus: status, reviewedByUserId: req.user.userId, reviewedAt: new Date(), reviewerNotes: typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 2000) : null }).where(and(eq(priceSnapshots.id, req.params.snapshotId), eq(priceSnapshots.companyId, req.user.companyId))).returning();
    if (!snapshot) return res.status(404).json({ error: "Fiyat snapshot bulunamadı." });
    await audit(req, `price_snapshot_${status}`, "price_snapshot", snapshot.id, {});
    res.json(snapshot);
  });

  app.get("/api/quotations/:id/pricing-snapshot", authenticate, rateLimit, async (req, res) => {
    const [quote] = await db.select().from(quotations).where(and(eq(quotations.id, req.params.id), eq(quotations.companyId, req.user.companyId)));
    if (!quote) return res.status(404).json({ error: "Teklif bulunamadı." });
    const items = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quote.id), eq(quotationItems.companyId, req.user.companyId)));
    const snapshotIds = items.flatMap((item) => item.priceSnapshotId ? [item.priceSnapshotId] : []);
    const snapshots = snapshotIds.length ? await db.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.id, snapshotIds))) : [];
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    const now = new Date();
    const itemSummaries = items.map((item) => {
      const snapshot = item.priceSnapshotId ? snapshotById.get(item.priceSnapshotId) : undefined;
      const stale = !snapshot || snapshot.reviewStatus === "rejected" || isPriceSnapshotStale(snapshot, now);
      return { item, snapshot: snapshot ? { ...snapshot, stale } : null, stale, missing: !snapshot };
    });
    res.json({ quote, items: itemSummaries, warnings: itemSummaries.filter((item) => item.stale || item.missing).map((item) => ({ quotationItemId: item.item.id, code: item.missing ? "MISSING_PRICE_SNAPSHOT" : "STALE_PRICE_SNAPSHOT" })) });
  });

  app.post("/api/quotations/:id/pricing-snapshot/lock", ...mutateStack, async (req, res) => {
    const [quote] = await db.select().from(quotations).where(and(eq(quotations.id, req.params.id), eq(quotations.companyId, req.user.companyId), eq(quotations.status, "draft")));
    if (!quote) return res.status(404).json({ error: "Yalnız şirketin taslak teklifi kilitlenebilir." });
    const items = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quote.id), eq(quotationItems.companyId, req.user.companyId)));
    if (!items.length) return res.status(409).json({ error: "Snapshot kilidi için teklif kalemi bulunamadı." });
    const assignments = new Map<string, string>();
    if (Array.isArray(req.body?.items)) for (const assignment of req.body.items) if (assignment && typeof assignment.quotationItemId === "string" && typeof assignment.priceSnapshotId === "string") assignments.set(assignment.quotationItemId, assignment.priceSnapshotId);
    const resolvedSnapshotIds = items.map((item) => assignments.get(item.id) ?? item.priceSnapshotId).filter((id): id is string => Boolean(id));
    if (resolvedSnapshotIds.length !== items.length) return res.status(409).json({ error: "Her teklif kalemi için fiyat snapshot gerekir.", code: "MISSING_PRICE_SNAPSHOT" });
    const snapshots = await db.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.id, resolvedSnapshotIds)));
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    if (snapshots.length !== new Set(resolvedSnapshotIds).size || snapshots.some((snapshot) => snapshot.reviewStatus === "rejected")) return res.status(409).json({ error: "Geçersiz veya reddedilmiş fiyat snapshot seçildi." });
    const staleSnapshots = snapshots.filter((snapshot) => isPriceSnapshotStale(snapshot));
    if (staleSnapshots.length && req.body?.allowStale !== true) return res.status(409).json({ error: "Süresi geçmiş fiyat snapshot'ı var; açık allowStale kararı gerekir.", code: "STALE_PRICE_SNAPSHOT", snapshotIds: staleSnapshots.map((snapshot) => snapshot.id) });
    const lockItems = items.map((item) => {
      const snapshotId = assignments.get(item.id) ?? item.priceSnapshotId!;
      const snapshot = snapshotById.get(snapshotId)!;
      return { item, snapshot };
    });
    const lockStatus = staleSnapshots.length ? "stale" : "locked";
    const lockHash = computePricingLockHash(lockItems.map(({ item, snapshot }) => ({ quotationItemId: item.id, priceSnapshotId: snapshot.id, priceSnapshotStatus: lockStatus, amount: snapshot.amount, currency: snapshot.currency, unit: snapshot.unit })));
    await db.transaction(async (tx) => {
      for (const { item, snapshot } of lockItems) {
        await tx.update(quotationItemEvidence).set({ status: "superseded" }).where(and(eq(quotationItemEvidence.companyId, req.user.companyId), eq(quotationItemEvidence.quotationItemId, item.id), eq(quotationItemEvidence.evidenceType, "price"), eq(quotationItemEvidence.status, "current")));
        await tx.update(quotationItems).set({ priceSnapshotId: snapshot.id, priceSnapshotLockedAt: new Date(), priceSnapshotStatus: lockStatus }).where(and(eq(quotationItems.id, item.id), eq(quotationItems.quotationId, quote.id), eq(quotationItems.companyId, req.user.companyId)));
        await tx.insert(quotationItemEvidence).values({
          companyId: req.user.companyId,
          quotationId: quote.id,
          quotationItemId: item.id,
          evidenceType: "price",
          evidenceKey: sha256Payload({ itemId: item.id, snapshotId: snapshot.id, lockHash }),
          priceSnapshotId: snapshot.id,
          sourceDocumentHash: snapshot.sourceDocumentHash,
          capturedValueJson: { amount: snapshot.amount, currency: snapshot.currency, unit: snapshot.unit, validUntil: snapshot.validUntil, sourceVersion: snapshot.sourceVersion },
          status: "current",
          createdByUserId: req.user.userId,
        }).onConflictDoNothing();
      }
      await tx.update(quotations).set({ pricingSnapshotLockStatus: lockStatus, pricingSnapshotLockedAt: new Date(), pricingSnapshotLockedByUserId: req.user.userId, pricingSnapshotLockHash: lockHash, updatedAt: new Date() }).where(and(eq(quotations.id, quote.id), eq(quotations.companyId, req.user.companyId)));
    });
    await audit(req, "pricing_snapshot_locked", "quotation", quote.id, { lockHash, lockStatus, snapshotIds: resolvedSnapshotIds });
    res.json({ quotationId: quote.id, lockHash, lockStatus, snapshotIds: resolvedSnapshotIds, staleSnapshotIds: staleSnapshots.map((snapshot) => snapshot.id) });
  });
}
