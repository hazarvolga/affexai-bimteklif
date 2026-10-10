import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { companies, documentProcessingArtifacts, documentProcessingRuns, documents, normalizedQuantityRows } from "../../db/schema";
import { createStorageAdapter } from "./storage";
import { detectAndValidateFile, sanitizeSpreadsheetText, sha256, validateXlsxArchive } from "./file-security";
import { type ColumnMapping, type ParsedQuantityRow, suggestMapping, validateRows } from "./normalize";
import { buildIfcSmartCheckEvidenceFromContent } from "../../ifc/smartcheck-processing";
import { parseIfcText } from "../../ifc/parser/legacy-parser";
import { buildIfcSmartCheckEvidenceArtifact } from "../../ifc/smartcheck-evidence";
import { IfcWorkerError, runPythonIfcExtractor } from "./ifc-python-runner";

export type PreviewSheet = {
  name: string;
  rowCount: number;
  columnCount: number;
  sampleRows: string[][];
  suggestedMapping: ColumnMapping;
  formulaCells: string[];
};

export type DocumentPreview = {
  kind: "xlsx" | "csv";
  sheets: PreviewSheet[];
};

function cellText(cell: ExcelJS.Cell, formulaJson: Record<string, string>): string {
  const value = cell.value;
  if (value && typeof value === "object" && "formula" in value) {
    formulaJson[cell.address] = String(value.formula);
    return value.result == null ? "" : String(value.result);
  }
  return cell.text ?? "";
}

function headerIndex(headers: string[], mapped?: string): number {
  return mapped ? headers.findIndex((header) => header.trim() === mapped.trim()) : -1;
}

function excelColumnName(columnNumber: number): string {
  let value = Math.max(1, columnNumber);
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function fromMatrix(sheetName: string, matrix: Array<Array<string>>, mappingInput: ColumnMapping = {}, formulas: Record<number, Record<string, string>> = {}) {
  const headerRow = Math.max(1, mappingInput.headerRow ?? 1);
  const headers = matrix[headerRow - 1] ?? [];
  const mapping = { ...suggestMapping(headers), ...mappingInput };
  const indices = {
    positionCode: headerIndex(headers, mapping.positionCode), description: headerIndex(headers, mapping.description),
    unit: headerIndex(headers, mapping.unit), quantity: headerIndex(headers, mapping.quantity),
    price: headerIndex(headers, mapping.price), wastePercent: headerIndex(headers, mapping.wastePercent),
  };
  if (indices.description < 0 || indices.unit < 0 || indices.quantity < 0) throw new Error("COLUMN_MAPPING_REQUIRED");
  const rows: ParsedQuantityRow[] = [];
  matrix.slice(headerRow).forEach((values, offset) => {
    if (values.every((value) => !String(value ?? "").trim())) return;
    const sourceRowNumber = headerRow + offset + 1;
    const read = (index: number) => index < 0 ? "" : String(values[index] ?? "");
    rows.push({
      sheetName, sourceRowNumber, sourceCellRange: `A${sourceRowNumber}:${excelColumnName(Math.min(headers.length, 256))}${sourceRowNumber}`,
      rawPositionCode: read(indices.positionCode), rawDescription: read(indices.description), rawUnit: read(indices.unit),
      rawQuantity: read(indices.quantity), rawPrice: read(indices.price), rawWastePercent: read(indices.wastePercent), formulaJson: formulas[sourceRowNumber] ?? {},
    });
  });
  return { rows, mapping };
}

function previewSheet(name: string, matrix: string[][], formulaCells: string[] = []): PreviewSheet {
  const nonEmptyRows = matrix.filter((row) => row.some((value) => String(value ?? "").trim() !== ""));
  const headers = nonEmptyRows[0] ?? [];
  const columnCount = nonEmptyRows.reduce((max, row) => Math.max(max, row.length), 0);
  return {
    name,
    rowCount: nonEmptyRows.length,
    columnCount,
    sampleRows: nonEmptyRows.slice(0, 21).map((row) => row.slice(0, 32)),
    suggestedMapping: suggestMapping(headers),
    formulaCells: formulaCells.slice(0, 50),
  };
}

/**
 * Reads only a bounded preview and never writes normalized rows. The route
 * uses this before mapping/process so a reviewer can see the source shape.
 */
export async function inspectDocument(content: Buffer, kind: "xlsx" | "csv"): Promise<DocumentPreview> {
  if (kind === "csv") {
    const records = parseCsv(content, { bom: true, relax_column_count: true, skip_empty_lines: true }) as unknown[][];
    const formulaCells: string[] = [];
    const matrix = records.map((record, rowIndex) => record.map((value, columnIndex) => {
      const raw = String(value ?? "");
      if (/^[=+\-@]/.test(raw)) formulaCells.push(`CSV!${excelColumnName(columnIndex + 1)}${rowIndex + 1}`);
      return sanitizeSpreadsheetText(raw);
    }));
    return { kind, sheets: [previewSheet("CSV", matrix, formulaCells)] };
  }

  await validateXlsxArchive(content);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content as unknown as ExcelJS.Buffer);
  const sheets = workbook.worksheets.map((worksheet) => {
    const matrix: string[][] = [];
    const formulaCells: string[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values: string[] = [];
      for (let column = 1; column <= row.cellCount; column += 1) {
        const cell = row.getCell(column);
        const value = cell.value;
        if (value && typeof value === "object" && "formula" in value) formulaCells.push(`${worksheet.name}!${cell.address}`);
        values.push(sanitizeSpreadsheetText(cellText(cell, {})));
      }
      matrix[rowNumber - 1] = values;
    });
    return previewSheet(worksheet.name, matrix, formulaCells);
  });
  return { kind, sheets };
}

async function parseDocument(content: Buffer, kind: "xlsx" | "csv", mapping: ColumnMapping) {
  if (kind === "csv") {
    const records = parseCsv(content, { bom: true, relax_column_count: true, skip_empty_lines: true }) as unknown[][];
    const matrix = records.map((record) => record.map((value) => {
      const raw = String(value ?? "");
      return sanitizeSpreadsheetText(raw);
    }));
    const formulaRows: Record<number, Record<string, string>> = {};
    records.forEach((record, rowIndex) => record.forEach((value, columnIndex) => {
      const raw = String(value ?? "");
      if (/^[=+\-@]/.test(raw)) (formulaRows[rowIndex + 1] ??= {})[`${columnIndex + 1}`] = raw;
    }));
    return fromMatrix("CSV", matrix, mapping, formulaRows);
  }
  await validateXlsxArchive(content);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content as unknown as ExcelJS.Buffer);
  const worksheet = mapping.sheet ? workbook.getWorksheet(mapping.sheet) : workbook.worksheets[0];
  if (!worksheet) throw new Error("SHEET_NOT_FOUND");
  const matrix: string[][] = [];
  const formulas: Record<number, Record<string, string>> = {};
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowFormulas: Record<string, string> = {};
    const values: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) values.push(cellText(row.getCell(column), rowFormulas));
    matrix[rowNumber - 1] = values;
    if (Object.keys(rowFormulas).length) formulas[rowNumber] = rowFormulas;
  });
  return fromMatrix(worksheet.name, matrix, mapping, formulas);
}

async function updateRun(runId: string, companyId: string, values: Partial<typeof documentProcessingRuns.$inferInsert>) {
  await db.update(documentProcessingRuns).set({ ...values, updatedAt: new Date() }).where(and(eq(documentProcessingRuns.id, runId), eq(documentProcessingRuns.companyId, companyId)));
}

async function processIfcSmartCheckDocument(payload: {
  companyId: string;
  documentId: string;
  processingRunId: string;
  originalFileName: string;
  checksumSha256: string;
  content?: Buffer;
  filePath?: string;
}) {
  const { companyId, documentId, processingRunId, originalFileName, checksumSha256, content, filePath } = payload;
  const engine = (process.env.SMARTCHECK_IFC_ENGINE || "legacy").toLowerCase();
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
      const pythonResult = await runPythonIfcExtractor({
        inputPath: resolvedPath,
        fileName: originalFileName,
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
    artifact = buildIfcSmartCheckEvidenceFromContent({
      fileName: originalFileName,
      checksumSha256,
      content: legacyContent,
    });

    try {
      const pythonResult = await runPythonIfcExtractor({
        inputPath: resolvedPath,
        fileName: originalFileName,
      });

      const legacyParsed = parseIfcText(legacyContent.toString("utf8"));
      const shadowReport = {
        mode: "shadow",
        timestamp: new Date().toISOString(),
        legacySummary: legacyParsed.summary,
        pythonSummary: pythonResult.summary,
        elementCountDiff: Math.abs(legacyParsed.summary.totalElements - pythonResult.summary.totalElements),
        volumeDeltaM3: Number(Math.abs(legacyParsed.summary.totalVolumeM3 - pythonResult.summary.totalVolumeM3).toFixed(2)),
        parityStatus: Math.abs(legacyParsed.summary.totalElements - pythonResult.summary.totalElements) === 0 ? "match" : "divergence",
      };

      const shadowContent = Buffer.from(JSON.stringify(shadowReport, null, 2));
      const shadowKey = `${companyId}/${documentId}/${processingRunId}/ifc-shadow-report.json`;
      await storage.put(shadowKey, shadowContent, "application/json");

      await db.insert(documentProcessingArtifacts).values({
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
    } catch (shadowErr) {
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

  await updateRun(processingRunId, companyId, {
    currentStage: "normalizing",
    progressPercent: 45,
    progressMessage: "IFC property evidence satırları hazırlanıyor",
  });

  const artifactContent = Buffer.from(JSON.stringify(artifact, null, 2));
  const artifactKey = `${companyId}/${documentId}/${processingRunId}/ifc-evidence.json`;
  await storage.put(artifactKey, artifactContent, "application/json");

  await updateRun(processingRunId, companyId, {
    currentStage: "validating",
    progressPercent: 70,
    progressMessage: "IFC evidence admission kontrolleri çalışıyor",
  });

  await db.transaction(async (tx) => {
    await tx.delete(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.processingRunId, processingRunId), eq(normalizedQuantityRows.companyId, companyId)));
    if (artifact.rows.length) {
      await tx.insert(normalizedQuantityRows).values(artifact.rows.map((row) => ({
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
      })));
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
        },
      },
    });
  });

  if (artifact.rows.length === 0) {
    throw new Error("IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE");
  }

  await updateRun(processingRunId, companyId, {
    status: "succeeded",
    currentStage: "awaiting_review",
    progressPercent: 100,
    progressMessage: "IFC property evidence insan incelemesi bekliyor",
    completedAt: new Date(),
  });
  await db.update(documents).set({
    status: "awaiting_review",
    importMappingJson: {
      source: "ifc_property",
      artifactType: "ifc_evidence",
      schemaVersion: artifact.schemaVersion,
      evidenceRowCount: artifact.summary.evidenceRowCount,
      blockedElementCount: artifact.summary.blockedElementCount,
    },
    updatedAt: new Date(),
  }).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));
}

export async function processSmartCheckDocument(payload: { companyId: string; documentId: string; processingRunId: string }) {
  const { companyId, documentId, processingRunId } = payload;
  const [document] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)));
  const [run] = await db.select().from(documentProcessingRuns).where(and(eq(documentProcessingRuns.id, processingRunId), eq(documentProcessingRuns.documentId, documentId), eq(documentProcessingRuns.companyId, companyId)));
  if (!document || !run) throw new Error("TENANT_DOCUMENT_RUN_MISMATCH");
  if (run.status === "succeeded") return;
  try {
    await updateRun(run.id, companyId, { status: "running", currentStage: "parsing", progressPercent: 10, progressMessage: "Dosya ayrıştırılıyor", startedAt: run.startedAt ?? new Date() });
    await db.update(documents).set({ status: "processing", updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
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
        });
        return;
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    const content = await storage.get(document.storageKey);
    if (sha256(content) !== document.checksumSha256) throw new Error("CHECKSUM_MISMATCH");
    const kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
    if (kind === "ifc") throw new Error("UNEXPECTED_IFC_DOCUMENT");

    const parsed = await parseDocument(content, kind, document.importMappingJson as ColumnMapping);
    await updateRun(run.id, companyId, { currentStage: "normalizing", progressPercent: 45, progressMessage: "Satırlar normalize ediliyor" });
    const [company] = await db.select({ maxWaste: companies.smartcheckMaxWastePercent }).from(companies).where(eq(companies.id, companyId));
    const results = validateRows(parsed.rows, Number(company?.maxWaste ?? 20));
    await updateRun(run.id, companyId, { currentStage: "validating", progressPercent: 70, progressMessage: "Deterministik kontroller çalışıyor" });
    await db.transaction(async (tx) => {
      await tx.delete(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.processingRunId, run.id), eq(normalizedQuantityRows.companyId, companyId)));
      if (results.length) await tx.insert(normalizedQuantityRows).values(results.map(({ row, normalized, findings }) => ({
        companyId, documentId, processingRunId: run.id, ...row,
        normalizedDescription: normalized.description, normalizedPositionCode: normalized.positionCode, normalizedUnit: normalized.unit,
        normalizedQuantity: normalized.quantity?.toString(), normalizedPrice: normalized.price?.toString(), normalizedWastePercent: normalized.wastePercent.toString(),
        mappingConfidence: "0.90", findingsJson: findings,
      })));
    });
    const artifactContent = Buffer.from(JSON.stringify({ mapping: parsed.mapping, rowCount: results.length, rows: results }, null, 2));
    const artifactKey = `${companyId}/${documentId}/${run.id}/normalized.json`;
    await storage.put(artifactKey, artifactContent, "application/json");
    await db.insert(documentProcessingArtifacts).values({ companyId, documentId, processingRunId: run.id, artifactType: "normalized_table", storageKey: artifactKey, checksumSha256: sha256(artifactContent), contentType: "application/json", sizeBytes: artifactContent.length, metadataJson: { mapping: parsed.mapping, rowCount: results.length } }).onConflictDoUpdate({ target: [documentProcessingArtifacts.companyId, documentProcessingArtifacts.processingRunId, documentProcessingArtifacts.artifactType], set: { storageKey: artifactKey, checksumSha256: sha256(artifactContent), sizeBytes: artifactContent.length, metadataJson: { mapping: parsed.mapping, rowCount: results.length } } });
    await updateRun(run.id, companyId, { status: "succeeded", currentStage: "awaiting_review", progressPercent: 100, progressMessage: "İnsan incelemesi bekleniyor", completedAt: new Date() });
    await db.update(documents).set({ status: "awaiting_review", importMappingJson: parsed.mapping, updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
  } catch (error) {
    const errorCode = error instanceof IfcWorkerError ? error.code : error instanceof Error ? error.message : "PROCESSING_FAILED";
    const errorMessage = error instanceof Error ? error.message : "PROCESSING_FAILED";
    await updateRun(run.id, companyId, { status: "failed", currentStage: "failed", progressMessage: "İşleme başarısız", errorCode, errorMessage, completedAt: new Date() });
    await db.update(documents).set({ status: "failed", updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
    throw error;
  }
}

export function processingIdempotencyKey(documentChecksum: string, mapping: ColumnMapping) {
  return crypto.createHash("sha256").update(`smartcheck-import-v1:${documentChecksum}:${JSON.stringify(mapping)}`).digest("hex");
}
