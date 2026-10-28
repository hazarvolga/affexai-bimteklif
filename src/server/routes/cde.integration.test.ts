import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import type pg from "pg";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import { useTestIsolation } from "./test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("CDE project roles, immutable scopes, optimistic lock and idempotent decisions are tenant-safe", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const previousSourceCommit = process.env.SOURCE_COMMIT;
  process.env.SOURCE_COMMIT = "a".repeat(40);
  const [{ createApiApp }, schema, dbModule, { AuthService }, { CdeService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"), import("../../services/cde/service"),
  ]);
  const { eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA] = await db.insert(schema.companies).values({ name: `CDE A ${suffix}` }).returning();
  const [companyB] = await db.insert(schema.companies).values({ name: `CDE B ${suffix}` }).returning();
  const [owner] = await db.insert(schema.users).values({ email: `cde-owner-${suffix}@example.test`, fullName: "CDE Owner", emailVerified: new Date() }).returning();
  const [approver] = await db.insert(schema.users).values({ email: `cde-approver-${suffix}@example.test`, fullName: "CDE Approver", emailVerified: new Date() }).returning();
  const [viewer] = await db.insert(schema.users).values({ email: `cde-viewer-${suffix}@example.test`, fullName: "CDE Viewer", emailVerified: new Date() }).returning();
  const [nonMember] = await db.insert(schema.users).values({ email: `cde-nonmember-${suffix}@example.test`, fullName: "CDE Non Member", emailVerified: new Date() }).returning();
  const [other] = await db.insert(schema.users).values({ email: `cde-other-${suffix}@example.test`, fullName: "Other Tenant", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([
    { companyId: companyA.id, userId: owner.id, role: "owner" },
    { companyId: companyA.id, userId: approver.id, role: "viewer" },
    { companyId: companyA.id, userId: viewer.id, role: "viewer" },
    { companyId: companyA.id, userId: nonMember.id, role: "viewer" },
    { companyId: companyB.id, userId: other.id, role: "owner" },
  ]);
  const checksum = "a".repeat(64);
  const [document] = await db.insert(schema.documents).values({
    companyId: companyA.id, uploadedByUserId: owner.id, originalFileName: "coordination.ifc", displayName: "Coordination", mimeType: "application/x-step",
    fileSizeBytes: 128, storageKey: `${companyA.id}/coordination.ifc`, checksumSha256: checksum,
  }).returning();
  const [firstRun] = await db.insert(schema.documentProcessingRuns).values({
    companyId: companyA.id, documentId: document.id, status: "succeeded", currentStage: "completed", idempotencyKey: `cde-run-${suffix}-1`, pipelineVersion: 4, provider: "ifcopenshell", model: "0.8.5", progressPercent: 100,
  }).returning();
  const [firstArtifact] = await db.insert(schema.documentProcessingArtifacts).values({
    companyId: companyA.id, documentId: document.id, processingRunId: firstRun.id, artifactType: "ifc_evidence", storageKey: `${companyA.id}/${document.id}/${firstRun.id}/ifc-evidence.json`, checksumSha256: "d".repeat(64), contentType: "application/json", sizeBytes: 128,
    metadataJson: { ruleEvaluations: { threeByThree: { rulePackVersion: "smartcheck-3x3-test" }, epys: { rulePackVersion: "epys-test" } } },
  }).returning();
  const tokens = {
    owner: AuthService.generateToken({ userId: owner.id, companyId: companyA.id, role: "owner" }),
    approver: AuthService.generateToken({ userId: approver.id, companyId: companyA.id, role: "viewer" }),
    viewer: AuthService.generateToken({ userId: viewer.id, companyId: companyA.id, role: "viewer" }),
    nonMember: AuthService.generateToken({ userId: nonMember.id, companyId: companyA.id, role: "viewer" }),
    other: AuthService.generateToken({ userId: other.id, companyId: companyB.id, role: "owner" }),
  };
  const testTransaction = async <T>(_pool: pg.Pool, _context: Readonly<{ companyId: string; userId: string }>, work: (client: pg.PoolClient) => Promise<T>) => {
    const client = await dbModule.pool.connect();
    try {
      await client.query("begin");
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  };
  const app = createApiApp({ cdeService: new CdeService(dbModule.pool, testTransaction) });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = tokens.owner) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const post = (path: string, body: unknown, token = tokens.owner, headers: Record<string, string> = {}) => request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }, token);
  let projectId = "";
  let containerId = "";
  try {
    const projectResponse = await post("/api/cde/projects", { documentId: document.id, name: "Metro CDE" });
    assert.equal(projectResponse.status, 201);
    projectId = (await projectResponse.json() as { project: { id: string } }).project.id;
    assert.equal((await post(`/api/cde/projects/${projectId}/members`, { userId: approver.id, role: "approver", discipline: "QA" })).status, 200);
    assert.equal((await post(`/api/cde/projects/${projectId}/members`, { userId: viewer.id, role: "viewer", discipline: "ARC" })).status, 200);
    assert.equal((await post(`/api/cde/projects/${projectId}/members`, { userId: owner.id, role: "viewer", discipline: "BIM" })).status, 409, "the final coordinator cannot demote themselves");

    const containerResponse = await post(`/api/cde/projects/${projectId}/containers`, { containerCode: "PRJ-ORG-VOL-LVL-TYP-001", title: "Koordinasyon Modeli" });
    assert.equal(containerResponse.status, 201);
    containerId = (await containerResponse.json() as { container: { id: string } }).container.id;
    const scope = { revisionCode: "P01.01", processingRunId: firstRun.id, resultArtifactId: firstArtifact.id };
    assert.equal((await post(`/api/cde/containers/${containerId}/revisions`, { ...scope, documentChecksumSha256: "f".repeat(64) })).status, 400, "client-supplied evidence hashes are rejected instead of being ignored");
    assert.equal((await post(`/api/cde/containers/${containerId}/revisions`, { ...scope, resultArtifactId: crypto.randomUUID() })).status, 422, "client cannot invent an evidence hash or artifact reference");
    assert.equal((await post(`/api/cde/containers/${containerId}/revisions`, { ...scope, revisionCode: "C01" })).status, 422, "WIP projection cannot be initialized with a contractual revision code");
    const revisionResponse = await post(`/api/cde/containers/${containerId}/revisions`, scope);
    assert.equal(revisionResponse.status, 201);
    const firstRevision = await revisionResponse.json() as { revision: { id: string; scopeHash: string }; container: { lockVersion: number } };
    assert.equal(firstRevision.container.lockVersion, 1);
    const reused = await post(`/api/cde/containers/${containerId}/revisions`, scope);
    assert.equal(reused.status, 200);
    assert.equal((await reused.json() as { created: boolean }).created, false);

    const sharedDecision = { action: "approve", expectedVersion: 1, toState: "SHARED", suitabilityCode: "S2", revisionCode: "P01.01", reason: "Koordinasyon kontrol edildi." };
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, sharedDecision, tokens.viewer, { "Idempotency-Key": "viewer-cannot-approve" })).status, 403);
    const approved = await post(`/api/cde/containers/${containerId}/transitions`, sharedDecision, tokens.approver, { "Idempotency-Key": "approve-shared" });
    assert.equal(approved.status, 200);
    const approvedBody = await approved.json() as { replayed: boolean; event: { resultingVersion: number; reason: string } };
    assert.equal(approvedBody.event.resultingVersion, 2);
    assert.equal(approvedBody.event.reason, sharedDecision.reason);
    const replay = await post(`/api/cde/containers/${containerId}/transitions`, sharedDecision, tokens.approver, { "Idempotency-Key": "approve-shared" });
    assert.equal(replay.status, 200);
    const replayBody = await replay.json() as { replayed: boolean; event: { reason: string } };
    assert.equal(replayBody.replayed, true);
    assert.equal(replayBody.event.reason, sharedDecision.reason);
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { action: "approve", expectedVersion: 2, toState: "WIP", suitabilityCode: "S0", revisionCode: "P01.01" }, tokens.approver, { "Idempotency-Key": "approve-cannot-withdraw" })).status, 422, "approve cannot bypass the reasoned withdraw audit action");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, sharedDecision, tokens.viewer, { "Idempotency-Key": "approve-shared" })).status, 403, "viewer cannot replay an authorized decision");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, sharedDecision, tokens.nonMember, { "Idempotency-Key": "approve-shared" })).status, 403, "same-tenant non-member cannot replay a project decision");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { ...sharedDecision, reason: "different payload" }, tokens.approver, { "Idempotency-Key": "approve-shared" })).status, 409, "same key cannot replay a different payload");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { ...sharedDecision, toState: "PUBLISHED", suitabilityCode: "A1", revisionCode: "C01" }, tokens.approver, { "Idempotency-Key": "stale" })).status, 409);
    const competing = await Promise.all([
      post(`/api/cde/containers/${containerId}/transitions`, { action: "reject", expectedVersion: 2, reason: "Koordinasyon eksik." }, tokens.approver, { "Idempotency-Key": "reject-a" }),
      post(`/api/cde/containers/${containerId}/transitions`, { action: "reject", expectedVersion: 2, reason: "Koordinasyon eksik." }, tokens.approver, { "Idempotency-Key": "reject-b" }),
    ]);
    assert.deepEqual(competing.map((response) => response.status).sort(), [200, 409], "optimistic lock admits exactly one concurrent decision");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { action: "approve", expectedVersion: 3, toState: "PUBLISHED", suitabilityCode: "A1", revisionCode: "C01" }, tokens.owner, { "Idempotency-Key": "self-publish" })).status, 403, "maker cannot publish own revision");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { action: "approve", expectedVersion: 3, toState: "PUBLISHED", suitabilityCode: "A1", revisionCode: "C01" }, tokens.approver, { "Idempotency-Key": "publish" })).status, 200);

    const [secondRun] = await db.insert(schema.documentProcessingRuns).values({
      companyId: companyA.id, documentId: document.id, status: "succeeded", currentStage: "completed", idempotencyKey: `cde-run-${suffix}-2`, pipelineVersion: 4, provider: "ifcopenshell", model: "0.8.5", progressPercent: 100,
    }).returning();
    const [secondArtifact] = await db.insert(schema.documentProcessingArtifacts).values({
      companyId: companyA.id, documentId: document.id, processingRunId: secondRun.id, artifactType: "ifc_evidence", storageKey: `${companyA.id}/${document.id}/${secondRun.id}/ifc-evidence.json`, checksumSha256: "1".repeat(64), contentType: "application/json", sizeBytes: 129,
      metadataJson: { ruleEvaluations: { threeByThree: { rulePackVersion: "smartcheck-3x3-test" }, epys: { rulePackVersion: "epys-test" } } },
    }).returning();
    const newScope = { revisionCode: "P02.01", processingRunId: secondRun.id, resultArtifactId: secondArtifact.id };
    const invalidatedResponse = await post(`/api/cde/containers/${containerId}/revisions`, newScope);
    assert.equal(invalidatedResponse.status, 201);
    const invalidated = await invalidatedResponse.json() as { approvalInvalidated: boolean; revision: { supersedesRevisionId: string }; container: { currentState: string; lockVersion: number } };
    assert.equal(invalidated.approvalInvalidated, true);
    assert.equal(invalidated.revision.supersedesRevisionId, firstRevision.revision.id);
    assert.equal(invalidated.container.currentState, "WIP");
    assert.equal(invalidated.container.lockVersion, 5);

    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { action: "approve", expectedVersion: 5, toState: "SHARED", suitabilityCode: "S2", revisionCode: "P99.99" }, tokens.approver, { "Idempotency-Key": "wrong-revision" })).status, 422, "shared decisions must match the immutable current revision code");
    assert.equal((await post(`/api/cde/containers/${containerId}/transitions`, { action: "approve", expectedVersion: 5, toState: "SHARED", suitabilityCode: "S2", revisionCode: "P02.01" }, tokens.approver, { "Idempotency-Key": "approve-second-shared" })).status, 200);
    const withdrawn = await post(`/api/cde/containers/${containerId}/transitions`, { action: "withdraw", expectedVersion: 6, reason: "Koordinasyon girdisi güncellenecek.", revisionCode: "P02.01" }, tokens.approver, { "Idempotency-Key": "withdraw-second" });
    assert.equal(withdrawn.status, 200);
    const withdrawBody = await withdrawn.json() as { event: { decision: string; resultingVersion: number; reason: string }; container: { currentState: string } };
    assert.equal(withdrawBody.event.resultingVersion, 7);
    assert.equal(withdrawBody.event.reason, "Koordinasyon girdisi güncellenecek.");
    const withdrawReplay = await post(`/api/cde/containers/${containerId}/transitions`, { action: "withdraw", expectedVersion: 6, reason: "Koordinasyon girdisi güncellenecek.", revisionCode: "P02.01" }, tokens.approver, { "Idempotency-Key": "withdraw-second" });
    assert.equal((await withdrawReplay.json() as { event: { reason: string } }).event.reason, "Koordinasyon girdisi güncellenecek.");

    const history = await request(`/api/cde/containers/${containerId}/history`);
    assert.equal(history.status, 200);
    const historyBody = await history.json() as { revisions: unknown[]; events: Array<{ event: { action: string; decision: string; actorDiscipline: string; reason: string }; actor: { email: string } }> };
    assert.equal(historyBody.revisions.length, 2);
    assert.ok(historyBody.events.some(({ event }) => event.decision === "invalidated"));
    assert.equal(historyBody.events.find(({ event }) => event.action === "reject")?.event.reason, "Koordinasyon eksik.");
    assert.equal(historyBody.events.find(({ event }) => event.action === "approve")?.event.reason, sharedDecision.reason);
    assert.ok(historyBody.events.some(({ event }) => event.action === "withdraw" && event.decision === "accepted"));
    assert.equal(historyBody.events.find(({ event }) => event.action === "withdraw")?.event.reason, "Koordinasyon girdisi güncellenecek.");
    assert.ok(historyBody.events.some(({ event, actor }) => event.actorDiscipline === "QA" && actor.email === approver.email));
    assert.equal(JSON.stringify(historyBody).includes("approve-shared"), false, "history DTO does not expose idempotency keys");
    assert.equal((await request(`/api/cde/projects/by-document/${document.id}`, {}, tokens.other)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.cdeTransitionEvents).where(eq(schema.cdeTransitionEvents.companyId, companyA.id));
    await db.update(schema.cdeContainers).set({ currentRevisionId: null, currentScopeHash: null }).where(eq(schema.cdeContainers.companyId, companyA.id));
    await db.delete(schema.cdeRevisions).where(eq(schema.cdeRevisions.companyId, companyA.id));
    await db.delete(schema.cdeContainers).where(eq(schema.cdeContainers.companyId, companyA.id));
    await db.delete(schema.cdeProjectMembers).where(eq(schema.cdeProjectMembers.companyId, companyA.id));
    await db.delete(schema.cdeProjects).where(eq(schema.cdeProjects.companyId, companyA.id));
    await db.delete(schema.documentProcessingArtifacts).where(eq(schema.documentProcessingArtifacts.companyId, companyA.id));
    await db.delete(schema.documentProcessingRuns).where(eq(schema.documentProcessingRuns.companyId, companyA.id));
    await db.delete(schema.documents).where(eq(schema.documents.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.companyId, companyA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.companyId, companyB.id));
    await db.delete(schema.users).where(eq(schema.users.id, owner.id));
    await db.delete(schema.users).where(eq(schema.users.id, approver.id));
    await db.delete(schema.users).where(eq(schema.users.id, viewer.id));
    await db.delete(schema.users).where(eq(schema.users.id, nonMember.id));
    await db.delete(schema.users).where(eq(schema.users.id, other.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
    if (previousSourceCommit === undefined) delete process.env.SOURCE_COMMIT;
    else process.env.SOURCE_COMMIT = previousSourceCommit;
  }
});
