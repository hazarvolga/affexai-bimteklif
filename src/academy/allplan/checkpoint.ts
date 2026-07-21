import type { AllplanInteractiveTool } from "./types";

type NumericRecord = Record<string, unknown>;

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);

export function validateCheckpointEvidence(tool: AllplanInteractiveTool, evidence: unknown) {
  if (!evidence || typeof evidence !== "object") return false;
  const data = evidence as NumericRecord;
  if (tool === "wall-simulator") return finite(data.priority) && Number(data.priority) >= 500 && Number(data.priority) <= 900;
  if (tool === "reinforcement-estimator") return data.coverMm === 35;
  if (tool === "coordinate-calculator") {
    const origin = data.origin as NumericRecord | undefined;
    const delta = data.delta as NumericRecord | undefined;
    const result = data.result as NumericRecord | undefined;
    if (!origin || !delta || !result) return false;
    const axes = ["x", "y", "z"];
    return axes.every(axis => finite(origin[axis]) && finite(delta[axis]) && finite(result[axis]) && Number(origin[axis]) + Number(delta[axis]) === Number(result[axis]))
      && axes.some(axis => Number(delta[axis]) !== 0);
  }
  if (tool === "shortcut-trainer") {
    const answers = data.answers;
    return Array.isArray(answers) && answers.length === 3 && answers.every((answer, index) => answer === ["Viewport navigation", "Command mapping", "Workspace profile"][index]);
  }
  return false;
}

export const requiredStudySeconds = (estimatedMinutes: number) => Math.max(60, Math.ceil(estimatedMinutes * 60 * 0.25));

export const acceptedStudyDelta = (requestedSeconds: number, elapsedSeconds: number) => {
  if (!Number.isInteger(requestedSeconds) || requestedSeconds < 1 || requestedSeconds > 60) return 0;
  return Math.min(requestedSeconds, Math.max(0, Math.floor(elapsedSeconds)));
};
