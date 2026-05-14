export type CalculationModel = "labor_heavy" | "material_heavy" | "balanced" | "system_based";

export interface IndustryPlugin {
  id: string;
  name: string;
  description: string;

  quotationRules: {
    calculationModel: CalculationModel;
    defaultVatRate: number;
    currencySupport: string[];
  };

  aiProfile: {
    systemPrompt: string;
    extractionRules: string;
  };

  defaultLineItems: string[];

  pdfTemplateId: string;

  riskRules: string[];

  enabled: boolean;
}
