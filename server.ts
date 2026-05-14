import express, { Request } from "express";
import path from "path";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        companyId: string;
        role: string;
        email: string;
      };
    }
  }
}

import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { db } from "./src/db";
import { clients, quotations, quotationItems, regulationAlerts, companies, invitations, users, industries, companyIndustrySettings, quotationFinancials, costComponents, leads, deals, activities } from "./src/db/schema";
import { sql, eq, desc, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import { generateQuotationPdf } from "./src/services/pdf/generate";
import { AIService } from "./src/services/ai/aiService";
import { RegulatoryIntelligenceService } from "./src/services/regulations/regulatoryService";
import { registry } from "./src/lib/plugins/registry";
import { ProfitService } from "./src/services/financials/profitService";
import { CRMIntelligenceService } from "./src/services/crm/crmService";
import { AuthService } from "./src/services/auth/authService";
import { memberships, subscriptions, usageLogs, usageAlerts } from "./src/db/schema";

dotenv.config();

// SaaS Middleware
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const decoded = AuthService.verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  req.user = decoded;
  next();
};

const checkRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }
  next();
};

const PLAN_LIMITS = {
  starter: {
    AI_QUOTATION_GENERATED: 20,
    PDF_GENERATED: 20,
    QUOTATION_CREATED: 20,
    CRM_ACTION_EXECUTED: 100,
    REGULATION_CHECK_RUN: 50,
    PROFIT_ANALYSIS_RUN: 50
  },
  pro: {
    AI_QUOTATION_GENERATED: 500,
    PDF_GENERATED: 999999,
    QUOTATION_CREATED: 5000,
    CRM_ACTION_EXECUTED: 50000,
    REGULATION_CHECK_RUN: 1000,
    PROFIT_ANALYSIS_RUN: 1000
  },
  elite: {
    AI_QUOTATION_GENERATED: 5000,
    PDF_GENERATED: 999999,
    QUOTATION_CREATED: 999999,
    CRM_ACTION_EXECUTED: 999999,
    REGULATION_CHECK_RUN: 5000,
    PROFIT_ANALYSIS_RUN: 5000
  },
  enterprise: {
    AI_QUOTATION_GENERATED: 999999,
    PDF_GENERATED: 999999,
    QUOTATION_CREATED: 999999,
    CRM_ACTION_EXECUTED: 999999,
    REGULATION_CHECK_RUN: 999999,
    PROFIT_ANALYSIS_RUN: 999999
  }
};

const usageTracker = (feature: string) => async (req: any, res: any, next: any) => {
  try {
    const { companyId, userId } = req.user;
    
    // Check limits
    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.companyId, companyId) });
    const plan = (sub?.plan || "starter") as keyof typeof PLAN_LIMITS;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const usage = await db.select({ count: sql<number>`sum(${usageLogs.count})` })
      .from(usageLogs)
      .where(and(
        eq(usageLogs.companyId, companyId),
        eq(usageLogs.feature, feature),
        sql`${usageLogs.date} >= ${startOfMonth}`
      ));

    const currentCount = Number(usage[0]?.count || 0);

    // Hard limit enforcement
    const limit = PLAN_LIMITS[plan][feature as keyof typeof PLAN_LIMITS['starter']];
    if (currentCount >= limit) {
      return res.status(403).json({ 
        error: "Quota Exceeded", 
        message: `Monthly ${feature} limit reached for ${plan.toUpperCase()} plan. Please upgrade to continue.`,
        limit,
        current: currentCount
      });
    }

    // Usage-80 Alert check
    if (currentCount >= limit * 0.8 && currentCount < limit * 0.82) {
      // Just a simple way to trigger once around 80%
      await db.insert(usageAlerts).values({
        companyId,
        type: "quota_80",
        message: `Your ${feature} usage has reached 80% of your current plan limit.`
      }).onConflictDoNothing();
    }

        // Log usage after request completes successfully
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Estimate cost
        let costEstimate = "0";
        switch (feature) {
          case "AI_QUOTATION_GENERATED": costEstimate = "0.05"; break;
          case "PDF_GENERATED": costEstimate = "0.01"; break;
          case "QUOTATION_CREATED": costEstimate = "0.005"; break;
          case "CRM_ACTION_EXECUTED": costEstimate = "0.002"; break;
          case "REGULATION_CHECK_RUN": costEstimate = "0.01"; break;
          case "PROFIT_ANALYSIS_RUN": costEstimate = "0.02"; break;
        }

        await db.insert(usageLogs).values({
          companyId,
          userId,
          feature,
          count: 1,
          costEstimate
        });
      }
    });

    next();
  } catch (error) {
    next();
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Setup
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const aiService = new AIService(process.env.GEMINI_API_KEY || "");
  const regulatoryService = new RegulatoryIntelligenceService(process.env.GEMINI_API_KEY || "");
  const profitService = new ProfitService(process.env.GEMINI_API_KEY || "");
  const crmService = new CRMIntelligenceService(process.env.GEMINI_API_KEY || "");

  // API routes go here FIRST
  app.get("/api/health", async (req, res) => {
    try {
      const dbCheck = await db.select({ val: sql`1` });
      res.json({ status: "ok", db: "connected", dbCheck, env: { hasDbUrl: !!process.env.DATABASE_URL } });
    } catch (error: any) {
      res.status(500).json({ status: "error", db: "failed", error: error.message });
    }
  });

  // SaaS Auth Endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, companyName } = req.body;
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(400).json({ error: "User already exists" });

      const [company] = await db.insert(companies).values({ name: companyName }).returning();
      const passwordHash = await AuthService.hashPassword(password);
      const [user] = await db.insert(users).values({ email, fullName, passwordHash }).returning();
      
      await db.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
      await db.insert(subscriptions).values({ companyId: company.id, plan: "starter" });

      const token = AuthService.generateToken({ userId: user.id, companyId: company.id, role: "owner" });
      res.json({ token, user, company });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !(await AuthService.comparePassword(password, user.passwordHash || ""))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, user.id));
      const company = membership ? await db.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }) : null;

      const token = AuthService.generateToken({ 
        userId: user.id, 
        companyId: membership?.companyId || null, 
        role: membership?.role || null 
      });

      res.json({ token, user, company, role: membership?.role });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.user.userId) });
      const [membership] = await db.select().from(memberships).where(eq(memberships.userId, req.user.userId));
      const company = membership ? await db.query.companies.findFirst({ where: eq(companies.id, membership.companyId) }) : null;
      res.json({ user, company, role: membership?.role });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Billing & Usage
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

  app.get("/api/company/team", authenticate, async (req, res) => {
    const members = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.companyId, req.user.companyId));
    
    res.json(members);
  });

  // Protected Business Routes
  // (Middleware will be applied to groups of routes below)

  // CRM API
  app.get("/api/crm/pipeline", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const allDeals = await db.select().from(deals).where(eq(deals.companyId, companyId)).orderBy(desc(deals.createdAt));
      res.json(allDeals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pipeline" });
    }
  });

  app.post("/api/crm/leads", authenticate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
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

  app.post("/api/crm/activities", authenticate, async (req, res) => {
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

  app.post("/api/crm/deals/update-stage", authenticate, async (req, res) => {
    try {
      const { dealId, stage } = req.body;
      const [updatedDeal] = await db.update(deals)
        .set({ stage, updatedAt: new Date() })
        .where(and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId)))
        .returning();
      
      // Log activity
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

  app.post("/api/crm/analyze-deal", authenticate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const { dealId } = req.body;
      const deal = await db.query.deals.findFirst({
        where: and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId))
      });
      if (!deal || !deal.quotationId) return res.status(404).json({ error: "Deal or Quotation not found" });

      const quote = await db.query.quotations.findFirst({
        where: eq(quotations.id, deal.quotationId),
      });
      const qItems = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, deal.quotationId));
      const financials = await db.query.quotationFinancials.findFirst({
        where: eq(quotationFinancials.quotationId, deal.quotationId)
      });

      const analysis = await crmService.analyzeDeal(deal, { ...quote, items: qItems }, financials);
      
      // Update deal with insights
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

  // Regulatory Intelligence
  app.get("/api/regulations/alerts", authenticate, async (req, res) => {
    try {
      const alerts = await db.select().from(regulationAlerts).orderBy(desc(regulationAlerts.createdAt));
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/regulations/sync", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const newAlerts = await regulatoryService.crawlAndAnalyze();
      
      if (newAlerts && newAlerts.length > 0) {
        const formattedAlerts = newAlerts.map(a => ({
          ...a,
          effectiveDate: new Date(a.effectiveDate),
        }));
        await db.insert(regulationAlerts).values(formattedAlerts);
      }
      
      res.json({ message: "Sync successful", count: newAlerts.length });
    } catch (error) {
      console.error("Regulatory sync failed:", error);
      res.status(500).json({ error: "Failed to sync regulations" });
    }
  });

  app.post("/api/regulations/check-impact", authenticate, usageTracker("REGULATION_CHECK_RUN"), async (req, res) => {
    try {
      const { quotationId, alertId } = req.body;
      
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      const alert = await db.query.regulationAlerts.findFirst({
        where: eq(regulationAlerts.id, alertId),
      });

      if (!quote || !alert) return res.status(404).json({ error: "Quote or Alert not found" });

      const impact = await regulatoryService.checkQuotationImpact(quote, alert as any);
      res.json(impact);
    } catch (error) {
      res.status(500).json({ error: "Impact analysis failed" });
    }
  });

  // Financial Intelligence
  app.post("/api/profit/calculate", authenticate, usageTracker("PROFIT_ANALYSIS_RUN"), async (req, res) => {
    try {
      const { quotationId } = req.body;
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      // In a real app we'd join items. For simplicity here let's fetch items separately if needed
      const items = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, req.user.companyId)));

      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const analysis = await profitService.analyzeProfitability(items, quote.industryId || "residential", quote.currency);
      
      // Save/Update Financials
      await db.insert(quotationFinancials).values({
        quotationId,
        totalCost: analysis.totalCost.toString(),
        totalPrice: analysis.totalPrice.toString(),
        profit: analysis.profit.toString(),
        margin: analysis.margin.toFixed(2),
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
      }).onConflictDoUpdate({
        target: quotationFinancials.quotationId,
        set: {
          totalCost: analysis.totalCost.toString(),
          totalPrice: analysis.totalPrice.toString(),
          profit: analysis.profit.toString(),
          margin: analysis.margin.toFixed(2),
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          updatedAt: new Date()
        }
      });

      // Save/Update Components
      await db.insert(costComponents).values({
        quotationId,
        materialCost: analysis.costBreakdown.material.toString(),
        laborCost: analysis.costBreakdown.labor.toString(),
        logisticsCost: analysis.costBreakdown.logistics.toString(),
        subcontractorCost: analysis.costBreakdown.subcontractor.toString(),
        overheadCost: analysis.costBreakdown.overhead.toString(),
      }).onConflictDoUpdate({
        target: costComponents.quotationId,
        set: {
          materialCost: analysis.costBreakdown.material.toString(),
          laborCost: analysis.costBreakdown.labor.toString(),
          logisticsCost: analysis.costBreakdown.logistics.toString(),
          subcontractorCost: analysis.costBreakdown.subcontractor.toString(),
          overheadCost: analysis.costBreakdown.overhead.toString(),
        }
      });

      res.json(analysis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Financial analysis failed" });
    }
  });

  app.get("/api/profit/report/:quotationId", authenticate, async (req, res) => {
    try {
      const { quotationId } = req.params;
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const financials = await db.query.quotationFinancials.findFirst({
        where: eq(quotationFinancials.quotationId, quotationId)
      });
      const components = await db.query.costComponents.findFirst({
        where: eq(costComponents.quotationId, quotationId)
      });
      res.json({ financials, components });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // Industry Plugins Registry & Settings
  app.get("/api/ai/industries", authenticate, (req, res) => {
    res.json(registry.listIndustries());
  });

  app.get("/api/company/industry-settings", authenticate, async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const settings = await db.select().from(companyIndustrySettings)
        .where(eq(companyIndustrySettings.companyId, companyId));
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industry settings" });
    }
  });

  app.post("/api/company/industry-settings", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const { industryId, isEnabled } = req.body;
      const companyId = req.user.companyId;
      
      await db.insert(companyIndustrySettings)
        .values({ companyId, industryId, isEnabled })
        .onConflictDoUpdate({
          target: [companyIndustrySettings.companyId, companyIndustrySettings.industryId],
          set: { isEnabled }
        });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update industry settings" });
    }
  });

  app.post("/api/ai/detect-industry", authenticate, async (req, res) => {
    try {
      const { description } = req.body;
      const industryId = await aiService.detectIndustry(description);
      res.json({ industryId });
    } catch (error) {
      res.status(500).json({ error: "Industry detection failed" });
    }
  });

  app.post("/api/ai/generate-quotation", authenticate, usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    try {
      const { description, industryId } = req.body;
      const result = await aiService.generateQuotation(description, industryId);
      res.json(result);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "AI Generation failed" });
    }
  });

  app.post("/api/ai/improve-quotation", async (req, res) => {
    try {
      const { items, instructions } = req.body;
      const improvedItems = await aiService.improveQuotation(items, instructions);
      res.json(improvedItems);
    } catch (error) {
      res.status(500).json({ error: "Improvement failed" });
    }
  });

  // Companies
  app.get("/api/company", async (req, res) => {
    try {
      const company = await db.query.companies.findFirst();
      res.json(company || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  // Clients
  app.get("/api/clients", authenticate, async (req, res) => {
    try {
      const allClients = await db.select().from(clients).where(eq(clients.companyId, req.user.companyId)).orderBy(desc(clients.createdAt));
      res.json(allClients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authenticate, async (req, res) => {
    try {
      const data = { ...req.body, companyId: req.user.companyId };
      const newClient = await db.insert(clients).values(data).returning();
      res.json(newClient[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Quotations
  app.get("/api/quotations", authenticate, async (req, res) => {
    try {
      const allQuotes = await db.select()
        .from(quotations)
        .where(and(eq(quotations.isLatest, true), eq(quotations.companyId, req.user.companyId)))
        .orderBy(desc(quotations.createdAt));
      res.json(allQuotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });

      if (!quote) return res.status(404).json({ error: "Quote not found" });

      const items = await db.select()
        .from(quotationItems)
        .where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, req.user.companyId)));

      const revisions = await db.select()
        .from(quotations)
        .where(
          and(
            eq(quotations.parentId, quote.parentId || quote.id),
            eq(quotations.companyId, quote.companyId)
          )
        )
        .orderBy(desc(quotations.revisionVersion));

      res.json({ ...quote, items, revisions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotation details" });
    }
  });

  app.post("/api/quotations", authenticate, usageTracker("QUOTATION_CREATED"), async (req, res) => {
    try {
      const { items, ...quoteData } = req.body;
      
      const [newQuote] = await db.insert(quotations).values({
        ...quoteData,
        companyId: req.user.companyId,
        subtotal: String(quoteData.subtotal || 0),
        discountTotal: String(quoteData.discountTotal || 0),
        vatTotal: String(quoteData.vatTotal || 0),
        grandTotal: String(quoteData.grandTotal || 0),
        date: new Date(quoteData.date),
        expiryDate: new Date(quoteData.expiryDate),
        revisionVersion: 1,
        isLatest: true
      }).returning();

      if (items && items.length > 0) {
        const itemsWithExtras = items.map((item: any) => ({
          ...item,
          quotationId: newQuote.id,
          companyId: newQuote.companyId,
          quantity: String(item.quantity || 0),
          unitPrice: String(item.unitPrice || 0),
          discountPercent: String(item.discountPercent || 0),
          vatPercent: String(item.vatPercent || 20),
          total: String(item.total || 0),
        }));
        await db.insert(quotationItems).values(itemsWithExtras);
      }

      res.json(newQuote);
    } catch (error) {
      console.error("Quote creation error:", error);
      res.status(500).json({ error: "Failed to create quotation" });
    }
  });

  app.post("/api/quotations/:id/revision", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      
      const original = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });

      if (!original) return res.status(404).json({ error: "Original quote not found" });

      const originalItems = await db.select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, id));

      await db.update(quotations)
        .set({ isLatest: false })
        .where(and(
          eq(quotations.parentId, original.parentId || original.id),
          eq(quotations.companyId, req.user.companyId)
        ));

      const [newQuote] = await db.insert(quotations).values({
        ...original,
        id: undefined,
        parentId: original.parentId || original.id,
        revisionVersion: original.revisionVersion + 1,
        isLatest: true,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any).returning();

      // 5. Clone items
      if (originalItems.length > 0) {
        const clonedItems = originalItems.map(item => ({
          ...item,
          id: undefined,
          quotationId: newQuote.id,
        }));
        await db.insert(quotationItems).values(clonedItems);
      }

      res.json(newQuote);
    } catch (error) {
      console.error("Revision error:", error);
      res.status(500).json({ error: "Failed to create revision" });
    }
  });

  app.patch("/api/quotations/:id/status", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const [updated] = await db.update(quotations)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)))
        .returning();
      
      if (!updated) return res.status(404).json({ error: "Quotation not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // AI Quote Generation Proxy
  app.post("/api/ai/generate-quote", async (req, res) => {
    try {
      const { description } = req.body;
      const prompt = `Sen bir inşaat uzmanısın. Aşağıdaki açıklamayı yapılandırılmış bir inşaat kalemleri listesine dönüştür.
      Birimler, miktarlar ve birim fiyatlar tahmini olsun. Birim fiyatlar 2024-2025 Türkiye güncel inşaat malzeme ve işçilik piyasa ortalamalarına dayansın.
      Açıklama: "${description}"
      Yanıtı şu anahtarlara sahip bir JSON dizisi olarak döndür: description, unit, quantity, unitPrice.
      Fiyatı tahmin edemediğin kalemler için unitPrice değerini 0 döndür.
      Örnek: [{"description": "Hafriyat", "unit": "m3", "quantity": 100, "unitPrice": 150}]`;

      const response = await ai.getGenerativeModel({
        model: "gemini-1.5-flash",
      }).generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.response.text() || "[]"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate quote" });
    }
  });

  // PDF Generation for Quotations
  app.get("/api/quotations/:id/pdf", authenticate, usageTracker("PDF_GENERATED"), async (req, res) => {
    try {
      const { id } = req.params;
      const { templateId } = req.query;

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const pdfBuffer = await generateQuotationPdf(id, templateId as string);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=teklif-${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Invitations
  app.get("/api/invitations", authenticate, async (req, res) => {
    try {
      const invites = await db.select().from(invitations).where(eq(invitations.companyId, req.user.companyId)).orderBy(desc(invitations.createdAt));
      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.post("/api/invitations", authenticate, checkRole(["owner", "admin"]), async (req, res) => {
    try {
      const { email, role } = req.body;
      const companyId = req.user.companyId;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [newInvite] = await db.insert(invitations).values({
        companyId,
        email,
        role: role || "viewer",
        token,
        invitedBy: req.user.userId,
        expiresAt,
      } as any).returning();

      console.log(`Invitation link: http://0.0.0.0:3000/accept-invite/${token}`);
      res.json(newInvite);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), eq(invitations.acceptedAt, null))
      });

      if (!invite || new Date() > new Date(invite.expiresAt)) {
        return res.status(404).json({ error: "Invalid or expired invitation" });
      }

      res.json(invite);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify invitation" });
    }
  });

  app.post("/api/invitations/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const { fullName } = req.body;

      const invite = await db.query.invitations.findFirst({
        where: and(eq(invitations.token, token), eq(invitations.acceptedAt, null))
      });

      if (!invite || new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ error: "Invalid or expired invitation" });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");

      const [newUser] = await db.insert(users).values({
        email: invite.email,
        fullName,
        verificationToken,
        emailVerified: null,
      } as any).returning();

      await db.update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));

      console.log(`Verification link: http://0.0.0.0:3000/verify-email/${verificationToken}`);

      res.json(newUser);
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const user = await db.query.users.findFirst({
        where: eq(users.verificationToken, token)
      });

      if (!user) {
        return res.status(404).json({ error: "Invalid verification token" });
      }

      await db.update(users)
        .set({ 
          emailVerified: new Date(),
          verificationToken: null 
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Email successfully verified!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    
    // Basic seeding if empty
    try {
      const existingCompany = await db.query.companies.findFirst();
      if (!existingCompany) {
        console.log("Seeding initial company and admin...");
        const [company] = await db.insert(companies).values({
          name: "TeklifPro Demo Şirketi",
          defaultCurrency: "TRY",
        }).returning();
        
        const passwordHash = await AuthService.hashPassword("admin123");
        const [user] = await db.insert(users).values({
          email: "admin@teklifpro.ai",
          fullName: "Admin Kullanıcı",
          passwordHash
        }).returning();

        await db.insert(memberships).values({
          userId: user.id,
          companyId: company.id,
          role: "owner",
        });
      }
    } catch (err) {
      console.error("Seeding failed (this is expected if DB is not provisioned yet):", err);
    }
  });
}

startServer();

