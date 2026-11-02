import { requestTuikToken } from "./tuik-connection";
import { TUIK_SDMX_REST_BASE_URL } from "./tuik-sdmx-adapter";

const TUIK_AGENCY_ID = "TR";
const TUIK_PROBE_TIMEOUT_MS = 60_000;
const TUIK_PROBE_MAX_CHARS = 12 * 1024 * 1024;
const SAMPLE_LIMIT = 12;
const IDENTIFIER = /^[A-Za-z0-9_.-]+$/;
/** Columns of an SDMX-CSV file that are not dimensions of the series. */
const NON_DIMENSION_COLUMNS = new Set(["DATAFLOW", "STRUCTURE", "STRUCTURE_ID", "ACTION"]);

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface TuikDimensionSummary {
  id: string;
  name: string;
  valueCount: number;
  sampleValues: Array<{ id: string; name: string }>;
}

export interface TuikSampleSeries {
  key: string;
  period: string | null;
  value: number | null;
}

export interface TuikDataSummary {
  dimensions: TuikDimensionSummary[];
  seriesCount: number;
  sampleSeries: TuikSampleSeries[];
}

export interface TuikProbeResult {
  status: "ok" | "not_configured" | "failed";
  errorCode?: string;
  summary?: TuikDataSummary;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some(cell => cell !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some(cell => cell !== "")) rows.push(row);
  return rows;
}

/** A plain decimal only; anything else (a decimal comma, text) is left empty rather than guessed at. */
function plainNumber(text: string | undefined): number | null {
  if (!text || !/^-?\d+(\.\d+)?$/.test(text.trim())) return null;
  return Number(text);
}

/** Reduces an SDMX-CSV response to its dimensions and the newest value of a few series, so a person can see what it holds. */
export function summarizeTuikCsv(text: string): TuikDataSummary {
  const rows = parseCsvRows(text);
  const header = rows[0]?.map(cell => cell.trim());
  const timeColumn = header?.indexOf("TIME_PERIOD") ?? -1;
  const valueColumn = header?.indexOf("OBS_VALUE") ?? -1;
  if (!header || timeColumn < 0 || valueColumn < 0) throw new Error("TUIK_DATA_UNRECOGNIZED");

  const dimensionColumns = header.map((name, index) => ({ name, index })).filter(({ name, index }) => index !== timeColumn && index !== valueColumn && index < Math.min(timeColumn, valueColumn) && !NON_DIMENSION_COLUMNS.has(name));
  const valuesByDimension = dimensionColumns.map(() => new Set<string>());
  const newest = new Map<string, { period: string; value: number | null }>();
  for (const row of rows.slice(1)) {
    const key = dimensionColumns.map(({ name, index }, position) => {
      valuesByDimension[position].add(row[index] ?? "");
      return `${name}=${row[index] ?? ""}`;
    }).join(" · ");
    const period = row[timeColumn] ?? "";
    const current = newest.get(key);
    if (!current || period > current.period) newest.set(key, { period, value: plainNumber(row[valueColumn]) });
  }
  return {
    dimensions: dimensionColumns.map(({ name }, position) => ({
      id: name,
      name: "",
      valueCount: valuesByDimension[position].size,
      sampleValues: [...valuesByDimension[position]].slice(0, SAMPLE_LIMIT).map(id => ({ id, name: "" })),
    })),
    seriesCount: newest.size,
    sampleSeries: [...newest].slice(0, SAMPLE_LIMIT).map(([key, observation]) => ({ key, period: observation.period || null, value: observation.value })),
  };
}

function failureCode(error: unknown): string {
  return error instanceof Error && /^TUIK_[A-Z0-9_]+$/.test(error.message) ? error.message : "TUIK_REQUEST_FAILED";
}

/**
 * Read-only look at one TÜİK dataflow: its dimensions and the newest value of a few series. Stores nothing.
 * The request follows the portal's documentation: the data address of the dataflow, `format=SDMX-CSV`, and a start
 * period (the previous year) so that the answer stays small.
 */
export async function probeTuikDataflow(apiKey: string | undefined, dataflowId: string, version: string, fetchFn: FetchFn = fetch, now: Date = new Date()): Promise<TuikProbeResult> {
  if (!IDENTIFIER.test(dataflowId) || !IDENTIFIER.test(version)) return { status: "failed", errorCode: "TUIK_INVALID_IDENTIFIER" };
  const key = apiKey?.trim();
  if (!key) return { status: "not_configured" };
  try {
    const token = await requestTuikToken(key, fetchFn);
    const url = `${TUIK_SDMX_REST_BASE_URL}/data/${TUIK_AGENCY_ID},${dataflowId},${version}?format=SDMX-CSV&startPeriod=${now.getUTCFullYear() - 1}`;
    const response = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TUIK_PROBE_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`TUIK_DATA_HTTP_${response.status}`);
    const text = await response.text();
    if (text.length > TUIK_PROBE_MAX_CHARS) throw new Error("TUIK_DATA_TOO_LARGE");
    return { status: "ok", summary: summarizeTuikCsv(text) };
  } catch (error) {
    return { status: "failed", errorCode: failureCode(error) };
  }
}
