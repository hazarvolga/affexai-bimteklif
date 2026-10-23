import { and, asc, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../../db";
import {
  cdeContainers,
  cdeProjectMembers,
  cdeProjects,
  cdeRevisions,
  cdeTransitionEvents,
  documentProcessingArtifacts,
  documentProcessingRuns,
  documents,
  memberships,
  users,
} from "../../db/schema";
import {
  canonicalCdeScopeHash,
  canonicalCdeTransitionRequestHash,
  transitionMetadata,
  type CdeDiscipline,
  type CdeProjectRole,
  type CdeRevisionScope,
} from "../../contracts/cde";
import { validateCdeStateTransition, type CdeState, type SuitabilityCode } from "../../smartcheck/rules/iso19650";
import { readBuildRevision } from "../../server/observability/error-tracking";

export class CdeServiceError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

type Actor = { companyId: string; userId: string };

type CdeRevisionRequest = { revisionCode: string; processingRunId: string; resultArtifactId: string };

const canManage = (role: CdeProjectRole) => role === "coordinator";
const canAuthor = (role: CdeProjectRole) => role === "coordinator" || role === "contributor";
const canDecide = (role: CdeProjectRole) => role === "coordinator" || role === "approver";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const hashCanonical = (value: unknown) => createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");

function releaseCodeHash() {
  const sourceCommit = readBuildRevision().revision?.trim().toLowerCase() ?? "";
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new CdeServiceError(503, "CDE_BUILD_IDENTITY_REQUIRED", "CDE revision oluşturmak için doğrulanmış 40 karakterli release commit kimliği zorunludur.");
  }
  return hashCanonical({ sourceCommit });
}

function ruleEvidence(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const rules = (metadata as Record<string, unknown>).ruleEvaluations;
  return rules && typeof rules === "object" && !Array.isArray(rules) && Object.keys(rules as object).length ? rules : null;
}

export class CdeService {
  async createProject(actor: Actor, input: { documentId: string; name: string }) {
    const [document] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, actor.companyId)));
    if (!document) throw new CdeServiceError(404, "DOCUMENT_NOT_FOUND", "Doküman bulunamadı.");
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(cdeProjects).where(and(eq(cdeProjects.companyId, actor.companyId), eq(cdeProjects.documentId, input.documentId)));
      if (existing) return { project: existing, created: false };
      const [project] = await tx.insert(cdeProjects).values({ companyId: actor.companyId, documentId: input.documentId, name: input.name, createdByUserId: actor.userId }).returning();
      await tx.insert(cdeProjectMembers).values({ companyId: actor.companyId, projectId: project.id, userId: actor.userId, projectRole: "coordinator", discipline: "BIM", assignedByUserId: actor.userId });
      return { project, created: true };
    });
  }

  async listProjects(actor: Actor, documentId?: string) {
    const predicates = [eq(cdeProjects.companyId, actor.companyId), eq(cdeProjectMembers.userId, actor.userId)];
    if (documentId) predicates.push(eq(cdeProjects.documentId, documentId));
    return db.select({ project: cdeProjects, projectRole: cdeProjectMembers.projectRole, discipline: cdeProjectMembers.discipline })
      .from(cdeProjects)
      .innerJoin(cdeProjectMembers, and(eq(cdeProjectMembers.projectId, cdeProjects.id), eq(cdeProjectMembers.companyId, cdeProjects.companyId)))
      .where(and(...predicates))
      .orderBy(asc(cdeProjects.createdAt));
  }

  async projectByDocument(actor: Actor, documentId: string) {
    const rows = await this.listProjects(actor, documentId);
    if (!rows[0]) throw new CdeServiceError(404, "CDE_PROJECT_NOT_FOUND", "CDE projesi bulunamadı.");
    return this.projectDetail(actor, rows[0].project.id);
  }

  async projectDetail(actor: Actor, projectId: string) {
    const { project } = await this.requireProjectRole(actor, projectId);
    const [members, containers] = await Promise.all([
      db.select().from(cdeProjectMembers).where(and(eq(cdeProjectMembers.companyId, actor.companyId), eq(cdeProjectMembers.projectId, projectId))).orderBy(asc(cdeProjectMembers.createdAt)),
      db.select().from(cdeContainers).where(and(eq(cdeContainers.companyId, actor.companyId), eq(cdeContainers.projectId, projectId))).orderBy(asc(cdeContainers.createdAt)),
    ]);
    return { ...project, members, containers };
  }

  async assignMember(actor: Actor, projectId: string, input: { userId: string; role: CdeProjectRole; discipline: CdeDiscipline }) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.companyId}:${projectId}:members`}, 0))`);
      const { role } = await this.requireProjectRole(actor, projectId, tx);
      if (!canManage(role)) throw new CdeServiceError(403, "CDE_PROJECT_ROLE_FORBIDDEN", "Bu işlem proje koordinatörü rolü gerektirir.");
      const [membership] = await tx.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.companyId, actor.companyId), eq(memberships.userId, input.userId)));
      if (!membership) throw new CdeServiceError(404, "MEMBER_NOT_FOUND", "Şirket üyesi bulunamadı.");
      const [existing] = await tx.select({ role: cdeProjectMembers.projectRole }).from(cdeProjectMembers).where(and(eq(cdeProjectMembers.companyId, actor.companyId), eq(cdeProjectMembers.projectId, projectId), eq(cdeProjectMembers.userId, input.userId)));
      if (existing?.role === "coordinator" && input.role !== "coordinator") {
        const [{ coordinatorCount }] = await tx.select({ coordinatorCount: sql<number>`count(*)::int` }).from(cdeProjectMembers).where(and(eq(cdeProjectMembers.companyId, actor.companyId), eq(cdeProjectMembers.projectId, projectId), eq(cdeProjectMembers.projectRole, "coordinator")));
        if (coordinatorCount <= 1) throw new CdeServiceError(409, "CDE_LAST_COORDINATOR_REQUIRED", "Projede en az bir koordinatör kalmalıdır.");
      }
      const [member] = await tx.insert(cdeProjectMembers).values({ companyId: actor.companyId, projectId, userId: input.userId, projectRole: input.role, discipline: input.discipline, assignedByUserId: actor.userId })
        .onConflictDoUpdate({ target: [cdeProjectMembers.companyId, cdeProjectMembers.projectId, cdeProjectMembers.userId], set: { projectRole: input.role, discipline: input.discipline, assignedByUserId: actor.userId, updatedAt: new Date() } }).returning();
      return member;
    });
  }

  async createContainer(actor: Actor, projectId: string, input: { containerCode: string; title: string }) {
    const { role } = await this.requireProjectRole(actor, projectId);
    if (!canAuthor(role)) throw new CdeServiceError(403, "CDE_PROJECT_ROLE_FORBIDDEN", "Bu işlem CDE içerik üreticisi rolü gerektirir.");
    const [existing] = await db.select().from(cdeContainers).where(and(eq(cdeContainers.companyId, actor.companyId), eq(cdeContainers.projectId, projectId), eq(cdeContainers.containerCode, input.containerCode)));
    if (existing) return { container: existing, created: false };
    const [container] = await db.insert(cdeContainers).values({ companyId: actor.companyId, projectId, containerCode: input.containerCode, title: input.title, createdByUserId: actor.userId }).returning();
    return { container, created: true };
  }

  async createOrReuseRevision(actor: Actor, containerId: string, input: CdeRevisionRequest) {
    const initialTransition = validateCdeStateTransition({ fromState: null, toState: "WIP", suitabilityCode: "S0", revisionCode: input.revisionCode, actor: actor.userId });
    if (!initialTransition.allowed) throw new CdeServiceError(422, "CDE_REVISION_CODE_INVALID", initialTransition.reason);
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.companyId}:${containerId}:revision`}, 0))`);
      const [container] = await tx.select().from(cdeContainers).where(and(eq(cdeContainers.id, containerId), eq(cdeContainers.companyId, actor.companyId)));
      if (!container) throw new CdeServiceError(404, "CDE_CONTAINER_NOT_FOUND", "CDE konteyneri bulunamadı.");
      const { project, role, discipline } = await this.requireProjectRole(actor, container.projectId, tx);
      if (!canAuthor(role)) throw new CdeServiceError(403, "CDE_PROJECT_ROLE_FORBIDDEN", "Bu işlem CDE içerik üreticisi rolü gerektirir.");
      const [evidence] = await tx.select({
        documentChecksumSha256: documents.checksumSha256,
        runId: documentProcessingRuns.id, runKey: documentProcessingRuns.idempotencyKey, pipelineVersion: documentProcessingRuns.pipelineVersion,
        provider: documentProcessingRuns.provider, model: documentProcessingRuns.model,
        artifactId: documentProcessingArtifacts.id, artifactType: documentProcessingArtifacts.artifactType,
        artifactChecksumSha256: documentProcessingArtifacts.checksumSha256, artifactMetadata: documentProcessingArtifacts.metadataJson,
      }).from(documentProcessingRuns)
        .innerJoin(documents, and(eq(documents.id, documentProcessingRuns.documentId), eq(documents.companyId, documentProcessingRuns.companyId)))
        .innerJoin(documentProcessingArtifacts, and(eq(documentProcessingArtifacts.id, input.resultArtifactId), eq(documentProcessingArtifacts.processingRunId, documentProcessingRuns.id), eq(documentProcessingArtifacts.documentId, documentProcessingRuns.documentId), eq(documentProcessingArtifacts.companyId, documentProcessingRuns.companyId)))
        .where(and(eq(documentProcessingRuns.id, input.processingRunId), eq(documentProcessingRuns.documentId, project.documentId), eq(documentProcessingRuns.companyId, actor.companyId), eq(documentProcessingRuns.status, "succeeded")));
      if (!evidence || evidence.artifactType !== "ifc_evidence") throw new CdeServiceError(422, "CDE_VERIFIED_EVIDENCE_REQUIRED", "Başarılı IFC processing run ve ona bağlı sonuç artifact kaydı zorunludur.");
      if (![evidence.documentChecksumSha256, evidence.artifactChecksumSha256].every((value) => /^[0-9a-f]{64}$/.test(value))) {
        throw new CdeServiceError(422, "CDE_EVIDENCE_HASH_INVALID", "Sunucu kanıt kayıtlarının SHA-256 özeti doğrulanamadı.");
      }
      const rules = ruleEvidence(evidence.artifactMetadata);
      if (!rules) throw new CdeServiceError(422, "CDE_RULE_EVIDENCE_REQUIRED", "Sonuç artifact kaydında sunucu kural sürümü kanıtı bulunamadı.");
      const scope: CdeRevisionScope = {
        revisionCode: input.revisionCode,
        documentChecksumSha256: evidence.documentChecksumSha256,
        sourceHash: hashCanonical({ documentChecksumSha256: evidence.documentChecksumSha256, processingRunId: evidence.runId, runKey: evidence.runKey, pipelineVersion: evidence.pipelineVersion, provider: evidence.provider, model: evidence.model }),
        ruleHash: hashCanonical(rules), resultHash: evidence.artifactChecksumSha256, codeHash: releaseCodeHash(),
      };
      const scopeHash = canonicalCdeScopeHash(scope);
      const [existing] = await tx.select().from(cdeRevisions).where(and(eq(cdeRevisions.companyId, actor.companyId), eq(cdeRevisions.containerId, containerId), eq(cdeRevisions.scopeHash, scopeHash)));
      if (existing) return { revision: existing, container, created: false, approvalInvalidated: false };

      const [revision] = await tx.insert(cdeRevisions).values({
        companyId: actor.companyId,
        projectId: container.projectId,
        containerId,
        supersedesRevisionId: container.currentRevisionId,
        documentId: project.documentId,
        processingRunId: evidence.runId,
        resultArtifactId: evidence.artifactId,
        revisionCode: input.revisionCode,
        documentChecksumSha256: scope.documentChecksumSha256,
        sourceHash: scope.sourceHash,
        ruleHash: scope.ruleHash,
        resultHash: scope.resultHash,
        codeHash: scope.codeHash,
        scopeHash,
        createdByUserId: actor.userId,
      }).returning();
      const approvalInvalidated = Boolean(container.currentScopeHash && container.currentState !== "WIP");
      const nextVersion = container.lockVersion + 1;
      const [projection] = await tx.update(cdeContainers).set({ currentRevisionId: revision.id, currentScopeHash: scopeHash, currentState: "WIP", lockVersion: nextVersion, updatedAt: new Date() })
        .where(and(eq(cdeContainers.id, containerId), eq(cdeContainers.companyId, actor.companyId), eq(cdeContainers.lockVersion, container.lockVersion))).returning();
      if (!projection) throw new CdeServiceError(409, "CDE_STALE_VERSION", "CDE konteyneri eşzamanlı olarak değiştirildi.");
      await tx.insert(cdeTransitionEvents).values({
        companyId: actor.companyId, projectId: container.projectId, containerId, revisionId: revision.id,
        idempotencyKey: `scope:${scopeHash}`, requestHash: scopeHash, action: "scope_created", decision: approvalInvalidated ? "invalidated" : "accepted",
        fromState: container.currentState, toState: "WIP", suitabilityCode: "S0", revisionCode: input.revisionCode, scopeHash,
        expectedVersion: container.lockVersion, resultingVersion: nextVersion, actorUserId: actor.userId, actorProjectRole: role, actorDiscipline: discipline,
        reason: approvalInvalidated ? "Yeni kanıt kapsamı önceki onayı geçersiz kıldı." : "İlk kanıt kapsamı oluşturuldu.",
      });
      return { revision, container: projection, created: true, approvalInvalidated };
    });
  }

  async transition(actor: Actor, containerId: string, idempotencyKey: string, input: { action: "approve" | "reject" | "withdraw"; expectedVersion: number; toState?: CdeState; suitabilityCode?: SuitabilityCode; revisionCode?: string; reason?: string }) {
    const requestHash = canonicalCdeTransitionRequestHash(input);
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.companyId}:${containerId}:${idempotencyKey}`}, 0))`);
      const [container] = await tx.select().from(cdeContainers).where(and(eq(cdeContainers.id, containerId), eq(cdeContainers.companyId, actor.companyId)));
      if (!container) throw new CdeServiceError(404, "CDE_CONTAINER_NOT_FOUND", "CDE konteyneri bulunamadı.");
      const { role, discipline } = await this.requireProjectRole(actor, container.projectId, tx);
      if (!canDecide(role)) throw new CdeServiceError(403, "CDE_PROJECT_ROLE_FORBIDDEN", "Bu işlem CDE onaylayıcı rolü gerektirir.");
      const [replay] = await tx.select().from(cdeTransitionEvents).where(and(eq(cdeTransitionEvents.companyId, actor.companyId), eq(cdeTransitionEvents.containerId, containerId), eq(cdeTransitionEvents.idempotencyKey, idempotencyKey)));
      if (replay) {
        if (replay.actorUserId !== actor.userId) throw new CdeServiceError(409, "CDE_IDEMPOTENCY_ACTOR_MISMATCH", "Idempotency-Key başka bir karar aktörüne aittir.");
        if (replay.requestHash !== requestHash) throw new CdeServiceError(409, "CDE_IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency-Key farklı bir istek gövdesiyle daha önce kullanıldı.");
        return { event: replay, replayed: true };
      }
      if (container.lockVersion !== input.expectedVersion) throw new CdeServiceError(409, "CDE_STALE_VERSION", "CDE projection sürümü güncel değil.");
      if (!container.currentRevisionId || !container.currentScopeHash) throw new CdeServiceError(409, "CDE_REVISION_REQUIRED", "Durum kararı için güncel revision zorunludur.");

      const [currentRevision] = await tx.select({ createdByUserId: cdeRevisions.createdByUserId, revisionCode: cdeRevisions.revisionCode }).from(cdeRevisions).where(and(eq(cdeRevisions.id, container.currentRevisionId), eq(cdeRevisions.companyId, actor.companyId), eq(cdeRevisions.containerId, containerId)));
      if (!currentRevision) throw new CdeServiceError(409, "CDE_CURRENT_REVISION_INVALID", "Güncel revision projection invariantı bozulmuş.");
      if (input.action === "approve" && input.toState === "PUBLISHED" && currentRevision.createdByUserId === actor.userId) {
        throw new CdeServiceError(403, "CDE_MAKER_CHECKER_REQUIRED", "Revision oluşturan kullanıcı aynı revisionı PUBLISHED durumuna onaylayamaz.");
      }
      if (input.action === "approve" && input.toState === "WIP") {
        throw new CdeServiceError(422, "CDE_ACTION_TRANSITION_MISMATCH", "WIP durumuna dönüş yalnız gerekçeli withdraw işlemiyle yapılabilir.");
      }

      const metadata = transitionMetadata(input as Parameters<typeof transitionMetadata>[0]);
      if (metadata && (metadata.toState === "WIP" || metadata.toState === "SHARED") && metadata.revisionCode !== currentRevision.revisionCode) {
        throw new CdeServiceError(422, "CDE_REVISION_CODE_MISMATCH", "WIP/SHARED kararı güncel immutable revision koduyla eşleşmelidir.");
      }
      let decision: "accepted" | "rejected" = "rejected";
      let reason = input.reason ?? "Karar gerekçesi belirtilmedi.";
      let nextState = container.currentState as CdeState;
      const nextVersion = container.lockVersion + 1;
      if (input.action !== "reject") {
        const validation = validateCdeStateTransition({ fromState: container.currentState as CdeState, ...metadata!, actor: actor.userId });
        if (!validation.allowed) throw new CdeServiceError(422, "CDE_TRANSITION_INVALID", validation.reason);
        decision = "accepted";
        reason = validation.reason;
        nextState = validation.toState;
      }
      const [updated] = await tx.update(cdeContainers).set({ currentState: nextState, lockVersion: nextVersion, updatedAt: new Date() })
        .where(and(eq(cdeContainers.id, containerId), eq(cdeContainers.companyId, actor.companyId), eq(cdeContainers.lockVersion, input.expectedVersion))).returning();
      if (!updated) throw new CdeServiceError(409, "CDE_STALE_VERSION", "CDE konteyneri eşzamanlı olarak değiştirildi.");
      const [event] = await tx.insert(cdeTransitionEvents).values({
        companyId: actor.companyId, projectId: container.projectId, containerId, revisionId: container.currentRevisionId,
        idempotencyKey, requestHash, action: input.action, decision, fromState: container.currentState, toState: metadata?.toState ?? null,
        suitabilityCode: metadata?.suitabilityCode ?? null, revisionCode: metadata?.revisionCode ?? null, scopeHash: container.currentScopeHash,
        expectedVersion: input.expectedVersion, resultingVersion: nextVersion, actorUserId: actor.userId, actorProjectRole: role, actorDiscipline: discipline, reason,
      }).returning();
      return { event, replayed: false };
    });
  }

  async history(actor: Actor, containerId: string) {
    const [container] = await db.select().from(cdeContainers).where(and(eq(cdeContainers.id, containerId), eq(cdeContainers.companyId, actor.companyId)));
    if (!container) throw new CdeServiceError(404, "CDE_CONTAINER_NOT_FOUND", "CDE konteyneri bulunamadı.");
    await this.requireProjectRole(actor, container.projectId);
    const [revisions, events] = await Promise.all([
      db.select().from(cdeRevisions).where(and(eq(cdeRevisions.companyId, actor.companyId), eq(cdeRevisions.containerId, containerId))).orderBy(asc(cdeRevisions.createdAt)),
      db.select({ event: {
        id: cdeTransitionEvents.id, revisionId: cdeTransitionEvents.revisionId, action: cdeTransitionEvents.action,
        decision: cdeTransitionEvents.decision, fromState: cdeTransitionEvents.fromState, toState: cdeTransitionEvents.toState,
        suitabilityCode: cdeTransitionEvents.suitabilityCode, revisionCode: cdeTransitionEvents.revisionCode,
        scopeHash: cdeTransitionEvents.scopeHash, expectedVersion: cdeTransitionEvents.expectedVersion,
        resultingVersion: cdeTransitionEvents.resultingVersion, actorUserId: cdeTransitionEvents.actorUserId,
        actorProjectRole: cdeTransitionEvents.actorProjectRole, actorDiscipline: cdeTransitionEvents.actorDiscipline,
        reason: cdeTransitionEvents.reason, createdAt: cdeTransitionEvents.createdAt,
      }, actor: { id: users.id, fullName: users.fullName, email: users.email } }).from(cdeTransitionEvents)
        .innerJoin(users, eq(users.id, cdeTransitionEvents.actorUserId))
        .where(and(eq(cdeTransitionEvents.companyId, actor.companyId), eq(cdeTransitionEvents.containerId, containerId))).orderBy(asc(cdeTransitionEvents.createdAt)),
    ]);
    return { container, revisions, events };
  }

  private async requireProjectRole(actor: Actor, projectId: string, executor: any = db): Promise<{ project: typeof cdeProjects.$inferSelect; role: CdeProjectRole; discipline: CdeDiscipline }> {
    const [row] = await executor.select({ project: cdeProjects, role: cdeProjectMembers.projectRole, discipline: cdeProjectMembers.discipline }).from(cdeProjects)
      .leftJoin(cdeProjectMembers, and(eq(cdeProjectMembers.projectId, cdeProjects.id), eq(cdeProjectMembers.companyId, cdeProjects.companyId), eq(cdeProjectMembers.userId, actor.userId)))
      .where(and(eq(cdeProjects.id, projectId), eq(cdeProjects.companyId, actor.companyId)));
    if (!row) throw new CdeServiceError(404, "CDE_PROJECT_NOT_FOUND", "CDE projesi bulunamadı.");
    if (!row.role) throw new CdeServiceError(403, "CDE_PROJECT_ROLE_FORBIDDEN", "CDE proje üyeliği gereklidir.");
    return { project: row.project, role: row.role as CdeProjectRole, discipline: row.discipline as CdeDiscipline };
  }
}

export const cdeService = new CdeService();
