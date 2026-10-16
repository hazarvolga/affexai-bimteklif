import { normalizeStepLines, volumeUnitResolver } from "./units";
export type IfcSupportedElementType = "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcWall" | "IfcReinforcingBar";

export interface IfcPropertyQuantity {
  stepId: string;
  globalId: string;
  entityType: IfcSupportedElementType;
  quantityName: "Hacim" | "Net Hacim" | "Volume" | "NetVolume" | "GrossVolume" | "PeC_Volume";
  normalizedValue: number;
  normalizedUnit: "m3";
  sourceType: "property";
  sourcePath: string;
  confidence: number;
  propertySetName: string;
  propertyStepId: string;
}

export interface IfcPropertyQuantityExtraction {
  quantities: IfcPropertyQuantity[];
  summary: {
    allplanVolumePropertyCount: number;
    recognizedVolumeQuantityCount: number;
    recognizedSlabVolumeCount: number;
    recognizedSlabVolumeSumM3: number;
  };
}

interface IfcPropertyValue {
  stepId: string;
  name: IfcPropertyQuantity["quantityName"];
  value: number;
}

interface IfcPropertySet {
  stepId: string;
  name: string;
  propertyIds: string[];
}

interface IfcElementIdentity {
  stepId: string;
  globalId: string;
  entityType: IfcSupportedElementType;
}

interface IfcPropertyRelation {
  relationStepId: string;
  relatedObjectIds: string[];
  propertySetId: string;
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

function isApprovedVolumePropertySet(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.startsWith("allplanattributes") ||
    lower.startsWith("allplanquantities") ||
    lower === "pset_slabcommon" ||
    lower === "pset_beamcommon" ||
    lower === "pset_columncommon" ||
    lower === "pset_wallcommon" ||
    lower === "pset_revit_dimensions" ||
    lower === "dimensions" ||
    lower === "pecparameters"
  );
}

function parseReferences(value: string): string[] {
  return Array.from(value.matchAll(/#(\d+)/g), (match) => match[1]);
}

function roundM3(value: number): number {
  return Number(value.toFixed(12));
}

export function extractAllplanVolumeQuantities(ifcText: string): IfcPropertyQuantityExtraction {
  const resolveVolumeUnit = volumeUnitResolver(ifcText);
  const properties = new Map<string, IfcPropertyValue>();
  const complexProperties = new Map<string, string[]>();
  const propertySets = new Map<string, IfcPropertySet>();
  const elements = new Map<string, IfcElementIdentity>();
  const relations: IfcPropertyRelation[] = [];
  const quantities: IfcPropertyQuantity[] = [];
  let allplanHacimCount = 0;

  const elementRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCWALLELEMENTEDCASE|IFCREINFORCINGBAR)\s*\(\s*'([^']*)'/i;
  const propertyRegex = /^#(\d+)\s*=\s*IFCPROPERTYSINGLEVALUE\s*\(\s*'(Hacim|Net Hacim|Volume|NetVolume|GrossVolume|PeC_Volume)'\s*,\s*(?:'[^']*'|\$)\s*,\s*IFC[A-Z0-9_]*\(([-+0-9.Ee]+)\)\s*,\s*(#[0-9]+|\$)\s*\);/i;
  const complexPropRegex = /^#(\d+)\s*=\s*IFCCOMPLEXPROPERTY\s*\(\s*'[^']*'\s*,\s*(?:'[^']*'|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*\(([^)]*)\)\s*\);/i;
  const propertySetRegex = /^#(\d+)\s*=\s*IFCPROPERTYSET\s*\(\s*'[^']*'\s*,\s*(?:#[0-9]+|\$)\s*,\s*'([^']*)'\s*,\s*(?:'[^']*'|\$)\s*,\s*\(([^)]*)\)\s*\);/i;
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

    const propertyMatch = line.match(propertyRegex);
    if (propertyMatch) {
      const propName = propertyMatch[2] as IfcPropertyQuantity["quantityName"];
      const scale = resolveVolumeUnit(propertyMatch[4]);
      const value = Number(propertyMatch[3]) * (scale ?? NaN);
      if (Number.isFinite(value) && value > 0) {
        if (propName === "Hacim" || propName === "Net Hacim") {
          allplanHacimCount++;
        }
        properties.set(propertyMatch[1], {
          stepId: propertyMatch[1],
          name: propName,
          value,
        });
      }
      continue;
    }

    const complexMatch = line.match(complexPropRegex);
    if (complexMatch) {
      complexProperties.set(complexMatch[1], parseReferences(complexMatch[2]));
      continue;
    }

    const propertySetMatch = line.match(propertySetRegex);
    if (propertySetMatch) {
      propertySets.set(propertySetMatch[1], {
        stepId: propertySetMatch[1],
        name: propertySetMatch[2],
        propertyIds: parseReferences(propertySetMatch[3]),
      });
      continue;
    }

    const relationMatch = line.match(relationRegex);
    if (!relationMatch) continue;

    relations.push({
      relationStepId: relationMatch[1],
      relatedObjectIds: parseReferences(relationMatch[2]),
      propertySetId: relationMatch[3],
    });
  }

  for (const relation of relations) {
    const propertySet = propertySets.get(relation.propertySetId);
    if (!propertySet || !isApprovedVolumePropertySet(propertySet.name)) continue;

    const expandedIds: string[] = [];
    for (const pid of propertySet.propertyIds) {
      expandedIds.push(pid);
      const subIds = complexProperties.get(pid);
      if (subIds) expandedIds.push(...subIds);
    }

    const volumeProperties = expandedIds
      .map((propertyId) => properties.get(propertyId))
      .filter((property): property is IfcPropertyValue => Boolean(property));

    for (const objectId of relation.relatedObjectIds) {
      const element = elements.get(objectId);
      if (!element) continue;

      for (const property of volumeProperties) {
        quantities.push({
          stepId: element.stepId,
          globalId: element.globalId,
          entityType: element.entityType,
          quantityName: property.name,
          normalizedValue: roundM3(property.value),
          normalizedUnit: "m3",
          sourceType: "property",
          sourcePath: `#${relation.relationStepId}/#${propertySet.stepId}/#${property.stepId}:${propertySet.name}/${property.name}`,
          confidence: propertySet.name.startsWith("AllplanAttributes") ? 0.9 : 0.8,
          propertySetName: propertySet.name,
          propertyStepId: property.stepId,
        });
      }
    }
  }

  const slabQuantities = quantities.filter((quantity) => quantity.entityType === "IfcSlab");

  return {
    quantities,
    summary: {
      allplanVolumePropertyCount: allplanHacimCount,
      recognizedVolumeQuantityCount: quantities.length,
      recognizedSlabVolumeCount: slabQuantities.length,
      recognizedSlabVolumeSumM3: roundM3(slabQuantities.reduce((sum, quantity) => sum + quantity.normalizedValue, 0)),
    },
  };
}
