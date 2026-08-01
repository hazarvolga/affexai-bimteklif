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
  return element.type !== "IfcReinforcingBar" && (element.quantitySource === "qto" || element.quantitySource === "property");
}

export function summarizeIfcEvidencePolicy(elements: ParsedIfcElement[]): IfcEvidencePolicySummary {
  return {
    acceptedQtoCount: elements.filter((element) => isIfcConcreteQuantityAdmissible(element) && element.quantitySource === "qto").length,
    acceptedPropertyCount: elements.filter((element) => isIfcConcreteQuantityAdmissible(element) && element.quantitySource === "property").length,
    blockedEstimateCount: elements.filter((element) => element.quantitySource === "estimate" && element.type !== "IfcReinforcingBar").length,
    blockedGeometryCount: elements.filter((element) => element.quantitySource === "geometry").length,
    blockedRebarCount: elements.filter((element) => element.type === "IfcReinforcingBar").length,
    blockedFormworkEstimateCount: elements.filter((element) => element.formworkM2 > 0).length,
    admissibleQuantityCount: elements.filter(isIfcConcreteQuantityAdmissible).length,
  };
}

export function describeIfcQuantityEvidence(element: ParsedIfcElement): IfcQuantityEvidenceDisplay {
  if (element.type === "IfcReinforcingBar") {
    return {
      label: "Rebar blocked",
      tone: "rose",
      admittedToSmartCheck: false,
      reason: "Donatı için bar length/mass, diameter grouping, lap/waste ve reviewer-backed validation gerekir.",
    };
  }
  if (element.quantitySource === "qto") {
    return {
      label: "QTO accepted",
      tone: "emerald",
      admittedToSmartCheck: true,
      reason: "IfcElementQuantity / IfcQuantityVolume kanıtı SmartCheck review satırına alınabilir.",
    };
  }
  if (element.quantitySource === "property") {
    return {
      label: "Property accepted",
      tone: "sky",
      admittedToSmartCheck: true,
      reason: "Approved property evidence SmartCheck review satırına alınabilir.",
    };
  }
  if (element.quantitySource === "geometry") {
    return {
      label: "Geometry blocked",
      tone: "rose",
      admittedToSmartCheck: false,
      reason: "Geometry fallback için unit, opening, net/gross ve tolerance rules henüz tamamlanmadı.",
    };
  }
  return {
    label: "Estimate blocked",
    tone: "amber",
    admittedToSmartCheck: false,
    reason: "Demo/estimated quantity SmartCheck evidence satırına alınmaz.",
  };
}
