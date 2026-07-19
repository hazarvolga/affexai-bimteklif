import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { costComponents, quotationFinancials, quotationItems, quotations } from "../../db/schema";
import { ProfitService } from "../../services/financials/profitService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";

export function registerProfitRoutes(app: Express, profitService: ProfitService, canMutate: any) {
  app.post("/api/profit/calculate", authenticate, canMutate, usageTracker("PROFIT_ANALYSIS_RUN"), async (req, res) => {
    try {
      const { quotationId } = req.body;
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      const items = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, req.user.companyId)));

      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const analysis = await profitService.analyzeProfitability(items, quote.industryId || "residential", quote.currency, {
        projectDurationMonths: Number(quote.projectDurationMonths),
        escalationVolatilityPercent: Number(quote.escalationVolatilityPercent),
      });

      await db.insert(quotationFinancials).values({
        quotationId,
        totalCost: analysis.totalCost.toString(),
        totalPrice: analysis.totalPrice.toString(),
        profit: analysis.profit.toString(),
        margin: analysis.margin.toFixed(2),
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        costDataStatus: analysis.costStatus,
      }).onConflictDoUpdate({
        target: quotationFinancials.quotationId,
        set: {
          totalCost: analysis.totalCost.toString(),
          totalPrice: analysis.totalPrice.toString(),
          profit: analysis.profit.toString(),
          margin: analysis.margin.toFixed(2),
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          costDataStatus: analysis.costStatus,
          updatedAt: new Date()
        }
      });

      await db.insert(costComponents).values({
        quotationId,
        materialCost: analysis.costBreakdown.material.toString(),
        laborCost: analysis.costBreakdown.labor.toString(),
        logisticsCost: analysis.costBreakdown.logistics.toString(),
        subcontractorCost: analysis.costBreakdown.subcontractor.toString(),
        overheadCost: analysis.costBreakdown.overhead.toString(),
      }).onConflictDoUpdate({
        target: costComponents.quotationId,
        set: {
          materialCost: analysis.costBreakdown.material.toString(),
          laborCost: analysis.costBreakdown.labor.toString(),
          logisticsCost: analysis.costBreakdown.logistics.toString(),
          subcontractorCost: analysis.costBreakdown.subcontractor.toString(),
          overheadCost: analysis.costBreakdown.overhead.toString(),
        }
      });

      res.json(analysis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Financial analysis failed" });
    }
  });

  app.get("/api/profit/report/:quotationId", authenticate, async (req, res) => {
    try {
      const { quotationId } = req.params;
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const financials = await db.query.quotationFinancials.findFirst({
        where: eq(quotationFinancials.quotationId, quotationId)
      });
      const components = await db.query.costComponents.findFirst({
        where: eq(costComponents.quotationId, quotationId)
      });
      res.json({ financials, components });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });
}
