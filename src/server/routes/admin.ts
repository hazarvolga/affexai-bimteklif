import type { Express } from "express";
import { authenticate, checkSuperAdmin } from "../middleware/auth";
import { db } from "../../db";
import { plans } from "../../db/schema";
import { sql } from "drizzle-orm";
import { z } from 'zod';
import { createPlanInput, updatePlanInput, updateSubscriptionInput } from '../admin/input';
import { AdminChangeError, createPlan, updatePlan, updateSubscription } from '../admin/changes';
import { readAdminTenants } from '../admin/stats';

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
      const statusCounts = tenantsRes.rows.reduce((acc: any, row: any) => {
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
      const planDistribution = mrrRes.rows.map((row: any) => {
        const count = Number(row.active_count);
        const price = Number(row.monthly_price);
        totalMRR += (count * price);
        return { name: row.name, count };
      });

      // Bu ayki toplam teklif sayısı (usage_records üzerinden, mevcut ay formatı YYYY-MM)
      const usageRes = await db.execute(sql`
        SELECT SUM(quote_count) as total_quotes FROM usage_records
        WHERE period = to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM')
      `);
      const totalQuotesThisMonth = Number(usageRes.rows[0]?.total_quotes || 0);

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
      return res.json(await readAdminTenants());
    } catch (error) {
      return res.status(503).json({ error: 'Tenant quota stats unavailable' });
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
      const input = createPlanInput.safeParse(req.body);
      if (!input.success) return res.status(400).json({ error: 'Invalid plan fields' });
      const newPlan = await createPlan(req.user.userId, input.data);
      return res.status(201).json(newPlan);
    } catch (error) {
      return res.status(500).json({ error: "Plan creation failed." });
    }
  });

  // Update a plan
  app.patch("/api/admin/plans/:id", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const input = updatePlanInput.safeParse(req.body);
      if (!input.success || !z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid plan fields' });
      const updatedPlan = await updatePlan(req.user.userId, req.params.id, input.data);
      return res.json(updatedPlan);
    } catch (error) {
      if (error instanceof AdminChangeError) return res.status(error.status).json({ error: error.message });
      return res.status(500).json({ error: "Plan update failed." });
    }
  });

  // Update tenant subscription (plan, status, bonus quote limit)
  app.patch("/api/admin/tenants/:companyId", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const input = updateSubscriptionInput.safeParse(req.body);
      if (!input.success || !z.string().uuid().safeParse(req.params.companyId).success) return res.status(400).json({ error: 'Invalid subscription fields' });
      await updateSubscription(req.user.userId, req.params.companyId, input.data);
      
      return res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminChangeError) return res.status(error.status).json({ error: error.message });
      return res.status(500).json({ error: "Tenant update failed." });
    }
  });
}
