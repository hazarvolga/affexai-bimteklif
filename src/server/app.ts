import { registerPricingFileImportRoutes } from './routes/pricing-file-import';
import express from "express";
import path from "path";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { db, pool } from "../db";
import { companies, memberships, rateLimitBuckets, users } from "../db/schema";
import { sql } from "drizzle-orm";
import Layer from "express/lib/router/layer";

// Ensure Express 4 catches rejected promises from async route handlers and forwards to error middleware
// (Prevents Node 24 process crash from unhandledRejection on any database/route error)
const originalHandleRequest = (Layer as any).prototype.handle_request;
if (!(Layer as any).__asyncErrorsPatched) {
  (Layer as any).prototype.handle_request = function (req: any, res: any, next: any) {
    const fn = this.handle;
    if (fn.length > 3) {
      return originalHandleRequest.call(this, req, res, next);
    }
    try {
      const maybePromise = fn.call(this, req, res, next);
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(next);
      }
      return maybePromise;
    } catch (err) {
      next(err);
    }
  };
  (Layer as any).__asyncErrorsPatched = true;
}
import { AIService } from "../services/ai/aiService";
import { createTextProvider } from "../services/ai/providers/text-provider";
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
import { registerQuotationEditRoutes } from "./routes/quotation-edit";
import { registerPilotRoutes } from "./routes/pilot";
import { registerAdminRoutes } from "./routes/admin";
import { registerAdminLogRoutes } from "./routes/admin-logs";
import { registerAcademyRoutes } from "./routes/academy";
import { captureError, readBuildRevision } from "./observability/error-tracking";
import { canonicalHostRedirect, contentSecurityPolicy, isKnownSpaRoute, llmsFullTxt, llmsTxt, robotsTxt, securityTxt, sitemapXml } from "./security/web-hardening";
import { injectRouteMeta } from "./security/route-meta";
import { capabilitySummaryLines } from "./security/web-hardening";
import { registerIfcBrowserAnalysisRoutes } from "./routes/ifc-browser-analysis";
import { registerSmartCheckRoutes } from "./routes/smartcheck";
import { registerPricingRoutes } from "./routes/pricing";
import { registerSourceIntelligenceRoutes } from "./routes/source-intelligence";
import { registerMarketIntelligenceRoutes } from "./routes/market-intelligence";
import { registerPilotEvidenceRoutes } from "./routes/pilot-evidence";
import { registerCdeRoutes } from "./routes/cde";
import { assertProductionEnvironment, validateSmartcheckStorageEnvironment } from "./config/production";
import { validateAuthEmailEnvironment } from './auth/email-policy';
import { pruneExpiredRateLimits } from "./auth/security";
import { requestIdMiddleware } from "./logger";
import { priceSchedulerService } from "./crawler/priceSchedulerService";

dotenv.config({ path: ".env.local" });
dotenv.config();

const canMutate = checkRole(["owner", "admin", "manager"]);

export function createApiApp(options?: { configureRoutes?: (app: express.Express) => void }) {
  const productionConfig = assertProductionEnvironment();
  const app = express();
  app.disable('x-powered-by');
  if (productionConfig.trustProxyHops > 0) app.set('trust proxy', productionConfig.trustProxyHops);

  // www -> apex 301 before anything else answers (P1-4).
  if (process.env.NODE_ENV === "production") app.use(canonicalHostRedirect(process.env.PUBLIC_APP_URL));
  const csp = contentSecurityPolicy(process.env);
  const buildRevision = readBuildRevision();

  // HTTP hardening headers (SEC-08, SEC-09, OPS-10)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
    }
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      // Dev keeps Vite's inline HMR preamble working; production enforces the policy.
      res.setHeader("Content-Security-Policy", csp);
    }
    next();
  });

  app.use(requestIdMiddleware);

  const defaultJsonParser = express.json({
    limit: "1mb",
    verify: (req: any, _res, buffer) => {
      if (req.originalUrl?.split("?")[0] === "/api/academy/allplan/webhooks/payment") req.rawBody = Buffer.from(buffer);
    },
  });

  // SEC-2: Do not parse 50MB bodies before authentication; let /import-pdf authenticate first.
  app.use((req, res, next) => {
    if (/^\/api\/admin\/pricing-sources\/[^/]+\/import-pdf$/.test(req.path)) {
      return next();
    }
    return defaultJsonParser(req, res, next);
  });

  // Liveness probe (fast, no external dependencies) - OPS-12
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness probe (verifies database & storage) - OPS-12
  app.get("/readyz", async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      await db.select({ bucketKey: rateLimitBuckets.bucketKey }).from(rateLimitBuckets).limit(1);
      const storageReadiness = process.env.SMARTCHECK_IMPORT_ENABLED === "true" ? validateSmartcheckStorageEnvironment(process.env).valid : true;
      if (storageReadiness === false) {
        return res.status(503).json({ status: "error", reason: "storage_not_ready" });
      }
      res.json({ status: "ready", db: "connected", storage: storageReadiness ? "ready" : "disabled" });
    } catch (error) {
      res.status(503).json({ status: "error", db: "failed" });
    }
  });

  // AI service uses OpenAI when configured and falls back to Gemini.
  const aiService = new AIService({
    openAiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  });
  const textProvider = createTextProvider();
  const regulatoryService = new RegulatoryIntelligenceService(textProvider);
  const profitService = new ProfitService(textProvider);
  const crmService = new CRMIntelligenceService(textProvider);

  // API routes go here FIRST
  app.get("/api/health", async (req, res) => {
    try {
      await db.execute(sql`select 1`);
      await db.select({ bucketKey: rateLimitBuckets.bucketKey }).from(rateLimitBuckets).limit(1);
      const storageReadiness = process.env.SMARTCHECK_IMPORT_ENABLED === "true" ? validateSmartcheckStorageEnvironment(process.env).valid : null;
      const emailMode = process.env.AUTH_EMAIL_DELIVERY_MODE ?? 'webhook';
      const emailDeliveryConfigured = emailMode !== 'disabled'
        && validateAuthEmailEnvironment(process.env).length === 0
        && (emailMode === 'smtp' || Boolean(process.env.AUTH_EMAIL_WEBHOOK_URL));
      res.json({ status: "ok", db: "connected", dbCheck: { val: 1 }, readiness: { persistentRateLimit: true, emailDeliveryConfigured, publicUrlConfigured: Boolean(process.env.PUBLIC_APP_URL), smartcheckStorageConfigured: storageReadiness }, ...buildRevision });
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
  registerQuotationEditRoutes(app, canMutate);
  registerPilotRoutes(app);
  registerAdminRoutes(app);
  registerAdminLogRoutes(app);
  registerAcademyRoutes(app);
  registerSmartCheckRoutes(app);
  registerIfcBrowserAnalysisRoutes(app, canMutate);
  registerPricingRoutes(app);
  registerPricingFileImportRoutes(app);
  registerSourceIntelligenceRoutes(app);
  registerMarketIntelligenceRoutes(app);
  registerPilotEvidenceRoutes(app);
  registerCdeRoutes(app);

  if (options?.configureRoutes) {
    options.configureRoutes(app);
  }

  // 404 JSON fallback for any unhandled /api/* route
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "Endpoint bulunamadı." });
  });

  // Central API error handler
  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled API error:", error);
    captureError(error, { route: req.route?.path ?? req.path, method: req.method });
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: "Beklenmeyen bir sunucu hatası oluştu." });
  });

  return app;
}

export function registerProductionFrontend(app: express.Express, distPath: string) {
  app.get('/.well-known/security.txt', (_req, res) => {
    if (!process.env.PUBLIC_APP_URL) return res.status(404).end();
    res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=86400').send(securityTxt(process.env.PUBLIC_APP_URL));
  });
  // The same dist contains server/worker bundles. Never mount its root publicly.
  app.use((req, res, next) => {
    let pathname: string;
    try { pathname = decodeURIComponent(req.path); }
    catch { return res.status(400).end(); }
    if (/(^|\/)\./.test(pathname) || /\.(?:map|cjs|mjs)(?:\/|$)/i.test(pathname)) return res.status(404).end();
    next();
  });
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y', immutable: true, dotfiles: 'deny', index: false, redirect: false,
  }));
  // Vite public/ root assets are mounted explicitly rather than reopening the mixed frontend/backend dist directory.
  app.get('/favicon.svg', (_req, res) => { res.sendFile(path.join(distPath, 'favicon.svg')); });
  const appleIconFile = path.join(distPath, 'apple-touch-icon.png');
  app.get('/apple-touch-icon.png', (_req, res) => {
    if (!fs.existsSync(appleIconFile)) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=86400').sendFile(appleIconFile);
  });
  const manifestFile = path.join(distPath, 'manifest.webmanifest');
  app.get('/manifest.webmanifest', (_req, res) => {
    if (!fs.existsSync(manifestFile)) return res.status(404).end();
    res.type('application/manifest+json').set('Cache-Control', 'public, max-age=86400').sendFile(manifestFile);
  });
  const ogImageFile = path.join(distPath, 'og-image.png');
  const hasOgImage = fs.existsSync(ogImageFile);
  app.get('/og-image.png', (_req, res) => {
    if (!hasOgImage) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=86400').sendFile(ogImageFile);
  });
  app.get('/sitemap.xml', (_req, res) => {
    if (!process.env.PUBLIC_APP_URL) return res.status(404).end();
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemapXml(process.env.PUBLIC_APP_URL));
  });
  app.get('/robots.txt', (_req, res) => {
    if (!process.env.PUBLIC_APP_URL) return res.status(404).end();
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robotsTxt(process.env.PUBLIC_APP_URL));
  });
  app.get('/llms.txt', (_req, res) => {
    if (!process.env.PUBLIC_APP_URL) return res.status(404).end();
    res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(llmsTxt(process.env.PUBLIC_APP_URL));
  });
  app.get('/llms-full.txt', (_req, res) => {
    if (!process.env.PUBLIC_APP_URL) return res.status(404).end();
    res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(llmsFullTxt(process.env.PUBLIC_APP_URL));
  });
  const indexFile = path.join(distPath, 'index.html');
  app.get('*', (req, res) => {
    const pathname = decodeURIComponent(req.path);
    if (pathname !== '/index.html' && path.posix.extname(pathname)) return res.status(404).end();
    res.setHeader('Cache-Control', 'no-cache');
    const known = isKnownSpaRoute(pathname);
    if (!known) {
      res.status(404);
    }
    const publicUrl = process.env.PUBLIC_APP_URL;
    if (!publicUrl) return res.sendFile(indexFile);
    // Crawlers that do not run JS still need the right <title>, description, canonical and noindex for this route.
    let html: string;
    try { html = fs.readFileSync(indexFile, 'utf8'); } catch { return res.sendFile(indexFile); }
    res.type('html').send(injectRouteMeta(html, {
      pathname: pathname === '/index.html' ? '/' : pathname,
      origin: new URL(publicUrl).origin,
      notFound: !known,
      ogImagePath: hasOgImage ? '/og-image.png' : null,
      capabilityLines: capabilitySummaryLines(),
    }));
  });
}

export async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT || 3000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    registerProductionFrontend(app, distPath);
  }

  const server = app.listen(PORT, "0.0.0.0", async () => {
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

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 300000;

  const pruneInterval = setInterval(() => {
    pruneExpiredRateLimits().catch(err => console.error("Rate limit pruning failed:", err));
  }, 3600_000);
  pruneInterval.unref();

  // Start automated nightly crawler scheduler (OPS-CRAWLER)
  priceSchedulerService.start();

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(pruneInterval);
    priceSchedulerService.stop();
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await pool.end();

        console.log("DB pool closed. Server exited.");
        process.exit(0);
      } catch (err) {
        console.error("Error during pool termination:", err);
        process.exit(1);
      }
    });
    setTimeout(() => {
      console.error("Forced exit due to shutdown timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}
