import type { TrPsetCsbProjectCompliance } from "../types";

const TR_PSET_CSB_NAME = "Tr_Pset_CSB";

export interface ElementPozNo {
  stepId: string;
  value: string;
  sourcePath: string;
}

export interface ElementPozNoExtraction {
  pozNoByStepId: Map<string, ElementPozNo>;
}

interface IfcPropertySet {
  stepId: string;
  name: string;
  propertyIds: string[];
}

interface IfcTextProperty {
  stepId: string;
  value: string;
}

interface IfcRealProperty {
  stepId: string;
  name: "TAKS" | "KAKS" | "CekmeOn" | "CekmeYan";
  value: number;
}

interface IfcPropertyRelation {
  relationStepId: string;
  relatedObjectIds: string[];
  propertySetId: string;
}

const elementRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCREINFORCINGBAR)\s*\(/i;
const siteOrBuildingRegex = /^#(\d+)\s*=\s*(IFCSITE|IFCBUILDING)\s*\(/i;
const pozNoValueRegex = /^#(\d+)\s*=\s*IFCPROPERTYSINGLEVALUE\s*\('PozNo'\s*,\s*\$\s*,\s*IFCTEXT\('([^']*)'\)\s*,\s*\$\s*\);/i;
const realValueRegex = /^#(\d+)\s*=\s*IFCPROPERTYSINGLEVALUE\s*\('(TAKS|KAKS|CekmeOn|CekmeYan)'\s*,\s*\$\s*,\s*IFC[A-Z0-9_]*\(([-+0-9.Ee]+)\)\s*,\s*\$\s*\);/i;
const propertySetRegex = /^#(\d+)\s*=\s*IFCPROPERTYSET\s*\('[^']*'\s*,\s*#[0-9]+\s*,\s*'([^']*)'\s*,\s*\$\s*,\s*\(([^)]*)\)\s*\);/i;
const relationRegex = /^#(\d+)\s*=\s*IFCRELDEFINESBYPROPERTIES\s*\('[^']*'\s*,\s*#[0-9]+\s*,\s*\$\s*,\s*\$\s*,\s*\(([^)]*)\)\s*,\s*#(\d+)\s*\);/i;

function parseReferences(value: string): string[] {
  return Array.from(value.matchAll(/#(\d+)/g), (match) => match[1]);
}

function isTrPsetCsb(name: string): boolean {
  return name === TR_PSET_CSB_NAME;
}

/**
 * Reads the per-element `Tr_Pset_CSB.PozNo` value (ÇŞB position code) off
 * IfcBeam/Column/Slab/Wall/ReinforcingBar entities. Matches the property
 * name exactly so it does not confuse the regulation's `PozNo` with
 * unrelated Allplan-internal properties like `PozNoListe`.
 */
export function extractElementPozNo(ifcText: string): ElementPozNoExtraction {
  const elementIds = new Set<string>();
  const textProperties = new Map<string, IfcTextProperty>();
  const propertySets = new Map<string, IfcPropertySet>();
  const relations: IfcPropertyRelation[] = [];
  const pozNoByStepId = new Map<string, ElementPozNo>();

  for (const rawLine of ifcText.split("\n")) {
    const line = rawLine.trim();

    const elementMatch = line.match(elementRegex);
    if (elementMatch) {
      elementIds.add(elementMatch[1]);
      continue;
    }

    const pozNoMatch = line.match(pozNoValueRegex);
    if (pozNoMatch) {
      textProperties.set(pozNoMatch[1], { stepId: pozNoMatch[1], value: pozNoMatch[2] });
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
    if (relationMatch) {
      relations.push({
        relationStepId: relationMatch[1],
        relatedObjectIds: parseReferences(relationMatch[2]),
        propertySetId: relationMatch[3],
      });
    }
  }

  for (const relation of relations) {
    const propertySet = propertySets.get(relation.propertySetId);
    if (!propertySet || !isTrPsetCsb(propertySet.name)) continue;

    const pozNoProperty = propertySet.propertyIds
      .map((propertyId) => textProperties.get(propertyId))
      .find((property): property is IfcTextProperty => Boolean(property));
    if (!pozNoProperty) continue;

    for (const objectId of relation.relatedObjectIds) {
      if (!elementIds.has(objectId)) continue;
      pozNoByStepId.set(objectId, {
        stepId: objectId,
        value: pozNoProperty.value,
        sourcePath: `#${relation.relationStepId}/#${propertySet.stepId}/#${pozNoProperty.stepId}:${propertySet.name}/PozNo`,
      });
    }
  }

  return { pozNoByStepId };
}

/**
 * Reads project/parcel-level `Tr_Pset_CSB` compliance values (TAKS, KAKS,
 * CekmeOn, CekmeYan) off IfcSite or IfcBuilding entities. These are not
 * per-element properties — the current parser does not otherwise read
 * IfcSite/IfcBuilding entities at all, so this is an independent pass over
 * the raw IFC text.
 */
export function extractProjectComplianceData(ifcText: string): TrPsetCsbProjectCompliance {
  const siteIds = new Set<string>();
  const buildingIds = new Set<string>();
  const realProperties = new Map<string, IfcRealProperty>();
  const propertySets = new Map<string, IfcPropertySet>();
  const relations: IfcPropertyRelation[] = [];

  for (const rawLine of ifcText.split("\n")) {
    const line = rawLine.trim();

    const entityMatch = line.match(siteOrBuildingRegex);
    if (entityMatch) {
      if (entityMatch[2].toUpperCase() === "IFCSITE") siteIds.add(entityMatch[1]);
      else buildingIds.add(entityMatch[1]);
      continue;
    }

    const realMatch = line.match(realValueRegex);
    if (realMatch) {
      const value = Number(realMatch[3]);
      if (Number.isFinite(value)) {
        realProperties.set(realMatch[1], { stepId: realMatch[1], name: realMatch[2] as IfcRealProperty["name"], value });
      }
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
    if (relationMatch) {
      relations.push({
        relationStepId: relationMatch[1],
        relatedObjectIds: parseReferences(relationMatch[2]),
        propertySetId: relationMatch[3],
      });
    }
  }

  const valuesByEntityId = new Map<string, { values: Partial<Record<IfcRealProperty["name"], number>>; sourcePath: string }>();

  for (const relation of relations) {
    const propertySet = propertySets.get(relation.propertySetId);
    if (!propertySet || !isTrPsetCsb(propertySet.name)) continue;

    const properties = propertySet.propertyIds
      .map((propertyId) => realProperties.get(propertyId))
      .filter((property): property is IfcRealProperty => Boolean(property));
    if (properties.length === 0) continue;

    for (const objectId of relation.relatedObjectIds) {
      if (!siteIds.has(objectId) && !buildingIds.has(objectId)) continue;
      const entry = valuesByEntityId.get(objectId) ?? {
        values: {},
        sourcePath: `#${relation.relationStepId}/#${propertySet.stepId}:${propertySet.name}`,
      };
      for (const property of properties) entry.values[property.name] = property.value;
      valuesByEntityId.set(objectId, entry);
    }
  }

  const siteEntry = Array.from(siteIds).map((id) => valuesByEntityId.get(id)).find(Boolean);
  const buildingEntry = Array.from(buildingIds).map((id) => valuesByEntityId.get(id)).find(Boolean);
  const chosen = siteEntry ?? buildingEntry;

  if (!chosen) return { source: null };

  return {
    taks: chosen.values.TAKS,
    kaks: chosen.values.KAKS,
    cekmeOn: chosen.values.CekmeOn,
    cekmeYan: chosen.values.CekmeYan,
    source: siteEntry ? "ifc_site" : "ifc_building",
    sourcePath: chosen.sourcePath,
  };
}
