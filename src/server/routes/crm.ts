import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { activities, clients, deals, leads, quotationFinancials, quotationItems, quotations } from "../../db/schema";
import { CRMIntelligenceService } from "../../services/crm/crmService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { activityInput, dealIdInput, dealInput, leadInput, stageInput } from '../../services/crm/input';
import { reserveAiUsage } from '../../services/billing/ai-quota';
import { QuotaError } from '../../services/billing/quota-policy';

export function registerCrmRoutes(app: Express, crmService: CRMIntelligenceService, canMutate: any) {
  app.get('/api/crm/deals/:id', authenticate, async (req, res) => {
    const parsed = dealIdInput.safeParse({ dealId: req.params.id });
    if (!parsed.success) return res.status(400).json({ error: 'Invalid deal ID' });
    try {
      const deal = await db.query.deals.findFirst({ where: and(eq(deals.id, parsed.data.dealId), eq(deals.companyId, req.user.companyId)) });
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      return res.json(deal);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch deal' });
    }
  });
  app.get("/api/crm/pipeline", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allDeals = await db.select()
        .from(deals)
        .where(eq(deals.companyId, companyId))
        .orderBy(desc(deals.createdAt))
        .limit(limit)
        .offset(offset);
      res.json(allDeals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pipeline" });
    }
  });

  app.post("/api/crm/deals", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const parsed = dealInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid deal input' });
      const newDeal = await db.transaction(async tx => {
        const [client] = await tx.select({ id: clients.id }).from(clients)
          .where(and(eq(clients.id, parsed.data.clientId), eq(clients.companyId, req.user.companyId))).for('share');
        if (!client) return null;
        const [created] = await tx.insert(deals).values({ ...parsed.data, name: parsed.data.name, clientId: parsed.data.clientId,
          value: String(parsed.data.value), companyId: req.user.companyId }).returning();
        await tx.insert(activities).values({ companyId: created.companyId, dealId: created.id, userId: req.user.userId, type: 'note', description: 'Fırsat oluşturuldu.' });
        return created;
      });
      if (!newDeal) return res.status(404).json({ error: 'Müşteri bulunamadı' });
      res.status(201).json(newDeal);
    } catch (error) {
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  app.post("/api/crm/leads", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const parsed = leadInput.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid lead input' });
      }
      const data = {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        source: parsed.data.source || null,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        companyId: req.user.companyId,
      };
      const [newLead] = await db.insert(leads).values(data).returning();
      res.json(newLead);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.get("/api/crm/leads", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allLeads = await db.select()
        .from(leads)
        .where(eq(leads.companyId, companyId))
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset);
      res.json(allLeads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/crm/activities", authenticate, canMutate, async (req, res) => {
    try {
      const parsed = activityInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid activity input' });
      const activity = await db.transaction(async tx => {
        const [deal] = await tx.select({ id: deals.id }).from(deals)
          .where(and(eq(deals.id, parsed.data.dealId), eq(deals.companyId, req.user.companyId))).for('share');
        if (!deal) return null;
        const [created] = await tx.insert(activities).values({ dealId: parsed.data.dealId, description: parsed.data.description,
          companyId: req.user.companyId, userId: req.user.userId, type: 'note' }).returning();
        return created;
      });
      if (!activity) return res.status(404).json({ error: 'Deal not found' });
      res.status(201).json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.get("/api/crm/deals/:id/activities", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const dealActivities = await db.select()
        .from(activities)
        .where(and(eq(activities.dealId, id), eq(activities.companyId, req.user.companyId)))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);
      res.json(dealActivities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/crm/deals/update-stage", authenticate, canMutate, async (req, res) => {
    try {
      const parsed = stageInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid stage input' });
      const { dealId, stage } = parsed.data;
      const updatedDeal = await db.transaction(async tx => {
        const where = and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId));
        const [deal] = await tx.select().from(deals).where(where).for('update');
        if (!deal) return null;
        if (deal.stage === stage) return deal;
        const [updated] = await tx.update(deals).set({ stage, updatedAt: new Date() }).where(where).returning();
        await tx.insert(activities).values({ companyId: req.user.companyId, dealId, userId: req.user.userId,
          type: 'stage_change', description: `Satış aşaması ${stage} olarak güncellendi.` });
        return updated;
      });
      if (!updatedDeal) return res.status(404).json({ error: 'Deal not found' });
      res.json(updatedDeal);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deal stage" });
    }
  });

  app.post("/api/crm/analyze-deal", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const parsed = dealIdInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid deal ID' });
      const { dealId } = parsed.data;
      const deal = await db.query.deals.findFirst({
        where: and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId))
      });
      if (!deal || !deal.quotationId) return res.status(404).json({ error: "Deal or Quotation not found" });

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, deal.quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: 'Quotation not found' });
      const qItems = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, deal.quotationId), eq(quotationItems.companyId, req.user.companyId)));
      const financials = await db.query.quotationFinancials.findFirst({
        where: eq(quotationFinancials.quotationId, deal.quotationId)
      });

      await reserveAiUsage(req.user.companyId, req.user.userId);
      const analysis = await crmService.analyzeDeal(deal, { ...quote, items: qItems }, financials);

      await db.update(deals)
        .set({
          probability: analysis.probability.toString(),
          riskLevel: analysis.riskLevel,
          aiInsights: analysis.insights,
          updatedAt: new Date()
        })
        .where(and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId)));

      res.json(analysis);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      console.error(error);
      res.status(500).json({ error: "Deal analysis failed" });
    }
  });
}
