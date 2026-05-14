import { GoogleGenerativeAI } from "@google/generative-ai";

export interface RegulationAlert {
  title: string;
  category: "tax" | "labor" | "material" | "procurement" | "legal";
  effectiveDate: string;
  impactLevel: "low" | "medium" | "high";
  summary: string;
  affectedModules: string[];
  actionSuggestion: string;
}

export class RegulatoryIntelligenceService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async crawlAndAnalyze(): Promise<RegulationAlert[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Sen Türkiye inşaat sektörü için bir Mevzuat İstihbarat Uzmanısısın. 
      Resmî Gazete, GİB, SGK, KİK ve TÜİK gibi kaynaklardan gelen güncel (veya simüle edilmiş güncel) gelişmeleri analiz et.
      
      Görevin:
      1. İnşaat sektörünü doğrudan etkileyen son 3 önemli mevzuat değişikliğini veya ekonomik güncellemeyi (örn: KDV oranı, asgari ücret artışı, demir-çelik ithalat vergisi, kamu ihale kanunu değişikliği) belirle.
      2. Her biri için aşağıdaki JSON formatında yapılandırılmış veri döndür:
      
      [
        {
          "title": "Başlık (Türkçe)",
          "category": "tax|labor|material|procurement|legal",
          "effectiveDate": "YYYY-MM-DD",
          "impactLevel": "low|medium|high",
          "summary": "Teknik özet (Türkçe)",
          "affectedModules": ["residential", "electrical", "mechanical", "renovation"],
          "actionSuggestion": "Kullanıcıya önerilen aksiyon (Örn: Tekliflerdeki KDV oranını %20'ye güncelleyin)"
        }
      ]
      
      Sektör için gerçekçi ve kritik olanları seç. Sadece JSON döndür.
    `;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const alerts = JSON.parse(result.response.text());
      return alerts as RegulationAlert[];
    } catch (e) {
      console.error("Regulatory Intelligence failed", e);
      return [];
    }
  }

  async checkQuotationImpact(quotationData: any, alert: RegulationAlert): Promise<{
    impactDetected: boolean;
    reason: string;
    suggestedAdjustment: string;
  }> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Mevzuat Değişikliği: ${JSON.stringify(alert)}
      Teklif Verileri: ${JSON.stringify(quotationData)}
      
      Bu mevzuat değişikliğinin verilen teklif üzerindeki etkisini analiz et.
      Eğer etkiliyorsa (örn: Teklifteki KDV eski kalmışsa veya işçilik maliyetleri artmışsa), detaylı bir rapor ver.
      
      Çıktı JSON formatında olmalı:
      {
        "impactDetected": boolean,
        "reason": "Neden etkilendiği açıklaması",
        "suggestedAdjustment": "Yapılması gereken düzeltme önerisi"
      }
    `;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      return JSON.parse(result.response.text());
    } catch (e) {
      return { impactDetected: false, reason: "", suggestedAdjustment: "" };
    }
  }
}
