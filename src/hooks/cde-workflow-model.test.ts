import assert from "node:assert/strict";
import test from "node:test";
import {
  cdeMemberForUser,
  canSubmitCdeDecision,
  currentCdeRevision,
  requiresCdeReapproval,
  type CdeHistoryView,
  type CdeProjectView,
} from "./cde-workflow-model";

const container = {
  id: "container-1",
  containerCode: "ARC-ZZ-001",
  title: "Mimari model",
  currentState: "WIP" as const,
  currentRevisionId: "revision-2",
  currentScopeHash: "b".repeat(64),
  lockVersion: 4,
};

test("only the current revision invalidation marks the container as awaiting reapproval", () => {
  const history: CdeHistoryView = {
    container,
    revisions: [
      { id: "revision-1", revisionCode: "P01.01", scopeHash: "a".repeat(64), createdByUserId: "user-1", createdAt: "2026-10-22T09:00:00Z" },
      { id: "revision-2", revisionCode: "P01.02", scopeHash: "b".repeat(64), createdByUserId: "user-2", createdAt: "2026-10-23T09:00:00Z" },
    ],
    events: [{
      event: {
        id: "event-2", revisionId: "revision-2", action: "scope_created", decision: "invalidated",
        fromState: "PUBLISHED", toState: "WIP", suitabilityCode: "S0", revisionCode: "P01.02",
        scopeHash: "b".repeat(64), expectedVersion: 3, resultingVersion: 4, actorUserId: "user-2",
        actorProjectRole: "contributor", actorDiscipline: "ARC", reason: "Kapsam değişti.", createdAt: "2026-10-23T09:00:00Z",
      },
      actor: { id: "user-2", fullName: "Ayşe Mimar", email: "ayse@example.test" },
    }],
  };
  assert.equal(requiresCdeReapproval(history), true);
  assert.equal(currentCdeRevision(history)?.revisionCode, "P01.02");

  const published = { ...history, container: { ...history.container, currentState: "PUBLISHED" as const } };
  assert.equal(requiresCdeReapproval(published), false);
});

test("current role and discipline come from the authenticated user's project membership", () => {
  const project: CdeProjectView = {
    id: "project-1", documentId: "document-1", name: "Demo", containers: [],
    members: [{ userId: "user-1", projectRole: "approver", discipline: "QA" }],
  };
  assert.deepEqual(cdeMemberForUser(project, "user-1"), project.members[0]);
  assert.equal(cdeMemberForUser(project, "user-2"), null);
});

test("a stale history snapshot cannot authorize a decision for a newly selected container", () => {
  const history: CdeHistoryView = { container, revisions: [], events: [] };
  assert.equal(canSubmitCdeDecision(history, container.id, true), true);
  assert.equal(canSubmitCdeDecision(history, "container-2", true), false);
  assert.equal(canSubmitCdeDecision(history, container.id, false), false);
});
