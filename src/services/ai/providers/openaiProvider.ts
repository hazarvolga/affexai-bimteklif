import { AIProvider, AIQuotationInput, AIQuotationResult, buildQuotationPrompt, extractJsonObject } from "./types";

interface OpenAIChatCompletion {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  constructor(
    private apiKey: string | undefined,
    private model = process.env.OPENAI_MODEL || "gpt-4o-mini"
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async generateQuotation(input: AIQuotationInput): Promise<AIQuotationResult> {
    const content = await this.createJsonCompletion(buildQuotationPrompt(input));
    return JSON.parse(extractJsonObject(content)) as AIQuotationResult;
  }

  async improveQuotation(items: any[], instructions: string): Promise<any[]> {
    const content = await this.createJsonCompletion(`
      Aşağıdaki inşaat teklif kalemlerini, verilen talimatlara göre iyileştir veya güncelle.
      Mevcut Kalemler: ${JSON.stringify(items)}
      Talimat: "${instructions}"

      Sadece güncellenmiş kalemler listesini JSON dizisi olarak döndür: [{description, unit, quantity, unitPrice}]
    `);

    return JSON.parse(extractJsonObject(content));
  }

  private async createJsonCompletion(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are TeklifPro's structured quotation assistant. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorBody.slice(0, 160)}`);
    }

    const data = await response.json() as OpenAIChatCompletion;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty response");

    return content;
  }
}
