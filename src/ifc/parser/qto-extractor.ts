import { normalizeStepLines, projectLengthUnitScale, volumeUnitResolver } from "./units";
import type { IfcSupportedElementType } from "./quantity-extractor";

export interface IfcQtoVolumeQuantity {
  stepId: string;
  globalId: string;
  entityType: IfcSupportedElementType;
  quantityName: string;
  normalizedValue: number;
  normalizedUnit: "m3";
  sourceType: "qto";
  sourcePath: string;
  confidence: number;
  quantitySetName: string;
  quantityStepId: string;
}

export interface IfcQtoVolumeExtraction {
  quantities: IfcQtoVolumeQuantity[];
  summary: {
    elementQuantitySetCount: number;
    recognizedVolumeQuantityCount: number;
    recognizedVolumeSumM3: number;
  };
}

interface IfcQuantityVolumeValue {
  stepId: string;
  name: string;
  value: number;
  hasExplicitUnit: boolean;
}

interface IfcElementQuantitySet {
  stepId: string;
  name: string;
  quantityIds: string[];
}

interface IfcElementIdentity {
  stepId: string;
  globalId: string;
  entityType: IfcSupportedElementType;
}

interface IfcQtoRelation {
  relationStepId: string;
  relatedObjectIds: string[];
  quantitySetId: string;
}

const supportedTypeByEntity: Record<string, IfcSupportedElementType> = {
  IFCBEAM: "IfcBeam",
  IFCCOLUMN: "IfcColumn",
  IFCSLAB: "IfcSlab",
  IFCWALL: "IfcWall",
  IFCWALLSTANDARDCASE: "IfcWall",
  IFCWALLELEMENTEDCASE: "IfcWall",
  IFCREINFORCINGBAR: "IfcReinforcingBar",
};

const approvedVolumeQuantityNames = new Set([
  "GrossVolume",
  "NetVolume",
  "Volume",
  "Hacim",
  "Net Hacim",
]);

function parseReferences(value: string): string[] {
  return Array.from(value.matchAll(/#(\d+)/g), (match) => match[1]);
}

function roundM3(value: number): number {
  return Number(value.toFixed(12));
}

export function extractIfcQtoVolumeQuantities(ifcText: string): IfcQtoVolumeExtraction {
  const resolveVolumeUnit = volumeUnitResolver(ifcText);
  const lengthScale = projectLengthUnitScale(ifcText);
  const quantitiesById = new Map<string, IfcQuantityVolumeValue>();
  const lengthsById = new Map<string, { name: string; valueM: number }>();
  const areasById = new Map<string, { name: string; valueM2: number }>();
  const quantitySets = new Map<string, IfcElementQuantitySet>();
  const elements = new Map<string, IfcElementIdentity>();
  const relations: IfcQtoRelation[] = [];
  const quantities: IfcQtoVolumeQuantity[] = [];

  const elementRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCWALLELEMENTEDCASE|IFCREINFORCINGBAR)\s*\(\s*'([^']*)'/i;
  const quantityRegex = /^#(\d+)\s*=\s*IFCQUANTITYVOLUME\s*\(\s*'([^']+)'\s*,\s*(?:'[^']*'|\$)\s*,\s*(#[0-9]+|\$)\s*,\s*([-+0-9.Ee]+)\s*(?:,\s*[^)]*)?\);/i;
  const lengthQtyRegex = /^#(\d+)\s*=\s*IFCQUANTITYLENGTH\s*\(\s*'([^']+)'\s*,\s*(?:'[^']*'|\$)\s*,\s*(#[0-9]+|\$)\s*,\s*([-+0-9.Ee]+)\s*(?:,\s*[^)]*)?\);/i;
  const areaQtyRegex = /^#(\d+)\s*=\s*IFCQUANTITYAREA\s*\(\s*'([^']+)'\s*,\s*(?:'[^']*'|\$)\s*,\s*(#[0-9]+|\$)\s*,\s*([-+0-9.Ee]+)\s*(?:,\s*[^)]*)?\);/i;
  const quantitySetRegex = /^#(\d+)\s*=\s*IFCELEMENTQUANTITY\s*\(\s*'[^']*'\s*,\s*(?:#[0-9]+|\$)\s*,\s*'([^']*)'\s*,\s*(?:'[^']*'|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*\(([^)]*)\)\s*\);/i;
  const relationRegex = /^#(\d+)\s*=\s*IFCRELDEFINESBYPROPERTIES\s*\(\s*'[^']*'\s*,\s*(?:#[0-9]+|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*\(([^)]*)\)\s*,\s*#(\d+)\s*\);/i;

  for (const line of normalizeStepLines(ifcText)) {
    const elementMatch = line.match(elementRegex);
    if (elementMatch) {
      elements.set(elementMatch[1], {
        stepId: elementMatch[1],
        globalId: elementMatch[3],
        entityType: supportedTypeByEntity[elementMatch[2].toUpperCase()],
      });
      continue;
    }

    const quantityMatch = line.match(quantityRegex);
    if (quantityMatch) {
      const scale = resolveVolumeUnit(quantityMatch[3]);
      const value = Number(quantityMatch[4]) * (scale ?? NaN);
      if (Number.isFinite(value) && value > 0 && approvedVolumeQuantityNames.has(quantityMatch[2])) {
        quantitiesById.set(quantityMatch[1], {
          stepId: quantityMatch[1],
          name: quantityMatch[2],
          value,
          hasExplicitUnit: quantityMatch[3] !== "$",
        });
      }
      continue;
    }

    if (lengthScale > 0 && lengthScale < 0.1) {
      const lenMatch = line.match(lengthQtyRegex);
      if (lenMatch) {
        const val = Number(lenMatch[4]);
        if (Number.isFinite(val) && val > 0) {
          lengthsById.set(lenMatch[1], { name: lenMatch[2].toLowerCase(), valueM: val * lengthScale });
        }
        continue;
      }
      const areaMatch = line.match(areaQtyRegex);
      if (areaMatch) {
        const val = Number(areaMatch[4]);
        if (Number.isFinite(val) && val > 0) {
          areasById.set(areaMatch[1], { name: areaMatch[2].toLowerCase(), valueM2: val });
        }
        continue;
      }
    }

    const quantitySetMatch = line.match(quantitySetRegex);
    if (quantitySetMatch) {
      quantitySets.set(quantitySetMatch[1], {
        stepId: quantitySetMatch[1],
        name: quantitySetMatch[2],
        quantityIds: parseReferences(quantitySetMatch[3]),
      });
      continue;
    }

    const relationMatch = line.match(relationRegex);
    if (!relationMatch) continue;
    relations.push({
      relationStepId: relationMatch[1],
      relatedObjectIds: parseReferences(relationMatch[2]),
      quantitySetId: relationMatch[3],
    });
  }

  for (const relation of relations) {
    const quantitySet = quantitySets.get(relation.quantitySetId);
    if (!quantitySet) continue;

    let volumeQuantities = quantitySet.quantityIds
      .map((quantityId) => quantitiesById.get(quantityId))
      .filter((quantity): quantity is IfcQuantityVolumeValue => Boolean(quantity));

    // Normalize Revit mm³ / m²·mm QTO unit scaling anomalies when project length unit is mm
    if (lengthScale > 0 && lengthScale < 0.1 && volumeQuantities.length > 0) {
      const setLengths = new Map<string, number>();
      const setAreas = new Map<string, number>();
      for (const qid of quantitySet.quantityIds) {
        const l = lengthsById.get(qid);
        if (l) setLengths.set(l.name, l.valueM);
        const a = areasById.get(qid);
        if (a && a.valueM2 < 1e5) setAreas.set(a.name, a.valueM2);
      }
      const wM = setLengths.get("width") ?? setLengths.get("depth") ?? setLengths.get("thickness");
      const lM = setLengths.get("length");
      const hM = setLengths.get("height");
      const boxVol = lM && wM && hM ? lM * wM * hM : undefined;
      const slabArea = setAreas.get("grossarea") ?? setAreas.get("netarea") ?? setAreas.get("grossfootprintarea");
      const minVol = Math.min(...volumeQuantities.map((q) => q.value));

      const normalized: IfcQuantityVolumeValue[] = [];
      for (const q of volumeQuantities) {
        if (q.hasExplicitUnit) {
          normalized.push(q);
          continue;
        }
        const sameNameMin = Math.min(
          ...volumeQuantities.filter((other) => other.name.toLowerCase() === q.name.toLowerCase()).map((o) => o.value),
        );
        if (sameNameMin > 0 && q.value > sameNameMin * 500) {
          // Discard unscaled duplicate (e.g. Revit NetVolume in mm³ alongside NetVolume in m³)
          continue;
        }
        let val = q.value;
        if (minVol > 0 && val > minVol * 500) {
          for (const p of [1, 2, 3]) {
            const scaled = val * Math.pow(lengthScale, p);
            if (Math.abs(scaled - minVol) / minVol < 0.35) {
              val = scaled;
              break;
            }
          }
        } else if (slabArea && wM && val > slabArea * wM * 100 && Math.abs(val * lengthScale - slabArea * wM) / (slabArea * wM) < 0.35) {
          val = val * lengthScale;
        } else if (boxVol && val > boxVol * 50) {
          for (const factor of [lengthScale, Math.pow(lengthScale, 2), Math.pow(lengthScale, 3), Math.pow(0.3048, 2) * lengthScale]) {
            const scaled = val * factor;
            if (scaled >= 0.05 * boxVol && scaled <= 2.5 * boxVol) {
              val = scaled;
              break;
            }
          }
        }
        normalized.push({ ...q, value: val });
      }
      volumeQuantities = normalized;
    }

    for (const objectId of relation.relatedObjectIds) {
      const element = elements.get(objectId);
      if (!element) continue;

      for (const quantity of volumeQuantities) {
        quantities.push({
          stepId: element.stepId,
          globalId: element.globalId,
          entityType: element.entityType,
          quantityName: quantity.name,
          normalizedValue: roundM3(quantity.value),
          normalizedUnit: "m3",
          sourceType: "qto",
          sourcePath: `#${relation.relationStepId}/#${quantitySet.stepId}/#${quantity.stepId}:${quantitySet.name}/${quantity.name}`,
          confidence: quantity.name === "NetVolume" || quantity.name === "Net Hacim" ? 0.95 : 0.9,
          quantitySetName: quantitySet.name,
          quantityStepId: quantity.stepId,
        });
      }
    }
  }

  return {
    quantities,
    summary: {
      elementQuantitySetCount: quantitySets.size,
      recognizedVolumeQuantityCount: quantities.length,
      recognizedVolumeSumM3: roundM3(quantities.reduce((sum, quantity) => sum + quantity.normalizedValue, 0)),
    },
  };
}
