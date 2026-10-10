import type { Express } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { subscriptions, usageAlerts } from "../../db/schema";
import { authenticate } from "../middleware/auth";
import { PLAN_LIMITS } from "../middleware/usage";
import { readBillingUsage } from "../../services/billing/usage-report";

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
