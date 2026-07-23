export type RegulationImpactCategory = "tax" | "labor" | "material" | "procurement" | "legal";

export type RegulationImpactVersion = {
  category: RegulationImpactCategory;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  title: string;
  applicability: string | null;
};

export type ImpactQuotation = {
  id: string;
  quoteNumber: string;
  projectName: string;
  date: Date;
  expiryDate: Date;
  status: string;
};

export type ImpactQuotationItem = {
  id: string;
  quotationId: string;
  description: string;
  unit: string;
  costCategory: string;
};

export type RegulationQuotationImpact = {
  quotation: ImpactQuotation;
  itemIds: string[];
  effectiveStatus: "upcoming" | "effective" | "unknown";
  matchType: "targeted" | "quotation_wide";
  confidence: "low" | "medium";
  reason: string;
  matchedFields: string[];
};

const laborTerms = ["işçilik", "işçi", "personel", "usta", "sgk", "emek"];
const materialTerms = ["malzeme", "boru", "vana", "kablo", "armatür", "pompa", "kanal", "izolasyon"];

function normalized(value: string) {
  return value.toLocaleLowerCase("tr-TR");
}
function includesTerm(value: string, terms: string[]) {
  const text = normalized(value);
  return terms.some((term) => text.includes(term));
}

function effectiveStatus(version: RegulationImpactVersion, asOf: Date) {
  if (!version.effectiveFrom) return "unknown" as const;
  if (version.effectiveFrom > asOf) return "upcoming" as const;
  if (version.effectiveUntil && version.effectiveUntil < asOf) return "effective" as const;
  return "effective" as const;
}

export function findRegulationQuotationImpact(
  version: RegulationImpactVersion,
  quotation: ImpactQuotation,
  items: ImpactQuotationItem[],
  asOf = new Date(),
): RegulationQuotationImpact | null {
  const quoteItems = items.filter((item) => item.quotationId === quotation.id);
  const targeted = version.category === "labor"
    ? quoteItems.filter((item) => item.costCategory === "labor" || includesTerm(item.description, laborTerms))
    : version.category === "material"
      ? quoteItems.filter((item) => item.costCategory === "material" || includesTerm(item.description, materialTerms))
      : [];
  const broadCategory = version.category === "tax" || version.category === "legal" || version.category === "procurement";
  const affectedItems = targeted.length > 0 ? targeted : broadCategory ? quoteItems : [];
  if (!affectedItems.length && !broadCategory) return null;
  const matchType = targeted.length > 0 ? "targeted" : "quotation_wide";
  const matchedFields = targeted.length > 0 ? ["quotation_items.cost_category", "quotation_items.description"] : ["quotation.project_scope"];
  const reason = targeted.length > 0
    ? `${version.title} için ${version.category} kategorisiyle eşleşen ${targeted.length} teklif kalemi bulundu.`
    : `${version.title} ${version.category} sınıfında olduğu için teklif düzeyinde advisory inceleme önerilir.`;
  return {
    quotation,
    itemIds: affectedItems.map((item) => item.id),
    effectiveStatus: effectiveStatus(version, asOf),
    matchType,
    confidence: targeted.length > 0 ? "medium" : "low",
    reason,
    matchedFields,
  };
}
