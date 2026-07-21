import assert from "node:assert/strict";
import test from "node:test";
import { acceptedStudyDelta, requiredStudySeconds, validateCheckpointEvidence } from "./checkpoint";

test("checkpoint evidence is validated for every native lab", () => {
  assert.equal(validateCheckpointEvidence("wall-simulator", { priority: 500 }), true);
  assert.equal(validateCheckpointEvidence("wall-simulator", { priority: 300 }), false);
  assert.equal(validateCheckpointEvidence("reinforcement-estimator", { coverMm: 35 }), true);
  assert.equal(validateCheckpointEvidence("coordinate-calculator", { origin: { x: 0, y: 0, z: 0 }, delta: { x: 2, y: 3, z: 0 }, result: { x: 2, y: 3, z: 0 } }), true);
  assert.equal(validateCheckpointEvidence("coordinate-calculator", { origin: { x: 0, y: 0, z: 0 }, delta: { x: 2, y: 3, z: 0 }, result: { x: 4, y: 3, z: 0 } }), false);
  assert.equal(validateCheckpointEvidence("shortcut-trainer", { answers: ["Viewport navigation", "Command mapping", "Workspace profile"] }), true);
  assert.equal(validateCheckpointEvidence("shortcut-trainer", { answers: ["IFC schema", "Command mapping", "Workspace profile"] }), false);
});

test("study heartbeat cannot credit more time than elapsed on the server", () => {
  assert.equal(acceptedStudyDelta(30, 30), 30);
  assert.equal(acceptedStudyDelta(30, 0), 0);
  assert.equal(acceptedStudyDelta(60, 12.9), 12);
  assert.equal(acceptedStudyDelta(61, 120), 0);
});

test("lesson completion requires a meaningful minimum study window", () => {
  assert.equal(requiredStudySeconds(20), 300);
  assert.equal(requiredStudySeconds(1), 60);
});
