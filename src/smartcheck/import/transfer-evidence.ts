type ReviewedRow = {
  reviewStatus: string;
  reviewerUserId: string | null;
  reviewedAt: Date | null;
  reviewerNotes: string | null;
  normalizedQuantity: string | null;
  normalizedUnit: string | null;
  findingsJson: Array<Record<string, unknown>>;
};

export function transferReviewEvidence(row: ReviewedRow, quantity: number, unit: string) {
  const quantityChanged = row.normalizedQuantity == null || !Number.isFinite(quantity)
    || Number(row.normalizedQuantity) !== quantity || row.normalizedUnit !== unit;
  const hasDecision = Boolean(row.reviewerUserId && row.reviewedAt);
  const verificationStatus = !hasDecision || quantityChanged ? "unverified"
    : row.reviewStatus === "accepted_exception" ? "accepted_exception"
    : row.reviewStatus === "approved" ? "verified" : "unverified";
  return {
    verificationStatus,
    review: {
      status: row.reviewStatus,
      reviewerUserId: row.reviewerUserId,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      notes: row.reviewerNotes,
      quantityChanged,
      sourceQuantity: row.normalizedQuantity,
      sourceUnit: row.normalizedUnit,
      findingRuleVersions: [...new Set(row.findingsJson.flatMap(finding =>
        typeof finding.ruleVersion === "string" ? [finding.ruleVersion] : []))].sort(),
      // Findings only identify failed checks, not the complete executed rule set.
      executedRuleSet: null,
      competencyVerified: false,
    },
  };
}
