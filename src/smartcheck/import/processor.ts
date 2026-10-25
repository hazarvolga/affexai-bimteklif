import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { documentProcessingArtifacts, documentProcessingRuns, documents, normalizedQuantityRows } from "../../db/schema";
import { createStorageAdapter } from "./storage";
import { detectAndValidateFile, sanitizeSpreadsheetText, sha256, validateXlsxArchive } from "./file-security";
import { type ColumnMapping, type ParsedQuantityRow, suggestMapping, validateRows } from "./normalize";
import { buildIfcSmartCheckEvidenceFromContent } from "../../ifc/smartcheck-processing";
import { parseIfcText } from "../../ifc/parser/legacy-parser";
import { buildIfcSmartCheckEvidenceArtifact } from "../../ifc/smartcheck-evidence";
import { IfcWorkerError, runPythonIfcExtractor } from "./ifc-python-runner";
import { consumeIfcUsage } from "../../services/billing/quota";
import { applyIfcRuleEvaluations, evaluateIfcRulePacks } from "../rules/ifc-rule-run";
import { runEpysPreflight, summarizeEpysPreflight } from "./epys-preflight-runner";
import { buildPdfProcessingArtifacts, type PdfProcessingArtifact } from "./pdf-artifacts";
import { captureError } from "../../server/observability/error-tracking";
import { isActiveStandard } from "../rules/three-by-three";
import { fetchWorkerCompanyContext } from "./worker-company-context";

export { inspectDocument } from "./spreadsheet-runner";
export { buildPdfProcessingArtifacts, type PdfProcessingArtifact } from "./pdf-artifacts";
export type { DocumentPreview, PreviewSheet } from "./spreadsheet-parser";
import { parseDocument } from "./spreadsheet-runner";

export class SmartCheckRunLeaseLostError extends Error {
  constructor() {
    super("SMARTCHECK_RUN_LEASE_LOST");
    this.name = "SmartCheckRunLeaseLostError";
  }
}

async function assertRunLease(tx: any, runId: string, companyId: string, leaseToken: string) {
  const [lease] = await tx.select({ id: documentProcessingRuns.id })
    .from(documentProcessingRuns)
    .where(and(
      eq(documentProcessingRuns.id, runId),
      eq(documentProcessingRuns.companyId, companyId),
      eq(documentProcessingRuns.status, "running"),
      eq(documentProcessingRuns.workerLeaseToken, leaseToken),
    ))
    .for("update");
  if (!lease) throw new SmartCheckRunLeaseLostError();
}

async function updateRun(runId: string, companyId: string, leaseToken: string, values: Partial<typeof documentProcessingRuns.$inferInsert>) {
  const updated = await db.update(documentProcessingRuns).set({ ...values, updatedAt: new Date() }).where(and(
    eq(documentProcessingRuns.id, runId),
    eq(documentProcessingRuns.companyId, companyId),
    eq(documentProcessingRuns.status, "running"),
    eq(documentProcessingRuns.workerLeaseToken, leaseToken),
  )).returning({ id: documentProcessingRuns.id });
  if (updated.length === 0) throw new SmartCheckRunLeaseLostError();
}

async function chunkedInsert<T extends Record<string, any>>(tx: any, table: any, items: T[], chunkSize = 500) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await tx.insert(table).values(chunk);
    }
  }
}

/**
 * RG 33331 e-PYS pre-check (EK-9) stored as its own artifact. It is advisory: a failure is
 * reported to error tracking and never fails the quantity-evidence run.
 */
async function storeEpysPreflight(input: {
  companyId: string; documentId: string; processingRunId: string; inputPath: string; fileName: string;
  leaseToken: string;
  storage: ReturnType<typeof createStorageAdapter>;
}) {
  const { companyId, documentId, processingRunId, leaseToken, storage } = input;
  try {
    const report = await runEpysPreflight({ inputPath: input.inputPath, fileName: input.fileName });
    const content = Buffer.from(JSON.stringify(report, null, 2));
    const storageKey = `${companyId}/${documentId}/${processingRunId}/${leaseToken}/epys-preflight.json`;
    await storage.put(storageKey, content, "application/json");
    const metadataJson = summarizeEpysPreflight(report);
    await db.transaction(async (tx) => {
      await assertRunLease(tx, processingRunId, companyId, leaseToken);
      await tx.insert(documentProcessingArtifacts).values({
        companyId, documentId, processingRunId, artifactType: "epys_preflight", storageKey,
        checksumSha256: sha256(content), contentType: "application/json", sizeBytes: content.length, metadataJson,
      }).onConflictDoUpdate({
        target: [documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.artifactType],
        set: { storageKey, checksumSha256: sha256(content), sizeBytes: content.length, metadataJson },
      });
    });
  } catch (error) {
    if (error instanceof SmartCheckRunLeaseLostError) throw error;
    console.error("e-PYS pre-check failed; quantity evidence continues", { processingRunId });
    captureError(error, { task: "epys_preflight", processingRunId });
  }
}

async function processIfcSmartCheckDocument(payload: {
  companyId: string;
  documentId: string;
  processingRunId: string;
  originalFileName: string;
  checksumSha256: string;
  content?: Buffer;
  filePath?: string;
  leaseToken: string;
}) {
  const { companyId, documentId, processingRunId, originalFileName, checksumSha256, content, filePath, leaseToken } = payload;
  const engine = (process.env.SMARTCHECK_IFC_ENGINE || (process.env.NODE_ENV === "production" ? "ifcopenshell" : "legacy")).toLowerCase();
  if (process.env.NODE_ENV === "production" && engine !== "ifcopenshell") throw new Error("IFC_PRODUCTION_ENGINE_REQUIRED");
  const storage = createStorageAdapter();

  let artifact: ReturnType<typeof buildIfcSmartCheckEvidenceFromContent>;

  if (engine === "ifcopenshell") {
    let resolvedPath = filePath;
    let cleanupDir: string | null = null;
    if (!resolvedPath) {
      if (!content) throw new Error("IFC_CONTENT_OR_FILE_REQUIRED");
      cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-ifc-tmp-"));
      resolvedPath = path.join(cleanupDir, "model.ifc");
      await fs.writeFile(resolvedPath, content);
    }
    try {
      await storeEpysPreflight({ companyId, documentId, processingRunId, inputPath: resolvedPath, fileName: originalFileName, leaseToken, storage });
      const pythonResult = await runPythonIfcExtractor({
        inputPath: resolvedPath,
        fileName: originalFileName,
        runId: processingRunId,
      });
      artifact = buildIfcSmartCheckEvidenceArtifact(pythonResult.elements, pythonResult.summary, {
        fileName: originalFileName,
        checksumSha256,
        parserVersion: pythonResult.parserVersion,
      });
    } finally {
      if (cleanupDir) {
        await fs.rm(cleanupDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  } else if (engine === "shadow") {
    let resolvedPath = filePath;
    let cleanupDir: string | null = null;
    if (!resolvedPath) {
      if (!content) throw new Error("IFC_CONTENT_OR_FILE_REQUIRED");
      cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-ifc-tmp-"));
      resolvedPath = path.join(cleanupDir, "model.ifc");
      await fs.writeFile(resolvedPath, content);
    }

    const legacyContent = content ?? await fs.readFile(resolvedPath);
    const legacyText = legacyContent.toString("utf8");
    const legacyParsed = parseIfcText(legacyText);
    artifact = buildIfcSmartCheckEvidenceArtifact(legacyParsed.elements, legacyParsed.summary, {
      fileName: originalFileName,
      checksumSha256,
      schemaName: legacyText.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i)?.[1],
      parserVersion: "legacy-ifc-evidence-v1",
    });

    try {
      const pythonResult = await runPythonIfcExtractor({
        inputPath: resolvedPath,
        fileName: originalFileName,
        runId: processingRunId,
      });

      const ls = legacyParsed.summary;
      const ps = pythonResult.summary;

      const beamCountDiff = Math.abs(ls.beamCount - ps.beamCount);
      const beamVolumeDiff = Number(Math.abs(ls.beamVolumeM3 - ps.beamVolumeM3).toFixed(3));
      const columnCountDiff = Math.abs(ls.columnCount - ps.columnCount);
      const columnVolumeDiff = Number(Math.abs(ls.columnVolumeM3 - ps.columnVolumeM3).toFixed(3));
      const slabCountDiff = Math.abs(ls.slabCount - ps.slabCount);
      const slabVolumeDiff = Number(Math.abs(ls.slabVolumeM3 - ps.slabVolumeM3).toFixed(3));
      const wallCountDiff = Math.abs(ls.wallCount - ps.wallCount);
      const wallVolumeDiff = Number(Math.abs(ls.wallVolumeM3 - ps.wallVolumeM3).toFixed(3));
      const rebarCountDiff = Math.abs(ls.rebarCount - ps.rebarCount);
      const rebarWeightDiff = Number(Math.abs(ls.totalRebarKg - ps.totalRebarKg).toFixed(3));
      const formworkDiff = Number(Math.abs(ls.totalFormworkM2 - ps.totalFormworkM2).toFixed(3));
      const totalVolumeDiff = Number(Math.abs(ls.totalVolumeM3 - ps.totalVolumeM3).toFixed(3));
      const totalElementCountDiff = Math.abs(ls.totalElements - ps.totalElements);

      const isDivergent =
        totalElementCountDiff > 0 ||
        beamCountDiff > 0 || columnCountDiff > 0 || slabCountDiff > 0 || wallCountDiff > 0 || rebarCountDiff > 0 ||
        totalVolumeDiff > 0.05 ||
        beamVolumeDiff > 0.05 || columnVolumeDiff > 0.05 || slabVolumeDiff > 0.05 || wallVolumeDiff > 0.05 ||
        formworkDiff > 0.05 ||
        rebarWeightDiff > 0.5;

      const shadowReport = {
        mode: "shadow",
        timestamp: new Date().toISOString(),
        legacySummary: ls,
        pythonSummary: ps,
        totalElementCountDiff,
        totalVolumeDeltaM3: totalVolumeDiff,
        totalFormworkDeltaM2: formworkDiff,
        totalRebarWeightDeltaKg: rebarWeightDiff,
        parityStatus: isDivergent ? "divergence" : "match",
        typeBreakdown: {
          beam: { legacyCount: ls.beamCount, pythonCount: ps.beamCount, legacyVolumeM3: ls.beamVolumeM3, pythonVolumeM3: ps.beamVolumeM3, countDelta: beamCountDiff, volumeDeltaM3: beamVolumeDiff },
          column: { legacyCount: ls.columnCount, pythonCount: ps.columnCount, legacyVolumeM3: ls.columnVolumeM3, pythonVolumeM3: ps.columnVolumeM3, countDelta: columnCountDiff, volumeDeltaM3: columnVolumeDiff },
          slab: { legacyCount: ls.slabCount, pythonCount: ps.slabCount, legacyVolumeM3: ls.slabVolumeM3, pythonVolumeM3: ps.slabVolumeM3, countDelta: slabCountDiff, volumeDeltaM3: slabVolumeDiff },
          wall: { legacyCount: ls.wallCount, pythonCount: ps.wallCount, legacyVolumeM3: ls.wallVolumeM3, pythonVolumeM3: ps.wallVolumeM3, countDelta: wallCountDiff, volumeDeltaM3: wallVolumeDiff },
          rebar: { legacyCount: ls.rebarCount, pythonCount: ps.rebarCount, legacyWeightKg: ls.totalRebarKg, pythonWeightKg: ps.totalRebarKg, countDelta: rebarCountDiff, weightDeltaKg: rebarWeightDiff },
        },
      };

      const shadowContent = Buffer.from(JSON.stringify(shadowReport, null, 2));
      const shadowKey = `${companyId}/${documentId}/${processingRunId}/${leaseToken}/ifc-shadow-report.json`;
      await storage.put(shadowKey, shadowContent, "application/json");

      await db.transaction(async (tx) => {
        await assertRunLease(tx, processingRunId, companyId, leaseToken);
        await tx.insert(documentProcessingArtifacts).values({
          companyId,
          documentId,
          processingRunId,
          artifactType: "ifc_shadow_report",
          storageKey: shadowKey,
          checksumSha256: sha256(shadowContent),
          contentType: "application/json",
          sizeBytes: shadowContent.length,
          metadataJson: shadowReport,
        }).onConflictDoUpdate({
          target: [documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.artifactType],
          set: {
            storageKey: shadowKey,
            checksumSha256: sha256(shadowContent),
            sizeBytes: shadowContent.length,
            metadataJson: shadowReport,
          },
        });
      });
    } catch (shadowErr) {
      if (shadowErr instanceof SmartCheckRunLeaseLostError) throw shadowErr;
      console.error("IFC shadow comparison execution failed, continuing with legacy artifact:", shadowErr);
    } finally {
      if (cleanupDir) {
        await fs.rm(cleanupDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  } else {
    // Default legacy parser
    const legacyContent = content ?? (filePath ? await fs.readFile(filePath) : null);
    if (!legacyContent) throw new Error("IFC_CONTENT_OR_FILE_REQUIRED");
    artifact = buildIfcSmartCheckEvidenceFromContent({
      fileName: originalFileName,
      checksumSha256,
      content: legacyContent,
    });
  }

  await updateRun(processingRunId, companyId, leaseToken, {
    currentStage: "normalizing",
    progressPercent: 45,
    progressMessage: "IFC property evidence satırları hazırlanıyor",
  });

  // 3x3 and e-PYS run on the server for every IFC run; results are stored as run evidence (E-1, E-6).
  const companyContext = await fetchWorkerCompanyContext(companyId);
  if (!companyContext.companyExists || !companyContext.activeStandard) throw new Error("TENANT_COMPANY_MISSING");
  if (!isActiveStandard(companyContext.activeStandard)) throw new Error("UNKNOWN_ACTIVE_STANDARD");
  artifact = applyIfcRuleEvaluations(artifact, evaluateIfcRulePacks(artifact, companyContext.activeStandard));
  const ruleSummary = {
    threeByThree: {
      rulePackVersion: artifact.ruleEvaluations!.threeByThree.rulePackVersion,
      activeStandard: artifact.ruleEvaluations!.threeByThree.activeStandard,
      status: artifact.ruleEvaluations!.threeByThree.status,
      violationCount: artifact.ruleEvaluations!.threeByThree.violations.length,
      normativeObservationCount: artifact.ruleEvaluations!.threeByThree.normativeObservations.length,
      coverage: artifact.ruleEvaluations!.threeByThree.coverage,
      governance: artifact.ruleEvaluations!.threeByThree.governance,
    },
    epys: {
      rulePackVersion: artifact.ruleEvaluations!.epys.rulePackVersion,
      isValid: artifact.ruleEvaluations!.epys.isValid,
      score: artifact.ruleEvaluations!.epys.score,
      evaluationStatus: artifact.ruleEvaluations!.epys.evaluationStatus,
      sourceVerificationStatus: artifact.ruleEvaluations!.epys.sourceVerificationStatus,
      checks: artifact.ruleEvaluations!.epys.checks,
    },
  };

  const artifactContent = Buffer.from(JSON.stringify(artifact, null, 2));
  const artifactKey = `${companyId}/${documentId}/${processingRunId}/${leaseToken}/ifc-evidence.json`;
  await storage.put(artifactKey, artifactContent, "application/json");

  await updateRun(processingRunId, companyId, leaseToken, {
    currentStage: "validating",
    progressPercent: 70,
    progressMessage: "IFC evidence admission kontrolleri çalışıyor",
  });

  if (artifact.rows.length === 0) {
    throw new Error("IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE");
  }

  await db.transaction(async (tx) => {
    await assertRunLease(tx, processingRunId, companyId, leaseToken);
    await tx.delete(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.processingRunId, processingRunId), eq(normalizedQuantityRows.companyId, companyId)));
    if (artifact.rows.length) {
      const rowsToInsert = artifact.rows.map((row) => ({
        companyId,
        documentId,
        processingRunId,
        sheetName: row.sheetName,
        sourceRowNumber: row.sourceRowNumber,
        sourceCellRange: row.sourceCellRange,
        rawDescription: row.rawDescription,
        rawPositionCode: row.rawPositionCode,
        rawUnit: row.rawUnit,
        rawQuantity: row.rawQuantity,
        rawPrice: row.rawPrice,
        rawWastePercent: row.rawWastePercent,
        formulaJson: row.formulaJson,
        normalizedDescription: row.normalizedDescription,
        normalizedPositionCode: row.normalizedPositionCode,
        normalizedUnit: row.normalizedUnit,
        normalizedQuantity: row.normalizedQuantity,
        normalizedPrice: row.normalizedPrice,
        normalizedWastePercent: row.normalizedWastePercent,
        quantitySource: row.quantitySource,
        priceSource: row.priceSource,
        mappingConfidence: row.mappingConfidence,
        reviewStatus: row.reviewStatus,
        findingsJson: row.findingsJson,
      }));
      await chunkedInsert(tx, normalizedQuantityRows, rowsToInsert, 500);
    }

    await tx.insert(documentProcessingArtifacts).values({
      companyId,
      documentId,
      processingRunId,
      artifactType: "ifc_evidence",
      storageKey: artifactKey,
      checksumSha256: sha256(artifactContent),
      contentType: "application/json",
      sizeBytes: artifactContent.length,
      metadataJson: {
        schemaVersion: artifact.schemaVersion,
        kind: artifact.kind,
        document: artifact.document,
        summary: artifact.summary,
        ruleEvaluations: ruleSummary,
      },
    }).onConflictDoUpdate({
      target: [documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.artifactType],
      set: {
        storageKey: artifactKey,
        checksumSha256: sha256(artifactContent),
        sizeBytes: artifactContent.length,
        metadataJson: {
          schemaVersion: artifact.schemaVersion,
          kind: artifact.kind,
          document: artifact.document,
          summary: artifact.summary,
          ruleEvaluations: ruleSummary,
        },
      },
    });
    const now = new Date();
    const updatedRuns = await tx.update(documentProcessingRuns)
      .set({
        status: "succeeded",
        currentStage: "awaiting_review",
        progressPercent: 100,
        progressMessage: "IFC property evidence insan incelemesi bekliyor",
        completedAt: now,
        updatedAt: now,
        quotaConsumed: true,
      })
      .where(
        and(
          eq(documentProcessingRuns.id, processingRunId),
          eq(documentProcessingRuns.companyId, companyId),
          eq(documentProcessingRuns.status, "running"),
          eq(documentProcessingRuns.workerLeaseToken, leaseToken),
          eq(documentProcessingRuns.quotaConsumed, false),
        )
      )
      .returning({ id: documentProcessingRuns.id });

    if (updatedRuns.length > 0) {
      await consumeIfcUsage(tx, companyId, now);
    } else {
      throw new SmartCheckRunLeaseLostError();
    }

    await tx.update(documents).set({
      status: "awaiting_review",
      importMappingJson: {
        source: "ifc_property",
        artifactType: "ifc_evidence",
        schemaVersion: artifact.schemaVersion,
        evidenceRowCount: artifact.summary.evidenceRowCount,
        blockedElementCount: artifact.summary.blockedElementCount,
        threeByThreeViolationCount: ruleSummary.threeByThree.violationCount,
        epysScore: ruleSummary.epys.score,
      },
      updatedAt: now,
    }).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));
  });
}

export const DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS = 15 * 60 * 1000;

export function isSmartCheckLeaseExpired(
  run: { status: string; updatedAt?: Date | null; startedAt?: Date | null },
  now = new Date(),
  leaseTimeoutMs = DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS,
): boolean {
  if (run.status !== "running") return false;
  const reference = run.updatedAt ?? run.startedAt;
  if (!reference) return false;
  return now.getTime() - reference.getTime() >= leaseTimeoutMs;
}

export async function claimSmartCheckRun(
  payload: { companyId: string; documentId: string; processingRunId: string },
  deliveryId = `direct:${crypto.randomUUID()}`,
  options: { now?: Date; leaseTimeoutMs?: number } = {},
) {
  const now = options.now ?? new Date();
  const leaseTimeoutMs = options.leaseTimeoutMs ?? DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS;
  const leaseToken = crypto.randomUUID();
  const [claimed] = await db.update(documentProcessingRuns).set({
    status: "running",
    currentStage: "parsing",
    progressPercent: 10,
    progressMessage: "Dosya ayrıştırılıyor",
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    errorCode: null,
    errorMessage: null,
    workerJobId: deliveryId,
    workerLeaseToken: leaseToken,
  }).where(and(
    eq(documentProcessingRuns.id, payload.processingRunId),
    eq(documentProcessingRuns.documentId, payload.documentId),
    eq(documentProcessingRuns.companyId, payload.companyId),
    eq(documentProcessingRuns.status, "queued"),
  )).returning();
  if (claimed) return claimed;

  const [existing] = await db.select({
    companyId: documentProcessingRuns.companyId,
    documentId: documentProcessingRuns.documentId,
    status: documentProcessingRuns.status,
    workerJobId: documentProcessingRuns.workerJobId,
    workerLeaseToken: documentProcessingRuns.workerLeaseToken,
    updatedAt: documentProcessingRuns.updatedAt,
    startedAt: documentProcessingRuns.startedAt,
  }).from(documentProcessingRuns).where(eq(documentProcessingRuns.id, payload.processingRunId));
  if (!existing || existing.companyId !== payload.companyId || existing.documentId !== payload.documentId) {
    throw new Error("TENANT_DOCUMENT_RUN_MISMATCH");
  }
  const sameDeliveryRetry = existing.workerJobId === deliveryId && (existing.status === "running" || existing.status === "failed");
  const orphanLeaseExpired = isSmartCheckLeaseExpired(existing, now, leaseTimeoutMs);
  if (
    existing.workerLeaseToken &&
    (sameDeliveryRetry || orphanLeaseExpired)
  ) {
    const [reclaimed] = await db.update(documentProcessingRuns).set({
      status: "running",
      currentStage: "parsing",
      progressPercent: 10,
      progressMessage: orphanLeaseExpired ? "Süresi dolan işçi kilidi devralındı" : "Dosya yeniden teslim alındı",
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      errorCode: null,
      errorMessage: null,
      workerJobId: deliveryId,
      workerLeaseToken: leaseToken,
    }).where(and(
      eq(documentProcessingRuns.id, payload.processingRunId),
      eq(documentProcessingRuns.companyId, payload.companyId),
      eq(documentProcessingRuns.workerLeaseToken, existing.workerLeaseToken),
      sql`${documentProcessingRuns.status} IN ('running', 'failed')`,
    )).returning();
    if (reclaimed) return reclaimed;
  }
  return null;
}

export async function processSmartCheckDocument(
  payload: { companyId: string; documentId: string; processingRunId: string },
  deliveryId = `direct:${crypto.randomUUID()}`,
  hooks: { afterClaim?: () => Promise<void>; beforeCanonicalWrite?: () => Promise<void>; afterArtifactPut?: () => Promise<void> } = {},
) {
  const claimed = await claimSmartCheckRun(payload, deliveryId);
  if (!claimed) return;
  if (!claimed.workerLeaseToken) throw new Error("SMARTCHECK_RUN_LEASE_MISSING");
  await hooks.afterClaim?.();
  await processClaimedSmartCheckDocument(payload, claimed.workerLeaseToken, hooks);
}

async function processClaimedSmartCheckDocument(
  payload: { companyId: string; documentId: string; processingRunId: string },
  leaseToken: string,
  hooks: { beforeCanonicalWrite?: () => Promise<void>; afterArtifactPut?: () => Promise<void> },
) {
  const { companyId, documentId, processingRunId } = payload;
  const [document] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));
  const [run] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.id, processingRunId), eq(documentProcessingRuns.documentId, documentId), eq(documentProcessingRuns.companyId, companyId)));
  if (!document || !run) throw new Error("TENANT_DOCUMENT_RUN_MISMATCH");
  if (run.status !== "running" || run.workerLeaseToken !== leaseToken) throw new SmartCheckRunLeaseLostError();
  try {
    await db.transaction(async (tx) => {
      await assertRunLease(tx, run.id, companyId, leaseToken);
      await tx.update(documents).set({ status: "processing", updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
    });
    const storage = createStorageAdapter();

    const isIfc = document.originalFileName.toLowerCase().endsWith(".ifc") || document.mimeType === "application/ifc";
    if (isIfc) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-ifc-job-"));
      const localIfcPath = path.join(tmpDir, "model.ifc");
      try {
        await storage.downloadToFile(document.storageKey, localIfcPath, document.checksumSha256);
        await processIfcSmartCheckDocument({
          companyId,
          documentId: document.id,
          processingRunId: run.id,
          originalFileName: document.originalFileName,
          checksumSha256: document.checksumSha256,
          filePath: localIfcPath,
          leaseToken,
        });
        return;
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    if (document.originalFileName.toLowerCase().endsWith(".pdf")) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bimmetraj-pdf-job-"));
      const localPath = path.join(tmpDir, "document.pdf");
      try {
        await storage.downloadToFile(document.storageKey, localPath, document.checksumSha256);
        const pdfArtifacts = await buildPdfProcessingArtifacts({
          inputPath: localPath,
          fileName: document.originalFileName,
          expectedSourceChecksum: document.checksumSha256,
        });
        const storedArtifacts: Array<{ artifact: PdfProcessingArtifact; artifactKey: string }> = [];
        for (const artifact of pdfArtifacts) {
          const artifactKey = `${companyId}/${documentId}/${run.id}/${leaseToken}/${artifact.fileName}`;
          await storage.put(artifactKey, artifact.content, artifact.contentType);
          storedArtifacts.push({ artifact, artifactKey });
        }
        const validation = pdfArtifacts.find((artifact) => artifact.artifactType === "verapdf_validation")!.metadataJson;
        const validationStatus = validation.status === "completed"
          ? (validation.validation as { isCompliant: boolean }).isCompliant ? "PDF/A doğrulaması tamamlandı" : "PDF/A doğrulaması: uyumsuz"
          : "PDF yapısal ön kontrolü tamamlandı; PDF/A doğrulayıcı kullanılamıyor";
        const now = new Date();
        await db.transaction(async (tx) => {
          await assertRunLease(tx, run.id, companyId, leaseToken);
          for (const { artifact, artifactKey } of storedArtifacts) {
            await tx.insert(documentProcessingArtifacts).values({
              companyId,
              documentId,
              processingRunId: run.id,
              artifactType: artifact.artifactType,
              storageKey: artifactKey,
              checksumSha256: sha256(artifact.content),
              contentType: artifact.contentType,
              sizeBytes: artifact.content.length,
              metadataJson: artifact.metadataJson,
            }).onConflictDoUpdate({
              target: [documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.artifactType],
              set: {
                storageKey: artifactKey,
                checksumSha256: sha256(artifact.content),
                contentType: artifact.contentType,
                sizeBytes: artifact.content.length,
                metadataJson: artifact.metadataJson,
              },
            });
          }
          await tx.update(documentProcessingRuns).set({ status: "succeeded", currentStage: "awaiting_review", progressPercent: 100, progressMessage: validationStatus, completedAt: now, updatedAt: now }).where(and(
            eq(documentProcessingRuns.id, run.id),
            eq(documentProcessingRuns.companyId, companyId),
            eq(documentProcessingRuns.status, "running"),
            eq(documentProcessingRuns.workerLeaseToken, leaseToken),
          ));
          await tx.update(documents).set({ status: "awaiting_review", updatedAt: now }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
        });
        return;
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    const content = await storage.get(document.storageKey);
    if (sha256(content) !== document.checksumSha256) throw new Error("CHECKSUM_MISMATCH");
    const kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
    if (kind === "ifc" || kind === "pdf") throw new Error("UNEXPECTED_DOCUMENT_KIND");

    const parsed = await parseDocument(content, kind, document.importMappingJson as ColumnMapping);
    await updateRun(run.id, companyId, leaseToken, { currentStage: "normalizing", progressPercent: 45, progressMessage: "Satırlar normalize ediliyor" });
    const companyContext = await fetchWorkerCompanyContext(companyId);
    if (!companyContext.companyExists) throw new Error("TENANT_COMPANY_MISSING");
    const results = validateRows(parsed.rows, Number(companyContext.maxWaste ?? 20));
    await updateRun(run.id, companyId, leaseToken, { currentStage: "validating", progressPercent: 70, progressMessage: "Deterministik kontroller çalışıyor" });
    await hooks.beforeCanonicalWrite?.();
    const artifactContent = Buffer.from(JSON.stringify({ mapping: parsed.mapping, rowCount: results.length, rows: results }, null, 2));
    const artifactKey = `${companyId}/${documentId}/${run.id}/${leaseToken}/normalized.json`;
    await storage.put(artifactKey, artifactContent, "application/json");
    await hooks.afterArtifactPut?.();
    await db.transaction(async (tx) => {
      await assertRunLease(tx, run.id, companyId, leaseToken);
      await tx.delete(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.processingRunId, run.id), eq(normalizedQuantityRows.companyId, companyId)));
      if (results.length) {
        const rowsToInsert = results.map(({ row, normalized, findings }) => ({
          companyId, documentId, processingRunId: run.id, ...row,
          normalizedDescription: normalized.description, normalizedPositionCode: normalized.positionCode, normalizedUnit: normalized.unit,
          normalizedQuantity: normalized.quantity?.toString(), normalizedPrice: normalized.price?.toString(), normalizedWastePercent: normalized.wastePercent.toString(),
          mappingConfidence: "0.90", findingsJson: findings,
        }));
        await chunkedInsert(tx, normalizedQuantityRows, rowsToInsert, 500);
      }
      await tx.insert(documentProcessingArtifacts).values({ companyId, documentId, processingRunId: run.id, artifactType: "normalized_table", storageKey: artifactKey, checksumSha256: sha256(artifactContent), contentType: "application/json", sizeBytes: artifactContent.length, metadataJson: { mapping: parsed.mapping, rowCount: results.length } }).onConflictDoUpdate({ target: [documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.artifactType], set: { storageKey: artifactKey, checksumSha256: sha256(artifactContent), sizeBytes: artifactContent.length, metadataJson: { mapping: parsed.mapping, rowCount: results.length } } });
      const now = new Date();
      await tx.update(documentProcessingRuns).set({ status: "succeeded", currentStage: "awaiting_review", progressPercent: 100, progressMessage: "İnsan incelemesi bekleniyor", completedAt: now, updatedAt: now }).where(and(
        eq(documentProcessingRuns.id, run.id),
        eq(documentProcessingRuns.companyId, companyId),
        eq(documentProcessingRuns.status, "running"),
        eq(documentProcessingRuns.workerLeaseToken, leaseToken),
      ));
      await tx.update(documents).set({ status: "awaiting_review", importMappingJson: parsed.mapping, updatedAt: now }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
    });
  } catch (error) {
    const errorCode = error instanceof IfcWorkerError ? error.code : error instanceof Error ? error.message : "PROCESSING_FAILED";
    const errorMessage = error instanceof IfcWorkerError
      ? error.sanitizedMessage
      : error instanceof Error
        ? (error.message.includes("/") || error.message.includes("\\") || error.message.includes("Traceback") ? "İşlem sırasında beklenmeyen bir hata oluştu." : error.message)
        : "PROCESSING_FAILED";
    if (!(error instanceof SmartCheckRunLeaseLostError)) {
      await db.transaction(async (tx) => {
        await assertRunLease(tx, run.id, companyId, leaseToken);
        const now = new Date();
        await tx.update(documentProcessingRuns).set({ status: "failed", currentStage: "failed", progressMessage: "İşleme başarısız", errorCode, errorMessage, completedAt: now, updatedAt: now }).where(and(
          eq(documentProcessingRuns.id, run.id),
          eq(documentProcessingRuns.companyId, companyId),
          eq(documentProcessingRuns.status, "running"),
          eq(documentProcessingRuns.workerLeaseToken, leaseToken),
        ));
        await tx.update(documents).set({ status: "failed", updatedAt: now }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
      });
    }
    throw error;
  }
}

export function processingIdempotencyKey(documentChecksum: string, mapping: ColumnMapping) {
  return crypto.createHash("sha256").update(`smartcheck-import-v1:${documentChecksum}:${JSON.stringify(mapping)}`).digest("hex");
}
