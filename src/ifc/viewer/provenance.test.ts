import assert from "node:assert/strict";
import { it } from "node:test";
import { parseSmartCheckRowToPseudoElement } from "../calm-icmal";

it("rehydrates canonical source identity from the persisted normalized-row formula JSON", () => {
  const fileSha256 = "a".repeat(64);
  const runId = "22222222-2222-4222-8222-222222222222";
  const element = parseSmartCheckRowToPseudoElement({
    rawDescription: "IfcWall Duvar beton hacmi · Zemin · IFC#12",
    rawUnit: "m³",
    rawQuantity: "2.5",
    formulaJson: {
      elementStepId: "#12",
      globalId: "DUPLICATE",
      elementKey: `${fileSha256}:${runId}:#12`,
      sourceFileSha256: fileSha256,
      sourceRunId: runId,
      sourceStepId: "12",
      sourceGlobalId: "DUPLICATE",
    },
  }, 0);
  assert.deepEqual(element.sourceIdentity, {
    fileSha256,
    runId,
    stepId: "12",
    globalId: "DUPLICATE",
    elementKey: `${fileSha256}:${runId}:#12`,
  });
});
