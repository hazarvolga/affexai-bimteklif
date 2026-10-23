export type PriceAuthorizationStatus = "pending" | "authorized" | "restricted";

export type PriceAuthorizationReason =
  | "authorization_pending"
  | "authorization_restricted"
  | "authorization_evidence_missing";

export type PriceCandidateRejectionReason =
  | PriceAuthorizationReason
  | "position_code_mismatch"
  | "unit_mismatch"
  | "not_approved"
  | "not_yet_valid"
  | "expired"
  | "manual_attribution_missing"
  | "invalid_amount";

export type PriceSourceAuthorizationInput = {
  sourceType: string;
  authorizationStatus: PriceAuthorizationStatus;
  authorizationEvidenceHash: string | null;
};

export type PriceCandidate = PriceSourceAuthorizationInput & {
  snapshotId: string;
  sourceId: string;
  reviewStatus: string;
  positionCode: string | null;
  unit: string;
  amount: string | number;
  validFrom: Date | string | null;
  validUntil: Date | string | null;
  capturedAt: Date | string;
  reviewedByUserId?: string | null;
  reviewedAt?: Date | string | null;
  reviewerNotes?: string | null;
};

export type PriceCandidateRejection = {
  snapshotId: string;
  reason: PriceCandidateRejectionReason;
};

export type PriceSelectionResult = {
  status: "selected" | "review_required" | "no_match";
  reason: "single_eligible_candidate" | "ambiguous_candidates" | "no_eligible_candidate";
  candidate: PriceCandidate | null;
  rejections: PriceCandidateRejection[];
};

export type ManualSnapshotApprovalInput = {
  sourceCreatorUserId: string;
  snapshotCreatorUserId: string | null;
  reviewerUserId: string;
  reviewerNotes: string | null | undefined;
};

export type ManualSnapshotApprovalReason =
  | "reviewer_notes_missing"
  | "snapshot_creator_missing"
  | "snapshot_creator_is_reviewer"
  | "source_creator_is_reviewer";

const HASH_PATTERN = /^[a-f0-9]{16,128}$/i;

function normalizeCode(value: string | null): string {
  return (value ?? "").trim().toLocaleUpperCase("tr-TR");
}

function normalizeUnit(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, "");
  const aliases: Record<string, string> = {
    m3: "m³",
    "m^3": "m³",
    m2: "m²",
    "m^2": "m²",
    metre: "m",
    meter: "m",
    mtül: "m",
    mtul: "m",
  };
  return aliases[normalized] ?? normalized;
}

function validDate(value: Date | string | null): number | null {
  if (value === null) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function evaluatePriceSourceAuthorization(
  source: PriceSourceAuthorizationInput,
): { eligible: true; reason: null } | { eligible: false; reason: PriceAuthorizationReason } {
  if (source.authorizationStatus === "pending") {
    return { eligible: false, reason: "authorization_pending" };
  }
  if (source.authorizationStatus === "restricted") {
    return { eligible: false, reason: "authorization_restricted" };
  }
  if (!source.authorizationEvidenceHash || !HASH_PATTERN.test(source.authorizationEvidenceHash)) {
    return { eligible: false, reason: "authorization_evidence_missing" };
  }
  return { eligible: true, reason: null };
}

export function evaluateManualSnapshotApproval(
  input: ManualSnapshotApprovalInput,
): { eligible: true; reason: null } | { eligible: false; reason: ManualSnapshotApprovalReason } {
  if (!input.reviewerNotes?.trim()) return { eligible: false, reason: "reviewer_notes_missing" };
  if (!input.snapshotCreatorUserId) return { eligible: false, reason: "snapshot_creator_missing" };
  if (input.snapshotCreatorUserId === input.reviewerUserId) return { eligible: false, reason: "snapshot_creator_is_reviewer" };
  if (input.sourceCreatorUserId === input.reviewerUserId) return { eligible: false, reason: "source_creator_is_reviewer" };
  return { eligible: true, reason: null };
}

function rejectionForCandidate(
  candidate: PriceCandidate,
  positionCode: string,
  unit: string,
  at: Date,
): PriceCandidateRejectionReason | null {
  const authorization = evaluatePriceSourceAuthorization(candidate);
  if (!authorization.eligible) return authorization.reason;
  if (normalizeCode(candidate.positionCode) !== normalizeCode(positionCode)) return "position_code_mismatch";
  if (normalizeUnit(candidate.unit) !== normalizeUnit(unit)) return "unit_mismatch";
  if (candidate.reviewStatus !== "approved") return "not_approved";
  const amount = Number(candidate.amount);
  if (!Number.isFinite(amount) || amount < 0) return "invalid_amount";
  const atTime = at.getTime();
  const validFrom = validDate(candidate.validFrom);
  const validUntil = validDate(candidate.validUntil);
  if (validFrom !== null && validFrom > atTime) return "not_yet_valid";
  if (validUntil !== null && validUntil < atTime) return "expired";
  if (candidate.sourceType === "manual_override") {
    const hasAttribution = Boolean(
      candidate.reviewedByUserId
      && candidate.reviewedAt
      && candidate.reviewerNotes?.trim(),
    );
    if (!hasAttribution) return "manual_attribution_missing";
  }
  return null;
}

export function selectPriceCandidate(input: {
  positionCode: string;
  unit: string;
  at?: Date;
  candidates: readonly PriceCandidate[];
}): PriceSelectionResult {
  const at = input.at ?? new Date();
  const eligible: PriceCandidate[] = [];
  const rejections: PriceCandidateRejection[] = [];

  for (const candidate of input.candidates) {
    const reason = rejectionForCandidate(candidate, input.positionCode, input.unit, at);
    if (reason) rejections.push({ snapshotId: candidate.snapshotId, reason });
    else eligible.push(candidate);
  }

  if (eligible.length === 0) {
    const hasMatchingCandidate = rejections.some((entry) => entry.reason !== "position_code_mismatch");
    return {
      status: hasMatchingCandidate ? "review_required" : "no_match",
      reason: "no_eligible_candidate",
      candidate: null,
      rejections,
    };
  }
  if (eligible.length > 1) {
    return { status: "review_required", reason: "ambiguous_candidates", candidate: null, rejections };
  }
  return {
    status: "selected",
    reason: "single_eligible_candidate",
    candidate: eligible[0] ?? null,
    rejections,
  };
}
