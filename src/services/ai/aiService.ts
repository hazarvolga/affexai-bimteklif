import { GoogleGenerativeAI } from "@google/generative-ai";
import { registry } from "../../lib/plugins/registry";

export interface AIQuotationResult {
  projectType: string;
  confidence: number;
  industryId: string;
  lineItems: Array<{
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }>;
  assumptions: string[];
  riskFlags: string[];
  riskLevel: "low" | "medium" | "high";
}

export class AIService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async detectIndustry(inputText: string): Promise<string> {
    return registry.detectIndustry(inputText);
  }

  async generateQuotation(inputText: string, industryId?: string): Promise<AIQuotationResult> {
    const targetIndustryId = industryId || await this.detectIndustry(inputText);
    const plugin = registry.getIndustry(targetIndustryId) || registry.getIndustry("residential")!;
    
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      ${plugin.aiProfile.systemPrompt}
      ${plugin.aiProfile.extractionRules}
      
      Müşteri Girdisi: "${inputText}"
      Ana Maliyet Modeli: ${plugin.quotationRules.calculationModel}
      Riske Duyarlı Alanlar: ${plugin.riskRules.join(", ")}
      Varsayılan Kalemler Gerektiğinde: ${plugin.defaultLineItems.join(", ")}
      
      Görevin:
      1. Girdiyi analiz et ve yapılandırılmış bir inşaat teklifi oluştur.
      2. Eksik miktarları rasyonel şekilde tahmin et.
      3. Birim fiyatlar 2024-2025 Türkiye güncel piyasa (TL bazlı) ortalamalarına dayansın.
      4. Çıktıyı aşağıdaki JSON formatında ver:
      
      {
        "projectType": "${plugin.name} - ${targetIndustryId}",
        "confidence": 0.0-1.0_arasında_güven_skoru,
        "industryId": "${targetIndustryId}",
        "lineItems": [
          { "description": "kalem_açıklaması", "unit": "birim", "quantity": miktar, "unitPrice": birim_fiyat }
        ],
        "assumptions": ["yapılan_varsayımlar"],
        "riskFlags": ["risk_etiketleri_ör_döviz_kuru_malzeme_oynaklığı"],
        "riskLevel": "low|medium|high"
      }
      
      Sadece JSON döndür. Başka metin ekleme.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    try {
      const parsed = JSON.parse(result.response.text());
      return parsed as AIQuotationResult;
    } catch (e) {
      console.error("AI Response parsing failed", e);
      throw new Error("AI format bozuk döndürdü.");
    }
  }

  async improveQuotation(items: any[], instructions: string): Promise<any[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
