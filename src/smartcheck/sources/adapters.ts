import { sha256Payload } from "../pricing/snapshots";

export const OFFICIAL_ADAPTERS = {
  yfk: { adapterKey: "yfk", sourceKind: "price", displayName: "YFK birim fiyatları", authority: "ÇŞİDB Yapı İşleri Genel Müdürlüğü", sourceUrl: "https://yfk.csb.gov.tr", allowedHost: "yfk.csb.gov.tr", cadence: "monthly" },
  tuik: { adapterKey: "tuik", sourceKind: "index", displayName: "TÜİK inşaat endeksleri", authority: "Türkiye İstatistik Kurumu", sourceUrl: "https://data.tuik.gov.tr", allowedHost: "data.tuik.gov.tr", cadence: "monthly" },
  gib: { adapterKey: "gib", sourceKind: "regulation", displayName: "GİB tebliğleri", authority: "Gelir İdaresi Başkanlığı", sourceUrl: "https://www.gib.gov.tr", allowedHost: "www.gib.gov.tr", cadence: "weekly" },
  resmi_gazete: { adapterKey: "resmi_gazete", sourceKind: "regulation", displayName: "Resmî Gazete", authority: "Türkiye Cumhuriyeti Resmî Gazete", sourceUrl: "https://www.resmigazete.gov.tr", allowedHost: "www.resmigazete.gov.tr", cadence: "daily" },
} as const;

export type OfficialAdapterKey = keyof typeof OFFICIAL_ADAPTERS;
export type NormalizedPriceEntry = {
  externalReference: string | null;
  positionCode: string | null;
  description: string;
  unit: string;
  amount: number;
  currency: "TRY" | "USD" | "EUR";
  vatStatus: "included" | "excluded" | "unknown";
  vatPercent: number | null;
  region: string | null;
  validFrom: string | null;
  validUntil: string | null;
  confidence: number;
  sourceVersion: string | null;
};

export type NormalizedRegulationChange = {
  title: string;
  summary: string;
  category: "tax" | "labor" | "material" | "procurement" | "legal";
  impactLevel: "low" | "medium" | "high";
  effectiveFrom: string | null;
  sourceText: string;
  applicability: string | null;
};

export type NormalizedSourcePayload = {
  sourceDocumentIdentifier: string;
  sourceVersion: string | null;
  publishedAt: string | null;
  entries: NormalizedPriceEntry[];
  changes: NormalizedRegulationChange[];
};

export type SourceDiff = {
  changed: boolean;
  added: number;
  changedCount: number;
  removed: number;
  preview: Array<Record<string, unknown>>;
};

export function getOfficialAdapter(adapterKey: string) {
  return Object.prototype.hasOwnProperty.call(OFFICIAL_ADAPTERS, adapterKey) ? OFFICIAL_ADAPTERS[adapterKey as OfficialAdapterKey] : null;
}

export function assertAllowedSourceUrl(adapterKey: string, sourceUrl: string) {
  const adapter = getOfficialAdapter(adapterKey);
  if (!adapter) throw new Error("UNKNOWN_OFFICIAL_ADAPTER");
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || (url.hostname !== adapter.allowedHost && !url.hostname.endsWith(`.${adapter.allowedHost}`))) throw new Error("SOURCE_HOST_NOT_ALLOWED");
  return url.toString();
}

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function nullableText(value: unknown, maxLength: number) {
  const text = textValue(value, maxLength);
  return text || null;
}

function nullableIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberValue(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeOfficialPayload(adapterKey: string, payload: unknown): NormalizedSourcePayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("SOURCE_PAYLOAD_OBJECT_REQUIRED");
  const input = payload as Record<string, unknown>;
  const sourceDocumentIdentifier = textValue(input.sourceDocumentIdentifier, 255);
  if (!sourceDocumentIdentifier) throw new Error("SOURCE_DOCUMENT_IDENTIFIER_REQUIRED");
  const entries: NormalizedPriceEntry[] = [];
  const rawEntries = Array.isArray(input.entries) ? input.entries : [];
  for (const raw of rawEntries.slice(0, 5000)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const description = textValue(row.description, 500);
    const unit = textValue(row.unit, 40);
    const amount = numberValue(row.amount, Number.NaN);
    if (!description || !unit || !Number.isFinite(amount) || amount < 0) continue;
    const currency = textValue(row.currency, 3).toUpperCase();
    entries.push({
      externalReference: nullableText(row.externalReference, 255),
      positionCode: nullableText(row.positionCode, 120),
      description,
      unit,
      amount,
      currency: currency === "USD" || currency === "EUR" ? currency : "TRY",
      vatStatus: row.vatStatus === "included" || row.vatStatus === "excluded" ? row.vatStatus : "unknown",
      vatPercent: row.vatPercent === undefined || row.vatPercent === null ? null : Math.max(0, Math.min(100, numberValue(row.vatPercent, 0))),
      region: nullableText(row.region, 120),
      validFrom: nullableIsoDate(row.validFrom ?? input.validFrom),
      validUntil: nullableIsoDate(row.validUntil ?? input.validUntil),
      confidence: Math.max(0, Math.min(1, numberValue(row.confidence, 0.5))),
      sourceVersion: nullableText(row.sourceVersion ?? input.sourceVersion, 120),
    });
  }
  const changes: NormalizedRegulationChange[] = [];
  const rawChanges = Array.isArray(input.changes) ? input.changes : [];
  for (const raw of rawChanges.slice(0, 500)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const title = textValue(row.title, 500);
    const summary = textValue(row.summary, 4000);
    const sourceText = textValue(row.sourceText ?? row.summary, 8000);
    if (!title || !summary || !sourceText) continue;
    const category = ["tax", "labor", "material", "procurement", "legal"].includes(String(row.category)) ? row.category as NormalizedRegulationChange["category"] : "legal";
    const impactLevel = ["low", "medium", "high"].includes(String(row.impactLevel)) ? row.impactLevel as NormalizedRegulationChange["impactLevel"] : "medium";
    changes.push({ title, summary, category, impactLevel, effectiveFrom: nullableIsoDate(row.effectiveFrom ?? row.effectiveDate), sourceText, applicability: nullableText(row.applicability, 2000) });
  }
  if (adapterKey === "yfk" || adapterKey === "tuik") return { sourceDocumentIdentifier, sourceVersion: nullableText(input.sourceVersion, 120), publishedAt: nullableIsoDate(input.publishedAt), entries, changes: [] };
  return { sourceDocumentIdentifier, sourceVersion: nullableText(input.sourceVersion, 120), publishedAt: nullableIsoDate(input.publishedAt), entries: [], changes };
}

function entryKey(entry: NormalizedPriceEntry) {
  return entry.positionCode ?? `${entry.description}|${entry.unit}`;
}

function changeKey(change: NormalizedRegulationChange) {
  return `${change.title}|${change.effectiveFrom ?? ""}`;
}

export function diffSourcePayload(previous: NormalizedSourcePayload | null, next: NormalizedSourcePayload): SourceDiff {
  if (!previous) return { changed: true, added: next.entries.length + next.changes.length, changedCount: 0, removed: 0, preview: [] };
  const previousPairs: Array<[string, string]> = [...previous.entries.map((entry) => [entryKey(entry), JSON.stringify(entry)] as [string, string]), ...previous.changes.map((change) => [changeKey(change), JSON.stringify(change)] as [string, string])];
  const nextPairs: Array<[string, string]> = [...next.entries.map((entry) => [entryKey(entry), JSON.stringify(entry)] as [string, string]), ...next.changes.map((change) => [changeKey(change), JSON.stringify(change)] as [string, string])];
  const previousMap = new Map(previousPairs);
  const nextMap = new Map(nextPairs);
  let added = 0;
  let changedCount = 0;
  const preview: Array<Record<string, unknown>> = [];
  for (const [key, value] of nextMap) {
    if (!previousMap.has(key)) { added += 1; preview.push({ key, change: "added" }); }
    else if (previousMap.get(key) !== value) { changedCount += 1; preview.push({ key, change: "changed" }); }
  }
  let removed = 0;
  for (const key of previousMap.keys()) if (!nextMap.has(key)) { removed += 1; preview.push({ key, change: "removed" }); }
  return { changed: added > 0 || changedCount > 0 || removed > 0, added, changedCount, removed, preview: preview.slice(0, 100) };
}

export function sourcePayloadHash(payload: unknown) {
  return sha256Payload(payload);
}
