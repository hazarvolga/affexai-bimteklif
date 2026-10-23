import type { ParsedIfcElement } from "./types";

export interface IfcEvidencePolicySummary {
  acceptedQtoCount: number;
  acceptedPropertyCount: number;
  blockedEstimateCount: number;
  blockedGeometryCount: number;
  blockedRebarCount: number;
  blockedFormworkEstimateCount: number;
  admissibleQuantityCount: number;
}

export interface IfcQuantityEvidenceDisplay {
  label: string;
  tone: "emerald" | "sky" | "amber" | "rose" | "zinc";
  admittedToSmartCheck: boolean;
  reason: string;
}

export function isIfcConcreteQuantityAdmissible(element: ParsedIfcElement): boolean {
  const sourceBacked = element.quantitySource === "qto" || element.quantitySource === "property";
  if (element.type === "IfcReinforcingBar") return sourceBacked && element.rebarKg > 0 && Boolean(element.quantitySourcePath);
  return sourceBacked;
}

export function summarizeIfcEvidencePolicy(elements: ParsedIfcElement[]): IfcEvidencePolicySummary {
  return {
    acceptedQtoCount: elements.filter((element) => isIfcConcreteQuantityAdmissible(element) && element.quantitySource === "qto").length,
    acceptedPropertyCount: elements.filter((element) => isIfcConcreteQuantityAdmissible(element) && element.quantitySource === "property").length,
    blockedEstimateCount: elements.filter((element) => element.quantitySource === "estimate" && element.type !== "IfcReinforcingBar").length,
    blockedGeometryCount: elements.filter((element) => element.quantitySource === "geometry").length,
    blockedRebarCount: elements.filter((element) => element.type === "IfcReinforcingBar" && !isIfcConcreteQuantityAdmissible(element)).length,
    blockedFormworkEstimateCount: elements.filter((element) => element.formworkM2 > 0).length,
    admissibleQuantityCount: elements.filter(isIfcConcreteQuantityAdmissible).length,
  };
}

export function describeIfcQuantityEvidence(element: ParsedIfcElement): IfcQuantityEvidenceDisplay {
  if (element.type === "IfcReinforcingBar") {
    if (isIfcConcreteQuantityAdmissible(element)) {
      return {
        label: "Kabul Edilen Donatı Kütlesi",
        tone: "emerald",
        admittedToSmartCheck: true,
        reason: "IFC QTO veya kaynak yolu kayıtlı property kütlesi kg olarak inceleme satırına aktarılır; ton dönüşümü açık birim sözleşmesiyle yapılır.",
      };
    }
    return {
      label: "Donatı Askıda",
      tone: "rose",
      admittedToSmartCheck: false,
      reason: "Donatı için çubuk metrajı/kütlesi, çap gruplandırması, bindirme payı ve uzman denetçi doğrulaması gerekir.",
    };
  }
  if (element.quantitySource === "qto") {
    return {
      label: "Kabul Edilen Metraj (QTO)",
      tone: "emerald",
      admittedToSmartCheck: true,
      reason: "IfcElementQuantity / IfcQuantityVolume kanıtı SmartCheck inceleme satırına aktarılabilir.",
    };
  }
  if (element.quantitySource === "property") {
    return {
      label: "Kabul Edilen Nitelik",
      tone: "sky",
      admittedToSmartCheck: true,
      reason: "Onaylı nitelik (özellik) kanıtı SmartCheck inceleme satırına aktarılabilir.",
    };
  }
  if (element.quantitySource === "geometry") {
    return {
      label: "Geometri Uyumsuz",
      tone: "rose",
      admittedToSmartCheck: false,
      reason: "Geometrik hesaplama için birim, boşluk minha, net/brüt ve tolerans kuralları henüz tamamlanmadı.",
    };
  }
  return {
    label: "Tahmin Askıda",
    tone: "amber",
    admittedToSmartCheck: false,
    reason: "Demo veya yaklaşık tahmin metrajı SmartCheck kanıt satırına doğrudan aktarılmaz.",
  };
}
