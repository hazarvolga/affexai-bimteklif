import type { IfcSourceIdentity, ParsedIfcElement } from "../types";

export interface IfcCoverageSelection {
  globalId: string;
  elementKey: string | null;
  sourceIdentity: IfcSourceIdentity | null;
}

export function resolveCoverageSelection(
  elements: readonly ParsedIfcElement[],
  record: { globalId: string; sourceIdentity?: IfcSourceIdentity },
): IfcCoverageSelection {
  const matching = elements.filter(element => element.guid === record.globalId && element.sourceIdentity);
  const sourceIdentity = record.sourceIdentity ?? (matching.length === 1 ? matching[0].sourceIdentity : undefined) ?? null;
  return { globalId: record.globalId, elementKey: sourceIdentity?.elementKey ?? null, sourceIdentity };
}
