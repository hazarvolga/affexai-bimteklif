import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, AIQuotationInput, AIQuotationResult, buildQuotationPrompt } from "./types";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private genAI: GoogleGenerativeAI;

  constructor(private apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async generateQuotation(input: AIQuotationInput): Promise<AIQuotationResult> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { timeout: 30_000 });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildQuotationPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text()) as AIQuotationResult;
  }

  async improveQuotation(items: any[], instructions: string): Promise<any[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { timeout: 30_000 });


    const prompt = `
      Aşağıdaki inşaat teklif kalemlerini, verilen talimatlara göre iyileştir veya güncelle.
      Mevcut Kalemler: ${JSON.stringify(items)}
      Talimat: "${instructions}"

      Sadece güncellenmiş kalemler listesini JSON dizisi olarak döndür: [{description, unit, quantity, unitPrice}]
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text());
  }
}
