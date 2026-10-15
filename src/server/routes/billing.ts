import type { Express } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { companies, plans, subscriptions, usageAlerts } from "../../db/schema";
import { authenticate, checkRole } from "../middleware/auth";
import { PLAN_LIMITS } from "../middleware/usage";
import { readBillingUsage } from "../../services/billing/usage-report";
import {
  createInitialPaymentOrder,
  getActiveBankAccounts,
  getCompanyPaymentRequests,
  submitBankTransferInputSchema,
  submitBankTransferNotification,
} from "../../services/billing/bank-transfer";

const canManageBilling = checkRole(["owner", "admin"]);

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

  app.get("/api/public/bank-accounts", async (_req, res) => {
    try {
      const accounts = await getActiveBankAccounts();
      return res.set("Cache-Control", "public, max-age=30").json(accounts);
    } catch {
      return res.status(503).json({ error: "Banka hesap bilgileri geçici olarak kullanılamıyor." });
    }
  });

  app.get("/api/billing/bank-accounts", authenticate, async (_req, res) => {
    try {
      const accounts = await getActiveBankAccounts();
      return res.json(accounts);
    } catch {
      return res.status(503).json({ error: "Banka hesap bilgileri alınamadı." });
    }
  });

  app.get("/api/billing/subscription", authenticate, async (req, res) => {
    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.companyId, req.user.companyId) });
    res.json(sub);
  });

  app.get("/api/billing/plans", (_req, res) => {
    res.json(PLAN_LIMITS);
  });

  app.get("/api/billing/usage-stats", authenticate, async (req, res) => {
    try {
      res.json(await readBillingUsage(req.user.companyId));
    } catch {
      res.status(503).json({ error: "Failed to fetch usage stats", code: "BILLING_USAGE_UNAVAILABLE" });
    }
  });

  app.get("/api/billing/alerts", authenticate, async (req, res) => {
    const alerts = await db.select().from(usageAlerts).where(eq(usageAlerts.companyId, req.user.companyId)).orderBy(desc(usageAlerts.createdAt)).limit(10);
    res.json(alerts);
  });

  app.get("/api/billing/payment-requests", authenticate, async (req, res) => {
    try {
      const requests = await getCompanyPaymentRequests(req.user.companyId);
      return res.json(requests);
    } catch (error) {
      console.error("Failed to fetch company payment requests:", error);
      return res.status(500).json({ error: "Ödeme talepleri alınamadı." });
    }
  });

  if (typeof app.post === "function") {
    app.post("/api/billing/payment-requests/init", authenticate, canManageBilling, async (req, res) => {
      try {
        const planId = typeof req.body?.planId === "string" ? req.body.planId.trim() : "";
        if (!planId) return res.status(400).json({ error: "Paket seçimi zorunludur." });
        const existing = await getCompanyPaymentRequests(req.user.companyId);
        const awaiting = existing.find((r) => r.planId === planId && r.status === "awaiting_transfer");
        if (awaiting) {
          return res.json(awaiting);
        }
        const [company] = await db
          .select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(eq(companies.id, req.user.companyId))
          .limit(1);
        if (!company) return res.status(404).json({ error: "Şirket bulunamadı." });
        const created = await createInitialPaymentOrder({
          companyId: company.id,
          companyName: company.name,
          userId: req.user.userId,
          userEmail: req.user.email,
          planId,
        });
        if (!created) {
          return res.status(400).json({ error: "Seçilen paket için havale siparişi oluşturulamadı." });
        }
        return res.status(201).json(created);
      } catch (error) {
        console.error("Payment order init error:", error);
        return res.status(500).json({ error: "Sipariş referans kodu oluşturulamadı." });
      }
    });

    app.post("/api/billing/payment-requests", authenticate, canManageBilling, async (req, res) => {
      try {
        const parsed = submitBankTransferInputSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Lütfen gönderen adı ve dekont/işlem numarasını eksiksiz giriniz." });
        }
        const record = await submitBankTransferNotification({
          companyId: req.user.companyId,
          userId: req.user.userId,
          payload: parsed.data,
        });
        return res.status(201).json(record);
      } catch (error) {
        if (error instanceof Error && error.message === "PAID_PLAN_REQUIRED") {
          return res.status(400).json({ error: "Yalnızca ücretli paketler için havale bildirimi yapılabilir." });
        }
        console.error("Bank transfer notification error:", error);
        return res.status(500).json({ error: "Ödeme bildirimi kaydedilemedi." });
      }
    });
  }
}

