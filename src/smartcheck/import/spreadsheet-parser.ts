import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { sanitizeSpreadsheetText, validateXlsxArchive } from "./file-security";
import {
  cleanTurkishHeader,
  normalizeUnit,
  parseLocalizedNumber,
  suggestMapping,
  type ColumnMapping,
  type ParsedQuantityRow,
  type SpreadsheetArchetype,
} from "./normalize";

const MAX_SPREADSHEET_ROWS = 25_000;
const MAX_SPREADSHEET_COLS = 256;
const MAX_SPREADSHEET_CELLS = 650_000;
const MAX_CELL_CHARS = 32_768;

function checkMatrix(matrix: string[][]) {
  if (matrix.length > MAX_SPREADSHEET_ROWS) throw new Error("SPREADSHEET_SHAPE_LIMIT");
  let cells = 0;
  for (const row of matrix) {
    if (!row) continue;
    cells += row.length;
    if (row.length > MAX_SPREADSHEET_COLS || cells > MAX_SPREADSHEET_CELLS) {
      throw new Error("SPREADSHEET_SHAPE_LIMIT");
    }
    if (row.some((value) => String(value ?? "").length > MAX_CELL_CHARS)) {
      throw new Error("SPREADSHEET_CELL_LIMIT");
    }
  }
}

export type PreviewSheet = {
  name: string;
  rowCount: number;
  columnCount: number;
  sampleRows: string[][];
  suggestedMapping: ColumnMapping;
  formulaCells: string[];
  detectedArchetype?: SpreadsheetArchetype;
  repeatingBlockCount?: number;
};

export type DocumentPreview = {
  kind: "xlsx" | "csv";
  sheets: PreviewSheet[];
};

type RowSpan = {
  startCol: number;
  endCol: number;
  text: string;
  clean: string;
};

/**
 * Safely extracts text from an ExcelJS cell, resolving merged master cells
 * without triggering ExcelJS's `MergeValue.toString()` null crash.
 */
function cellText(cell: ExcelJS.Cell, formulaJson: Record<string, string>): string {
  const master = cell.isMerged && cell.master ? cell.master : cell;
  const value = master.value;
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) {
      const fObj = value as { formula?: string; sharedFormula?: string; result?: unknown };
      if (fObj.formula) {
        formulaJson[cell.address] = String(fObj.formula);
      }
      if (fObj.result === null || fObj.result === undefined) return "";
      if (typeof fObj.result === "object" && fObj.result !== null && "error" in fObj.result) {
        return "";
      }
      return String(fObj.result).trim();
    }
    if ("richText" in value && Array.isArray((value as { richText?: Array<{ text?: string }> }).richText)) {
      return (value as { richText: Array<{ text?: string }> }).richText
        .map((part) => part.text ?? "")
        .join("")
        .trim();
    }
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") {
      return (value as { text: string }).text.trim();
    }
  }

  try {
    return (master.text ?? String(value)).trim();
  } catch {
    return String(value).trim();
  }
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

/**
 * Deduplicates horizontal merged cells on a row into ordered spans.
 */
function getRowSpans(row: string[] | undefined): RowSpan[] {
  if (!row || row.length === 0) return [];
  const spans: RowSpan[] = [];
  for (let c = 0; c < row.length; c += 1) {
    const text = String(row[c] ?? "").trim();
    if (!text) continue;
    const prev = spans[spans.length - 1];
    if (prev && prev.endCol === c - 1 && prev.text === text) {
      prev.endCol = c;
    } else {
      spans.push({
        startCol: c,
        endCol: c,
        text,
        clean: cleanTurkishHeader(text),
      });
    }
  }
  return spans;
}

function isPozNoLabel(clean: string): boolean {
  return /^poz\s*(no|kodu)?\s*[:.]?$/.test(clean);
}

function isBirimiLabel(clean: string): boolean {
  return /^(birimi|birim|olcu birimi)\s*[:.]?$/.test(clean);
}

function isImalatinAdiLabel(clean: string): boolean {
  return /^(imalatin\s*(adi|cinsi|tanimi)|is\s*kalemi\s*adi)\s*[:.]?$/.test(clean);
}

function isMetrajNoLabel(clean: string): boolean {
  return /^metraj\s*no\s*[:.]?$/.test(clean);
}

function isGenelToplamLabel(clean: string): boolean {
  return /^genel\s*toplam\s*[:.]?$/.test(clean);
}

function isAraToplamLabel(clean: string): boolean {
  return /^ara\s*toplam\s*[:.]?$/.test(clean);
}

/**
 * Detects whether row `r` (0-based) is the header card of a repeating TOKİ/Allplan/Kamu Poz block:
 *   Row r:     POZ NO[:] | <code?> | BİRİMİ[:] | <unit>
 *   Row r + 1: İMALATIN ADI[:] | <desc?> | METRAJ NO[:]
 */
function isRepeatingPozBlockStart(matrix: string[][], r: number): boolean {
  const spans = getRowSpans(matrix[r]);
  if (spans.length < 2) return false;
  const hasPoz = spans.some((s) => isPozNoLabel(s.clean));
  const hasBirim = spans.some((s) => isBirimiLabel(s.clean));
  if (!hasPoz || !hasBirim) return false;
  // A flat/pivot header row has "İmalatın Tanımı" or "Açıklama" or "Katlar" on the SAME row r;
  // a repeating Poz block card puts "İMALATIN ADI" on row r+1 and the unit value right after "BİRİMİ" on row r.
  if (spans.some((s) => isImalatinAdiLabel(s.clean) || s.clean === "katlar" || s.clean === "toplam")) {
    return false;
  }

  const birimIdx = spans.findIndex((s) => isBirimiLabel(s.clean));
  const afterBirim = birimIdx >= 0 ? spans[birimIdx + 1] : undefined;
  const hasUnitValueOnRow = Boolean(afterBirim && normalizeUnit(afterBirim.text) !== null);

  const nextSpans = getRowSpans(matrix[r + 1]);
  const hasImalatOnNextRow = nextSpans.some((s) => isImalatinAdiLabel(s.clean) || isMetrajNoLabel(s.clean));

  return hasUnitValueOnRow && hasImalatOnNextRow;
}

function findRepeatingBlockStarts(matrix: string[][]): number[] {
  const starts: number[] = [];
  for (let r = 0; r < matrix.length; r += 1) {
    if (isRepeatingPozBlockStart(matrix, r)) {
      starts.push(r);
    }
  }
  return starts;
}

/**
 * Extracts normalized quantity rows from a sheet structured as repeating Poz blocks
 * (e.g., TOKİ / Kamu Metraj Cetveli V4 & V6).
 */
export function extractRepeatingBlockRows(
  sheetName: string,
  matrix: string[][],
  formulas: Record<number, Record<string, string>> = {},
): ParsedQuantityRow[] {
  const starts = findRepeatingBlockStarts(matrix);
  if (starts.length === 0) return [];

  const results: ParsedQuantityRow[] = [];

  for (let i = 0; i < starts.length; i += 1) {
    const startRow = starts[i];
    const endRow = (starts[i + 1] ?? matrix.length) - 1;

    const row0Spans = getRowSpans(matrix[startRow]);
    const row1Spans = getRowSpans(matrix[startRow + 1]);

    const pozIdx = row0Spans.findIndex((s) => isPozNoLabel(s.clean));
    const birimIdx = row0Spans.findIndex((s) => isBirimiLabel(s.clean));

    let rawPositionCode = "";
    if (pozIdx >= 0) {
      const candidate = row0Spans[pozIdx + 1];
      if (candidate && (!birimIdx || pozIdx + 1 < birimIdx) && !isBirimiLabel(candidate.clean)) {
        rawPositionCode = candidate.text;
      }
    }

    let rawUnit = "";
    if (birimIdx >= 0 && row0Spans[birimIdx + 1]) {
      rawUnit = row0Spans[birimIdx + 1].text;
    }

    let rawDescription = "";
    const imalatIdx = row1Spans.findIndex((s) => isImalatinAdiLabel(s.clean));
    const metrajNoIdx = row1Spans.findIndex((s) => isMetrajNoLabel(s.clean));
    if (imalatIdx >= 0) {
      const candidate = row1Spans[imalatIdx + 1];
      if (
        candidate &&
        (metrajNoIdx < 0 || imalatIdx + 1 < metrajNoIdx) &&
        !isMetrajNoLabel(candidate.clean)
      ) {
        rawDescription = candidate.text;
      }
    }

    let genelToplamQty: string | null = null;
    let genelToplamRow = startRow + 1;
    let araToplamSum = 0;
    let hasAraToplam = false;
    let binaTotalQty: string | null = null;
    const subGroupNames: string[] = [];

    for (let r = startRow + 2; r <= endRow; r += 1) {
      const spans = getRowSpans(matrix[r]);
      if (spans.length === 0) continue;

      const genelIdx = spans.findIndex((s) => isGenelToplamLabel(s.clean));
      if (genelIdx >= 0) {
        for (let k = genelIdx + 1; k < spans.length; k += 1) {
          const num = parseLocalizedNumber(spans[k].text);
          if (num !== null) {
            genelToplamQty = spans[k].text;
            genelToplamRow = r + 1;
            if (!rawUnit && spans[k + 1] && normalizeUnit(spans[k + 1].text)) {
              rawUnit = spans[k + 1].text;
            }
            break;
          }
        }
        continue;
      }

      const araIdx = spans.findIndex((s) => isAraToplamLabel(s.clean));
      if (araIdx >= 0) {
        for (let k = araIdx + 1; k < spans.length; k += 1) {
          const num = parseLocalizedNumber(spans[k].text);
          if (num !== null) {
            araToplamSum += num;
            hasAraToplam = true;
            genelToplamRow = r + 1;
            break;
          }
        }
        continue;
      }

      if (spans[0].clean === "bina:" || spans[0].clean === "bina") {
        const lastSpan = spans[spans.length - 1];
        if (lastSpan && parseLocalizedNumber(lastSpan.text) !== null) {
          binaTotalQty = lastSpan.text;
        }
        continue;
      }

      // Collect element/category sub-headings (e.g. "Akıllı Sembol", "Kapı Sembolü", "Duvar")
      // when both POZ NO and İMALATIN ADI were left blank in the CAD export.
      if (
        !rawPositionCode &&
        !rawDescription &&
        spans.length === 2 &&
        !/^(id|bina|kat)\b/.test(spans[0].clean) &&
        !/^\d{4}[a-z]/i.test(spans[0].text) &&
        parseLocalizedNumber(spans[0].text) === null &&
        parseLocalizedNumber(spans[1].text) !== null
      ) {
        if (!subGroupNames.includes(spans[0].text)) {
          subGroupNames.push(spans[0].text);
        }
      }
    }

    const finalQuantity =
      genelToplamQty ??
      (hasAraToplam ? String(Number(araToplamSum.toFixed(4))) : binaTotalQty ?? "0");

    if (!rawDescription && rawPositionCode) {
      rawDescription = rawPositionCode;
    } else if (!rawDescription && !rawPositionCode) {
      const fallbackLabel = subGroupNames.slice(0, 2).join(" / ") || `İmalat Bloğu #${i + 1}`;
      rawPositionCode = `BLOK-${i + 1}`;
      rawDescription = fallbackLabel;
    } else if (!rawPositionCode && rawDescription) {
      rawPositionCode = rawDescription;
    }

    const maxCols = Math.min(
      MAX_SPREADSHEET_COLS,
      Math.max(18, (matrix[startRow] ?? []).length, (matrix[genelToplamRow - 1] ?? []).length),
    );

    results.push({
      sheetName,
      sourceRowNumber: startRow + 1,
      sourceCellRange: `A${startRow + 1}:${excelColumnName(maxCols)}${genelToplamRow}`,
      rawPositionCode,
      rawDescription,
      rawUnit,
      rawQuantity: finalQuantity,
      rawPrice: "",
      rawWastePercent: "",
      formulaJson: formulas[genelToplamRow] ?? formulas[startRow + 1] ?? {},
    });
  }

  return results;
}

/**
 * Builds effective headers for row `r` (0-based), inheriting parent headers from `r - 1`
 * when a 2-row header is unmerged, and splitting merged header spans if a sub-column in the
 * span is consistently a unit column in the data rows below (as in V6 row 18 `Malzeme`).
 */
function buildEffectiveHeaders(matrix: string[][], r: number, stopRow: number): string[] {
  const baseRow = matrix[r] ?? [];
  const prevRow = r > 0 ? matrix[r - 1] ?? [] : [];
  const maxLen = Math.max(baseRow.length, prevRow.length);
  const headers: string[] = [];

  // Check if prevRow looks like a parent header row (e.g. has "Katlar", "Poz No", etc.)
  const prevSuggested = suggestMapping(prevRow);
  const usePrevFallback = Boolean(
    prevSuggested.positionCode ||
      prevSuggested.description ||
      prevSuggested.unit ||
      prevRow.some((cell) => cleanTurkishHeader(String(cell ?? "")).includes("katlar")),
  );

  for (let c = 0; c < maxLen; c += 1) {
    const curr = String(baseRow[c] ?? "").trim();
    const prev = usePrevFallback ? String(prevRow[c] ?? "").trim() : "";
    headers[c] = curr || prev;
  }

  // Check if the header row lacks an explicit "Birim" column because a left header (like "Malzeme")
  // was merged over the unit column (e.g., V6 R18: A18:C18 = "Malzeme", while C19:C47 = "Adet", "m²", "m").
  const currentMapping = suggestMapping(headers);
  if (!currentMapping.unit) {
    const sampleDataRows = matrix
      .slice(r + 1, Math.min(stopRow, r + 30))
      .filter((row) => row && row.some((cell) => String(cell ?? "").trim() !== ""));

    if (sampleDataRows.length >= 2) {
      for (let c = 0; c < maxLen; c += 1) {
        let nonEmpty = 0;
        let unitMatches = 0;
        for (const dRow of sampleDataRows) {
          const val = String(dRow[c] ?? "").trim();
          if (!val) continue;
          nonEmpty += 1;
          if (normalizeUnit(val) !== null) unitMatches += 1;
        }
        if (nonEmpty >= 2 && unitMatches / nonEmpty >= 0.65) {
          headers[c] = "Birim";
          break;
        }
      }
    }
  }

  return headers;
}

/**
 * Automatically detects the sheet's structural archetype and best header row.
 */
export function detectSheetStructure(matrix: string[][]): {
  archetype: SpreadsheetArchetype;
  headerRow: number;
  effectiveHeaders: string[];
  suggestedMapping: ColumnMapping;
  repeatingBlockStarts: number[];
} {
  const repeatingBlockStarts = findRepeatingBlockStarts(matrix);
  const firstBlockRow = repeatingBlockStarts.length > 0 ? repeatingBlockStarts[0] : matrix.length;
  const searchLimit = Math.min(50, firstBlockRow);

  let bestRow = -1;
  let bestScore = 0;
  let bestHeaders: string[] = [];
  let bestMapping: ColumnMapping = {};

  for (let r = 0; r < searchLimit; r += 1) {
    const row = matrix[r];
    if (!row) continue;
    const spans = getRowSpans(row);
    // Title rows typically have only 1 span across the page
    if (spans.length < 2) continue;
    if (isRepeatingPozBlockStart(matrix, r)) continue;

    const effHeaders = buildEffectiveHeaders(matrix, r, firstBlockRow);
    const mapped = suggestMapping(effHeaders);

    let score = 0;
    if (mapped.description) score += 3;
    if (mapped.quantity) score += 3;
    if (mapped.unit) score += 2;
    if (mapped.positionCode) score += 2;
    if (mapped.price) score += 1;

    // Prefer the bottom row of a 2-row header (where "Toplam" appears on row r while "Katlar" was on row r-1)
    const hasToplam = spans.some((s) => s.clean === "toplam" || s.clean === "net metraj" || s.clean === "miktar");
    if (hasToplam) score += 2;

    if (score >= 7 && mapped.description && mapped.quantity && mapped.unit && score >= bestScore) {
      // Ensure there is at least 1 data row between r+1 and firstBlockRow
      const hasDataRowBelow = matrix
        .slice(r + 1, Math.min(firstBlockRow, r + 15))
        .some((dRow) => dRow && dRow.some((cell) => parseLocalizedNumber(String(cell ?? "")) !== null));
      if (hasDataRowBelow) {
        bestScore = score;
        bestRow = r;
        bestHeaders = effHeaders;
        bestMapping = mapped;
      }
    }
  }

  if (repeatingBlockStarts.length > 0 && bestRow >= 0) {
    return {
      archetype: "hybrid_summary_and_blocks",
      headerRow: bestRow + 1,
      effectiveHeaders: bestHeaders,
      suggestedMapping: {
        ...bestMapping,
        headerRow: bestRow + 1,
        tableMode: "flat_or_pivot",
        detectedArchetype: "hybrid_summary_and_blocks",
      },
      repeatingBlockStarts,
    };
  }

  if (repeatingBlockStarts.length > 0) {
    return {
      archetype: "repeating_block_boq",
      headerRow: repeatingBlockStarts[0] + 1,
      effectiveHeaders: ["POZ NO", "İMALATIN ADI", "BİRİMİ", "Genel Toplam"],
      suggestedMapping: {
        headerRow: repeatingBlockStarts[0] + 1,
        tableMode: "repeating_blocks",
        detectedArchetype: "repeating_block_boq",
        positionCode: "POZ NO",
        description: "İMALATIN ADI",
        unit: "BİRİMİ",
        quantity: "Genel Toplam",
      },
      repeatingBlockStarts,
    };
  }

  if (bestRow >= 0) {
    const prevRow = bestRow > 0 ? matrix[bestRow - 1] ?? [] : [];
    const isPivot =
      prevRow.some((cell) => cleanTurkishHeader(String(cell ?? "")).includes("katlar")) ||
      bestHeaders.filter((h) => Boolean(h && h.trim())).length > 8;
    const archetype: SpreadsheetArchetype = isPivot ? "multi_header_pivot" : "flat_table";
    return {
      archetype,
      headerRow: bestRow + 1,
      effectiveHeaders: bestHeaders,
      suggestedMapping: {
        ...bestMapping,
        headerRow: bestRow + 1,
        tableMode: "flat_or_pivot",
        detectedArchetype: archetype,
      },
      repeatingBlockStarts: [],
    };
  }

  // Fallback to first non-empty row (standard 1-row CSV/XLSX behavior)
  const firstNonEmptyIdx = matrix.findIndex((row) =>
    row?.some((value) => String(value ?? "").trim() !== ""),
  );
  const fallbackRow = Math.max(0, firstNonEmptyIdx);
  const fallbackHeaders = matrix[fallbackRow] ?? [];
  return {
    archetype: "flat_table",
    headerRow: fallbackRow + 1,
    effectiveHeaders: fallbackHeaders,
    suggestedMapping: suggestMapping(fallbackHeaders),
    repeatingBlockStarts: [],
  };
}

/**
 * Returns all column indices in `headers` matching `mappedLabel`, including trailing empty
 * columns that belong to a horizontally merged header span.
 */
function headerIndices(headers: string[], mappedLabel?: string): number[] {
  if (!mappedLabel) return [];
  const targetTrim = mappedLabel.trim();
  const targetClean = cleanTurkishHeader(targetTrim);
  if (!targetClean) return [];

  const exact: number[] = [];
  const fuzzy: number[] = [];
  headers.forEach((header, idx) => {
    const hTrim = String(header ?? "").trim();
    if (!hTrim) return;
    if (hTrim === targetTrim || cleanTurkishHeader(hTrim) === targetClean) {
      exact.push(idx);
    } else if (cleanTurkishHeader(hTrim).includes(targetClean)) {
      fuzzy.push(idx);
    }
  });
  const base = exact.length > 0 ? exact : fuzzy;
  if (base.length === 0) return [];

  // Expand each matched header index across immediately following empty header columns
  // so horizontally merged headers (when loaded with ignoreNodes: ["mergeCells"]) cover their full span.
  const expanded: number[] = [];
  for (const startIdx of base) {
    if (!expanded.includes(startIdx)) expanded.push(startIdx);
    for (let c = startIdx + 1; c < Math.min(headers.length + 4, startIdx + 4); c += 1) {
      const cellHeader = String(headers[c] ?? "").trim();
      if (cellHeader && cleanTurkishHeader(cellHeader) !== targetClean) break;
      if (!expanded.includes(c)) expanded.push(c);
    }
  }
  return expanded;
}

function readSpanValue(
  values: string[],
  cols: number[],
  validator?: (val: string) => boolean,
): string {
  if (cols.length === 0) return "";
  if (validator) {
    for (const c of cols) {
      const v = String(values[c] ?? "").trim();
      if (v && validator(v)) return v;
    }
  }
  for (const c of cols) {
    const v = String(values[c] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function isSummaryOrTotalRow(text: string): boolean {
  const clean = cleanTurkishHeader(text);
  return (
    clean === "toplam" ||
    clean === "genel toplam" ||
    clean === "ara toplam" ||
    clean === "toplam:" ||
    clean === "genel toplam:" ||
    clean === "ara toplam:" ||
    clean.startsWith("genel toplam") ||
    clean.startsWith("ara toplam")
  );
}

function fromMatrix(
  sheetName: string,
  matrix: Array<Array<string>>,
  mappingInput: ColumnMapping = {},
  formulas: Record<number, Record<string, string>> = {},
) {
  checkMatrix(matrix);

  const structure = detectSheetStructure(matrix);

  const wantsRepeatingBlocks =
    mappingInput.tableMode === "repeating_blocks" ||
    (mappingInput.tableMode !== "flat_or_pivot" &&
      structure.archetype === "repeating_block_boq" &&
      structure.repeatingBlockStarts.length > 0);

  if (wantsRepeatingBlocks && structure.repeatingBlockStarts.length > 0) {
    const rows = extractRepeatingBlockRows(sheetName, matrix, formulas);
    const mapping: ColumnMapping = {
      ...structure.suggestedMapping,
      ...mappingInput,
      tableMode: "repeating_blocks",
      detectedArchetype: structure.archetype,
    };
    return { rows, mapping };
  }

  // If caller left headerRow at default 1 (or undefined) and auto-detection found a real header row > 1
  // whereas row 1 does not match required columns, use the detected headerRow.
  let headerRow = Math.max(1, mappingInput.headerRow ?? structure.headerRow);
  const stopRow =
    structure.repeatingBlockStarts.length > 0 && structure.repeatingBlockStarts[0] > headerRow
      ? structure.repeatingBlockStarts[0]
      : matrix.length;

  let headers = buildEffectiveHeaders(matrix, headerRow - 1, stopRow);
  let mapping: ColumnMapping = {
    ...suggestMapping(headers),
    ...mappingInput,
    headerRow,
    detectedArchetype: structure.archetype,
  };

  let descCols = headerIndices(headers, mapping.description);
  let unitCols = headerIndices(headers, mapping.unit);
  let qtyCols = headerIndices(headers, mapping.quantity);

  // If mappingInput had stale profile defaults (e.g. headerRow=1, description="Açıklama")
  // that don't exist on row 1, fall back to the auto-detected structure headerRow & mapping!
  if ((descCols.length === 0 || unitCols.length === 0 || qtyCols.length === 0) && structure.headerRow > 0) {
    headerRow = structure.headerRow;
    headers = buildEffectiveHeaders(matrix, headerRow - 1, stopRow);
    const autoSuggested = suggestMapping(headers);
    mapping = {
      ...autoSuggested,
      ...mappingInput,
      headerRow,
      positionCode: headerIndices(headers, mappingInput.positionCode).length
        ? mappingInput.positionCode
        : autoSuggested.positionCode,
      description: headerIndices(headers, mappingInput.description).length
        ? mappingInput.description
        : autoSuggested.description,
      unit: headerIndices(headers, mappingInput.unit).length
        ? mappingInput.unit
        : autoSuggested.unit,
      quantity: headerIndices(headers, mappingInput.quantity).length
        ? mappingInput.quantity
        : autoSuggested.quantity,
      price: headerIndices(headers, mappingInput.price).length
        ? mappingInput.price
        : autoSuggested.price,
      wastePercent: headerIndices(headers, mappingInput.wastePercent).length
        ? mappingInput.wastePercent
        : autoSuggested.wastePercent,
      detectedArchetype: structure.archetype,
    };
    descCols = headerIndices(headers, mapping.description);
    unitCols = headerIndices(headers, mapping.unit);
    qtyCols = headerIndices(headers, mapping.quantity);
  }

  let codeCols = headerIndices(headers, mapping.positionCode);
  const priceCols = headerIndices(headers, mapping.price);
  const wasteCols = headerIndices(headers, mapping.wastePercent);

  // Exclude unitCols from descCols/codeCols when a header like "Malzeme" was merged over the unit column
  if (unitCols.length > 0) {
    const unitSet = new Set(unitCols);
    const filteredDesc = descCols.filter((c) => !unitSet.has(c));
    if (filteredDesc.length > 0) descCols = filteredDesc;
    const filteredCode = codeCols.filter((c) => !unitSet.has(c));
    if (filteredCode.length > 0) codeCols = filteredCode;
  }

  // If description is merged (e.g. C3:C4) and data actually overflows 1 cell to the right (C4:C5)
  // while the next mapped column is at >= C6, include the adjacent overflow column in descCols.
  if (descCols.length > 0) {
    const maxDescCol = descCols[descCols.length - 1];
    const nextColHeader = String(headers[maxDescCol + 1] ?? "").trim();
    if (!nextColHeader) {
      descCols = [...descCols, maxDescCol + 1];
    }
  }

  if (descCols.length === 0 || unitCols.length === 0 || qtyCols.length === 0) {
    throw new Error("COLUMN_MAPPING_REQUIRED");
  }

  const rows: ParsedQuantityRow[] = [];
  let lastNamedPositionCode = "";
  let lastNamedDescription = "";
  let lastNamedUnit = "";

  const isMultiRowContractorSheet = headerRow > 1 || structure.archetype !== "flat_table";

  for (let r = headerRow; r < stopRow; r += 1) {
    const values = matrix[r] ?? [];
    if (values.every((value) => !String(value ?? "").trim())) continue;
    if (isRepeatingPozBlockStart(matrix, r)) break;

    const sourceRowNumber = r + 1;
    let rawPositionCode = readSpanValue(values, codeCols);
    let rawDescription = readSpanValue(
      values,
      descCols.filter((c) => !codeCols.includes(c) || descCols.length === codeCols.length),
    );
    if (!rawDescription) {
      rawDescription = readSpanValue(values, descCols);
    }
    const rawUnit = readSpanValue(values, unitCols, (v) => normalizeUnit(v) !== null);
    const rawQuantity = readSpanValue(values, qtyCols, (v) => parseLocalizedNumber(v) !== null);
    const rawPrice = readSpanValue(values, priceCols);
    const rawWastePercent = readSpanValue(values, wasteCols);

    // Skip repeated header rows or total/subtotal summary rows
    if (
      isSummaryOrTotalRow(rawDescription) ||
      isSummaryOrTotalRow(rawPositionCode) ||
      (cleanTurkishHeader(rawUnit) === "birim" && cleanTurkishHeader(rawQuantity) === cleanTurkishHeader(mapping.quantity ?? ""))
    ) {
      continue;
    }

    if (isMultiRowContractorSheet) {
      // Fallback 1: Malzeme Pozu is filled, Poz Açıklaması is empty (e.g. Astar_2mm, Beton C30/37)
      if (!rawDescription && rawPositionCode) {
        rawDescription = rawPositionCode;
      }
      // Fallback 2: Single "Malzeme" column acts as both code and description (e.g. V6 summary table)
      if (!rawPositionCode && rawDescription && codeCols.length === 0) {
        rawPositionCode = rawDescription;
      }
      // Fallback 3: Multi-unit continuation row or unnamed BIM group row with valid unit + positive quantity
      if (!rawDescription && !rawPositionCode) {
        const validUnit = normalizeUnit(rawUnit);
        const validQty = parseLocalizedNumber(rawQuantity);
        if (validUnit && validQty !== null && validQty > 0) {
          if (lastNamedDescription && lastNamedUnit && lastNamedUnit !== validUnit) {
            rawPositionCode = `${lastNamedPositionCode || lastNamedDescription}_${validUnit}`;
            rawDescription = `${lastNamedDescription} (${validUnit})`;
          } else {
            rawPositionCode = `POZSUZ-${sourceRowNumber}`;
            rawDescription = `Poz Atanmamış İmalat Kalemi (${validUnit})`;
          }
        } else {
          continue;
        }
      } else {
        lastNamedPositionCode = rawPositionCode;
        lastNamedDescription = rawDescription;
        lastNamedUnit = normalizeUnit(rawUnit) ?? rawUnit;
      }

      // If a contractor sheet has multiple rows with the same PositionCode but different units (e.g. Beton_C30 in m² and m³),
      // disambiguate the position code by unit if needed.
    }

    rows.push({
      sheetName,
      sourceRowNumber,
      sourceCellRange: `A${sourceRowNumber}:${excelColumnName(Math.min(Math.max(headers.length, values.length, 1), MAX_SPREADSHEET_COLS))}${sourceRowNumber}`,
      rawPositionCode,
      rawDescription,
      rawUnit,
      rawQuantity,
      rawPrice,
      rawWastePercent,
      formulaJson: formulas[sourceRowNumber] ?? {},
    });
  }

  return { rows, mapping };
}

function previewSheet(name: string, matrix: string[][], formulaCells: string[] = []): PreviewSheet {
  checkMatrix(matrix);
  const nonEmptyRows = matrix.filter((row) => row && row.some((value) => String(value ?? "").trim() !== ""));
  const columnCount = nonEmptyRows.reduce((max, row) => Math.max(max, row.length), 0);
  const structure = detectSheetStructure(matrix);

  // Ensure sampleRows includes enough rows to cover headerRow (e.g. row 16 or row 18) plus data rows
  // while keeping exact length for small CSVs without empty leading rows.
  const hasLeadingEmptyRows =
    matrix.length > nonEmptyRows.length && (structure.headerRow > 1 || matrix.length > 8);
  const sampleSliceLimit = Math.max(25, structure.headerRow + 12);
  const sourceRowsForSample = hasLeadingEmptyRows
    ? Array.from({ length: Math.min(matrix.length, sampleSliceLimit) }, (_, idx) => matrix[idx] ?? [])
    : nonEmptyRows.slice(0, sampleSliceLimit);

  return {
    name,
    rowCount: nonEmptyRows.length,
    columnCount,
    sampleRows: sourceRowsForSample.map((row) => row.slice(0, 32)),
    suggestedMapping: structure.suggestedMapping,
    formulaCells: formulaCells.slice(0, 50),
    detectedArchetype: structure.archetype,
    repeatingBlockCount: structure.repeatingBlockStarts.length,
  };
}

/**
 * Reads only a bounded preview and never writes normalized rows. The route
 * uses this before mapping/process so a reviewer can see the source shape.
 */
export async function inspectDocument(content: Buffer, kind: "xlsx" | "csv"): Promise<DocumentPreview> {
  if (kind === "csv") {
    const records = parseCsv(content, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      max_record_size: 65_536,
      to: MAX_SPREADSHEET_ROWS + 1,
    }) as unknown[][];
    const formulaCells: string[] = [];
    const matrix = records.map((record, rowIndex) =>
      record.map((value, columnIndex) => {
        const raw = String(value ?? "");
        if (/^[=+\-@]/.test(raw)) formulaCells.push(`CSV!${excelColumnName(columnIndex + 1)}${rowIndex + 1}`);
        return sanitizeSpreadsheetText(raw);
      }),
    );
    return { kind, sheets: [previewSheet("CSV", matrix, formulaCells)] };
  }

  await validateXlsxArchive(content);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content as unknown as ExcelJS.Buffer, { ignoreNodes: ["mergeCells"] } as unknown as undefined);
  if (workbook.worksheets.length > 20) throw new Error("SPREADSHEET_SHAPE_LIMIT");
  const sheets = workbook.worksheets.map((worksheet) => {
    const matrix: string[][] = [];
    const formulaCells: string[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > MAX_SPREADSHEET_ROWS || row.cellCount > MAX_SPREADSHEET_COLS) {
        throw new Error("SPREADSHEET_SHAPE_LIMIT");
      }
      const values: string[] = [];
      for (let column = 1; column <= row.cellCount; column += 1) {
        const cell = row.getCell(column);
        const master = cell.isMerged && cell.master ? cell.master : cell;
        const value = master.value;
        if (value && typeof value === "object" && "formula" in value && cell.address === master.address) {
          formulaCells.push(`${worksheet.name}!${cell.address}`);
        }
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
    const records = parseCsv(content, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      max_record_size: 65_536,
      to: MAX_SPREADSHEET_ROWS + 1,
    }) as unknown[][];
    const matrix = records.map((record) =>
      record.map((value) => {
        const raw = String(value ?? "");
        return sanitizeSpreadsheetText(raw);
      }),
    );
    const formulaRows: Record<number, Record<string, string>> = {};
    records.forEach((record, rowIndex) =>
      record.forEach((value, columnIndex) => {
        const raw = String(value ?? "");
        if (/^[=+\-@]/.test(raw)) (formulaRows[rowIndex + 1] ??= {})[`${columnIndex + 1}`] = raw;
      }),
    );
    return fromMatrix("CSV", matrix, mapping, formulaRows);
  }
  await validateXlsxArchive(content);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content as unknown as ExcelJS.Buffer, { ignoreNodes: ["mergeCells"] } as unknown as undefined);
  const worksheet = mapping.sheet ? workbook.getWorksheet(mapping.sheet) : workbook.worksheets[0];
  if (!worksheet) throw new Error("SHEET_NOT_FOUND");
  const matrix: string[][] = [];
  const formulas: Record<number, Record<string, string>> = {};
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowFormulas: Record<string, string> = {};
    if (rowNumber > MAX_SPREADSHEET_ROWS || row.cellCount > MAX_SPREADSHEET_COLS) {
      throw new Error("SPREADSHEET_SHAPE_LIMIT");
    }
    const values: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) {
      values.push(cellText(row.getCell(column), rowFormulas));
    }
    matrix[rowNumber - 1] = values;
    if (Object.keys(rowFormulas).length) formulas[rowNumber] = rowFormulas;
  });
  return fromMatrix(worksheet.name, matrix, mapping, formulas);
}
