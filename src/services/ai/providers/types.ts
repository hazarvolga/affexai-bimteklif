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

export interface AIQuotationInput {
  inputText: string;
  industryId: string;
  plugin: any;
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateQuotation(input: AIQuotationInput): Promise<AIQuotationResult>;
  improveQuotation(items: any[], instructions: string): Promise<any[]>;
  estimateMargin?(input: unknown): Promise<unknown>;
}

export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

export function buildQuotationPrompt({ inputText, industryId, plugin }: AIQuotationInput): string {
  return `
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
      "projectType": "${plugin.name} - ${industryId}",
      "confidence": 0.0-1.0_arasında_güven_skoru,
      "industryId": "${industryId}",
      "lineItems": [
        { "description": "kalem_açıklaması", "unit": "birim", "quantity": miktar, "unitPrice": birim_fiyat }
      ],
      "assumptions": ["yapılan_varsayımlar"],
      "riskFlags": ["risk_etiketleri_ör_döviz_kuru_malzeme_oynaklığı"],
      "riskLevel": "low|medium|high"
    }

    Sadece JSON döndür. Başka metin ekleme.
  `;
}
