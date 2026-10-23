import { createHash } from "node:crypto";
import { parseCsv, serializeCsv } from "../../lib/tabular-data";

export type VendorExchangeStatus = "candidate" | "internal_roundtrip";
export type VendorName = "AMP" | "OSKA";

export interface VendorExchangeProfile {
  id: string;
  vendor: VendorName;
  productVersion: string;
  format: "csv";
  delimiter: "," | ";" | "\t";
  permission: {
    status: "permitted" | "unknown" | "denied";
    basis: string;
    evidenceReference: string;
  };
  columns: {
    positionCode: string;
    description: string;
    unit: string;
    quantity: string;
  };
}

export interface CanonicalVendorRow {
  positionCode: string;
  description: string;
  unit: string;
  quantity: string;
}

interface ExchangeManifest {
  profileId: string;
  vendor: VendorName;
  productVersion: string;
  checksumSha256: string;
  rowCount: number;
  automaticOfficialSubmission: false;
}

export interface CandidateExchange {
  status: "candidate";
  compatible: false;
  csv: string;
  profile: VendorExchangeProfile;
  canonicalRows: CanonicalVendorRow[];
  manifest: ExchangeManifest;
}

export interface BlockedExchange {
  status: "blocked";
  compatible: false;
  reasons: string[];
}

export type PreparedVendorExchange = CandidateExchange | BlockedExchange;

export interface ValidatedExchange {
  status: "internal_roundtrip";
  compatible: false;
  checksumSha256: string;
}

export interface RejectedExchange {
  status: "rejected";
  compatible: false;
  reasons: string[];
}

const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const ACTIVE_FORMULA = /^[\s=+\-@]/u;
const MACRO_CAPABLE_EXTENSION = /\.(?:xls|xla|xlt|xlsm|xlam|xlsb|xltm)$/iu;
const CANONICAL_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u;

function normalizeCanonicalDecimal(value: string): string {
  if (!CANONICAL_DECIMAL.test(value)) throw new TypeError("INVALID_CANONICAL_DECIMAL");
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer, fraction = ""] = unsigned.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/u, "") || "0";
  const normalizedFraction = fraction.replace(/0+$/u, "");
  const normalized = normalizedFraction ? `${normalizedInteger}.${normalizedFraction}` : normalizedInteger;
  return negative && normalized !== "0" ? `-${normalized}` : normalized;
}

export function parseLocalizedDecimal(value: string, locale: "tr-TR" | "en-US"): string {
  const trimmed = value.trim();
  if (!trimmed || /\s/u.test(trimmed)) throw new TypeError("INVALID_NUMBER");
  const decimal = locale === "tr-TR" ? "," : ".";
  const thousands = locale === "tr-TR" ? "." : ",";
  const escapedDecimal = decimal === "." ? "\\." : decimal;
  const escapedThousands = thousands === "." ? "\\." : thousands;
  if (new RegExp(`^-?[1-9]\\d*${escapedDecimal}\\d{3}$`, "u").test(trimmed) && !trimmed.includes(thousands)) {
    throw new TypeError("AMBIGUOUS_NUMBER");
  }
  const localized = new RegExp(`^-?(?:(?:0|[1-9]\\d*)|(?:[1-9]\\d{0,2}(?:${escapedThousands}\\d{3})+))(?:${escapedDecimal}\\d+)?$`, "u");
  if (!localized.test(trimmed)) throw new TypeError("INVALID_NUMBER");
  return normalizeCanonicalDecimal(trimmed.split(thousands).join("").replace(decimal, "."));
}

export function inspectExchangeFile(input: { fileName: string; cells: readonly string[] }): { safe: boolean; risks: string[] } {
  const risks: string[] = [];
  if (MACRO_CAPABLE_EXTENSION.test(input.fileName)) risks.push("MACRO_CAPABLE_FILE");
  if (input.cells.some((cell) => ACTIVE_FORMULA.test(cell))) risks.push("ACTIVE_FORMULA_CELL");
  return { safe: risks.length === 0, risks };
}

function profileReasons(profile: VendorExchangeProfile | null): string[] {
  if (!profile) return ["PERMITTED_PROFILE_REQUIRED"];
  if (profile.permission.status !== "permitted" || !profile.permission.evidenceReference.trim()) {
    return ["PERMISSION_EVIDENCE_REQUIRED"];
  }
  if (!profile.id.trim() || !profile.productVersion.trim() || Object.values(profile.columns).some((column) => !column.trim())) {
    return ["EXACT_PROFILE_MAPPING_REQUIRED"];
  }
  return [];
}

function validateRows(rows: readonly CanonicalVendorRow[]): string[] {
  const reasons = new Set<string>();
  if (rows.length === 0) reasons.add("ROWS_REQUIRED");
  for (const row of rows) {
    if (!row.positionCode.trim() || !row.description.trim() || !row.unit.trim()) reasons.add("REQUIRED_FIELD_MISSING");
    try {
      if (normalizeCanonicalDecimal(row.quantity).startsWith("-")) reasons.add("NEGATIVE_QUANTITY");
    } catch {
      reasons.add("INVALID_QUANTITY");
    }
  }
  return [...reasons];
}

export function prepareVendorExchange(input: {
  profile: VendorExchangeProfile | null;
  rows: readonly CanonicalVendorRow[];
}): PreparedVendorExchange {
  const reasons = [...profileReasons(input.profile), ...validateRows(input.rows)];
  if (reasons.length || !input.profile) return { status: "blocked", compatible: false, reasons: [...new Set(reasons)] };
  const profile = input.profile;
  const canonicalRows = input.rows.map((row) => ({ ...row, quantity: normalizeCanonicalDecimal(row.quantity) }));
  const header = [profile.columns.positionCode, profile.columns.description, profile.columns.unit, profile.columns.quantity];
  const body = canonicalRows.map((row) => [row.positionCode, row.description, row.unit, row.quantity]);
  const csv = serializeCsv([header, ...body], { delimiter: profile.delimiter, bom: true });
  return {
    status: "candidate",
    compatible: false,
    csv,
    profile: { ...profile, permission: { ...profile.permission }, columns: { ...profile.columns } },
    canonicalRows,
    manifest: {
      profileId: profile.id,
      vendor: profile.vendor,
      productVersion: profile.productVersion,
      checksumSha256: sha256(csv),
      rowCount: canonicalRows.length,
      automaticOfficialSubmission: false,
    },
  };
}

function restoreNeutralizedCell(value: string): string {
  return value.startsWith("'") && ACTIVE_FORMULA.test(value.slice(1)) ? value.slice(1) : value;
}

function readCanonicalRows(candidate: CandidateExchange, csv: string): CanonicalVendorRow[] | null {
  let parsed: string[][];
  try {
    parsed = parseCsv(csv, { delimiter: candidate.profile.delimiter });
  } catch {
    return null;
  }
  const [header, ...rows] = parsed;
  const expectedHeader = Object.values(candidate.profile.columns);
  if (!header || header.length !== 4 || header.some((cell, index) => cell !== expectedHeader[index])) return null;
  return rows.map((cells) => ({
    positionCode: restoreNeutralizedCell(cells[0] ?? ""),
    description: restoreNeutralizedCell(cells[1] ?? ""),
    unit: restoreNeutralizedCell(cells[2] ?? ""),
    quantity: restoreNeutralizedCell(cells[3] ?? ""),
  }));
}

export function validateVendorReadback(input: {
  candidate: CandidateExchange;
  readbackCsv: string;
}): ValidatedExchange | RejectedExchange {
  if ((input as { externalAcceptance?: unknown }).externalAcceptance !== undefined) {
    return { status: "rejected", compatible: false, reasons: ["SERVER_OWNED_ACCEPTANCE_REQUIRED"] };
  }
  const reasons: string[] = [];
  const readbackHash = sha256(input.readbackCsv);
  if (readbackHash !== input.candidate.manifest.checksumSha256) reasons.push("CHECKSUM_DRIFT");
  const readbackRows = readCanonicalRows(input.candidate, input.readbackCsv);
  if (!readbackRows || JSON.stringify(readbackRows) !== JSON.stringify(input.candidate.canonicalRows)) {
    reasons.push("CANONICAL_MAPPING_DRIFT");
  }
  if (reasons.length) return { status: "rejected", compatible: false, reasons: [...new Set(reasons)] };
  return { status: "internal_roundtrip", compatible: false, checksumSha256: readbackHash };
}
