import { GoogleGenerativeAI } from "@google/generative-ai";

export interface DealIntelligence {
  probability: number;
  riskLevel: "low" | "medium" | "high";
  recommendedAction: string;
  expectedCloseValue: number;
  insights: string;
}

export class CRMIntelligenceService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeDeal(dealData: any, quotationData: any, financials: any): Promise<DealIntelligence> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const analysis = JSON.parse(result.response.text());
      return analysis as DealIntelligence;
    } catch (e) {
      console.error("Deal analysis failed", e);
      return {
        probability: 0.5,
        riskLevel: "medium",
        recommendedAction: "Müşteri ile iletişime geçin.",
        expectedCloseValue: Number(dealData.value || 0),
        insights: "Analiz yapılamadı, manuel kontrol önerilir."
      };
    }
  }

  async generateFollowUpMessage(dealData: any, reason: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Müşteri: ${dealData.clientName}
      Proje: ${dealData.projectName}
      Durum: ${dealData.stage}
      Neden: ${reason}
      
      Müşteriye gönderilecek profesyonel, nazik ve ikna edici bir takip (follow-up) mesajı hazırla. 
      Türkçe dilinde, inşaat sektörü jargonuna uygun olsun.
    `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      return "Profesyonel bir takip mesajı oluşturulamadı.";
    }
  }
}
