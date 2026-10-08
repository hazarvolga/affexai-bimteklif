import type { Express } from "express";
import { authenticate, checkSuperAdmin } from "../middleware/auth";
import { db } from "../../db";
import { companies, subscriptions, plans, users, memberships, usageRecords } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export function registerAdminRoutes(app: Express) {
  // 1. Dashboard Metrics
  app.get("/api/admin/dashboard", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      // Toplam tenant sayısı (aktif/askıda vb.)
      const tenantsRes = await db.execute(sql`
        SELECT s.status, COUNT(c.id) as count
        FROM companies c
        LEFT JOIN subscriptions s ON s.company_id = c.id
        GROUP BY s.status
      `);
      const statusCounts = (tenantsRes.rows || tenantsRes).reduce((acc: any, row: any) => {
        acc[row.status || 'unknown'] = Number(row.count);
        return acc;
      }, {});
      const totalTenants = Object.values(statusCounts).reduce((a: any, b: any) => a + b, 0);

      // MRR ve Paket Dağılımı
      const mrrRes = await db.execute(sql`
        SELECT p.name, p.monthly_price, COUNT(s.id) as active_count
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'active'
        GROUP BY p.name, p.monthly_price
      `);
      
      let totalMRR = 0;
      const planDistribution = (mrrRes.rows || mrrRes).map((row: any) => {
        const count = Number(row.active_count);
        const price = Number(row.monthly_price);
        totalMRR += (count * price);
        return { name: row.name, count };
      });

      // Bu ayki toplam teklif sayısı (usage_records üzerinden, mevcut ay formatı YYYY-MM)
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const usageRes = await db.execute(sql`
        SELECT SUM(quote_count) as total_quotes FROM usage_records WHERE period = ${currentPeriod}
      `);
      const totalQuotesThisMonth = Number((usageRes.rows || usageRes)[0]?.total_quotes || 0);

      return res.json({
        totalTenants,
        statusCounts,
        totalMRR,
        planDistribution,
        totalQuotesThisMonth,
      });
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      return res.status(500).json({ error: "Metrics fetch failed." });
    }
  });

  // Get all tenants
  app.get("/api/admin/tenants", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const tenants = await db.execute(sql`
        SELECT 
          c.id, c.name, c.created_at,
          u.email as owner_email,
          s.status as subscription_status,
          p.name as plan_name,
          p.monthly_quote_limit,
          s.bonus_quote_limit,
          s.current_period_start,
          s.current_period_end,
          COALESCE(ur.quote_count, 0) as current_usage
        FROM companies c
        LEFT JOIN subscriptions s ON s.company_id = c.id
        LEFT JOIN plans p ON p.id = s.plan_id
        LEFT JOIN memberships m ON m.company_id = c.id AND m.role = 'owner'
        LEFT JOIN users u ON u.id = m.user_id
        LEFT JOIN usage_records ur ON ur.company_id = c.id AND ur.period = to_char(CURRENT_DATE, 'YYYY-MM')
        ORDER BY c.created_at DESC
      `);
      return res.json(tenants.rows || tenants);
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

  // Update a plan
  app.patch("/api/admin/plans/:id", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, monthlyQuoteLimit, monthlyPrice, isActive } = req.body;
      const [updatedPlan] = await db.update(plans).set({
        name, monthlyQuoteLimit, monthlyPrice, isActive
      }).where(eq(plans.id, id)).returning();
      return res.json(updatedPlan);
    } catch (error) {
      return res.status(500).json({ error: "Plan update failed." });
    }
  });

  // Update tenant subscription (plan, status, bonus quote limit)
  app.patch("/api/admin/tenants/:companyId", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const { companyId } = req.params;
      const { planId, status, bonusQuoteLimit } = req.body;
      
      const [updatedSub] = await db.update(subscriptions)
        .set({
          planId: planId || null,
          status: status || 'active',
          bonusQuoteLimit: bonusQuoteLimit || 0
        })
        .where(eq(subscriptions.companyId, companyId))
        .returning();
        
      if (!updatedSub) {
        // if no subscription exists for company, create one
        await db.insert(subscriptions).values({
          companyId,
          planId: planId || null,
          status: status || 'active',
          bonusQuoteLimit: bonusQuoteLimit || 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Tenant update failed." });
    }
  });
}
