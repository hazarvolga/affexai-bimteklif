import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { companies, documentProcessingArtifacts, documentProcessingRuns, documents, normalizedQuantityRows } from "../../db/schema";
import { createStorageAdapter } from "./storage";
import { detectAndValidateFile, sanitizeSpreadsheetText, sha256, validateXlsxArchive } from "./file-security";
import { type ColumnMapping, type ParsedQuantityRow, suggestMapping, validateRows } from "./normalize";

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
    const content = await storage.get(document.storageKey);
    if (sha256(content) !== document.checksumSha256) throw new Error("CHECKSUM_MISMATCH");
    const kind = detectAndValidateFile(content, document.originalFileName, document.mimeType);
    if (kind === "ifc") throw new Error("IFC_WORKER_PENDING");
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
    const message = error instanceof Error ? error.message : "PROCESSING_FAILED";
    await updateRun(run.id, companyId, { status: "failed", currentStage: "failed", progressMessage: "İşleme başarısız", errorCode: message, errorMessage: message, completedAt: new Date() });
    await db.update(documents).set({ status: "failed", updatedAt: new Date() }).where(and(eq(documents.id, document.id), eq(documents.companyId, companyId)));
    throw error;
  }
}

export function processingIdempotencyKey(documentChecksum: string, mapping: ColumnMapping) {
  return crypto.createHash("sha256").update(`smartcheck-import-v1:${documentChecksum}:${JSON.stringify(mapping)}`).digest("hex");
}
