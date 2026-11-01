import { requestTuikToken } from "./tuik-connection";
import { TUIK_SDMX_REST_BASE_URL } from "./tuik-sdmx-adapter";

const TUIK_AGENCY_ID = "TR";
const TUIK_PROBE_TIMEOUT_MS = 60_000;
const TUIK_PROBE_MAX_CHARS = 12 * 1024 * 1024;
const SAMPLE_LIMIT = 12;
const IDENTIFIER = /^[A-Za-z0-9_.-]+$/;
const SDMX_JSON_ACCEPT = "application/vnd.sdmx.data+json;version=1.0.0";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

interface SdmxValue { id?: string; name?: string }
interface SdmxDimension { id?: string; name?: string; values?: SdmxValue[] }

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

function summarizeDimension(dimension: SdmxDimension): TuikDimensionSummary {
  const values = Array.isArray(dimension.values) ? dimension.values : [];
  return {
    id: String(dimension.id ?? ""),
    name: String(dimension.name ?? ""),
    valueCount: values.length,
    sampleValues: values.slice(0, SAMPLE_LIMIT).map(value => ({ id: String(value.id ?? ""), name: String(value.name ?? "") })),
  };
}

function latestObservation(observations: Record<string, unknown> | undefined, periods: SdmxValue[]) {
  const keys = Object.keys(observations ?? {});
  if (!keys.length) return { period: null, value: null };
  const last = keys.reduce((max, key) => (Number(key) > Number(max) ? key : max));
  const raw = (observations as Record<string, unknown[]>)[last]?.[0];
  const value = typeof raw === "number" ? raw : raw === null || raw === undefined ? null : Number(raw);
  return { period: periods[Number(last)]?.id ?? null, value: Number.isFinite(value) ? value : null };
}

/** Reduces an SDMX-JSON 1.0 response to its dimensions and a few series, so a person can see what it holds. */
export function summarizeTuikData(payload: unknown): TuikDataSummary {
  const root = (payload as { data?: Record<string, unknown> } | null)?.data ?? (payload as Record<string, unknown> | null);
  const dataSets = (root as { dataSets?: Array<{ series?: Record<string, { observations?: Record<string, unknown> }> }> } | null)?.dataSets;
  const dimensions = (root as { structure?: { dimensions?: { series?: SdmxDimension[]; observation?: SdmxDimension[] } } } | null)?.structure?.dimensions;
  if (!Array.isArray(dataSets) || !dataSets[0]?.series || !Array.isArray(dimensions?.series)) throw new Error("TUIK_DATA_UNRECOGNIZED");

  const seriesDimensions = dimensions.series;
  const periods = (dimensions.observation ?? []).find(dimension => dimension.id === "TIME_PERIOD")?.values ?? dimensions.observation?.[0]?.values ?? [];
  const entries = Object.entries(dataSets[0].series);
  return {
    dimensions: seriesDimensions.map(summarizeDimension),
    seriesCount: entries.length,
    sampleSeries: entries.slice(0, SAMPLE_LIMIT).map(([seriesKey, series]) => ({
      key: seriesKey.split(":").map((position, index) => `${seriesDimensions[index]?.id ?? index}=${seriesDimensions[index]?.values?.[Number(position)]?.id ?? position}`).join(" · "),
      ...latestObservation(series.observations, periods),
    })),
  };
}

function failureCode(error: unknown): string {
  return error instanceof Error && /^TUIK_[A-Z0-9_]+$/.test(error.message) ? error.message : "TUIK_REQUEST_FAILED";
}

/** Read-only look at one TÜİK dataflow: its dimensions and the newest value of a few series. Stores nothing. */
export async function probeTuikDataflow(apiKey: string | undefined, dataflowId: string, version: string, fetchFn: FetchFn = fetch): Promise<TuikProbeResult> {
  if (!IDENTIFIER.test(dataflowId) || !IDENTIFIER.test(version)) return { status: "failed", errorCode: "TUIK_INVALID_IDENTIFIER" };
  const key = apiKey?.trim();
  if (!key) return { status: "not_configured" };
  try {
    const token = await requestTuikToken(key, fetchFn);
    const response = await fetchFn(`${TUIK_SDMX_REST_BASE_URL}/data/${TUIK_AGENCY_ID},${dataflowId},${version}/all?lastNObservations=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: SDMX_JSON_ACCEPT },
      signal: AbortSignal.timeout(TUIK_PROBE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`TUIK_DATA_HTTP_${response.status}`);
    const text = await response.text();
    if (text.length > TUIK_PROBE_MAX_CHARS) throw new Error("TUIK_DATA_TOO_LARGE");
    return { status: "ok", summary: summarizeTuikData(JSON.parse(text)) };
  } catch (error) {
    return { status: "failed", errorCode: failureCode(error) };
  }
}
