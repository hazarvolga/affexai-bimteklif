import type { Express } from "express";
import { registry } from "../../lib/plugins/registry";
import { AIService } from "../../services/ai/aiService";
import { authenticate } from "../middleware/auth";
import { usageTracker } from "../middleware/usage";

export function registerAiRoutes(app: Express, aiService: AIService, canMutate: any) {
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

  app.post("/api/ai/generate-quote", authenticate, canMutate, usageTracker("AI_QUOTATION_GENERATED"), async (req, res) => {
    try {
      const { description } = req.body;
      const quotation = await aiService.generateQuotation(description, "residential");
      res.json(quotation.lineItems);
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate quote" });
    }
  });
}
