import { registry } from "../../lib/plugins/registry";
import { GeminiProvider } from "./providers/geminiProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { AIProviderRouter } from "./providers/providerRouter";
import type { AIQuotationResult } from "./providers/types";

export type { AIQuotationResult } from "./providers/types";

export class AIService {
  private providerRouter: AIProviderRouter;

  constructor(apiKeyOrOptions: string | { geminiApiKey?: string; openAiApiKey?: string } = "") {
    const options = typeof apiKeyOrOptions === "string"
      ? { geminiApiKey: apiKeyOrOptions, openAiApiKey: process.env.OPENAI_API_KEY }
      : apiKeyOrOptions;

    this.providerRouter = new AIProviderRouter([
      new OpenAIProvider(options.openAiApiKey || process.env.OPENAI_API_KEY),
      new GeminiProvider(options.geminiApiKey || process.env.GEMINI_API_KEY || ""),
    ]);
  }

  isConfigured(): boolean {
    return this.providerRouter.isConfigured();
  }

  async detectIndustry(inputText: string): Promise<string> {
    return registry.detectIndustry(inputText);
  }

  async generateQuotation(inputText: string, industryId?: string): Promise<AIQuotationResult> {
    const targetIndustryId = industryId || await this.detectIndustry(inputText);
    const plugin = registry.getIndustry(targetIndustryId) || registry.getIndustry("residential")!;

    try {
      return await this.providerRouter.generateQuotation({
        inputText,
        industryId: targetIndustryId,
        plugin,
      });
    } catch (e) {
      console.error("AI Response parsing failed", e);
      throw new Error("AI teklifi üretilemedi.");
    }
  }

  async improveQuotation(items: any[], instructions: string): Promise<any[]> {
    return this.providerRouter.improveQuotation(items, instructions);
  }
}
