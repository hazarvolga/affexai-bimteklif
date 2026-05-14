import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { db } from "../db";
import { companies, memberships, users } from "../db/schema";
import { sql } from "drizzle-orm";
import { AIService } from "../services/ai/aiService";
import { RegulatoryIntelligenceService } from "../services/regulations/regulatoryService";
import { ProfitService } from "../services/financials/profitService";
import { CRMIntelligenceService } from "../services/crm/crmService";
import { AuthService } from "../services/auth/authService";
import { checkRole } from "./middleware/auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerBillingRoutes } from "./routes/billing";
import { registerCompanyRoutes } from "./routes/company";
import { registerCrmRoutes } from "./routes/crm";
import { registerRegulationRoutes } from "./routes/regulations";
import { registerProfitRoutes } from "./routes/profit";
import { registerAiRoutes } from "./routes/ai";
import { registerClientRoutes } from "./routes/clients";
import { registerQuotationRoutes } from "./routes/quotations";

dotenv.config({ path: ".env.local" });
dotenv.config();

const canMutate = checkRole(["owner", "admin", "manager"]);

export async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // AI service uses OpenAI when configured and falls back to Gemini.
  const aiService = new AIService({
    openAiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  });
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
  registerCrmRoutes(app, crmService, canMutate);
  registerRegulationRoutes(app, regulatoryService, canMutate);
  registerProfitRoutes(app, profitService, canMutate);
  registerAiRoutes(app, aiService, canMutate);
  registerClientRoutes(app, canMutate);
  registerQuotationRoutes(app, canMutate);

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
