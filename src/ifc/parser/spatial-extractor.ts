import { normalizeStepLines, projectLengthUnitScale } from "./units";

export interface IfcStoreyInfo {
  stepId: string;
  globalId: string;
  name: string;
  elevationM: number | null;
}

export interface IfcElementStoreyAssignment {
  elementStepId: string;
  storeyStepId: string;
  storeyName: string;
  elevationM: number | null;
  sourcePath: string;
}

export interface IfcSpatialExtraction {
  storeys: IfcStoreyInfo[];
  elementStoreys: IfcElementStoreyAssignment[];
  summary: {
    storeyCount: number;
    assignedElementCount: number;
  };
}

function parseReferences(value: string): string[] {
  return Array.from(value.matchAll(/#(\d+)/g), (match) => match[1]);
}

function formatStoreyName(name: string, elevationM: number | null): string {
  return elevationM === null ? name : `${name} (${elevationM} m)`;
}

export function extractIfcStoreyContainment(ifcText: string): IfcSpatialExtraction {
  const storeys = new Map<string, IfcStoreyInfo>();
  const elementStoreys: IfcElementStoreyAssignment[] = [];
  const lengthScale = projectLengthUnitScale(ifcText);
  const normalizedLines = normalizeStepLines(ifcText);

  const storeyRegex = /^#(\d+)\s*=\s*IFCBUILDINGSTOREY\s*\(\s*'([^']*)'\s*,\s*(?:#[0-9]+|\$)\s*,\s*'([^']*)'.*,([-+0-9.Ee]+|\$)\s*\);/i;
  const containmentRegex = /^#(\d+)\s*=\s*IFCRELCONTAINEDINSPATIALSTRUCTURE\s*\(\s*'[^']*'\s*,\s*(?:#[0-9]+|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*(?:'[^']*'|\$)\s*,\s*\(([^)]*)\)\s*,\s*#(\d+)\s*\);/i;

  for (const line of normalizedLines) {
    const match = line.match(storeyRegex);
    if (!match) continue;

    const rawElev = match[4] === "$" ? null : Number(match[4]);
    const elevationM = rawElev !== null && Number.isFinite(rawElev) ? Number((rawElev * lengthScale).toFixed(6)) : null;
    storeys.set(match[1], {
      stepId: match[1],
      globalId: match[2],
      name: match[3],
      elevationM,
    });
  }

  for (const line of normalizedLines) {
    const match = line.match(containmentRegex);
    if (!match) continue;

    const storey = storeys.get(match[3]);
    if (!storey) continue;

    for (const elementStepId of parseReferences(match[2])) {
      elementStoreys.push({
        elementStepId,
        storeyStepId: storey.stepId,
        storeyName: formatStoreyName(storey.name, storey.elevationM),
        elevationM: storey.elevationM,
        sourcePath: `#${match[1]}/#${storey.stepId}:IfcRelContainedInSpatialStructure/IfcBuildingStorey`,
      });
    }
  }

  return {
    storeys: Array.from(storeys.values()),
    elementStoreys,
    summary: {
      storeyCount: storeys.size,
      assignedElementCount: elementStoreys.length,
    },
  };
}
