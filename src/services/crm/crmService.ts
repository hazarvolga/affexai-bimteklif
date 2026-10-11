import { GeminiProvider } from "../ai/providers/geminiProvider";
import type { TextProvider } from "../ai/providers/text-provider";
import { dealIntelligenceInput } from './input';

export interface DealIntelligence {
  probability: number;
  riskLevel: "low" | "medium" | "high";
  recommendedAction: string;
  expectedCloseValue: number;
  insights: string;
}

export class CRMIntelligenceService {
  private provider: TextProvider;

  constructor(provider: string | TextProvider) {
    this.provider = typeof provider === "string" ? new GeminiProvider(provider) : provider;
  }

  async analyzeDeal(dealData: any, quotationData: any, financials: any): Promise<DealIntelligence> {

    const prompt = `
      Sen kıdemli bir inşaat satış stratejistisin. Aşağıdaki satış fırsatı (deal) ve ilgili teklif verilerini analiz et.
      
      Deal Verileri: ${JSON.stringify(dealData)}
      Teklif Verileri: ${JSON.stringify(quotationData)}
      Finansal Analiz: ${JSON.stringify(financials)}
      
      Görevin:
      1. Satışın kapanma olasılığını (probability) 0.0 ile 1.0 arasında belirle.
      2. Risk seviyesini (low, medium, high) belirle.
      3. Satış ekibi için sıradaki en mantıklı aksiyonu (recommendedAction) öner.
      4. Stratejik öngörülerini (insights) paylaş.
      
      Çıktı JSON formatında olmalı:
      {
        "probability": number,
        "riskLevel": "low" | "medium" | "high",
        "recommendedAction": "Aksiyon açıklaması",
        "expectedCloseValue": number,
        "insights": "Detaylı AI öngörüsü"
      }
    `;

    try {
      const text = await this.provider.generateText(prompt, true);

      const resultData = dealIntelligenceInput.parse(JSON.parse(text));
      return { probability: resultData.probability, riskLevel: resultData.riskLevel,
        recommendedAction: resultData.recommendedAction, expectedCloseValue: resultData.expectedCloseValue, insights: resultData.insights };
    } catch (e) {
      throw new Error('Deal analysis unavailable', { cause: e });
    }
  }

  async generateFollowUpMessage(dealData: any, reason: string): Promise<string> {
    const prompt = `
      Müşteri: ${dealData.clientName}
      Proje: ${dealData.projectName}
      Durum: ${dealData.stage}
      Neden: ${reason}
      
      Müşteriye gönderilecek profesyonel, nazik ve ikna edici bir takip (follow-up) mesajı hazırla. 
      Türkçe dilinde, inşaat sektörü jargonuna uygun olsun.
    `;

    try {
      return await this.provider.generateText(prompt);
    } catch (e) {
      throw new Error("CRM_FOLLOWUP_UNAVAILABLE", { cause: e });
    }
  }
}
