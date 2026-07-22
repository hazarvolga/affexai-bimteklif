export type RuleGovernanceInput = {
  governanceStatus: "draft" | "advisory" | "approved";
  jurisdiction?: string;
  contractType?: string;
  officialAuthority?: string;
  sourceDocumentIdentifier?: string;
  sourceDocumentHash?: string;
  standardVersion?: string;
  effectiveFrom?: string;
  unitPolicyJson?: Record<string, unknown>;
  roundingPolicyJson?: Record<string, unknown>;
  applicability?: string;
  exceptions?: string;
  technicalReviewerUserId?: string;
  technicalApprovedAt?: string;
  sourceType?: "official" | "docx_reference" | "google_doc_reference";
};

const requiredApprovedFields: Array<keyof RuleGovernanceInput> = [
  "jurisdiction", "contractType", "officialAuthority", "sourceDocumentIdentifier", "sourceDocumentHash", "standardVersion",
  "effectiveFrom", "unitPolicyJson", "roundingPolicyJson", "applicability", "exceptions", "technicalReviewerUserId", "technicalApprovedAt",
];

export function validateRuleGovernance(input: RuleGovernanceInput): string[] {
  const errors: string[] = [];
  if (input.governanceStatus === "approved") {
    for (const field of requiredApprovedFields) if (input[field] === undefined || input[field] === null || input[field] === "") errors.push(`${field} is required for approved rules`);
    if (input.sourceType !== "official") errors.push("Only an official source can support an approved canonical rule");
    if (!/^[a-f0-9]{64}$/i.test(input.sourceDocumentHash ?? "")) errors.push("sourceDocumentHash must be SHA-256");
  }
  return errors;
}

export const restrictedTurkishRules = ["TS 500", "TS 708", "ÇŞİDB", "YFK", "KDV", "tevkifat"] as const;

export function defaultGovernanceStatus(title: string): "draft" | "advisory" {
  return restrictedTurkishRules.some((name) => title.toLocaleLowerCase("tr-TR").includes(name.toLocaleLowerCase("tr-TR"))) ? "advisory" : "draft";
}
