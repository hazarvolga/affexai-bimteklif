import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { quotationItems, quotations, regulationAlerts, regulationVersions } from "../../db/schema";
import { RegulatoryIntelligenceService } from "../../services/regulations/regulatoryService";
import { findRegulationQuotationImpact } from "../regulations/impact";
import { authenticate, checkRole } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { reserveAiUsage } from '../../services/billing/ai-quota';
import { QuotaError } from '../../services/billing/quota-policy';

export function registerRegulationRoutes(app: Express, regulatoryService: RegulatoryIntelligenceService, canMutate: any) {
  app.get("/api/regulations/alerts", authenticate, async (req, res) => {
    try {
      const alerts = await db.select().from(regulationAlerts)
        .where(eq(regulationAlerts.companyId, req.user.companyId))
        .orderBy(desc(regulationAlerts.createdAt));
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.get("/api/regulations/versions", authenticate, async (req, res) => {
    try {
      const versions = await db.select().from(regulationVersions)
        .where(and(eq(regulationVersions.companyId, req.user.companyId), eq(regulationVersions.governanceStatus, "advisory")))
        .orderBy(desc(regulationVersions.effectiveFrom), desc(regulationVersions.createdAt))
        .limit(200);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch regulation versions" });
    }
  });

  app.get("/api/regulations/versions/:id/affected-quotations", authenticate, async (req, res) => {
    try {
      const [version] = await db.select().from(regulationVersions)
        .where(and(eq(regulationVersions.id, req.params.id), eq(regulationVersions.companyId, req.user.companyId)));
      if (!version) return res.status(404).json({ error: "Regulation version not found" });
      const asOfValue = typeof req.query.asOf === "string" ? new Date(req.query.asOf) : new Date();
      const asOf = Number.isNaN(asOfValue.getTime()) ? new Date() : asOfValue;
      const quoteRows = await db.select().from(quotations)
        .where(and(eq(quotations.companyId, req.user.companyId), eq(quotations.isLatest, true)))
        .orderBy(desc(quotations.updatedAt)).limit(500);
      const quoteIds = quoteRows.map((quote) => quote.id);
      const items = quoteIds.length
        ? await db.select().from(quotationItems).where(and(eq(quotationItems.companyId, req.user.companyId), inArray(quotationItems.quotationId, quoteIds)))
        : [];
      const impactVersion = { ...version, category: version.category as "tax" | "labor" | "material" | "procurement" | "legal" };
      const affectedQuotations = quoteRows.map((quote) => findRegulationQuotationImpact(impactVersion, quote, items, asOf)).filter((impact): impact is NonNullable<typeof impact> => Boolean(impact));
      res.json({ version, asOf, count: affectedQuotations.length, affectedQuotations });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate regulation impact" });
    }
  });

  app.post("/api/regulations/sync", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      await reserveAiUsage(req.user.companyId, req.user.userId);
      const newAlerts = await regulatoryService.crawlAndAnalyze();

      if (newAlerts && newAlerts.length > 0) {
        const formattedAlerts = newAlerts.map(a => ({
          ...a,
          companyId: req.user.companyId,
          effectiveDate: new Date(a.effectiveDate),
        }));
        await db.insert(regulationAlerts).values(formattedAlerts);
      }

      res.json({ message: "Sync successful", count: newAlerts.length });
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      console.error("Regulatory sync failed:", error);
      res.status(500).json({ error: "Failed to sync regulations" });
    }
  });

  app.post("/api/regulations/check-impact", authenticate, canMutate, usageTracker("REGULATION_CHECK_RUN"), async (req, res) => {
    try {
      const { quotationId, alertId } = req.body;

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      const alert = await db.query.regulationAlerts.findFirst({
        where: and(eq(regulationAlerts.id, alertId), eq(regulationAlerts.companyId, req.user.companyId)),
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
