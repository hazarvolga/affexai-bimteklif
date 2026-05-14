import type { Express } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { subscriptions, usageAlerts, usageLogs } from "../../db/schema";
import { authenticate } from "../middleware/auth";
import { PLAN_LIMITS } from "../middleware/usage";

export function registerBillingRoutes(app: Express) {
  app.get("/api/billing/subscription", authenticate, async (req, res) => {
    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.companyId, req.user.companyId) });
    res.json(sub);
  });

  app.get("/api/billing/plans", (req, res) => {
    res.json(PLAN_LIMITS);
  });

  app.get("/api/billing/usage-stats", authenticate, async (req, res) => {
    try {
      const { companyId } = req.user;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = await db.select({
        feature: usageLogs.feature,
        currentCount: sql<number>`sum(${usageLogs.count})`,
        totalCost: sql<number>`sum(${usageLogs.costEstimate})`,
      })
      .from(usageLogs)
      .where(and(
        eq(usageLogs.companyId, companyId),
        sql`${usageLogs.date} >= ${startOfMonth}`
      ))
      .groupBy(usageLogs.feature);

      const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.companyId, companyId) });
      const plan = (sub?.plan || "starter") as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[plan];

      const report = Object.keys(limits).map(feature => {
        const stat = stats.find(s => s.feature === feature);
        return {
          feature,
          current: Number(stat?.currentCount || 0),
          limit: limits[feature as keyof typeof limits],
          cost: Number(stat?.totalCost || 0),
        };
      });

      res.json({
        plan,
        usage: report,
        totalMonthlyCost: report.reduce((acc, curr) => acc + curr.cost, 0),
        period: {
          start: startOfMonth,
          end: now
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/billing/alerts", authenticate, async (req, res) => {
    const alerts = await db.select().from(usageAlerts).where(eq(usageAlerts.companyId, req.user.companyId)).orderBy(desc(usageAlerts.createdAt)).limit(10);
    res.json(alerts);
  });
}
