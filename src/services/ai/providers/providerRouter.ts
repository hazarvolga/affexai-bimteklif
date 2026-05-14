import { AIProvider, AIQuotationInput, AIQuotationResult } from "./types";

export class AIProviderRouter implements AIProvider {
  readonly name = "router";

  constructor(private providers: AIProvider[]) {}

  isConfigured(): boolean {
    return this.providers.some((provider) => provider.isConfigured());
  }

  async generateQuotation(input: AIQuotationInput): Promise<AIQuotationResult> {
    return this.tryProviders((provider) => provider.generateQuotation(input), "generateQuotation");
  }

  async improveQuotation(items: any[], instructions: string): Promise<any[]> {
    return this.tryProviders((provider) => provider.improveQuotation(items, instructions), "improveQuotation");
  }

  private async tryProviders<T>(call: (provider: AIProvider) => Promise<T>, operation: string): Promise<T> {
    const configured = this.providers.filter((provider) => provider.isConfigured());
    if (configured.length === 0) {
      throw new Error("No AI provider is configured");
    }

    const errors: string[] = [];
    for (const provider of configured) {
      try {
        return await call(provider);
      } catch (error: any) {
        errors.push(`${provider.name}: ${error?.message || String(error)}`);
        console.warn(`AI provider ${provider.name} failed during ${operation}; trying fallback.`);
      }
    }

    throw new Error(`All AI providers failed during ${operation}: ${errors.join(" | ")}`);
  }
}
