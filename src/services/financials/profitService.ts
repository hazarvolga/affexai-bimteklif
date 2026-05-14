import { GoogleGenerativeAI } from "@google/generative-ai";
import { registry } from "../../lib/plugins/registry";

export interface FinancialAnalysis {
  totalCost: number;
  totalPrice: number;
  profit: number;
  margin: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  costBreakdown: {
    material: number;
    labor: number;
    logistics: number;
    subcontractor: number;
    overhead: number;
  };
  insights: string;
  suggestedPriceRange: {
    min: number;
    optimal: number;
    competitive: number;
  };
}

export class ProfitService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeProfitability(
    items: any[], 
    industryId: string, 
    currency: string = "TRY"
  ): Promise<FinancialAnalysis> {
    const totalPrice = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    
    // In a real scenario, cost would be stored per item or calculated via a formula.
    // For this module, we'll use a sophisticated estimation logic based on industry defaults.
    const plugin = registry.getIndustry(industryId) || registry.getIndustry("residential")!;
    
    // Simulated cost distribution based on industry plugin calculation model
    let costFactor = 0.8; // Default 20% margin
    if (plugin.quotationRules.calculationModel === "labor_heavy") costFactor = 0.65;
    if (plugin.quotationRules.calculationModel === "material_heavy") costFactor = 0.85;

    const totalCost = totalPrice * costFactor;
    const profit = totalPrice - totalCost;
    const margin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

    // Breakdown simulation
    const breakdown = {
      material: totalCost * (plugin.quotationRules.calculationModel === "material_heavy" ? 0.6 : 0.3),
      labor: totalCost * (plugin.quotationRules.calculationModel === "labor_heavy" ? 0.5 : 0.3),
      logistics: totalCost * 0.1,
      subcontractor: totalCost * 0.2,
      overhead: totalCost * 0.1,
    };

    // Risk Scoring
    let riskScore = 0;
    if (margin < 15) riskScore += 40;
    if (margin < 10) riskScore += 30;
    if (currency !== "USD" && currency !== "EUR") riskScore += 15; // Local currency risk

    const riskLevel = riskScore > 60 ? "HIGH" : riskScore > 30 ? "MEDIUM" : "LOW";

    // AI Financial Insights
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Sen bir inşaat finans uzmanısın. Aşağıdaki teklif verilerini analiz et ve stratejik finansal tavsiye ver.
      
      Sektör: ${plugin.name}
      Toplam Fiyat: ${totalPrice} ${currency}
      Tahmini Kar: ${profit} ${currency}
      Kar Marjı: %${margin.toFixed(2)}
      Risk Seviyesi: ${riskLevel}
      
      Görevin:
      1. Kar marjının sektör standartlarına (\%15-\%35) uygunluğunu değerlendir.
      2. En büyük maliyet risksini belirt.
      3. Teklifin rekabet gücünü yorumla.
      
      Kısa, öz ve profesyonel bir paragraf döndür.
    `;

    const result = await model.generateContent(prompt);
    const insights = result.response.text();

    return {
      totalCost,
      totalPrice,
      profit,
      margin,
      riskLevel,
      riskScore,
      costBreakdown: breakdown,
      insights,
      suggestedPriceRange: {
        min: totalCost * 1.1,
        optimal: totalCost * 1.25,
        competitive: totalCost * 1.2
      }
    };
  }
}
