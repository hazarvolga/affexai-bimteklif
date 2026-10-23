export type CdeProjectRole = "coordinator" | "approver" | "contributor" | "viewer";
export type CdeDiscipline = "ARC" | "STR" | "MEP" | "COST" | "QA" | "BIM";
export type CdeWorkflowState = "WIP" | "SHARED" | "PUBLISHED" | "ARCHIVED";

export interface CdeContainerView {
  id: string;
  containerCode: string;
  title: string;
  currentState: CdeWorkflowState;
  currentRevisionId: string | null;
  currentScopeHash: string | null;
  lockVersion: number;
}

export interface CdeProjectMemberView {
  userId: string;
  projectRole: CdeProjectRole;
  discipline: CdeDiscipline;
}

export interface CdeProjectView {
  id: string;
  documentId: string;
  name: string;
  members: CdeProjectMemberView[];
  containers: CdeContainerView[];
}

export interface CdeRevisionView {
  id: string;
  revisionCode: string;
  scopeHash: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CdeEventView {
  event: {
    id: string;
    revisionId: string | null;
    action: "scope_created" | "approve" | "reject" | "withdraw";
    decision: "accepted" | "rejected" | "invalidated";
    fromState: CdeWorkflowState;
    toState: CdeWorkflowState | null;
    suitabilityCode: string | null;
    revisionCode: string | null;
    scopeHash: string | null;
    expectedVersion: number;
    resultingVersion: number;
    actorUserId: string;
    actorProjectRole: CdeProjectRole;
    actorDiscipline: CdeDiscipline;
    reason: string;
    createdAt: string;
  };
  actor: { id: string; fullName: string; email: string };
}

export interface CdeHistoryView {
  container: CdeContainerView;
  revisions: CdeRevisionView[];
  events: CdeEventView[];
}

export function currentCdeRevision(history: CdeHistoryView | null): CdeRevisionView | null {
  if (!history?.container.currentRevisionId) return null;
  return history.revisions.find((revision) => revision.id === history.container.currentRevisionId) ?? null;
}

export function requiresCdeReapproval(history: CdeHistoryView | null): boolean {
  if (!history || history.container.currentState !== "WIP" || !history.container.currentRevisionId) return false;
  return history.events.some(({ event }) =>
    event.revisionId === history.container.currentRevisionId &&
    event.action === "scope_created" &&
    event.decision === "invalidated",
  );
}

export function cdeMemberForUser(project: CdeProjectView | null, userId: string | null | undefined) {
  if (!project || !userId) return null;
  return project.members.find((member) => member.userId === userId) ?? null;
}

export function canSubmitCdeDecision(history: CdeHistoryView | null, selectedContainerId: string | null, historyReady: boolean) {
  return Boolean(historyReady && history && selectedContainerId && history.container.id === selectedContainerId);
}
