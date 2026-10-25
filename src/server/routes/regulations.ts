import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tenantOf, withAppTenant } from "../../db/app-tenant";
import { quotationItems, quotations, regulationAlerts, regulationVersions } from "../../db/schema";
import { RegulatoryIntelligenceService } from "../../services/regulations/regulatoryService";
import { findRegulationQuotationImpact } from "../regulations/impact";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { reserveAiUsage } from '../../services/billing/ai-quota';
import { consumeRateLimit } from '../auth/security';
import { ingestRegulationDocument } from '../../services/regulations/ingest-document';
import { QuotaError } from '../../services/billing/quota-policy';

export function registerRegulationRoutes(app: Express, regulatoryService: RegulatoryIntelligenceService, canMutate: any) {
  app.get("/api/regulations/alerts", authenticate, async (req, res) => {
    try {
      const alerts = await withAppTenant(tenantOf(req.user), (tenantDb) =>
        tenantDb.select().from(regulationAlerts)
          .where(eq(regulationAlerts.companyId, req.user.companyId))
          .orderBy(desc(regulationAlerts.createdAt))
      , { readOnly: true });
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.get("/api/regulations/versions", authenticate, async (req, res) => {
    try {
      const versions = await withAppTenant(tenantOf(req.user), (tenantDb) =>
        tenantDb.select().from(regulationVersions)
          .where(and(eq(regulationVersions.companyId, req.user.companyId), eq(regulationVersions.governanceStatus, "advisory")))
          .orderBy(desc(regulationVersions.effectiveFrom), desc(regulationVersions.createdAt))
          .limit(200)
      , { readOnly: true });
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch regulation versions" });
    }
  });

  app.get("/api/regulations/versions/:id/affected-quotations", authenticate, async (req, res) => {
    try {
      const data = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
        const [version] = await tenantDb.select().from(regulationVersions)
          .where(and(eq(regulationVersions.id, req.params.id), eq(regulationVersions.companyId, req.user.companyId)));
        if (!version) return null;
        const quoteRows = await tenantDb.select().from(quotations)
          .where(and(eq(quotations.companyId, req.user.companyId), eq(quotations.isLatest, true)))
          .orderBy(desc(quotations.updatedAt)).limit(500);
        const quoteIds = quoteRows.map((quote) => quote.id);
        const items = quoteIds.length
          ? await tenantDb.select().from(quotationItems).where(and(eq(quotationItems.companyId, req.user.companyId), inArray(quotationItems.quotationId, quoteIds)))
          : [];
        return { version, quoteRows, items };
      });
      if (!data) return res.status(404).json({ error: "Regulation version not found" });
      const { version, quoteRows, items } = data;
      const asOfValue = typeof req.query.asOf === "string" ? new Date(req.query.asOf) : new Date();
      const asOf = Number.isNaN(asOfValue.getTime()) ? new Date() : asOfValue;
      const impactVersion = { ...version, category: version.category as "tax" | "labor" | "material" | "procurement" | "legal" };
      const affectedQuotations = quoteRows.map((quote) => findRegulationQuotationImpact(impactVersion, quote, items, asOf)).filter((impact): impact is NonNullable<typeof impact> => Boolean(impact));
      res.json({ version, asOf, count: affectedQuotations.length, affectedQuotations });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate regulation impact" });
    }
  });

  app.post("/api/regulations/sync", authenticate, requireVerifiedEmail, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const rate = await consumeRateLimit(`regulation-fetch:${req.user.companyId}:${req.user.userId}`, 5, 60_000);
      if (!rate.allowed) return res.status(429).set('Retry-After',String(rate.retryAfterSeconds)).json({ error:'Kaynak okuma sınırına ulaşıldı.' });
      const document = await regulatoryService.crawlAndAnalyze(req.body?.sourceUrl);
      const result = await ingestRegulationDocument(req.user.companyId,req.user.userId,document);
      return res.status(result.idempotent ? 200 : 201).json(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'REGULATION_INGEST_FAILED';
      const messages: Record<string,string> = {
        REGULATION_SOURCE_REQUIRED:'Resmî Gazete HTML belge bağlantısı zorunludur.',
        REGULATION_SOURCE_NOT_ALLOWED:'Yalnız Resmî Gazete arşivindeki HTTPS HTML belge bağlantıları kabul edilir.',
        REGULATION_SOURCE_UNAVAILABLE:'Resmî kaynağa erişilemedi. Hiçbir mevzuat kaydı üretilmedi.',
        REGULATION_DOCUMENT_ENCODING_UNSUPPORTED:'Belgenin karakter kodlaması desteklenmiyor; UTF-8 HTML belge gerekir.',
        REGULATION_DOCUMENT_INVALID:'Belge doğrulanamadı; hiçbir mevzuat kaydı üretilmedi.',
        REGULATION_DOCUMENT_TOO_LARGE:'Belge boyut sınırını aşıyor.',
        REGULATION_SOURCE_DISABLED:'Bu kaynak şirket için devre dışı.',
      };
      const status = code === 'REGULATION_SOURCE_UNAVAILABLE' ? 503 : code === 'REGULATION_SOURCE_DISABLED' ? 409 : code === 'REGULATION_DOCUMENT_TOO_LARGE' ? 413 : messages[code] ? 400 : 500;
      return res.status(status).json({ error:messages[code] ?? 'Kaynak inceleme kuyruğuna alınamadı.', code:messages[code] ? code : 'REGULATION_INGEST_FAILED' });
    }
  });

  app.post("/api/regulations/check-impact", authenticate, canMutate, usageTracker("REGULATION_CHECK_RUN"), async (req, res) => {
    try {
      const { quotationId, alertId } = req.body;

      const { quote, alert } = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
        const fetchedQuote = await tenantDb.query.quotations.findFirst({
          where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
        });
        const fetchedAlert = await tenantDb.query.regulationAlerts.findFirst({
          where: and(eq(regulationAlerts.id, alertId), eq(regulationAlerts.companyId, req.user.companyId)),
        });
        return { quote: fetchedQuote, alert: fetchedAlert };
      });

      if (!quote || !alert) return res.status(404).json({ error: "Quote or Alert not found" });

      await reserveAiUsage(req.user.companyId, req.user.userId);
      const impact = await regulatoryService.checkQuotationImpact(quote, alert as any);
      res.json(impact);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      res.status(500).json({ error: "Impact analysis failed" });
    }
  });
}
