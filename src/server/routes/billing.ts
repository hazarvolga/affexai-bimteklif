import type { Express } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { plans, subscriptions, usageAlerts } from "../../db/schema";
import { authenticate } from "../middleware/auth";
import { PLAN_LIMITS } from "../middleware/usage";
import { readBillingUsage } from "../../services/billing/usage-report";

export function registerBillingRoutes(app: Express) {
  app.get('/api/public/plans', async (_req, res) => {
    try {
      const publicPlans = await db.select({
        id: plans.id, name: plans.name, monthlyPrice: plans.monthlyPrice,
        monthlyQuoteLimit: plans.monthlyQuoteLimit, monthlyIfcLimit: plans.monthlyIfcLimit,
        ifcMaxFileMb: plans.ifcMaxFileMb, ifcMaxConcurrent: plans.ifcMaxConcurrent,
        isActive: plans.isActive, isPublished: plans.isPublished, isFeatured: plans.isFeatured,
        displayOrder: plans.displayOrder, marketingBadge: plans.marketingBadge,
        marketingDescription: plans.marketingDescription,
      }).from(plans).where(and(eq(plans.isActive, true), eq(plans.isPublished, true)))
        .orderBy(asc(plans.displayOrder), asc(plans.monthlyPrice), asc(plans.name));
      return res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300').json(publicPlans);
    } catch {
      return res.status(503).json({ error: 'Paket kataloğu geçici olarak kullanılamıyor.' });
    }
  });

  app.get("/api/billing/subscription", authenticate, async (req, res) => {
    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.companyId, req.user.companyId) });
    res.json(sub);
  });

  app.get("/api/billing/plans", (req, res) => {
    res.json(PLAN_LIMITS);
  });

  app.get("/api/billing/usage-stats", authenticate, async (req, res) => {
    try {
      res.json(await readBillingUsage(req.user.companyId));
    } catch (error) {
      res.status(503).json({ error: "Failed to fetch usage stats", code: "BILLING_USAGE_UNAVAILABLE" });
    }
  });

  app.get("/api/billing/alerts", authenticate, async (req, res) => {
    const alerts = await db.select().from(usageAlerts).where(eq(usageAlerts.companyId, req.user.companyId)).orderBy(desc(usageAlerts.createdAt)).limit(10);
    res.json(alerts);
  });
}
