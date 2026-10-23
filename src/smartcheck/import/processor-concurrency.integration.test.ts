import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { useTestIsolation } from "../../server/routes/test-isolation";
import { isProcessingRunStale } from "./run-health";

useTestIsolation();

test("SmartCheck processing atomically claims one worker per run", { timeout: 30_000 }, async () => {
  const [{ db }, schema, processor, storageModule] = await Promise.all([
    import("../../db"),
    import("../../db/schema"),
    import("./processor"),
    import("./storage"),
  ]);
  const { companies, documentProcessingArtifacts, documentProcessingRuns, documents, memberships, normalizedQuantityRows, users } = schema;
  const [company] = await db.insert(companies).values({ name: "Exclusive worker claim" }).returning();
  const [user] = await db.insert(users).values({ email: `${crypto.randomUUID()}@example.test`, fullName: "Owner" }).returning();
  await db.insert(memberships).values({ companyId: company.id, userId: user.id, role: "owner" });
  const content = Buffer.from("Poz No,Açıklama,Birim,Miktar\n15.001,Beton,m3,10\n");
  const checksum = crypto.createHash("sha256").update(content).digest("hex");
  const storageKey = `${company.id}/claim.csv`;
  await storageModule.createStorageAdapter().put(storageKey, content, "text/csv");
  const [document] = await db.insert(documents).values({
    companyId: company.id,
    uploadedByUserId: user.id,
    originalFileName: "claim.csv",
    displayName: "Claim",
    mimeType: "text/csv",
    fileSizeBytes: content.length,
    storageKey,
    checksumSha256: checksum,
  }).returning();
  const [run] = await db.insert(documentProcessingRuns).values({
    companyId: company.id,
    documentId: document.id,
    idempotencyKey: crypto.randomUUID(),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }).returning();
  const payload = { companyId: company.id, documentId: document.id, processingRunId: run.id };
  const claims = await Promise.all([
    processor.claimSmartCheckRun(payload, "job-a"),
    processor.claimSmartCheckRun(payload, "job-b"),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  const [claimed] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, run.id));
  assert.equal(claimed.status, "running");
  assert.equal(isProcessingRunStale(claimed), false, "claim must refresh the stale-run heartbeat");

  await db.update(documentProcessingRuns).set({ status: "queued", startedAt: null, workerJobId: null, workerLeaseToken: null }).where(eq(documentProcessingRuns.id, run.id));

  await Promise.all([
    processor.processSmartCheckDocument(payload, "job-c"),
    processor.processSmartCheckDocument(payload, "job-d"),
  ]);
  const [completed] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, run.id));
  assert.equal(completed.status, "succeeded");
  const [completedDocument] = await db.select().from(documents).where(eq(documents.id, document.id));
  assert.equal(completedDocument.status, "awaiting_review");
  assert.equal((await db.select().from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.companyId, company.id), eq(normalizedQuantityRows.processingRunId, run.id)))).length, 1);
  assert.equal((await db.select().from(documentProcessingArtifacts).where(and(eq(documentProcessingArtifacts.companyId, company.id), eq(documentProcessingArtifacts.processingRunId, run.id)))).length, 1);

  const [recoveredRun] = await db.insert(documentProcessingRuns).values({
    companyId: company.id,
    documentId: document.id,
    idempotencyKey: crypto.randomUUID(),
  }).returning();
  const recoveredPayload = { ...payload, processingRunId: recoveredRun.id };
  let releaseCanonicalWrite!: () => void;
  const canonicalWriteGate = new Promise<void>((resolve) => { releaseCanonicalWrite = resolve; });
  let canonicalWriteReached!: () => void;
  const atCanonicalWrite = new Promise<void>((resolve) => { canonicalWriteReached = resolve; });
  const staleWorker = processor.processSmartCheckDocument(recoveredPayload, "job-recovered", {
    beforeCanonicalWrite: async () => {
      canonicalWriteReached();
      await canonicalWriteGate;
    },
  });
  await atCanonicalWrite;
  await db.update(documentProcessingRuns).set({
    status: "failed",
    currentStage: "failed",
    errorCode: "WORKER_STALE",
    workerJobId: null,
    workerLeaseToken: null,
    updatedAt: new Date(),
  }).where(eq(documentProcessingRuns.id, recoveredRun.id));
  await db.update(documents).set({ status: "failed" }).where(eq(documents.id, document.id));
  releaseCanonicalWrite();
  await assert.rejects(staleWorker, processor.SmartCheckRunLeaseLostError);
  const [stillRecovered] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, recoveredRun.id));
  assert.equal(stillRecovered.status, "failed");
  assert.equal((await db.select().from(normalizedQuantityRows).where(eq(normalizedQuantityRows.processingRunId, recoveredRun.id))).length, 0);
  assert.equal((await db.select().from(documentProcessingArtifacts).where(eq(documentProcessingArtifacts.processingRunId, recoveredRun.id))).length, 0);

  const [redeliveredRun] = await db.insert(documentProcessingRuns).values({
    companyId: company.id,
    documentId: document.id,
    idempotencyKey: crypto.randomUUID(),
  }).returning();
  const redeliveredPayload = { ...payload, processingRunId: redeliveredRun.id };
  let releaseOldArtifact!: () => void;
  const oldArtifactGate = new Promise<void>((resolve) => { releaseOldArtifact = resolve; });
  let oldArtifactReached!: () => void;
  const atOldArtifact = new Promise<void>((resolve) => { oldArtifactReached = resolve; });
  const oldDelivery = processor.processSmartCheckDocument(redeliveredPayload, "job-redelivery", {
    afterArtifactPut: async () => {
      oldArtifactReached();
      await oldArtifactGate;
    },
  });
  await atOldArtifact;
  await processor.processSmartCheckDocument(redeliveredPayload, "job-redelivery");
  releaseOldArtifact();
  await assert.rejects(oldDelivery, processor.SmartCheckRunLeaseLostError);
  const [redelivered] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, redeliveredRun.id));
  assert.equal(redelivered.status, "succeeded", "the same Graphile job must reclaim a crashed running delivery");
  const [publishedArtifact] = await db.select().from(documentProcessingArtifacts).where(eq(documentProcessingArtifacts.processingRunId, redeliveredRun.id));
  assert.ok(publishedArtifact.storageKey.includes(redelivered.workerLeaseToken!));
  const publishedContent = await storageModule.createStorageAdapter().get(publishedArtifact.storageKey);
  assert.equal(crypto.createHash("sha256").update(publishedContent).digest("hex"), publishedArtifact.checksumSha256);
});
