import crypto from "node:crypto";
import type { Express, RequestHandler } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  priceSnapshots,
  priceSources,
  regulationAlerts,
  regulationVersions,
  smartcheckAuditLogs,
  sourceIngestionArtifacts,
  sourceIngestionRuns,
  sourceIntelligenceAdapters,
  sourceReviewItems,
} from "../../db/schema";
import { assertAllowedSourceUrl, diffSourcePayload, getOfficialAdapter, normalizeOfficialPayload, OFFICIAL_ADAPTERS, sourcePayloadHash, type NormalizedRegulationChange } from "../../smartcheck/sources/adapters";
import { buildPriceSnapshotKey } from "../../smartcheck/pricing/snapshots";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";

const mutateRoles = checkRole(["owner", "admin", "manager"]);
const rateLimit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`source-intelligence:${req.user.companyId}:${req.user.userId}`, 60, 60_000);
  if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla kaynak isteği." });
  next();
};
const mutateStack = [authenticate, requireVerifiedEmail, rateLimit, mutateRoles];

function objectPayload(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return new Date();
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function payloadSize(payload: unknown) {
  return Buffer.byteLength(JSON.stringify(payload));
}

function regulationChanges(payload: Record<string, unknown>) {
  return Array.isArray(payload.changes)
    ? payload.changes.filter((change): change is NormalizedRegulationChange => Boolean(change && typeof change === "object" && !Array.isArray(change)))
    : [];
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function audit(req: any, action: string, entityType: string, entityId: string, metadataJson: Record<string, unknown> = {}) {
  await db.insert(smartcheckAuditLogs).values({ companyId: req.user.companyId, userId: req.user.userId, action, entityType, entityId, metadataJson });
}

export function registerSourceIntelligenceRoutes(app: Express) {
  app.get("/api/source-intelligence/official-adapters", authenticate, rateLimit, async (req, res) => {
    const adapters = await db.select().from(sourceIntelligenceAdapters).where(eq(sourceIntelligenceAdapters.companyId, req.user.companyId)).orderBy(sourceIntelligenceAdapters.adapterKey);
    res.json(adapters);
  });

  app.post("/api/source-intelligence/official-adapters", ...mutateStack, async (req, res) => {
    const adapterKey = textValue(req.body?.adapterKey, 40);
    const definition = getOfficialAdapter(adapterKey);
    if (!definition) return res.status(400).json({ error: "Desteklenmeyen resmî kaynak adaptörü." });
    const sourceUrl = textValue(req.body?.sourceUrl, 2000) || definition.sourceUrl;
    try {
      assertAllowedSourceUrl(adapterKey, sourceUrl);
    } catch (error) {
      return res.status(400).json({ error: "Kaynak URL allowlist dışında.", code: error instanceof Error ? error.message : "SOURCE_HOST_NOT_ALLOWED" });
    }
    const existing = await db.select({ id: sourceIntelligenceAdapters.id }).from(sourceIntelligenceAdapters).where(and(eq(sourceIntelligenceAdapters.companyId, req.user.companyId), eq(sourceIntelligenceAdapters.adapterKey, adapterKey)));
    if (existing.length) return res.status(409).json({ error: "Bu adaptör şirket için zaten kayıtlı." });
    const [adapter] = await db.insert(sourceIntelligenceAdapters).values({
      companyId: req.user.companyId,
      adapterKey,
      sourceKind: definition.sourceKind,
      displayName: definition.displayName,
      authority: definition.authority,
      sourceUrl,
      allowedHost: definition.allowedHost,
      jurisdiction: "TR",
      region: textValue(req.body?.region, 120) || null,
      cadence: ["manual", "daily", "weekly", "monthly"].includes(req.body?.cadence) ? req.body.cadence : definition.cadence,
      enabled: req.body?.enabled !== false,
      configurationJson: objectPayload(req.body?.configurationJson) ?? {},
      createdByUserId: req.user.userId,
    }).returning();
    await audit(req, "source_adapter_created", "source_adapter", adapter.id, { adapterKey, sourceKind: definition.sourceKind });
    res.status(201).json(adapter);
  });

  app.get("/api/source-intelligence/health", authenticate, rateLimit, async (req, res) => {
    const adapters = await db.select().from(sourceIntelligenceAdapters).where(eq(sourceIntelligenceAdapters.companyId, req.user.companyId)).orderBy(sourceIntelligenceAdapters.adapterKey);
    const runs = await db.select().from(sourceIngestionRuns).where(eq(sourceIngestionRuns.companyId, req.user.companyId)).orderBy(desc(sourceIngestionRuns.createdAt)).limit(500);
    const latestByAdapter = new Map<string, typeof runs[number]>();
    for (const run of runs) if (!latestByAdapter.has(run.adapterId)) latestByAdapter.set(run.adapterId, run);
    res.json(adapters.map((adapter) => {
      const latest = latestByAdapter.get(adapter.id) ?? null;
      const health = !latest ? "never_run" : latest.status === "failed" ? "error" : latest.status === "awaiting_review" ? "awaiting_review" : "healthy";
      return { adapter, latestRun: latest, health };
    }));
  });

  app.get("/api/source-intelligence/review-queue", authenticate, rateLimit, async (req, res) => {
    const rows = await db.select({ item: sourceReviewItems, run: sourceIngestionRuns, adapter: sourceIntelligenceAdapters })
      .from(sourceReviewItems)
      .innerJoin(sourceIngestionRuns, and(eq(sourceReviewItems.ingestionRunId, sourceIngestionRuns.id), eq(sourceReviewItems.companyId, sourceIngestionRuns.companyId)))
      .innerJoin(sourceIntelligenceAdapters, and(eq(sourceIngestionRuns.adapterId, sourceIntelligenceAdapters.id), eq(sourceIngestionRuns.companyId, sourceIntelligenceAdapters.companyId)))
      .where(and(eq(sourceReviewItems.companyId, req.user.companyId), eq(sourceReviewItems.status, "pending")))
      .orderBy(desc(sourceReviewItems.createdAt)).limit(200);
    res.json(rows.map(({ item, run, adapter }) => ({ ...item, run, adapter })));
  });

  app.post("/api/source-intelligence/official-adapters/:adapterId/ingest", ...mutateStack, async (req, res) => {
    const [adapter] = await db.select().from(sourceIntelligenceAdapters).where(and(eq(sourceIntelligenceAdapters.id, req.params.adapterId), eq(sourceIntelligenceAdapters.companyId, req.user.companyId)));
    if (!adapter) return res.status(404).json({ error: "Kaynak adaptörü bulunamadı." });
    if (!adapter.enabled) return res.status(409).json({ error: "Kaynak adaptörü devre dışı." });
    const sourcePayload = objectPayload(req.body?.sourcePayload);
    if (!sourcePayload) return res.status(400).json({ error: "sourcePayload nesnesi zorunludur." });
    if (payloadSize(sourcePayload) > 1_000_000) return res.status(413).json({ error: "Kaynak payload 1 MB sınırını aşıyor." });
    const sourceDocumentIdentifier = textValue(req.body?.sourceDocumentIdentifier || sourcePayload.sourceDocumentIdentifier, 255);
    if (!sourceDocumentIdentifier) return res.status(400).json({ error: "Kaynak doküman kimliği zorunludur." });
    const sourceUrl = textValue(req.body?.sourceUrl, 2000) || adapter.sourceUrl;
    try {
      assertAllowedSourceUrl(adapter.adapterKey, sourceUrl);
    } catch (error) {
      return res.status(400).json({ error: "Kaynak URL allowlist dışında.", code: error instanceof Error ? error.message : "SOURCE_HOST_NOT_ALLOWED" });
    }
    const capturedAt = parseDate(req.body?.capturedAt);
    if (!capturedAt) return res.status(400).json({ error: "capturedAt geçersiz." });
    const sourceHash = sourcePayloadHash(sourcePayload);
    const runKey = crypto.createHash("sha256").update(`${adapter.id}:${sourceDocumentIdentifier}:${sourceHash}`).digest("hex");
    const existing = await db.select().from(sourceIngestionRuns).where(and(eq(sourceIngestionRuns.companyId, req.user.companyId), eq(sourceIngestionRuns.runKey, runKey)));
    if (existing.length) return res.status(200).json({ idempotent: true, run: existing[0] });

    const previousRun = (await db.select().from(sourceIngestionRuns).where(and(eq(sourceIngestionRuns.companyId, req.user.companyId), eq(sourceIngestionRuns.adapterId, adapter.id))).orderBy(desc(sourceIngestionRuns.createdAt)).limit(1))[0] ?? null;
    const previousArtifact = previousRun ? (await db.select().from(sourceIngestionArtifacts).where(and(eq(sourceIngestionArtifacts.companyId, req.user.companyId), eq(sourceIngestionArtifacts.ingestionRunId, previousRun.id), eq(sourceIngestionArtifacts.artifactType, "normalized"))).limit(1))[0] ?? null : null;
    let normalized;
    try {
      normalized = normalizeOfficialPayload(adapter.adapterKey, { ...sourcePayload, sourceDocumentIdentifier });
    } catch (error) {
      return res.status(400).json({ error: "Kaynak normalize edilemedi.", code: error instanceof Error ? error.message : "SOURCE_NORMALIZATION_FAILED" });
    }
    const previousNormalized = previousArtifact?.payloadJson as typeof normalized | null;
    const diff = diffSourcePayload(previousNormalized, normalized);
    const parserVersion = textValue(req.body?.parserVersion, 80) || "official-adapter-v1";
    let priceSourceId: string | null = null;
    let runId = "";
    try {
      const result = await db.transaction(async (tx) => {
        if (adapter.sourceKind === "price" || adapter.sourceKind === "index") {
          const requestedPriceSourceId = textValue(req.body?.priceSourceId, 80);
          if (requestedPriceSourceId) {
            const [requested] = await tx.select().from(priceSources).where(and(eq(priceSources.id, requestedPriceSourceId), eq(priceSources.companyId, req.user.companyId)));
            if (!requested) throw new Error("PRICE_SOURCE_NOT_FOUND");
            if (requested.sourceDocumentHash !== sourceHash) throw new Error("PRICE_SOURCE_HASH_MISMATCH");
            priceSourceId = requested.id;
          } else {
            const [createdSource] = await tx.insert(priceSources).values({
              companyId: req.user.companyId,
              sourceType: adapter.sourceKind === "index" ? "index_adjusted" : "official_reference",
              name: `${adapter.displayName} · ${sourceDocumentIdentifier}`,
              authority: adapter.authority,
              sourceUrl,
              sourceDocumentIdentifier,
              sourceDocumentHash: sourceHash,
              licenseStatus: "unknown",
              jurisdiction: adapter.jurisdiction,
              region: adapter.region,
              createdByUserId: req.user.userId,
              metadataJson: { adapterKey: adapter.adapterKey, parserVersion },
            }).returning({ id: priceSources.id });
            priceSourceId = createdSource.id;
          }
        }
        const [createdRun] = await tx.insert(sourceIngestionRuns).values({
          companyId: req.user.companyId,
          adapterId: adapter.id,
          priceSourceId,
          runKey,
          sourceDocumentIdentifier,
          sourceUrl,
          status: "fetching",
          sourceHash,
          previousSourceHash: previousRun?.sourceHash ?? null,
          parserVersion,
          httpStatus: Number.isInteger(req.body?.httpStatus) ? req.body.httpStatus : 200,
          requestedByUserId: req.user.userId,
          fetchedAt: capturedAt,
        }).returning();
        runId = createdRun.id;
        const rawArtifact = (await tx.insert(sourceIngestionArtifacts).values({ companyId: req.user.companyId, ingestionRunId: createdRun.id, artifactType: "raw", storageKey: `source-intelligence/${req.user.companyId}/${createdRun.id}/raw.json`, contentType: "application/json", checksumSha256: sourceHash, sizeBytes: payloadSize(sourcePayload), payloadJson: sourcePayload }).returning())[0];
        const normalizedHash = sourcePayloadHash(normalized);
        const normalizedArtifact = (await tx.insert(sourceIngestionArtifacts).values({ companyId: req.user.companyId, ingestionRunId: createdRun.id, artifactType: "normalized", storageKey: `source-intelligence/${req.user.companyId}/${createdRun.id}/normalized.json`, contentType: "application/json", checksumSha256: normalizedHash, sizeBytes: payloadSize(normalized), payloadJson: normalized }).returning())[0];
        const diffArtifact = (await tx.insert(sourceIngestionArtifacts).values({ companyId: req.user.companyId, ingestionRunId: createdRun.id, artifactType: "diff", storageKey: `source-intelligence/${req.user.companyId}/${createdRun.id}/diff.json`, contentType: "application/json", checksumSha256: sourcePayloadHash(diff), sizeBytes: payloadSize(diff), payloadJson: diff }).returning())[0];
        const reviewItemIds: string[] = [];
        const snapshotIds: string[] = [];
        if (priceSourceId) {
          for (const entry of normalized.entries) {
            const snapshotKey = buildPriceSnapshotKey({ sourceDocumentHash: sourceHash, externalReference: entry.externalReference, positionCode: entry.positionCode, description: entry.description, unit: entry.unit, amount: entry.amount, currency: entry.currency, capturedAt });
            const [snapshot] = await tx.insert(priceSnapshots).values({ companyId: req.user.companyId, priceSourceId, snapshotKey, externalReference: entry.externalReference, positionCode: entry.positionCode, description: entry.description, unit: entry.unit, amount: String(entry.amount), currency: entry.currency, vatStatus: entry.vatStatus, vatPercent: entry.vatPercent === null ? null : String(entry.vatPercent), region: entry.region ?? adapter.region, validFrom: entry.validFrom ? new Date(entry.validFrom) : null, validUntil: entry.validUntil ? new Date(entry.validUntil) : null, capturedAt, sourceDocumentHash: sourceHash, sourceVersion: entry.sourceVersion, confidence: String(entry.confidence), reviewStatus: "advisory", metadataJson: { adapterKey: adapter.adapterKey, ingestionRunId: createdRun.id } }).onConflictDoNothing({ target: [priceSnapshots.companyId, priceSnapshots.priceSourceId, priceSnapshots.snapshotKey] }).returning();
            const resolvedSnapshot = snapshot ?? (await tx.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, req.user.companyId), eq(priceSnapshots.priceSourceId, priceSourceId), eq(priceSnapshots.snapshotKey, snapshotKey))))[0];
            if (!resolvedSnapshot) continue;
            snapshotIds.push(resolvedSnapshot.id);
            const [reviewItem] = await tx.insert(sourceReviewItems).values({ companyId: req.user.companyId, ingestionRunId: createdRun.id, artifactId: normalizedArtifact.id, priceSnapshotId: resolvedSnapshot.id, itemType: "price_snapshot", title: `${entry.positionCode ?? entry.description} fiyat snapshot incelemesi`, rationale: "Resmî adaptör verisi reviewer onayı olmadan canonical fiyat olarak kullanılamaz.", proposedPayloadJson: entry, status: "pending" }).returning({ id: sourceReviewItems.id });
            reviewItemIds.push(reviewItem.id);
          }
        }
        if (normalized.changes.length > 0) {
          const [reviewItem] = await tx.insert(sourceReviewItems).values({ companyId: req.user.companyId, ingestionRunId: createdRun.id, artifactId: diffArtifact.id, itemType: "regulation_diff", title: `${adapter.displayName} değişiklik incelemesi`, rationale: "Mevzuat değişikliği yalnızca reviewer kararı sonrası advisory regulation version olarak görünür; bu akış otomatik canonical rule üretmez.", proposedPayloadJson: { sourceVersion: normalized.sourceVersion, publishedAt: normalized.publishedAt, changes: normalized.changes, diff }, status: "pending" }).returning({ id: sourceReviewItems.id });
          reviewItemIds.push(reviewItem.id);
        }
        const finalStatus = reviewItemIds.length ? "awaiting_review" : diff.changed ? "diffed" : "unchanged";
        const [updatedRun] = await tx.update(sourceIngestionRuns).set({ status: finalStatus, completedAt: new Date(), diffSummaryJson: diff, updatedAt: new Date() }).where(and(eq(sourceIngestionRuns.id, createdRun.id), eq(sourceIngestionRuns.companyId, req.user.companyId))).returning();
        await tx.update(sourceIntelligenceAdapters).set({ lastRunAt: new Date(), lastSuccessAt: new Date(), lastSourceHash: sourceHash, lastErrorCode: null, lastErrorMessage: null, updatedAt: new Date() }).where(and(eq(sourceIntelligenceAdapters.id, adapter.id), eq(sourceIntelligenceAdapters.companyId, req.user.companyId)));
        return { run: updatedRun, artifactIds: [rawArtifact.id, normalizedArtifact.id, diffArtifact.id], reviewItemIds, snapshotIds, diff };
      });
      await audit(req, "source_ingestion_completed", "source_ingestion_run", result.run.id, { adapterKey: adapter.adapterKey, sourceHash, status: result.run.status, diff: result.diff });
      return res.status(201).json({ ...result, sourceHash, priceSourceId });
    } catch (error) {
      if (runId) await db.update(sourceIngestionRuns).set({ status: "failed", errorCode: error instanceof Error ? error.message : "SOURCE_INGESTION_FAILED", errorMessage: "Kaynak ingest işlemi tamamlanamadı.", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(sourceIngestionRuns.id, runId), eq(sourceIngestionRuns.companyId, req.user.companyId)));
      const code = error instanceof Error ? error.message : "SOURCE_INGESTION_FAILED";
      if (code === "PRICE_SOURCE_NOT_FOUND") return res.status(404).json({ error: "Fiyat kaynağı bulunamadı." });
      if (code === "PRICE_SOURCE_HASH_MISMATCH") return res.status(409).json({ error: "Fiyat kaynağı hash’i yeni payload ile eşleşmiyor.", code });
      return res.status(500).json({ error: "Kaynak ingest işlemi başarısız.", code });
    }
  });

  app.patch("/api/source-intelligence/review-items/:id", ...mutateStack, async (req, res) => {
    const status = textValue(req.body?.status, 20);
    if (status !== "approved" && status !== "rejected") return res.status(400).json({ error: "Review durumu approved veya rejected olabilir." });
    const [item] = await db.select().from(sourceReviewItems).where(and(eq(sourceReviewItems.id, req.params.id), eq(sourceReviewItems.companyId, req.user.companyId)));
    if (!item) return res.status(404).json({ error: "Kaynak review item bulunamadı." });
    if (item.status !== "pending") return res.status(409).json({ error: "Review item daha önce karara bağlandı." });
    const reviewedAt = new Date();
    let updated: typeof item;
    await db.transaction(async (tx) => {
      [updated] = await tx.update(sourceReviewItems).set({ status, reviewedByUserId: req.user.userId, reviewedAt, reviewerNotes: textValue(req.body?.notes, 2000) || null, updatedAt: reviewedAt }).where(and(eq(sourceReviewItems.id, item.id), eq(sourceReviewItems.companyId, req.user.companyId))).returning();
      if (item.priceSnapshotId) await tx.update(priceSnapshots).set({ reviewStatus: status, reviewedByUserId: req.user.userId, reviewedAt, reviewerNotes: textValue(req.body?.notes, 2000) || null }).where(and(eq(priceSnapshots.id, item.priceSnapshotId), eq(priceSnapshots.companyId, req.user.companyId)));
      if (status === "approved" && item.itemType === "regulation_diff") {
        const [run] = await tx.select().from(sourceIngestionRuns).where(and(eq(sourceIngestionRuns.id, item.ingestionRunId), eq(sourceIngestionRuns.companyId, req.user.companyId)));
        const [adapter] = run ? await tx.select().from(sourceIntelligenceAdapters).where(and(eq(sourceIntelligenceAdapters.id, run.adapterId), eq(sourceIntelligenceAdapters.companyId, req.user.companyId))) : [];
        const payload = item.proposedPayloadJson as Record<string, unknown>;
        const changes = regulationChanges(payload);
        if (run && adapter) {
          for (const change of changes) {
            const versionKey = sourcePayloadHash({ companyId: req.user.companyId, sourceReviewItemId: item.id, change });
            const effectiveFrom = optionalDate(change.effectiveFrom);
            await tx.insert(regulationVersions).values({
              companyId: req.user.companyId,
              sourceReviewItemId: item.id,
              ingestionRunId: item.ingestionRunId,
              versionKey,
              title: change.title,
              summary: change.summary,
              category: change.category,
              impactLevel: change.impactLevel,
              authority: adapter.authority,
              sourceUrl: run.sourceUrl,
              sourceDocumentIdentifier: run.sourceDocumentIdentifier,
              sourceDocumentHash: run.sourceHash ?? "",
              sourceVersion: typeof payload.sourceVersion === "string" ? payload.sourceVersion : null,
              sourceText: change.sourceText,
              jurisdiction: adapter.jurisdiction,
              applicability: change.applicability,
              publishedAt: optionalDate(payload.publishedAt),
              effectiveFrom,
              governanceStatus: "advisory",
              reviewedByUserId: req.user.userId,
              reviewedAt,
              updatedAt: reviewedAt,
            }).onConflictDoNothing({ target: [regulationVersions.companyId, regulationVersions.versionKey] });
            await tx.insert(regulationAlerts).values({ companyId: req.user.companyId, title: change.title, category: change.category, effectiveDate: effectiveFrom ?? reviewedAt, impactLevel: change.impactLevel, summary: change.summary, affectedModules: ["quotation-impact"] });
          }
        }
      }
      const runItems = await tx.select({ status: sourceReviewItems.status }).from(sourceReviewItems).where(and(eq(sourceReviewItems.ingestionRunId, item.ingestionRunId), eq(sourceReviewItems.companyId, req.user.companyId)));
      if (runItems.length > 0 && runItems.every((runItem) => runItem.status !== "pending")) {
        const runStatus = runItems.some((runItem) => runItem.status === "rejected") ? "rejected" : "approved";
        await tx.update(sourceIngestionRuns).set({ status: runStatus, updatedAt: reviewedAt }).where(and(eq(sourceIngestionRuns.id, item.ingestionRunId), eq(sourceIngestionRuns.companyId, req.user.companyId)));
      }
    });
    await audit(req, `source_review_${status}`, "source_review_item", item.id, { itemType: item.itemType, priceSnapshotId: item.priceSnapshotId, canonicalPromotion: false });
    res.json(updated);
  });
}
