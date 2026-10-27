import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { registry } from "../../lib/plugins/registry";
import { AIService } from "../../services/ai/aiService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";
import { consumeRateLimit } from "../auth/security";

const detectIndustrySchema = z.object({
  description: z.string().min(1).max(4096),
});

const generateQuotationSchema = z.object({
  description: z.string().min(1).max(4096),
  industryId: z.string().max(64).optional(),
});

const improveQuotationSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())).max(200),
  instructions: z.string().min(1).max(2048),
});

const validateBeforeReservation = (schema: z.ZodTypeAny): RequestHandler => (req, res, next) => {
  if (!schema.safeParse(req.body).success) return res.status(400).json({ error: 'Geçersiz AI isteği.' });
  next();
};

export function registerAiRoutes(app: Express, aiService: AIService, canMutate: any) {
  const aiRateLimit = async (req: any, res: any, next: any) => {
    const result = await consumeRateLimit(`ai:${req.user.companyId}:${req.user.userId}`, 30, 60_000);
    if (!result.allowed) {
      return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla AI isteği. Lütfen biraz bekleyin." });
    }
    next();
  };

  app.get("/api/ai/industries", authenticate, (req, res) => {
    const configured = typeof aiService.isConfigured === "function" ? aiService.isConfigured() : false;
    res.set("X-AI-Configured", configured ? "true" : "false");
    res.json(registry.listIndustries());
  });

  app.get("/api/ai/status", authenticate, (req, res) => {
    const configured = typeof aiService.isConfigured === "function" ? aiService.isConfigured() : false;
    res.json({
      configured,
      mode: configured ? "live_ai" : "template_and_excel_only",
    });
  });

  app.post("/api/ai/detect-industry", authenticate, aiRateLimit, canMutate, async (req, res) => {
    const parsed = detectIndustrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz veya 4096 karakterden uzun açıklama." });
    try {
      const { description } = parsed.data;
      const industryId = await aiService.detectIndustry(description);
      res.json({ industryId });
    } catch (error) {
      res.status(500).json({ error: "Industry detection failed" });
    }
  });

  app.post("/api/ai/generate-quotation", authenticate, aiRateLimit, canMutate, validateBeforeReservation(generateQuotationSchema), usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    const parsed = generateQuotationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz veya 4096 karakterden uzun açıklama." });
    try {
      const { description, industryId } = parsed.data;
      const result = await aiService.generateQuotation(description, industryId);
      res.json({
        ...result,
        sourceStatus: "ai_estimate",
        authorityStatus: "non_authoritative",
        lineItems: result.lineItems.map((item) => ({
          ...item,
          quantitySource: "ai_estimate",
          unitPriceSource: "ai_estimate",
        })),
      });
    } catch (error) {
      console.error("AI Generation Error:", error);
      const configured = typeof aiService.isConfigured === "function" ? aiService.isConfigured() : true;
      res.status(500).json({
        error: configured
          ? "AI Generation failed"
          : "Sunucuda aktif AI sağlayıcısı (GEMINI_API_KEY / OPENAI_API_KEY) tanımlı değil. Excel/CSV içe aktarma veya Demo Şablon ile devam edebilirsiniz.",
        code: configured ? "AI_GENERATION_FAILED" : "AI_PROVIDER_NOT_CONFIGURED",
      });
    }
  });

  app.post("/api/ai/improve-quotation", authenticate, aiRateLimit, canMutate, validateBeforeReservation(improveQuotationSchema), usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    const parsed = improveQuotationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz kalemler (maks 200) veya 2048 karakterden uzun talimat." });
    try {
      const { items, instructions } = parsed.data;
      const improvedItems = await aiService.improveQuotation(items, instructions);
      res.json(improvedItems);
    } catch (error) {
      res.status(500).json({ error: "Improvement failed" });
    }
  });

  app.post("/api/ai/generate-quote", authenticate, aiRateLimit, canMutate, validateBeforeReservation(detectIndustrySchema), usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    const parsed = detectIndustrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz veya 4096 karakterden uzun açıklama." });
    try {
      const { description } = parsed.data;
      const quotation = await aiService.generateQuotation(description, "residential");
      res.json(quotation.lineItems);
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate quote" });
    }
  });
}

