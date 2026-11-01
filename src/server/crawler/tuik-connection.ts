import { TUIK_OIDC_TOKEN_URL, TUIK_SDMX_REST_BASE_URL } from "./tuik-sdmx-adapter";

const TUIK_AGENCY_ID = "TR";
const TUIK_TOKEN_CLIENT_ID = "nsi-ws-consumer";
const TUIK_REQUEST_TIMEOUT_MS = 30_000;
const INDEX_DATAFLOW_NAME = /fiyat endeks|maliyet endeks|price index|cost index/;

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface TuikDataflow {
  id: string;
  agencyId: string;
  version: string;
  name: string;
}

export interface TuikConnectionResult {
  status: "connected" | "not_configured" | "failed";
  errorCode?: string;
  totalDataflows: number;
  indexDataflows: TuikDataflow[];
}

const decodeXml = (text: string) => text
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
  .trim();

const xmlAttribute = (attributes: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1] ?? "";

function preferredName(markup: string): string {
  const names = [...markup.matchAll(/<(?:\w+:)?Name\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Name>/g)];
  const turkish = names.find(([, attributes]) => xmlAttribute(attributes, "xml:lang") === "tr");
  return decodeXml((turkish ?? names[0])?.[2] ?? "");
}

export function parseTuikDataflows(xml: string): TuikDataflow[] {
  return [...xml.matchAll(/<(?:\w+:)?Dataflow\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Dataflow>/g)].map(([, attributes, markup]) => ({
    id: xmlAttribute(attributes, "id"),
    agencyId: xmlAttribute(attributes, "agencyID"),
    version: xmlAttribute(attributes, "version"),
    name: preferredName(markup),
  }));
}

export async function requestTuikToken(apiKey: string, fetchFn: FetchFn = fetch): Promise<string> {
  const response = await fetchFn(TUIK_OIDC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "password", client_id: TUIK_TOKEN_CLIENT_ID, api_key: apiKey }).toString(),
    signal: AbortSignal.timeout(TUIK_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("TUIK_TOKEN_REJECTED");
  const body = await response.json().catch(() => null) as { access_token?: unknown } | null;
  if (typeof body?.access_token !== "string" || !body.access_token) throw new Error("TUIK_TOKEN_MISSING");
  return body.access_token;
}

async function listTuikDataflows(token: string, fetchFn: FetchFn): Promise<TuikDataflow[]> {
  const response = await fetchFn(`${TUIK_SDMX_REST_BASE_URL}/dataflow/${TUIK_AGENCY_ID}/all/latest?detail=full`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TUIK_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`TUIK_DATAFLOWS_HTTP_${response.status}`);
  const dataflows = parseTuikDataflows(await response.text());
  if (!dataflows.length) throw new Error("TUIK_DATAFLOWS_UNRECOGNIZED");
  return dataflows;
}

/** Only coded messages leave this module, so a key inside a transport error can never reach the panel. */
function failureCode(error: unknown): string {
  return error instanceof Error && /^TUIK_[A-Z0-9_]+$/.test(error.message) ? error.message : "TUIK_REQUEST_FAILED";
}

export async function checkTuikConnection(apiKey: string | undefined, fetchFn: FetchFn = fetch): Promise<TuikConnectionResult> {
  const key = apiKey?.trim();
  if (!key) return { status: "not_configured", totalDataflows: 0, indexDataflows: [] };
  try {
    const dataflows = await listTuikDataflows(await requestTuikToken(key, fetchFn), fetchFn);
    return {
      status: "connected",
      totalDataflows: dataflows.length,
      indexDataflows: dataflows.filter(flow => INDEX_DATAFLOW_NAME.test(flow.name.toLocaleLowerCase("tr-TR"))),
    };
  } catch (error) {
    return { status: "failed", errorCode: failureCode(error), totalDataflows: 0, indexDataflows: [] };
  }
}
