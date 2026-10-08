import type { Express } from "express";
import { authenticate, checkSuperAdmin } from "../middleware/auth";
import { db } from "../../db";
import { companies, subscriptions, plans, users, memberships } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export function registerAdminRoutes(app: Express) {
  // Get all tenants (companies with their subscriptions and plans)
  app.get("/api/admin/tenants", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      // Basic query for now
      const tenants = await db.execute(sql`
        SELECT 
          c.id, c.name,
          u.email as owner_email,
          s.status as subscription_status,
          p.name as plan_name,
          s.current_period_start,
          s.current_period_end
        FROM companies c
        LEFT JOIN subscriptions s ON s.company_id = c.id
        LEFT JOIN plans p ON p.id = s.plan_id
        LEFT JOIN memberships m ON m.company_id = c.id AND m.role = 'owner'
        LEFT JOIN users u ON u.id = m.user_id
        ORDER BY c.created_at DESC
      `);
      return res.json(tenants);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Tenants fetch failed." });
    }
  });

  // Get all plans
  app.get("/api/admin/plans", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const allPlans = await db.select().from(plans);
      return res.json(allPlans);
    } catch (error) {
      return res.status(500).json({ error: "Plans fetch failed." });
    }
  });

  // Create a plan
  app.post("/api/admin/plans", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const { name, monthlyQuoteLimit, monthlyPrice, isActive } = req.body;
      const [newPlan] = await db.insert(plans).values({
        name, monthlyQuoteLimit, monthlyPrice, isActive
      }).returning();
      return res.status(201).json(newPlan);
    } catch (error) {
      return res.status(500).json({ error: "Plan creation failed." });
    }
  });
}
