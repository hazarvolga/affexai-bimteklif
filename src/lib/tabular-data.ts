/**
 * Shared spreadsheet-safe tabular text boundary.
 *
 * Strings are always emitted as quoted CSV fields and formula-capable prefixes
 * are neutralized with a leading apostrophe. Typed finite numbers remain
 * numeric so spreadsheet applications can calculate with them.
 */
export type TabularCell = string | number | boolean | Date | null | undefined;

export interface CsvSerializeOptions {
  delimiter?: string;
  lineEnding?: "\r\n" | "\n";
  bom?: boolean;
}

export interface CsvParseOptions {
  delimiter?: string;
}

const FORMULA_OR_LEADING_WHITESPACE = /^[\s=+\-@]/u;

function assertDelimiter(value: string): void {
  if (Array.from(value).length !== 1) {
    throw new TypeError("CSV ayracı tek karakter olmalıdır.");
  }
  if (value === '"' || value === "\r" || value === "\n") {
    throw new TypeError("CSV ayracı tırnak veya satır sonu olamaz.");
  }
}

export function neutralizeSpreadsheetFormula(value: string): string {
  return FORMULA_OR_LEADING_WHITESPACE.test(value) ? `'${value}` : value;
}

export function toSpreadsheetCell(value: TabularCell): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("CSV sayısal hücreleri sonlu olmalıdır.");
    return value;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError("CSV tarih hücresi geçerli olmalıdır.");
    return value.toISOString();
  }
  return neutralizeSpreadsheetFormula(String(value));
}

function serializeCell(value: TabularCell): string {
  const safe = toSpreadsheetCell(value);
  if (typeof safe === "number") return String(safe);
  return `"${safe.replace(/"/g, '""')}"`;
}

export function serializeCsv(
  rows: ReadonlyArray<ReadonlyArray<TabularCell>>,
  options: CsvSerializeOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  const lineEnding = options.lineEnding ?? "\r\n";
  assertDelimiter(delimiter);
  const body = rows.map((row) => row.map(serializeCell).join(delimiter)).join(lineEnding);
  const terminated = rows.length > 0 ? `${body}${lineEnding}` : "";
  return `${options.bom ? "\uFEFF" : ""}${terminated}`;
}

function countDelimitersInFirstRecord(text: string, delimiter: string): number {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (char === "\r" || char === "\n")) break;
    if (!quoted && char === delimiter) count += 1;
  }
  return count;
}

export function detectCsvDelimiter(text: string): string {
  const candidates = [";", "\t", ","];
  let best = ",";
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = countDelimitersInFirstRecord(text, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string, options: CsvParseOptions = {}): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  if (source.length === 0) return [];
  const delimiter = options.delimiter ?? detectCsvDelimiter(source);
  assertDelimiter(delimiter);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let state: "unquoted" | "quoted" | "afterClosingQuote" = "unquoted";
  let recordEnded = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (state === "quoted") {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          state = "afterClosingQuote";
        }
      } else {
        cell += char;
      }
      recordEnded = false;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      state = "unquoted";
      recordEnded = false;
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      state = "unquoted";
      recordEnded = true;
    } else if (state === "afterClosingQuote") {
      throw new SyntaxError("CSV kapanış tırnağından sonra yalnız ayraç veya satır sonu içerebilir.");
    } else if (char === '"') {
      if (cell.length > 0) {
        throw new SyntaxError("CSV tırnak işareti yalnız hücrenin başında kullanılabilir.");
      }
      state = "quoted";
      recordEnded = false;
    } else {
      cell += char;
      recordEnded = false;
    }
  }

  if (state === "quoted") throw new SyntaxError("CSV tırnaklı hücresi kapatılmamış.");
  if (!recordEnded || row.length > 0 || cell.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
