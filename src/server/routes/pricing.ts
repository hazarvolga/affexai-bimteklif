import { benchmarkEligible } from '../../services/pricing/benchmark-policy';
import type { Express, RequestHandler } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  priceFeedStaging,
  priceSnapshots,
  priceSources,
  pricingDataSources,
  quotationItemEvidence,
  quotationItems,
  quotations,
  smartcheckAuditLogs,
} from "../../db/schema";
import { buildPriceSnapshotKey, computePricingLockHash, isPriceSnapshotStale, sha256Payload } from "../../smartcheck/pricing/snapshots";
import { suggestPriceSnapshotsForRow, type PriceMatchRowInput } from "../../smartcheck/pricing/matching";
import { COMMERCIAL_QUOTATION_AUTHORIZATION_SCOPE, evaluateManualSnapshotApproval, evaluatePriceSourceAuthorization, type PriceAuthorizationStatus } from "../../smartcheck/pricing/authorization";
import { priceSnapshotMatchesQuotationItem, verifiedPayloadHash } from "../../smartcheck/pricing/integrity";
import { defineManufacturingProfile } from "../../ifc/pricing/manufacturing-profile";
import { resolvePoz } from "../../ifc/pricing/poz-resolver";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";
import { isTenantCompanyActualDeclaration } from "../../smartcheck/pricing/catalog-import";

const sourceTypes = new Set(["official_reference", "supplier_quote", "company_actual", "index_adjusted", "manual_override"]);
const licenseStatuses = new Set(["unknown", "verified", "restricted", "not_applicable"]);
const currencies = new Set(["TRY", "USD", "EUR"]);
const reviewStatuses = new Set(["draft", "advisory", "approved", "rejected"]);
const catalogImportSourceTypes = new Set(["supplier_quote", "company_actual", "manual_override"]);
const authorizationStatuses = new Set<PriceAuthorizationStatus>(["pending", "authorized", "restricted"]);
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

export function parseCatalogVatPercent(value: unknown): { ok: true; value: string | null } | { ok: false; value: null } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" && typeof value !== "number") return { ok: false, value: null };
  const raw = typeof value === "string" ? value.trim() : String(value);
  if (!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(raw)) return { ok: false, value: null };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return { ok: false, value: null };
  return { ok: true, value: String(parsed) };
}

export function resolveAuthorizationInput(input: {
  sourceType: string;
  sourceDocumentHash: string;
  actorUserId: string;
  allowTenantAuthorization: boolean;
}) {
  // Vendor quotes require a separate permission/contract approval flow. Only
  // tenant-owned actuals and attributable manual overrides may self-authorize.
  const selfOwned = new Set(["company_actual", "manual_override"]);
  const tenantAuthorized = input.allowTenantAuthorization && selfOwned.has(input.sourceType);
  const authorizationStatus: PriceAuthorizationStatus = tenantAuthorized ? "authorized" : "pending";
  const authorizationScope = tenantAuthorized ? COMMERCIAL_QUOTATION_AUTHORIZATION_SCOPE : null;
  const authorizationEvidenceHash = tenantAuthorized ? input.sourceDocumentHash : null;
  const authorizedAt = authorizationStatus === "authorized" ? new Date() : null;
  const authorizedByUserId = authorizationStatus === "authorized" ? input.actorUserId : null;
  const decision = evaluatePriceSourceAuthorization({ sourceType: input.sourceType, authorizationStatus, authorizationEvidenceHash });
  return { authorizationStatus, authorizationScope, authorizationEvidenceHash, authorizedAt, authorizedByUserId, decision };
}

async function audit(req: any, action: string, entityType: string, entityId: string, metadataJson: Record<string, unknown> = {}) {
  await db.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson });
}

export function registerPricingRoutes(app: Express) {
  app.get("/api/pricing/benchmarks", authenticate, rateLimit, async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

      // 1. Get active pricing sources and their validity dates
      const sources = await db
        .select({
          id: pricingDataSources.id,
          code: pricingDataSources.code,
          name: pricingDataSources.name,
          authority: pricingDataSources.authority,
          category: pricingDataSources.category,
          sourceUrl: pricingDataSources.sourceUrl,
          versionTag: pricingDataSources.versionTag,
          validityStart: pricingDataSources.validityStart,
          validityEnd: pricingDataSources.validityEnd,
          lastSyncAt: pricingDataSources.lastSyncAt,
          status: pricingDataSources.status,
          authorizationStatus: pricingDataSources.authorizationStatus,
          authorizationEvidenceHash: pricingDataSources.authorizationEvidenceHash,
          authorizedAt: pricingDataSources.authorizedAt,
        })
        .from(pricingDataSources)
        .where(eq(pricingDataSources.status, 'active'));

      // Only reviewed, approved and currently valid prices may enter a quotation.
      const itemsQuery = db
        .select({
          id: priceFeedStaging.id,
          sourceId: priceFeedStaging.sourceId,
          sourceCode: pricingDataSources.code,
          sourceName: pricingDataSources.name,
          sourceStatus: pricingDataSources.status,
          authorizationStatus: pricingDataSources.authorizationStatus,
          authorizationEvidenceHash: pricingDataSources.authorizationEvidenceHash,
          authorizedAt: pricingDataSources.authorizedAt,
          reviewedAt: priceFeedStaging.reviewedAt,
          reviewedByUserId: priceFeedStaging.reviewedByUserId,
          itemCode: priceFeedStaging.itemCode,
          itemName: priceFeedStaging.itemName,
          unit: priceFeedStaging.unit,
          currentPrice: priceFeedStaging.currentPrice,
          crawledPrice: priceFeedStaging.crawledPrice,
          diffPercent: priceFeedStaging.diffPercent,
          sourceUrl: priceFeedStaging.sourceUrl,
          status: priceFeedStaging.status,
          confidenceScore: priceFeedStaging.confidenceScore,
          notes: priceFeedStaging.notes,
          crawledAt: priceFeedStaging.crawledAt,
          validityStart: pricingDataSources.validityStart,
          validityEnd: pricingDataSources.validityEnd,
        })
        .from(priceFeedStaging)
        .innerJoin(pricingDataSources, eq(priceFeedStaging.sourceId, pricingDataSources.id))
        .where(and(eq(priceFeedStaging.status, 'approved'), eq(pricingDataSources.status, 'active'), eq(pricingDataSources.authorizationStatus, 'authorized'), sql`${pricingDataSources.authorizationEvidenceHash} IS NOT NULL`, sql`${pricingDataSources.authorizedAt} IS NOT NULL`, eq(pricingDataSources.currency, 'TRY'),
          sql`${priceFeedStaging.reviewedAt} IS NOT NULL`, sql`${priceFeedStaging.reviewedByUserId} IS NOT NULL`,
          sql`${priceFeedStaging.crawledPrice} >= 0 AND ${priceFeedStaging.crawledPrice} != 'NaN'::numeric`,
          q ? sql`position(lower(${q}) in lower(${priceFeedStaging.itemCode} || ' ' || ${priceFeedStaging.itemName} || ' ' || ${pricingDataSources.name})) > 0` : undefined,
          sql`${pricingDataSources.validityStart} <= CURRENT_TIMESTAMP`, sql`${pricingDataSources.validityEnd} >= CURRENT_TIMESTAMP`))
        .orderBy(desc(priceFeedStaging.crawledAt)).limit(50);

      let items = (await itemsQuery).filter(item => benchmarkEligible(item));

      if (q) {
        const queryLower = q.toLowerCase();
        items = items.filter(
          (i) =>
            i.itemCode.toLowerCase().includes(queryLower) ||
            i.itemName.toLowerCase().includes(queryLower) ||
            i.sourceName.toLowerCase().includes(queryLower)
        );
      }

      return res.json({
        sourcesSummary: sources.map((s) => ({
          name: s.name,
          code: s.code,
          lastSyncAt: s.lastSyncAt,
          versionTag: s.versionTag,
          validityRange:
            s.validityStart && s.validityEnd
              ? `${new Date(s.validityStart).toLocaleDateString("tr-TR")} – ${new Date(s.validityEnd).toLocaleDateString("tr-TR")}`
              : "Geçerlilik tarihi bilinmiyor",
          status: s.status,
          authorizationStatus: s.authorizationStatus,
        })),
        disclaimer:
          "Yalnızca incelemesi onaylanmış ve geçerlilik tarihleri uygun kaynak kayıtları gösterilir. Bu onay resmî kurum veya e-PYS uygunluk doğrulaması değildir. Şantiye mesafesi, nakliye, pompa ve tedarik koşullarına göre sapmalar olabileceğinden nihai teklif mektubunu vermeden önce tedarikçinizden güncel proforma almanızı ve birim maliyetleri manuel teyit etmenizi önemle tavsiye ederiz.",
        items: items.slice(0, 50).map((item) => ({
          id: item.id,
          sourceId: item.sourceId,
          sourceCode: item.sourceCode,
          sourceName: item.sourceName,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unit: item.unit,
          currentPrice: item.currentPrice,
          crawledPrice: item.crawledPrice,
          diffPercent: item.diffPercent,
          sourceUrl: item.sourceUrl,
          confidenceScore: item.confidenceScore,
          crawledAt: item.crawledAt,
          validityStart: item.validityStart,
          validityEnd: item.validityEnd,
        })),
      });
    } catch (error) {
      console.error("Benchmarks query error:", error);
      return res.status(500).json({ error: "Fiyat rayiçleri sorgulanamadı." });
    }
  });

  app.get("/api/pricing/sources", authenticate, rateLimit, async (req, res) => {
    const rows = await db.select().from(priceSources).where(eq(priceSources.companyId, req.user.companyId)).orderBy(desc(priceSources.updatedAt)).limit(200);
    res.json(rows);
  });

  app.post("/api/pricing/sources", ...mutateStack, async (req, res) => {
    const sourceType = typeof req.body?.sourceType === "string" ? req.body.sourceType : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 200) : "";
    const sourceDocumentPayload = req.body?.sourceDocumentPayload;
    let sourceDocumentHash = "";
    try {
      sourceDocumentHash = verifiedPayloadHash(sourceDocumentPayload, req.body?.sourceDocumentHash);
    } catch (error) {
      return res.status(400).json({ error: "Kaynak belgesi zorunludur ve bildirilen hash gerçek payload ile eşleşmelidir.", code: error instanceof Error ? error.message : "SOURCE_DOCUMENT_INVALID" });
    }
    const licenseStatus = typeof req.body?.licenseStatus === "string" ? req.body.licenseStatus : "unknown";
    if (!sourceTypes.has(sourceType) || !name || !validHash(sourceDocumentHash) || !licenseStatuses.has(licenseStatus)) return res.status(400).json({ error: "Kaynak tipi, isim, lisans durumu ve kaynak hash zorunludur." });
    const authorization = resolveAuthorizationInput({ sourceType, sourceDocumentHash, actorUserId: req.user.userId, allowTenantAuthorization: false });
    if (authorization.authorizationStatus === "authorized" && (!authorization.authorizationScope || !authorization.decision.eligible)) return res.status(400).json({ error: "Yetkilendirilmiş fiyat kaynağı için kapsam, kanıt hash'i ve yetkilendirme tarihi zorunludur.", reason: authorization.decision.eligible ? "authorization_scope_missing" : authorization.decision.reason });
    const [source] = await db.insert(priceSources).values({
      companyId: req.user.companyId,
      sourceType,
      name,
      authority: typeof req.body?.authority === "string" ? req.body.authority.trim().slice(0, 200) : null,
      sourceUrl: typeof req.body?.sourceUrl === "string" ? req.body.sourceUrl.trim().slice(0, 2000) : null,
      sourceDocumentIdentifier: typeof req.body?.sourceDocumentIdentifier === "string" ? req.body.sourceDocumentIdentifier.trim().slice(0, 255) : null,
      sourceDocumentHash,
      licenseStatus,
      authorizationStatus: authorization.authorizationStatus,
      authorizationScope: authorization.authorizationScope,
      authorizationEvidenceHash: authorization.authorizationEvidenceHash,
      authorizedAt: authorization.authorizedAt,
      authorizedByUserId: authorization.authorizedByUserId,
      jurisdiction: typeof req.body?.jurisdiction === "string" ? req.body.jurisdiction.trim().slice(0, 120) : null,
      region: typeof req.body?.region === "string" ? req.body.region.trim().slice(0, 120) : null,
      createdByUserId: req.user.userId,
      metadataJson: req.body?.metadataJson && typeof req.body.metadataJson === "object" ? req.body.metadataJson : {},
    }).returning();
    await audit(req, "price_source_created", "price_source", source.id, { sourceType, sourceDocumentHash, licenseStatus, authorizationStatus: authorization.authorizationStatus });
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
    const mode = req.body?.mode === "CSB_2026_REFERENCE" ? "CSB_2026_REFERENCE" : "BYOL_TENANT_CATALOG";
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
    const now = new Date();
    const authorizedCandidates = await db.select({ snapshot: priceSnapshots, source: priceSources })
      .from(priceSnapshots)
      .innerJoin(priceSources, and(eq(priceSnapshots.priceSourceId, priceSources.id), eq(priceSnapshots.companyId, priceSources.companyId)))
      .where(and(eq(priceSnapshots.companyId, req.user.companyId), eq(priceSources.authorizationStatus, "authorized"), sql`${priceSources.authorizationEvidenceHash} IS NOT NULL`, sql`${priceSources.authorizedAt} IS NOT NULL`, eq(priceSnapshots.reviewStatus, "approved"), sql`${priceSnapshots.reviewedAt} IS NOT NULL`, sql`${priceSnapshots.reviewedByUserId} IS NOT NULL`, sql`(${priceSnapshots.validFrom} IS NULL OR ${priceSnapshots.validFrom} <= ${now})`, sql`(${priceSnapshots.validUntil} IS NULL OR ${priceSnapshots.validUntil} >= ${now})`))
      .orderBy(desc(priceSnapshots.capturedAt))
      .limit(500);
    const candidates = authorizedCandidates.filter(({ source }) => mode === "CSB_2026_REFERENCE"
      ? source.sourceType === "official_reference"
      : source.sourceType !== "official_reference");
    const suggestions = requestRows.map((row) => {
      const matches = suggestPriceSnapshotsForRow(row, candidates, { limit: 3, now });
      const strictResolution = resolvePoz(defineManufacturingProfile({
        profileId: row.rowId,
        title: row.description ?? row.rowId,
        proposedPozCode: row.positionCode ?? null,
        quantityUnit: row.unit ?? "",
        semantic: { requiredAll: [row.description ?? row.rowId] },
      }), candidates.flatMap(({ snapshot }) => snapshot.positionCode ? [{
        catalogId: snapshot.id,
        documentHash: snapshot.sourceDocumentHash,
        validityStart: snapshot.validFrom ? new Date(snapshot.validFrom).toISOString() : new Date(snapshot.capturedAt ?? 0).toISOString(),
        validityEnd: snapshot.validUntil ? new Date(snapshot.validUntil).toISOString() : "9999-12-31T23:59:59.999Z",
        itemCode: snapshot.positionCode,
        itemName: snapshot.description,
        unit: snapshot.unit,
        price: String(snapshot.amount),
      }] : []));
      const safe = strictResolution.status === "matched" && strictResolution.entry.catalogId === matches[0]?.snapshot.id && matches[0].snapshot.currency === "TRY" && matches[0].warnings.length === 0;
      return {
        rowId: row.rowId,
        bestSuggestion: matches[0] ?? null,
        suggestions: matches,
        decision: safe ? "safe_candidate" : matches[0] ? "review_required" : "no_match",
        strictResolution: strictResolution.status === "matched" ? "matched" : strictResolution.reason,
      };
    });
    res.json({ mode, suggestions });
  });

  app.post("/api/pricing/catalog/import", ...mutateStack, async (req, res) => {
    const sourceName = trimText(req.body?.sourceName, 200);
    const sourceType = typeof req.body?.sourceType === "string" ? req.body.sourceType : "supplier_quote";
    const licenseStatus = typeof req.body?.licenseStatus === "string" ? req.body.licenseStatus : "not_applicable";
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!sourceName || !catalogImportSourceTypes.has(sourceType) || !licenseStatuses.has(licenseStatus) || rows.length === 0 || rows.length > 500) {
      return res.status(400).json({ error: "Kaynak adı, izinli kaynak tipi ve 1-500 fiyat satırı zorunludur." });
    }
    if ((sourceType === "supplier_quote" && licenseStatus !== "verified") || (sourceType !== "supplier_quote" && licenseStatus !== "not_applicable")) {
      return res.status(400).json({ error: "Kaynak tipi ile lisans durumu uyumsuz.", code: "PRICE_SOURCE_LICENSE_SCOPE_INVALID" });
    }
    const ownershipDeclaration = req.body?.ownershipDeclaration;
    if (sourceType === "company_actual" && !isTenantCompanyActualDeclaration(ownershipDeclaration)) {
      return res.status(400).json({ error: "Firma gerçekleşen fiyatları için açık sahiplik beyanı zorunludur.", code: "TENANT_PRICE_OWNERSHIP_CONFIRMATION_REQUIRED" });
    }
    const vatPercent = parseCatalogVatPercent(req.body?.vatPercent);
    if (!vatPercent.ok) {
      return res.status(400).json({ error: "KDV oranı 0-100 aralığında ve en fazla iki ondalık basamaklı olmalıdır.", code: "CATALOG_VAT_PERCENT_INVALID" });
    }
    const sourceDocumentPayload = {
      kind: "pricing_catalog_import",
      sourceName,
      sourceType,
      sourceDocumentIdentifier: req.body?.sourceDocumentIdentifier ?? null,
      capturedAt: req.body?.capturedAt ?? null,
      validFrom: req.body?.validFrom ?? null,
      validUntil: req.body?.validUntil ?? null,
      vatStatus: req.body?.vatStatus ?? "unknown",
      vatPercent: vatPercent.value,
      freightStatus: req.body?.freightStatus ?? "unknown",
      region: req.body?.region ?? null,
      ownershipDeclaration: sourceType === "company_actual" ? ownershipDeclaration : null,
      rows,
    };
    let sourceDocumentHash = "";
    try {
      sourceDocumentHash = verifiedPayloadHash(sourceDocumentPayload, req.body?.sourceDocumentHash);
    } catch (error) {
      return res.status(400).json({ error: "Katalog hash'i gerçek satır manifestiyle eşleşmiyor.", code: error instanceof Error ? error.message : "SOURCE_DOCUMENT_INVALID" });
    }
    const authorization = resolveAuthorizationInput({ sourceType, sourceDocumentHash, actorUserId: req.user.userId, allowTenantAuthorization: true });
    if (authorization.authorizationStatus === "authorized" && (!authorization.authorizationScope || !authorization.decision.eligible)) return res.status(400).json({ error: "Katalog yetkilendirme kanıtı geçersiz.", reason: authorization.decision.eligible ? "authorization_scope_missing" : authorization.decision.reason });
    const parsedCapturedAt = parseDate(req.body?.capturedAt);
    if (parsedCapturedAt === undefined) return res.status(400).json({ error: "Yakalama tarihi geçersiz." });
    const capturedAt = parsedCapturedAt ?? new Date();
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
          authorizationStatus: authorization.authorizationStatus,
          authorizationScope: authorization.authorizationScope,
          authorizationEvidenceHash: authorization.authorizationEvidenceHash,
          authorizedAt: authorization.authorizedAt,
          authorizedByUserId: authorization.authorizedByUserId,
          jurisdiction: optionalText(req.body?.jurisdiction, 120),
          region: optionalText(req.body?.region, 120),
          createdByUserId: req.user.userId,
          metadataJson: {
            ...(req.body?.metadataJson && typeof req.body.metadataJson === "object" ? req.body.metadataJson : {}),
            ...(sourceType === "company_actual" ? {
              ownershipDeclaration: {
                ...ownershipDeclaration,
                acceptedByUserId: req.user.userId,
                acceptedAt: authorization.authorizedAt?.toISOString() ?? new Date().toISOString(),
              },
            } : {}),
          },
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
            vatPercent: vatPercent.value,
            freightStatus: req.body?.freightStatus === "included" || req.body?.freightStatus === "excluded" ? req.body.freightStatus : "unknown",
            region: row.region,
            validFrom: row.validFrom,
            validUntil: row.validUntil,
            capturedAt,
            sourceDocumentHash,
            sourceVersion: optionalText(req.body?.sourceVersion, 120),
            confidence: String(row.confidence),
            reviewStatus: "advisory",
            createdByUserId: req.user.userId,
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

      await audit(req, "price_catalog_imported", "price_source", source.id, { sourceType, sourceDocumentHash, authorizationStatus: authorization.authorizationStatus, insertedCount, reusedCount, rowCount: rows.length });
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
    const parsedCapturedAt = parseDate(req.body?.capturedAt);
    const capturedAt = parsedCapturedAt ?? new Date();
    const validFrom = parseDate(req.body?.validFrom);
    const validUntil = parseDate(req.body?.validUntil);
    const confidence = req.body?.confidence === undefined ? 0 : Number(req.body.confidence);
    if (!description || !unit || !Number.isFinite(amount) || amount < 0 || !currencies.has(currency) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || parsedCapturedAt === undefined || validFrom === undefined || validUntil === undefined) return res.status(400).json({ error: "Fiyat snapshot alanları geçersiz." });
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
      createdByUserId: req.user.userId,
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
    const [existing] = await db.select({ snapshot: priceSnapshots, source: priceSources })
      .from(priceSnapshots)
      .innerJoin(priceSources, and(eq(priceSnapshots.priceSourceId, priceSources.id), eq(priceSnapshots.companyId, priceSources.companyId)))
      .where(and(eq(priceSnapshots.id, req.params.snapshotId), eq(priceSnapshots.companyId, req.user.companyId)));
    if (!existing) return res.status(404).json({ error: "Fiyat snapshot bulunamadı." });
    if (status === "approved") {
      const authorization = evaluatePriceSourceAuthorization({ sourceType: existing.source.sourceType, authorizationStatus: existing.source.authorizationStatus as PriceAuthorizationStatus, authorizationEvidenceHash: existing.source.authorizationEvidenceHash });
      if (!authorization.eligible) return res.status(409).json({ error: "Yetkilendirilmemiş fiyat kaynağı onaylanamaz.", code: "PRICE_SOURCE_NOT_AUTHORIZED", reason: authorization.reason });
      if (existing.source.sourceType === "manual_override") {
        const manualApproval = evaluateManualSnapshotApproval({
          sourceCreatorUserId: existing.source.createdByUserId,
          snapshotCreatorUserId: existing.snapshot.createdByUserId,
          reviewerUserId: req.user.userId,
          reviewerNotes: trimText(req.body?.notes, 2000),
        });
        if (!manualApproval.eligible) {
          const missingAttribution = manualApproval.reason === "reviewer_notes_missing" || manualApproval.reason === "snapshot_creator_missing";
          return res.status(missingAttribution ? 400 : 409).json({
            error: missingAttribution ? "Manuel fiyat onayı için oluşturucu kaydı ve inceleme notu zorunludur." : "Manuel fiyat kaynağını veya snapshot'ını oluşturan kullanıcı aynı kaydı onaylayamaz.",
            code: missingAttribution ? "MANUAL_ATTRIBUTION_REQUIRED" : "MANUAL_TWO_PERSON_REVIEW_REQUIRED",
            reason: manualApproval.reason,
          });
        }
      }
    }
    const [snapshot] = await db.update(priceSnapshots).set({ reviewStatus: status, reviewedByUserId: req.user.userId, reviewedAt: new Date(), reviewerNotes: typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 2000) : null }).where(and(eq(priceSnapshots.id, req.params.snapshotId), eq(priceSnapshots.companyId, req.user.companyId))).returning();
    if (!snapshot) return res.status(409).json({ error: "Fiyat snapshot güncellenemedi." });
    await audit(req, `price_snapshot_${status}`, "price_snapshot", snapshot.id, {});
    res.json(snapshot);
  });

  app.get("/api/quotations/:id/pricing-snapshot", authenticate, rateLimit, async (req, res) => {
    const [quote] = await db.select().from(quotations).where(and(eq(quotations.id, req.params.id), eq(quotations.companyId, req.user.companyId)));
    if (!quote) return res.status(404).json({ error: "Teklif bulunamadı." });
    const items = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quote.id), eq(quotationItems.companyId, req.user.companyId)));
    const snapshotIds = items.flatMap((item) => item.priceSnapshotId ? [item.priceSnapshotId] : []);
    const snapshots = snapshotIds.length ? await db.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.id, snapshotIds))) : [];
    const sourceIds = [...new Set(snapshots.map((snapshot) => snapshot.priceSourceId))];
    const sources = sourceIds.length ? await db.select().from(priceSources).where(and(eq(priceSources.companyId, req.user.companyId), inArray(priceSources.id, sourceIds))) : [];
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    const now = new Date();
    const itemSummaries = items.map((item) => {
      const snapshot = item.priceSnapshotId ? snapshotById.get(item.priceSnapshotId) : undefined;
      const source = snapshot ? sourceById.get(snapshot.priceSourceId) : undefined;
      const authorized = source ? evaluatePriceSourceAuthorization({ sourceType: source.sourceType, authorizationStatus: source.authorizationStatus as PriceAuthorizationStatus, authorizationEvidenceHash: source.authorizationEvidenceHash }).eligible && Boolean(source.authorizationScope && source.authorizedAt && source.authorizedByUserId) : false;
      const stale = !snapshot || snapshot.reviewStatus !== "approved" || !authorized || isPriceSnapshotStale(snapshot, now);
      return { item, snapshot: snapshot ? { ...snapshot, stale } : null, stale, missing: !snapshot };
    });
    res.json({ quote, items: itemSummaries, warnings: itemSummaries.filter((item) => item.stale || item.missing).map((item) => ({ quotationItemId: item.item.id, code: item.missing ? "MISSING_PRICE_SNAPSHOT" : "STALE_PRICE_SNAPSHOT" })) });
  });

  app.post("/api/quotations/:id/pricing-snapshot/lock", ...mutateStack, async (req, res) => {
    const assignments = new Map<string, string>();
    if (Array.isArray(req.body?.items)) for (const assignment of req.body.items) if (assignment && typeof assignment.quotationItemId === "string" && typeof assignment.priceSnapshotId === "string") assignments.set(assignment.quotationItemId, assignment.priceSnapshotId);
    try {
      const result = await db.transaction(async (tx) => {
        const [quote] = await tx.select().from(quotations).where(and(eq(quotations.id, req.params.id), eq(quotations.companyId, req.user.companyId))).for("update");
        if (!quote || quote.status !== "draft") throw new Error("QUOTE_NOT_DRAFT");
        const items = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quote.id), eq(quotationItems.companyId, req.user.companyId))).for("update");
        if (!items.length) throw new Error("QUOTE_ITEMS_MISSING");
        if ([...assignments.keys()].some((itemId) => !items.some((item) => item.id === itemId))) throw new Error("UNKNOWN_QUOTATION_ITEM");
        const resolvedSnapshotIds = items.map((item) => assignments.get(item.id) ?? item.priceSnapshotId).filter((id): id is string => Boolean(id));
        if (resolvedSnapshotIds.length !== items.length) throw new Error("MISSING_PRICE_SNAPSHOT");
        const snapshots = await tx.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), inArray(priceSnapshots.id, resolvedSnapshotIds))).for("update");
        const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
        if (snapshots.length !== new Set(resolvedSnapshotIds).size || snapshots.some((snapshot) => snapshot.reviewStatus !== "approved" || !snapshot.reviewedAt || !snapshot.reviewedByUserId)) throw new Error("PRICE_SNAPSHOT_NOT_APPROVED");
        const sourceIds = [...new Set(snapshots.map((snapshot) => snapshot.priceSourceId))];
        const sources = await tx.select().from(priceSources).where(and(eq(priceSources.companyId, req.user.companyId), inArray(priceSources.id, sourceIds))).for("update");
        const sourceById = new Map(sources.map((source) => [source.id, source]));
        const unauthorizedSource = sources.find((source) => !evaluatePriceSourceAuthorization({ sourceType: source.sourceType, authorizationStatus: source.authorizationStatus as PriceAuthorizationStatus, authorizationEvidenceHash: source.authorizationEvidenceHash }).eligible || !source.authorizationScope || !source.authorizedAt || !source.authorizedByUserId);
        if (sources.length !== sourceIds.length || unauthorizedSource) throw new Error("PRICE_SOURCE_NOT_AUTHORIZED");
        const staleSnapshots = snapshots.filter((snapshot) => isPriceSnapshotStale(snapshot));
        if (staleSnapshots.length) throw new Error("STALE_PRICE_SNAPSHOT");
        const lockItems = items.map((item) => {
          const snapshotId = assignments.get(item.id) ?? item.priceSnapshotId!;
          const snapshot = snapshotById.get(snapshotId)!;
          const equivalence = priceSnapshotMatchesQuotationItem(item, snapshot, quote.currency);
          if ("reason" in equivalence) throw new Error(equivalence.reason);
          return { item, snapshot, source: sourceById.get(snapshot.priceSourceId)! };
        });
        const lockStatus = "locked" as const;
        const lockHash = computePricingLockHash(lockItems.map(({ item, snapshot, source }) => ({
          quotationItemId: item.id,
          priceSnapshotId: snapshot.id,
          priceSnapshotStatus: lockStatus,
          amount: snapshot.amount,
          currency: snapshot.currency,
          unit: snapshot.unit,
          sourceDocumentHash: snapshot.sourceDocumentHash,
          authorizationEvidenceHash: source.authorizationEvidenceHash,
          authorizationScope: source.authorizationScope,
          authorizedAt: source.authorizedAt,
          authorizedByUserId: source.authorizedByUserId,
          snapshotCreatedByUserId: snapshot.createdByUserId,
          reviewedByUserId: snapshot.reviewedByUserId,
          reviewedAt: snapshot.reviewedAt,
          validFrom: snapshot.validFrom,
          validUntil: snapshot.validUntil,
        })));
        const currentEvidence = await tx.select().from(quotationItemEvidence).where(and(eq(quotationItemEvidence.companyId, req.user.companyId), eq(quotationItemEvidence.quotationId, quote.id), eq(quotationItemEvidence.evidenceType, "price"), eq(quotationItemEvidence.status, "current"))).for("update");
        const identicalEvidence = lockItems.every(({ item, snapshot }) => currentEvidence.some((evidence) => evidence.quotationItemId === item.id && evidence.priceSnapshotId === snapshot.id));
        if (quote.pricingSnapshotLockStatus === "locked" && quote.pricingSnapshotLockHash === lockHash && identicalEvidence && currentEvidence.length === lockItems.length) {
          return { quotationId: quote.id, lockHash, lockStatus, snapshotIds: resolvedSnapshotIds };
        }
        for (const { item, snapshot, source } of lockItems) {
          await tx.update(quotationItemEvidence).set({ status: "superseded" }).where(and(eq(quotationItemEvidence.companyId, req.user.companyId), eq(quotationItemEvidence.quotationItemId, item.id), eq(quotationItemEvidence.evidenceType, "price"), eq(quotationItemEvidence.status, "current")));
          await tx.update(quotationItems).set({ priceSnapshotId: snapshot.id, priceSnapshotLockedAt: new Date(), priceSnapshotStatus: lockStatus }).where(and(eq(quotationItems.id, item.id), eq(quotationItems.quotationId, quote.id), eq(quotationItems.companyId, req.user.companyId)));
          const evidenceKey = sha256Payload({ itemId: item.id, snapshotId: snapshot.id, lockHash });
          const capturedValueJson = { amount: snapshot.amount, currency: snapshot.currency, unit: snapshot.unit, validFrom: snapshot.validFrom, validUntil: snapshot.validUntil, sourceVersion: snapshot.sourceVersion, authorizationEvidenceHash: source.authorizationEvidenceHash, authorizationScope: source.authorizationScope, authorizedAt: source.authorizedAt, authorizedByUserId: source.authorizedByUserId, snapshotCreatedByUserId: snapshot.createdByUserId, reviewedByUserId: snapshot.reviewedByUserId, reviewedAt: snapshot.reviewedAt };
          const revived = await tx.update(quotationItemEvidence).set({ status: "current", priceSnapshotId: snapshot.id, sourceDocumentHash: snapshot.sourceDocumentHash, capturedValueJson, createdByUserId: req.user.userId }).where(and(eq(quotationItemEvidence.companyId, req.user.companyId), eq(quotationItemEvidence.quotationItemId, item.id), eq(quotationItemEvidence.evidenceKey, evidenceKey))).returning({ id: quotationItemEvidence.id });
          if (!revived.length) {
            const inserted = await tx.insert(quotationItemEvidence).values({ companyId: req.user.companyId, quotationId: quote.id, quotationItemId: item.id, evidenceType: "price", evidenceKey, priceSnapshotId: snapshot.id, sourceDocumentHash: snapshot.sourceDocumentHash, capturedValueJson, status: "current", createdByUserId: req.user.userId }).returning({ id: quotationItemEvidence.id });
            if (inserted.length !== 1) throw new Error("PRICE_EVIDENCE_WRITE_FAILED");
          }
        }
        const updated = await tx.update(quotations).set({ pricingSnapshotLockStatus: lockStatus, pricingSnapshotLockedAt: new Date(), pricingSnapshotLockedByUserId: req.user.userId, pricingSnapshotLockHash: lockHash, updatedAt: new Date() }).where(and(eq(quotations.id, quote.id), eq(quotations.companyId, req.user.companyId), eq(quotations.status, "draft"))).returning({ id: quotations.id });
        if (updated.length !== 1) throw new Error("QUOTE_NOT_DRAFT");
        return { quotationId: quote.id, lockHash, lockStatus, snapshotIds: resolvedSnapshotIds };
      });
      await audit(req, "pricing_snapshot_locked", "quotation", result.quotationId, { lockHash: result.lockHash, lockStatus: result.lockStatus, snapshotIds: result.snapshotIds });
      return res.json({ ...result, staleSnapshotIds: [] });
    } catch (error) {
      const code = error instanceof Error ? error.message : "PRICE_LOCK_FAILED";
      const clientCodes = new Set(["QUOTE_NOT_DRAFT", "QUOTE_ITEMS_MISSING", "UNKNOWN_QUOTATION_ITEM", "MISSING_PRICE_SNAPSHOT", "PRICE_SNAPSHOT_NOT_APPROVED", "PRICE_SOURCE_NOT_AUTHORIZED", "STALE_PRICE_SNAPSHOT", "UNIT_MISMATCH", "CURRENCY_MISMATCH", "AMOUNT_MISMATCH", "POSITION_CODE_MISMATCH", "DESCRIPTION_MISMATCH", "PRICE_EVIDENCE_WRITE_FAILED"]);
      if (clientCodes.has(code)) return res.status(409).json({ error: "Fiyat snapshot kilidi doğrulama kapısından geçemedi.", code });
      console.error("Pricing lock error:", error);
      return res.status(500).json({ error: "Fiyat snapshot kilidi oluşturulamadı." });
    }
  });
}
