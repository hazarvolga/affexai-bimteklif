import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { db } from "../db";
import { clients, quotations, quotationItems, regulationAlerts, companies, invitations, users, industries, companyIndustrySettings, quotationFinancials, costComponents, leads, deals, activities } from "../db/schema";
import { sql, eq, desc, and, inArray } from "drizzle-orm";
import { generateQuotationPdf } from "../services/pdf/generate";
import { AIService } from "../services/ai/aiService";
import { RegulatoryIntelligenceService } from "../services/regulations/regulatoryService";
import { registry } from "../lib/plugins/registry";
import { ProfitService } from "../services/financials/profitService";
import { CRMIntelligenceService } from "../services/crm/crmService";
import { AuthService } from "../services/auth/authService";
import { memberships, subscriptions, usageLogs, usageAlerts } from "../db/schema";
import { authenticate, checkRole } from "./middleware/auth";
import { PLAN_LIMITS, usageTracker } from "./middleware/usage";
import { registerAuthRoutes } from "./routes/auth";
import { registerBillingRoutes } from "./routes/billing";
import { registerCompanyRoutes } from "./routes/company";
import { calculateLineItemTotal, calculateQuotationTotals, normalizeLineItem } from "../lib/calculations";

dotenv.config({ path: ".env.local" });
dotenv.config();

const canMutate = checkRole(["owner", "admin", "manager"]);

export async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

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
      await db.execute(sql`select 1`);
      res.json({ status: "ok", db: "connected", dbCheck: { val: 1 }, env: { hasDbUrl: !!process.env.DATABASE_URL } });
    } catch (error: any) {
      res.status(500).json({ status: "error", db: "failed", error: error.message });
    }
  });

  registerAuthRoutes(app);
  registerBillingRoutes(app);
  registerCompanyRoutes(app);

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

  app.post("/api/crm/leads", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
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

  app.post("/api/crm/activities", authenticate, canMutate, async (req, res) => {
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

  app.post("/api/crm/deals/update-stage", authenticate, canMutate, async (req, res) => {
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

  app.post("/api/crm/analyze-deal", authenticate, canMutate, usageTracker("CRM_ACTION_EXECUTED"), async (req, res) => {
    try {
      const { dealId } = req.body;
      const deal = await db.query.deals.findFirst({
        where: and(eq(deals.id, dealId), eq(deals.companyId, req.user.companyId))
      });
      if (!deal || !deal.quotationId) return res.status(404).json({ error: "Deal or Quotation not found" });

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, deal.quotationId), eq(quotations.companyId, req.user.companyId)),
      });
      const qItems = await db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, deal.quotationId), eq(quotationItems.companyId, req.user.companyId)));
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

  app.post("/api/regulations/check-impact", authenticate, canMutate, usageTracker("REGULATION_CHECK_RUN"), async (req, res) => {
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
  app.post("/api/profit/calculate", authenticate, canMutate, usageTracker("PROFIT_ANALYSIS_RUN"), async (req, res) => {
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


  app.post("/api/ai/detect-industry", authenticate, canMutate, async (req, res) => {
    try {
      const { description } = req.body;
      const industryId = await aiService.detectIndustry(description);
      res.json({ industryId });
    } catch (error) {
      res.status(500).json({ error: "Industry detection failed" });
    }
  });

  app.post("/api/ai/generate-quotation", authenticate, canMutate, usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    try {
      const { description, industryId } = req.body;
      const result = await aiService.generateQuotation(description, industryId);
      res.json(result);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "AI Generation failed" });
    }
  });

  app.post("/api/ai/improve-quotation", authenticate, canMutate, usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    try {
      const { items, instructions } = req.body;
      const improvedItems = await aiService.improveQuotation(items, instructions);
      res.json(improvedItems);
    } catch (error) {
      res.status(500).json({ error: "Improvement failed" });
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

  app.post("/api/clients", authenticate, canMutate, async (req, res) => {
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

  app.post("/api/quotations", authenticate, canMutate, usageTracker("QUOTATION_CREATED"), async (req, res) => {
    try {
      const { items, ...quoteData } = req.body;
      const normalizedItems = Array.isArray(items)
        ? items.map((item: any) => ({
            ...item,
            ...normalizeLineItem(item),
          }))
        : [];
      const totals = calculateQuotationTotals(normalizedItems);
      
      const [newQuote] = await db.insert(quotations).values({
        ...quoteData,
        companyId: req.user.companyId,
        subtotal: String(totals.subtotal),
        discountTotal: String(totals.discountTotal),
        vatTotal: String(totals.vatTotal),
        grandTotal: String(totals.grandTotal),
        date: new Date(quoteData.date),
        expiryDate: new Date(quoteData.expiryDate),
        revisionVersion: 1,
        isLatest: true
      }).returning();

      if (normalizedItems.length > 0) {
        const itemsWithExtras = normalizedItems.map((item: any) => ({
          ...item,
          quotationId: newQuote.id,
          companyId: newQuote.companyId,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          discountPercent: String(item.discountPercent),
          vatPercent: String(item.vatPercent),
          total: String(calculateLineItemTotal(item)),
        }));
        await db.insert(quotationItems).values(itemsWithExtras);
      }

      res.json(newQuote);
    } catch (error) {
      console.error("Quote creation error:", error);
      res.status(500).json({ error: "Failed to create quotation" });
    }
  });

  app.post("/api/quotations/:id/revision", authenticate, canMutate, async (req, res) => {
    try {
      const { id } = req.params;
      
      const original = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });

      if (!original) return res.status(404).json({ error: "Original quote not found" });

      const originalItems = await db.select()
        .from(quotationItems)
        .where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, req.user.companyId)));

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

  app.patch("/api/quotations/:id/status", authenticate, canMutate, async (req, res) => {
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
  app.post("/api/ai/generate-quote", authenticate, canMutate, usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
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
  app.get("/api/quotations/:id/pdf", authenticate, canMutate, usageTracker("PDF_GENERATED"), async (req, res) => {
    try {
      const { id } = req.params;
      const { templateId } = req.query;

      const quote = await db.query.quotations.findFirst({
        where: and(eq(quotations.id, id), eq(quotations.companyId, req.user.companyId)),
      });
      if (!quote) return res.status(404).json({ error: "Quotation not found" });

      const pdfBuffer = await generateQuotationPdf(id, templateId as string, req.user.companyId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=teklif-${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
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
