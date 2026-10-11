import { volumeUnitResolver } from "./units";
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
  const quantitiesById = new Map<string, IfcQuantityVolumeValue>();
  const quantitySets = new Map<string, IfcElementQuantitySet>();
  const elements = new Map<string, IfcElementIdentity>();
  const relations: IfcQtoRelation[] = [];
  const quantities: IfcQtoVolumeQuantity[] = [];

  const elementRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCREINFORCINGBAR)\s*\('([^']*)'/i;
  const quantityRegex = /^#(\d+)\s*=\s*IFCQUANTITYVOLUME\s*\('([^']+)'\s*,\s*(?:'[^']*'|\$)\s*,\s*(#[0-9]+|\$)\s*,\s*([-+0-9.Ee]+)\s*(?:,\s*[^)]*)?\);/i;
  const quantitySetRegex = /^#(\d+)\s*=\s*IFCELEMENTQUANTITY\s*\('[^']*'\s*,\s*#[0-9]+\s*,\s*'([^']*)'\s*,\s*(?:'[^']*'|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*\(([^)]*)\)\s*\);/i;
  const relationRegex = /^#(\d+)\s*=\s*IFCRELDEFINESBYPROPERTIES\s*\('[^']*'\s*,\s*#[0-9]+\s*,\s*\$\s*,\s*\$\s*,\s*\(([^)]*)\)\s*,\s*#(\d+)\s*\);/i;

  for (const rawLine of ifcText.split("\n")) {
    const line = rawLine.trim();

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
      if (Number.isFinite(value) && approvedVolumeQuantityNames.has(quantityMatch[2])) {
        quantitiesById.set(quantityMatch[1], {
          stepId: quantityMatch[1],
          name: quantityMatch[2],
          value,
        });
      }
      continue;
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

    const volumeQuantities = quantitySet.quantityIds
      .map((quantityId) => quantitiesById.get(quantityId))
      .filter((quantity): quantity is IfcQuantityVolumeValue => Boolean(quantity));

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
