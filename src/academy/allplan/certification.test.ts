import assert from "node:assert/strict";
import test from "node:test";
import { ALLPLAN_ASSESSMENT, evaluateCertificationEligibility, publicAssessment, scoreAssessment } from "./certification";

test("certification eligibility requires every lesson and interactive checkpoint", () => {
  assert.deepEqual(
    evaluateCertificationEligibility(
      { completedLessonSlugs: ["a", "b"], checkpointLessonSlugs: ["b"] },
      ["a", "b"],
      ["b"],
    ),
    { eligible: true, completedLessons: 2, requiredLessons: 2, completedCheckpoints: 1, requiredCheckpoints: 1 },
  );
  assert.equal(
    evaluateCertificationEligibility(
      { completedLessonSlugs: ["a", "b"], checkpointLessonSlugs: [] },
      ["a", "b"],
      ["b"],
    ).eligible,
    false,
  );
});

test("public assessment never exposes the answer key", () => {
  assert.equal(publicAssessment().length, ALLPLAN_ASSESSMENT.length);
  assert.equal("answer" in publicAssessment()[0], false);
});

test("assessment scoring enforces the 80 percent pass threshold", () => {
  assert.deepEqual(scoreAssessment([0, 1, 2, 3, 0], [0, 1, 2, 3, 1]), { score: 80, passed: true });
  assert.deepEqual(scoreAssessment([0, 1], [0, 1, 2]), { score: 0, passed: false });
});
