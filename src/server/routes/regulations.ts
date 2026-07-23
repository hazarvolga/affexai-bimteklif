import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { quotations, regulationAlerts } from "../../db/schema";
import { RegulatoryIntelligenceService } from "../../services/regulations/regulatoryService";
import { authenticate, checkRole } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";

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

  app.post("/api/regulations/sync", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
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

      const impact = await regulatoryService.checkQuotationImpact(quote, alert as any);
      res.json(impact);
    } catch (error) {
      res.status(500).json({ error: "Impact analysis failed" });
    }
  });
}
