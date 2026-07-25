
# TEKLIFPRO AI — MULTI-NIŞ INDUSTRY ENGINE ARCHITECTURE

Bu doküman:
- Industry Plugin Architecture
- AI Prompt Routing System (Niş bazlı AI davranışı)
- Multi-Tenant + Multi-Industry Database Design
- Multi-Niche Expansion Strategy

için production-grade sistem tasarımını içerir.

---

# 1. GENEL SİSTEM MİMARİSİ

Sistem 3 katmandan oluşur:

## 1. Core SaaS Engine (değişmez)

- Authentication
- Multi-tenant system
- Quotation engine (generic)
- AI orchestration layer
- PDF generator
- Billing (later)

## 2. Industry Plugin Layer (değişken)

Her sektör için ayrı modül:

- Residential Construction
- Electrical Contracting
- Mechanical/HVAC
- Renovation
- Infrastructure (future)
- Interior Design (future)

## 3. Intelligence Layer

- AI prompt routing
- cost inference engine
- regulation mapping
- margin prediction

---

# 2. INDUSTRY PLUGIN ARCHITECTURE

## 2.1 Klasör Yapısı

```txt
/src
  /industries
    /residential
      config.ts
      rules.ts
      templates.ts
      ai-profile.ts
      cost-model.ts

    /electrical
      config.ts
      rules.ts
      templates.ts
      ai-profile.ts
      cost-model.ts

    /mechanical
      config.ts
      rules.ts
      templates.ts
      ai-profile.ts
      cost-model.ts


      export interface IndustryPlugin {
  id: string;
  name: string;

  defaultCurrency: "TRY" | "USD" | "EUR";

  taxRules: {
    vatRate: number;
    withholdingEnabled: boolean;
  };

  quotationModel: {
    defaultLineItems: string[];
    calculationType: "labor_heavy" | "material_heavy" | "balanced";
  };

  aiProfile: {
    systemPrompt: string;
    extractionRules: string;
  };

  pdfTemplate: {
    templateId: string;
  };
}


export interface IndustryPlugin {
  id: string;
  name: string;

  defaultCurrency: "TRY" | "USD" | "EUR";

  taxRules: {
    vatRate: number;
    withholdingEnabled: boolean;
  };

  quotationModel: {
    defaultLineItems: string[];
    calculationType: "labor_heavy" | "material_heavy" | "balanced";
  };

  aiProfile: {
    systemPrompt: string;
    extractionRules: string;
  };

  pdfTemplate: {
    templateId: string;
  };
}