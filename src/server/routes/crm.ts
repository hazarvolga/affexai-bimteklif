import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { tenantOf, withAppTenant, withAppTenantTransaction } from "../../db/app-tenant";
import { activities, clients, deals, quotationFinancials, quotationItems, quotations } from "../../db/schema";
import { CRMIntelligenceService } from "../../services/crm/crmService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { activityInput, dealIdInput, dealInput, leadInput, leadPaginationInput, stageInput } from '../../services/crm/input';
import { CrmLeadService } from '../../services/crm/lead-service';
import { reserveAiUsage } from '../../services/billing/ai-quota';
import { QuotaError } from '../../services/billing/quota-policy';

/** Tenant transaction runners for CRM deal/activity paths (FORCE RLS since 0022); injectable for route tests. */
export type CrmTenantAccess = Readonly<{ read: typeof withAppTenant; transaction: typeof withAppTenantTransaction }>;
const defaultTenantAccess: CrmTenantAccess = { read: withAppTenant, transaction: withAppTenantTransaction };

export function registerCrmRoutes(
  app: Express,
  crmService: CRMIntelligenceService,
  canMutate: any,
  leadService: CrmLeadService = new CrmLeadService(),
  tenant: CrmTenantAccess = defaultTenantAccess,
) {
  app.get('/api/crm/deals/:id', authenticate, async (req, res) => {
    const parsed = dealIdInput.safeParse({ dealId: req.params.id });
    if (!parsed.success) return res.status(400).json({ error: 'Invalid deal ID' });
    try {
      const deal = await tenant.read(tenantOf(req.user), (tenantDb) => tenantDb.query.deals.findFirst({ where: and(eq(deals.id, parsed.data.dealId), eq(deals.companyId, req.user.companyId)) }));
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
      const allDeals = await tenant.read(tenantOf(req.user), (tenantDb) => tenantDb.select()
        .from(deals)
        .where(eq(deals.companyId, companyId))
        .orderBy(desc(deals.createdAt))
        .limit(limit)
        .offset(offset));
      res.json(allDeals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pipeline" });
    }
  });

  app.post("/api/crm/deals", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const parsed = dealInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid deal input' });
      const newDeal = await tenant.transaction(tenantOf(req.user), async tx => {
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

  app.post("/api/crm/leads", authenticate, canMutate, async (req, res, next) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Company is required", code: "COMPANY_REQUIRED" });
      const parsed = leadInput.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid lead input' });
      }
      const newLead = await leadService.create(req.user, { ...parsed.data, name: parsed.data.name! });
      res.status(201).json(newLead);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      next(error);
    }
  });

  app.get("/api/crm/leads", authenticate, async (req, res, next) => {
    try {
      if (!req.user.companyId) return res.status(403).json({ error: "Company is required", code: "COMPANY_REQUIRED" });
      const parsed = leadPaginationInput.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: "Invalid lead pagination", code: "LEAD_PAGINATION_INVALID" });
      res.json(await leadService.list(req.user, { limit: parsed.data.limit ?? 100, offset: parsed.data.offset ?? 0 }));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/crm/activities", authenticate, canMutate, async (req, res) => {
    try {
      const parsed = activityInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid activity input' });
      const activity = await tenant.transaction(tenantOf(req.user), async tx => {
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
      const dealActivities = await tenant.read(tenantOf(req.user), (tenantDb) => tenantDb.select()
        .from(activities)
        .where(and(eq(activities.dealId, id), eq(activities.companyId, req.user.companyId)))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset));
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
      const updatedDeal = await tenant.transaction(tenantOf(req.user), async tx => {
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
      const actor = tenantOf(req.user);
      const context = await tenant.read(actor, async (tenantDb) => {
        const deal = await tenantDb.query.deals.findFirst({
          where: and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId))
        });
        if (!deal || !deal.quotationId) return { missing: "Deal or Quotation not found" } as const;
        const quote = await tenantDb.query.quotations.findFirst({
          where: and(eq(quotations.id, deal.quotationId), eq(quotations.companyId, req.user.companyId)),
        });
        if (!quote) return { missing: "Quotation not found" } as const;
        const qItems = await tenantDb.select().from(quotationItems).where(and(eq(quotationItems.quotationId, deal.quotationId), eq(quotationItems.companyId, req.user.companyId)));
        const financials = await tenantDb.query.quotationFinancials.findFirst({
          where: eq(quotationFinancials.quotationId, deal.quotationId)
        });
        return { deal, quote, qItems, financials } as const;
      }, { readOnly: true });
      if ("missing" in context) return res.status(404).json({ error: context.missing });
      const { deal, quote, qItems, financials } = context;

      await reserveAiUsage(req.user.companyId, req.user.userId);
      const analysis = await crmService.analyzeDeal(deal, { ...quote, items: qItems }, financials);

      await tenant.read(actor, (tenantDb) => tenantDb.update(deals)
        .set({
          probability: analysis.probability.toString(),
          riskLevel: analysis.riskLevel,
          aiInsights: analysis.insights,
          updatedAt: new Date()
        })
        .where(and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId))));

      res.json(analysis);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      console.error(error);
      res.status(500).json({ error: "Deal analysis failed" });
    }
  });
}
