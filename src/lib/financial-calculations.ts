import { roundMoney, toFiniteNumber } from './calculations';

export type CostCategory = 'material' | 'labor' | 'logistics' | 'subcontractor' | 'overhead';

export interface FinancialLineItem {
  quantity: number | string | null | undefined;
  unitPrice: number | string | null | undefined;
  costUnitPrice: number | string | null | undefined;
  wastePercent?: number | string | null | undefined;
  discountPercent?: number | string | null | undefined;
  costCategory?: string | null | undefined;
}

export interface QuotationFinancialCalculation {
  salesNet: number;
  totalCost: number;
  profit: number;
  margin: number;
  missingCostItemIndexes: number[];
  costBreakdown: Record<CostCategory, number>;
  escalationPremium: number;
  projectDurationMonths: number;
  escalationVolatilityPercent: number;
  carbonRiskPremium: number;
  carbonRiskPremiumPercent: number;
  informationDeliveryCostPremium: number;
  informationDeliveryCostPercent: number;
}

const categories: CostCategory[] = ['material', 'labor', 'logistics', 'subcontractor', 'overhead'];

export function calculateQuotationFinancials(items: FinancialLineItem[], riskInputs: { projectDurationMonths?: number; escalationVolatilityPercent?: number; carbonRiskPremiumPercent?: number; informationDeliveryCostPercent?: number } = {}): QuotationFinancialCalculation {
  const costBreakdown = Object.fromEntries(categories.map((category) => [category, 0])) as Record<CostCategory, number>;
  const missingCostItemIndexes: number[] = [];
  let salesNet = 0;
  let totalCost = 0;

  items.forEach((item, index) => {
    const quantity = toFiniteNumber(item.quantity);
    const unitPrice = toFiniteNumber(item.unitPrice);
    const discount = toFiniteNumber(item.discountPercent);
    const costUnitPrice = item.costUnitPrice === null || item.costUnitPrice === undefined || item.costUnitPrice === ''
      ? Number.NaN
      : Number(item.costUnitPrice);
    const waste = Math.max(0, toFiniteNumber(item.wastePercent));

    salesNet += quantity * unitPrice * (1 - discount / 100);
    if (!Number.isFinite(costUnitPrice) || costUnitPrice < 0) {
      missingCostItemIndexes.push(index);
      return;
    }

    const effectiveCost = quantity * costUnitPrice * (1 + waste / 100);
    totalCost += effectiveCost;
    const category = categories.includes(item.costCategory as CostCategory) ? item.costCategory as CostCategory : 'material';
    costBreakdown[category] += effectiveCost;
  });

  const projectDurationMonths = Math.max(1, toFiniteNumber(riskInputs.projectDurationMonths, 1));
  const escalationVolatilityPercent = Math.max(0, toFiniteNumber(riskInputs.escalationVolatilityPercent));
  const escalationPremium = missingCostItemIndexes.length === 0
    ? roundMoney(totalCost * projectDurationMonths * escalationVolatilityPercent / 100)
    : 0;
  const carbonRiskPremiumPercent = Math.max(0, toFiniteNumber(riskInputs.carbonRiskPremiumPercent));
  const carbonRiskPremium = missingCostItemIndexes.length === 0
    ? roundMoney(totalCost * carbonRiskPremiumPercent / 100)
    : 0;
  const informationDeliveryCostPercent = Math.max(0, toFiniteNumber(riskInputs.informationDeliveryCostPercent));
  const informationDeliveryCostPremium = missingCostItemIndexes.length === 0
    ? roundMoney(totalCost * informationDeliveryCostPercent / 100)
    : 0;
  const riskAdjustedCost = totalCost + escalationPremium + carbonRiskPremium + informationDeliveryCostPremium;
  const riskAdjustedProfit = missingCostItemIndexes.length === 0 ? salesNet - riskAdjustedCost : 0;
  return {
    salesNet: roundMoney(salesNet),
    totalCost: roundMoney(riskAdjustedCost),
    profit: roundMoney(riskAdjustedProfit),
    margin: salesNet > 0 && missingCostItemIndexes.length === 0 ? roundMoney((riskAdjustedProfit / salesNet) * 100) : 0,
    missingCostItemIndexes,
    costBreakdown: Object.fromEntries(categories.map((category) => [category, roundMoney(costBreakdown[category])])) as Record<CostCategory, number>,
    escalationPremium,
    projectDurationMonths,
    escalationVolatilityPercent,
    carbonRiskPremium,
    carbonRiskPremiumPercent,
    informationDeliveryCostPremium,
    informationDeliveryCostPercent,
  };
}
