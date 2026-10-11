import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { sanitizeSpreadsheetText, validateXlsxArchive } from "./file-security";
import { type ColumnMapping, type ParsedQuantityRow, suggestMapping } from "./normalize";
function checkMatrix(matrix: string[][]) {
  if (matrix.length > 5001) throw new Error("SPREADSHEET_SHAPE_LIMIT");
  let cells = 0;
  for (const row of matrix) {
    if (!row) continue;
    cells += row.length;
    if (row.length > 256 || cells > 100_000) throw new Error("SPREADSHEET_SHAPE_LIMIT");
    if (row.some(value => String(value).length > 32_768)) throw new Error("SPREADSHEET_CELL_LIMIT");
  }
}
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
  checkMatrix(matrix);
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
  checkMatrix(matrix);
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
    const records = parseCsv(content, { bom: true, relax_column_count: true, skip_empty_lines: true, max_record_size: 65_536, to: 5002 }) as unknown[][];
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
  if (workbook.worksheets.length > 20) throw new Error("SPREADSHEET_SHAPE_LIMIT");
  const sheets = workbook.worksheets.map((worksheet) => {
    const matrix: string[][] = [];
    const formulaCells: string[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 5001 || row.cellCount > 256) throw new Error("SPREADSHEET_SHAPE_LIMIT");
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

export async function parseDocument(content: Buffer, kind: "xlsx" | "csv", mapping: ColumnMapping) {
  if (kind === "csv") {
    const records = parseCsv(content, { bom: true, relax_column_count: true, skip_empty_lines: true, max_record_size: 65_536, to: 5002 }) as unknown[][];
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
    if (rowNumber > 5001 || row.cellCount > 256) throw new Error("SPREADSHEET_SHAPE_LIMIT");
    const values: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) values.push(cellText(row.getCell(column), rowFormulas));
    matrix[rowNumber - 1] = values;
    if (Object.keys(rowFormulas).length) formulas[rowNumber] = rowFormulas;
  });
  return fromMatrix(worksheet.name, matrix, mapping, formulas);
}

