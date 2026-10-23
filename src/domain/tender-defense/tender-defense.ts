import { createHash } from "node:crypto";

export interface TenderSourceArtifact {
  documentId: string;
  fileName: string;
  mediaType: "application/pdf" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  checksumSha256: string;
}

export interface TenderSourceRow {
  sourceArtifact: TenderSourceArtifact;
  locator: { page: number; row: number } | { sheet: string; row: number };
  extractionMethod: "pdf_text" | "pdf_ocr" | "xlsx_cell";
  confidence: number;
  fields: { bidderName: string; offerAmount: string };
}

export interface ClassifiedTenderRow {
  rowId: string;
  reviewStatus: "REVIEW_REQUIRED" | "OCR_REQUIRED" | "DUPLICATE" | "SOURCE_INVALID";
  fields: { bidderName: string; offerAmount: string };
  provenance: {
    sourceArtifact: TenderSourceArtifact;
    locator: TenderSourceRow["locator"];
    extractionMethod: TenderSourceRow["extractionMethod"];
    confidence: number;
  };
}

export type TenderReviewDecision =
  | { rowId: string; decision: "accepted"; reviewedBy: string; reviewedAt: string }
  | { rowId: string; decision: "corrected"; correctedFields: { bidderName: string; offerAmount: string }; reviewedBy: string; reviewedAt: string }
  | { rowId: string; decision: "rejected"; reason: string; reviewedBy: string; reviewedAt: string };

export interface VerifiedAdtInput {
  bidderName: string;
  offerAmount: string;
  verificationStatus: "user_verified";
  rowId: string;
  provenance: ClassifiedTenderRow["provenance"];
  review: { decision: "accepted" | "corrected"; reviewedBy: string; reviewedAt: string };
}

const SHA256 = /^[a-f0-9]{64}$/u;
const MONEY = /^(?:0|[1-9]\d*)\.\d{2}$/u;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const sha256 = (value: unknown): string => createHash("sha256").update(canonical(value), "utf8").digest("hex");

function businessKey(row: TenderSourceRow): string {
  return `${row.fields.bidderName.trim().toLocaleLowerCase("tr-TR")}|${row.fields.offerAmount}`;
}

function hasValidProvenance(row: TenderSourceRow): boolean {
  const locatorValid = "page" in row.locator
    ? Number.isInteger(row.locator.page) && row.locator.page > 0 && Number.isInteger(row.locator.row) && row.locator.row > 0
    : row.locator.sheet.trim().length > 0 && Number.isInteger(row.locator.row) && row.locator.row > 0;
  const sourceMatchesExtraction = row.extractionMethod === "xlsx_cell"
    ? row.sourceArtifact.mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && "sheet" in row.locator
    : row.sourceArtifact.mediaType === "application/pdf" && "page" in row.locator;
  return row.sourceArtifact.documentId.trim().length > 0
    && row.sourceArtifact.fileName.trim().length > 0
    && SHA256.test(row.sourceArtifact.checksumSha256)
    && locatorValid
    && sourceMatchesExtraction;
}

export function classifyTenderSourceRows(rows: readonly TenderSourceRow[]): ClassifiedTenderRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const key = businessKey(row);
    const duplicate = seen.has(key);
    seen.add(key);
    const reviewStatus = !hasValidProvenance(row)
      ? "SOURCE_INVALID"
      : duplicate
      ? "DUPLICATE"
      : row.extractionMethod === "pdf_ocr" || !Number.isFinite(row.confidence) || row.confidence < 0.9
        ? "OCR_REQUIRED"
        : "REVIEW_REQUIRED";
    const provenance = {
      sourceArtifact: { ...row.sourceArtifact },
      locator: { ...row.locator },
      extractionMethod: row.extractionMethod,
      confidence: row.confidence,
    };
    return {
      rowId: sha256({ provenance, fields: row.fields }),
      reviewStatus,
      fields: { ...row.fields },
      provenance,
    };
  });
}

function validReview(decision: TenderReviewDecision): boolean {
  return decision.reviewedBy.trim().length > 0 && !Number.isNaN(Date.parse(decision.reviewedAt));
}

export function prepareVerifiedAdtInputs(
  rows: readonly ClassifiedTenderRow[],
  decisions: readonly TenderReviewDecision[],
): { status: "ready"; inputs: VerifiedAdtInput[] } | { status: "blocked"; reasons: string[] } {
  const decisionByRow = new Map(decisions.map((decision) => [decision.rowId, decision]));
  const reasons = new Set<string>();
  const inputs: VerifiedAdtInput[] = [];
  for (const row of rows) {
    const review = decisionByRow.get(row.rowId);
    if (row.reviewStatus === "SOURCE_INVALID") {
      reasons.add("INVALID_SOURCE_PROVENANCE");
      continue;
    }
    if (!review) {
      if (row.reviewStatus === "OCR_REQUIRED") reasons.add("UNRESOLVED_OCR_REQUIRED");
      else if (row.reviewStatus === "DUPLICATE") reasons.add("UNRESOLVED_DUPLICATE");
      else reasons.add("USER_REVIEW_REQUIRED");
      continue;
    }
    if (!validReview(review)) {
      reasons.add("INVALID_REVIEW_EVIDENCE");
      continue;
    }
    if (row.reviewStatus === "DUPLICATE" && review.decision !== "rejected") {
      reasons.add("DUPLICATE_MUST_BE_REJECTED");
      continue;
    }
    if (review.decision === "rejected") {
      if (!review.reason.trim()) reasons.add("REJECTION_REASON_REQUIRED");
      continue;
    }
    const fields = review.decision === "corrected" ? review.correctedFields : row.fields;
    if (!fields.bidderName.trim() || !MONEY.test(fields.offerAmount)) {
      reasons.add(review.decision === "corrected" ? "INVALID_CORRECTION" : "INVALID_ACCEPTED_ROW");
      continue;
    }
    inputs.push({
      bidderName: fields.bidderName.trim(),
      offerAmount: fields.offerAmount,
      verificationStatus: "user_verified",
      rowId: row.rowId,
      provenance: row.provenance,
      review: { decision: review.decision, reviewedBy: review.reviewedBy, reviewedAt: review.reviewedAt },
    });
  }
  return reasons.size ? { status: "blocked", reasons: [...reasons] } : { status: "ready", inputs };
}

function moneyToMinor(value: string): bigint {
  if (!MONEY.test(value)) throw new TypeError("INVALID_MONEY");
  const [whole, fraction] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction);
}

function minorToMoney(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function reconcileTenderTotal(amounts: readonly string[], expectedTotal: string): {
  status: "reconciled" | "mismatch";
  expectedTotal: string;
  actualTotal: string;
  difference: string;
} {
  const expected = moneyToMinor(expectedTotal);
  const actual = amounts.reduce((sum, amount) => sum + moneyToMinor(amount), 0n);
  const difference = actual - expected;
  return {
    status: difference === 0n ? "reconciled" : "mismatch",
    expectedTotal,
    actualTotal: minorToMoney(actual),
    difference: minorToMoney(difference),
  };
}

export function buildTenderDefenseManifest(
  inputs: readonly VerifiedAdtInput[],
  sourceArtifacts: readonly TenderSourceArtifact[],
): {
  checksumSha256: string;
  inputCount: number;
  sourceArtifacts: TenderSourceArtifact[];
  automaticOfficialSubmission: false;
} {
  for (const artifact of sourceArtifacts) {
    if (!artifact.documentId.trim() || !SHA256.test(artifact.checksumSha256)) throw new TypeError("INVALID_SOURCE_ARTIFACT");
  }
  const normalizedArtifacts = sourceArtifacts.map((artifact) => ({ ...artifact }));
  const checksumByDocumentId = new Map<string, string>();
  for (const artifact of normalizedArtifacts) {
    if (checksumByDocumentId.has(artifact.documentId)) throw new TypeError("DUPLICATE_SOURCE_ARTIFACT");
    checksumByDocumentId.set(artifact.documentId, artifact.checksumSha256);
  }
  for (const input of inputs) {
    const source = input.provenance.sourceArtifact;
    if (!source.documentId.trim() || !SHA256.test(source.checksumSha256)) throw new TypeError("INVALID_INPUT_PROVENANCE");
    const manifestChecksum = checksumByDocumentId.get(source.documentId);
    if (!manifestChecksum) throw new TypeError("SOURCE_ARTIFACT_NOT_BOUND");
    if (manifestChecksum !== source.checksumSha256) throw new TypeError("SOURCE_ARTIFACT_CHECKSUM_MISMATCH");
  }
  const payload = { schemaVersion: 1, inputs, sourceArtifacts: normalizedArtifacts, automaticOfficialSubmission: false as const };
  return {
    checksumSha256: sha256(payload),
    inputCount: inputs.length,
    sourceArtifacts: normalizedArtifacts,
    automaticOfficialSubmission: false,
  };
}
