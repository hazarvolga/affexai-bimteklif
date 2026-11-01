import type { ParsedOpening } from "./types";

export interface OpeningSizeGroup {
  widthM: number;
  heightM: number;
  count: number;
}

export interface OpeningKindOverview {
  count: number;
  measuredCount: number;
  /** Sum of width × height of the openings that have a size. */
  areaM2: number;
  /** Most frequent sizes first. */
  sizes: OpeningSizeGroup[];
}

export interface OpeningsOverview {
  door: OpeningKindOverview;
  window: OpeningKindOverview;
  unmeasuredCount: number;
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function overviewOf(openings: readonly ParsedOpening[]): OpeningKindOverview {
  const groups = new Map<string, OpeningSizeGroup>();
  let area = 0;
  let measuredCount = 0;
  for (const opening of openings) {
    if (typeof opening.widthM !== "number" || typeof opening.heightM !== "number" || opening.widthM <= 0 || opening.heightM <= 0) continue;
    measuredCount += 1;
    area += opening.widthM * opening.heightM;
    const widthM = round2(opening.widthM);
    const heightM = round2(opening.heightM);
    const key = `${widthM}x${heightM}`;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { widthM, heightM, count: 1 });
  }
  return { count: openings.length, measuredCount, areaM2: round2(area), sizes: [...groups.values()].sort((a, b) => b.count - a.count || a.widthM - b.widthM) };
}

/** Doors and windows the worker read from the model, independent of any icmal line. */
export function summarizeOpeningsOverview(openings: readonly ParsedOpening[]): OpeningsOverview {
  const door = overviewOf(openings.filter(opening => opening.kind === "door"));
  const window = overviewOf(openings.filter(opening => opening.kind === "window"));
  return { door, window, unmeasuredCount: door.count - door.measuredCount + window.count - window.measuredCount };
}
