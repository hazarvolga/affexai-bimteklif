import type { ParsedIfcElement } from "./types";

const DIRECT_WEIGHT_NAME = /\/(?:grossweight|netweight|weight|mass|ağırlık|agirlik|netto-masse|netto-gewicht|pec_weight)$/iu;

/** Nominal diameter × length × count × density is an estimate, not direct IFC mass evidence. */
export function hasDirectIfcRebarMassEvidence(element: ParsedIfcElement): boolean {
  return element.type === "IfcReinforcingBar"
    && (element.quantitySource === "qto" || element.quantitySource === "property")
    && Number.isFinite(element.rebarKg)
    && element.rebarKg > 0
    && DIRECT_WEIGHT_NAME.test(element.quantitySourcePath?.trim() ?? "");
}
