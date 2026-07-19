import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateQuotationFinancials } from "../../lib/financial-calculations";

export interface FinancialAnalysis {
  totalCost: number;
  totalPrice: number;
  profit: number;
  margin: number;
  costStatus: "complete" | "incomplete";
  missingCostItemIndexes: number[];
  escalationPremium: number;
  carbonRiskPremium: number;
  informationDeliveryCostPremium: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  riskScore: number;
  costBreakdown: { material: number; labor: number; logistics: number; subcontractor: number; overhead: number };
  insights: string;
  suggestedPriceRange: { min: number; optimal: number; competitive: number };
}

export class ProfitService {
  private genAI: GoogleGenerativeAI | null;

  constructor(apiKey: string) { this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null; }

  async analyzeProfitability(items: any[], industryId: string, currency = "TRY", riskInputs: { projectDurationMonths?: number; escalationVolatilityPercent?: number; carbonRiskPremiumPercent?: number; informationDeliveryCostPercent?: number } = {}): Promise<FinancialAnalysis> {
    const calculation = calculateQuotationFinancials(items, riskInputs);
    const costStatus = calculation.missingCostItemIndexes.length === 0 ? "complete" : "incomplete";
    if (costStatus === "incomplete") {
      return {
        totalCost: calculation.totalCost, totalPrice: calculation.salesNet, profit: 0, margin: 0,
        costStatus, missingCostItemIndexes: calculation.missingCostItemIndexes, riskLevel: "UNKNOWN", riskScore: 0,
        escalationPremium: 0,
        carbonRiskPremium: 0,
        informationDeliveryCostPremium: 0,
        costBreakdown: calculation.costBreakdown,
        insights: `${calculation.missingCostItemIndexes.length} teklif kaleminde maliyet birim fiyatı eksik. Gerçek kâr ve marj hesaplamak için maliyetleri girin.`,
        suggestedPriceRange: { min: 0, optimal: 0, competitive: 0 },
      };
    }

    let riskScore = 0;
    if (calculation.margin < 15) riskScore += 40;
    if (calculation.margin < 10) riskScore += 30;
    const riskLevel = riskScore > 60 ? "HIGH" : riskScore > 30 ? "MEDIUM" : "LOW";
    const fallback = `Maliyet verileri tamamlandı. Net satış ${calculation.salesNet.toLocaleString("tr-TR")} ${currency}, maliyet ${calculation.totalCost.toLocaleString("tr-TR")} ${currency}; hesaplanan marj %${calculation.margin.toFixed(2)} (${riskLevel}).`;
    let insights = fallback;
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`İnşaat teklifini kısa ve profesyonel değerlendir. Sektör: ${industryId}. Net satış: ${calculation.salesNet} ${currency}. Gerçek maliyet: ${calculation.totalCost} ${currency}. Kâr: ${calculation.profit} ${currency}. Marj: %${calculation.margin.toFixed(2)}. Risk: ${riskLevel}. En fazla üç cümlede marjı, ana maliyet riskini ve teklif kararını belirt.`);
        insights = result.response.text() || fallback;
      } catch (error) {
        console.error("Financial insight generation failed:", error);
      }
    }
    return {
      totalCost: calculation.totalCost, totalPrice: calculation.salesNet, profit: calculation.profit, margin: calculation.margin,
      costStatus, missingCostItemIndexes: [], riskLevel, riskScore, costBreakdown: calculation.costBreakdown, insights,
      escalationPremium: calculation.escalationPremium,
      carbonRiskPremium: calculation.carbonRiskPremium,
      informationDeliveryCostPremium: calculation.informationDeliveryCostPremium,
      suggestedPriceRange: { min: Math.round(calculation.totalCost * 1.1), optimal: Math.round(calculation.totalCost * 1.25), competitive: Math.round(calculation.totalCost * 1.2) },
    };
  }
}
