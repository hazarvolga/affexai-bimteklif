import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { tenantOf, withAppTenant } from "../../db/app-tenant";
import { costComponents, quotationFinancials, quotationItems, quotations } from "../../db/schema";
import { ProfitService } from "../../services/financials/profitService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { reserveAiUsage } from "../../services/billing/ai-quota";
import { QuotaError } from "../../services/billing/quota-policy";

export function registerProfitRoutes(app: Express, profitService: ProfitService, canMutate: any) {
  app.post("/api/profit/calculate", authenticate, canMutate, usageTracker("PROFIT_ANALYSIS_RUN"), async (req, res) => {
    try {
      const { quotationId } = req.body;
      const tenant = tenantOf(req.user);
      const { quote, items } = await withAppTenant(tenant, async (tenantDb) => {
        const fetchedQuote = await tenantDb.query.quotations.findFirst({
          where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
        });
        const fetchedItems = fetchedQuote
          ? await tenantDb.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, req.user.companyId)))
          : [];
        return { quote: fetchedQuote, items: fetchedItems };
      });

      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const analysis = await profitService.analyzeProfitability(items, quote.industryId || "residential", quote.currency, {
        projectDurationMonths: Number(quote.projectDurationMonths),
        escalationVolatilityPercent: Number(quote.escalationVolatilityPercent),
        carbonRiskPremiumPercent: Number(quote.carbonRiskPremiumPercent),
        informationDeliveryCostPercent: Number(quote.informationDeliveryCostPercent),
      }, () => reserveAiUsage(req.user.companyId, req.user.userId));

      await withAppTenant(tenant, async (tenantDb) => {
        await tenantDb.insert(quotationFinancials).values({
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

        await tenantDb.insert(costComponents).values({
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
      });

      res.json(analysis);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      console.error(error);
      res.status(500).json({ error: "Financial analysis failed" });
    }
  });

  app.get("/api/profit/report/:quotationId", authenticate, async (req, res) => {
    try {
      const { quotationId } = req.params;
      const report = await withAppTenant(tenantOf(req.user), async (tenantDb) => {
        const quote = await tenantDb.query.quotations.findFirst({
          where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
        });
        if (!quote) return null;

        const financials = await tenantDb.query.quotationFinancials.findFirst({
          where: eq(quotationFinancials.quotationId, quotationId)
        });
        const components = await tenantDb.query.costComponents.findFirst({
          where: eq(costComponents.quotationId, quotationId)
        });
        return { financials, components };
      });
      if (!report) return res.status(404).json({ error: "Quotation not found" });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });
}
