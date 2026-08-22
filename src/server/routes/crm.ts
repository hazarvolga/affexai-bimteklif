import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { activities, clients, deals, leads, quotationFinancials, quotationItems, quotations } from "../../db/schema";
import { CRMIntelligenceService } from "../../services/crm/crmService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";

export function registerCrmRoutes(app: Express, crmService: CRMIntelligenceService, canMutate: any) {
  app.get("/api/crm/pipeline", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const allDeals = await db.select().from(deals).where(eq(deals.companyId, companyId)).orderBy(desc(deals.createdAt));
      res.json(allDeals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pipeline" });
    }
  });

  app.post("/api/crm/deals", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const { clientId, name, value, expectedCloseDate, stage } = req.body;
      if (!clientId || !name) return res.status(400).json({ error: "clientId ve name zorunludur" });

      const [client] = await db.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.companyId, req.user.companyId)));
      if (!client) return res.status(404).json({ error: "Müşteri bulunamadı" });

      const [newDeal] = await db.insert(deals).values({
        companyId: req.user.companyId,
        clientId,
        name,
        stage: stage || "lead",
        value: value != null ? String(value) : "0",
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      }).returning();

      await db.insert(activities).values({
        companyId: newDeal.companyId,
        dealId: newDeal.id,
        userId: req.user.userId,
        type: "note",
        description: "Fırsat oluşturuldu.",
      });

      res.status(201).json(newDeal);
    } catch (error) {
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  app.post("/api/crm/leads", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const data = { ...req.body, companyId: req.user.companyId };
      const [newLead] = await db.insert(leads).values(data).returning();
      res.json(newLead);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.get("/api/crm/leads", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const allLeads = await db.select().from(leads).where(eq(leads.companyId, companyId)).orderBy(desc(leads.createdAt));
      res.json(allLeads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/crm/activities", authenticate, canMutate, async (req, res) => {
    try {
      const data = { ...req.body, companyId: req.user.companyId, userId: req.user.userId };
      const [activity] = await db.insert(activities).values(data).returning();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.get("/api/crm/deals/:id/activities", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const dealActivities = await db.select().from(activities).where(and(eq(activities.dealId, id), eq(activities.companyId, req.user.companyId))).orderBy(desc(activities.createdAt));
      res.json(dealActivities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/crm/deals/update-stage", authenticate, canMutate, async (req, res) => {
    try {
      const { dealId, stage } = req.body;
      const [updatedDeal] = await db.update(deals)
        .set({ stage, updatedAt: new Date() })
        .where(and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId)))
        .returning();

      await db.insert(activities).values({
        companyId: updatedDeal.companyId,
        dealId: updatedDeal.id,
        type: "stage_change",
        description: `Satış aşaması ${stage.toUpperCase()} olarak güncellendi.`
      });

      res.json(updatedDeal);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deal stage" });
    }
  });

  app.post("/api/crm/analyze-deal", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const { dealId } = req.body;
      const deal = await db.query.deals.findFirst({
        where: and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId))
      });
      if (!deal || !deal.quotationId) return res.status(404).json({ error: "Deal or Quotation not found" });

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, deal.quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      const qItems = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, deal.quotationId), eq(quotationItems.companyId, req.user.companyId)));
      const financials = await db.query.quotationFinancials.findFirst({
        where: eq(quotationFinancials.quotationId, deal.quotationId)
      });

      const analysis = await crmService.analyzeDeal(deal, { ...quote, items: qItems }, financials);

      await db.update(deals)
        .set({
          probability: analysis.probability.toString(),
          riskLevel: analysis.riskLevel,
          aiInsights: analysis.insights,
          updatedAt: new Date()
        })
        .where(eq(deals.id, dealId));

      res.json(analysis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Deal analysis failed" });
    }
  });
}
