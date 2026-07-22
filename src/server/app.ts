import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { db } from "../db";
import { companies, memberships, rateLimitBuckets, users } from "../db/schema";
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
import { registerPilotRoutes } from "./routes/pilot";
import { registerAcademyRoutes } from "./routes/academy";
import { registerSmartCheckRoutes } from "./routes/smartcheck";
import { assertProductionEnvironment } from "./config/production";
import { pruneExpiredRateLimits } from "./auth/security";

dotenv.config({ path: ".env.local" });
dotenv.config();

const canMutate = checkRole(["owner", "admin", "manager"]);

export async function startServer() {
  const productionConfig = assertProductionEnvironment();
  const app = express();
  app.disable('x-powered-by');
  const PORT = Number(process.env.PORT || 3000);
  if (productionConfig.trustProxyHops > 0) app.set('trust proxy', productionConfig.trustProxyHops);

  app.use(express.json({
    limit: "1mb",
    verify: (req: any, _res, buffer) => {
      if (req.originalUrl?.split("?")[0] === "/api/academy/allplan/webhooks/payment") req.rawBody = Buffer.from(buffer);
    },
  }));

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
      await db.select({ bucketKey: rateLimitBuckets.bucketKey }).from(rateLimitBuckets).limit(1);
      res.json({ status: "ok", db: "connected", dbCheck: { val: 1 }, readiness: { persistentRateLimit: true, emailDeliveryConfigured: Boolean(process.env.AUTH_EMAIL_WEBHOOK_URL), publicUrlConfigured: Boolean(process.env.PUBLIC_APP_URL) }, revision: process.env.SOURCE_COMMIT || null });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ status: "error", db: "failed" });
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
  registerPilotRoutes(app);
  registerAcademyRoutes(app);
  registerSmartCheckRoutes(app);

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled API error:", error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: "Beklenmeyen bir sunucu hatası oluştu." });
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
      await pruneExpiredRateLimits();
      if (process.env.NODE_ENV === "production") return;
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
