import assert from "node:assert/strict";
import { it } from "node:test";
import type { IfcSourceIdentity, ParsedIfcElement } from "../types";
import { resolveCoverageSelection } from "./selection";

const base = { fileSha256: "a".repeat(64), runId: "22222222-2222-4222-8222-222222222222", globalId: "DUP" };
const identity = (stepId: string): IfcSourceIdentity => ({ ...base, stepId, elementKey: `${base.fileSha256}:${base.runId}:#${stepId}` });
const element = (sourceIdentity: IfcSourceIdentity): ParsedIfcElement => ({ id: sourceIdentity.stepId, guid: sourceIdentity.globalId, type: "IfcWall", name: "Duvar", storey: "Zemin", storeySource: "ifc_spatial", volumeM3: 1, formworkM2: 0, rebarKg: 0, quantitySource: "qto", smartCheckStatus: "pass", sourceIdentity });

it("never resolves a duplicate GlobalId by first-match and honors record sourceIdentity", () => {
  const first = identity("12");
  const second = identity("13");
  const elements = [element(first), element(second)];
  assert.deepEqual(resolveCoverageSelection(elements, { globalId: "DUP" }), { globalId: "DUP", elementKey: null, sourceIdentity: null });
  assert.deepEqual(resolveCoverageSelection(elements, { globalId: "DUP", sourceIdentity: second }), { globalId: "DUP", elementKey: second.elementKey, sourceIdentity: second });
});
