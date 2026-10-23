import { createHash } from "node:crypto";
import { z } from "zod";
import type { CdeState, SuitabilityCode } from "../smartcheck/rules/iso19650";

export const cdeProjectRoleSchema = z.enum(["coordinator", "approver", "contributor", "viewer"]);
export const cdeDisciplineSchema = z.enum(["ARC", "STR", "MEP", "COST", "QA", "BIM"]);
export const cdeStateSchema = z.enum(["WIP", "SHARED", "PUBLISHED", "ARCHIVED"]);
export const cdeSuitabilitySchema = z.enum(["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "B"]);

export const createCdeProjectSchema = z.object({
  documentId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
}).strict();

export const assignCdeMemberSchema = z.object({
  userId: z.string().uuid(),
  role: cdeProjectRoleSchema,
  discipline: cdeDisciplineSchema,
}).strict();

export const createCdeContainerSchema = z.object({
  containerCode: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(240),
}).strict();

export const createCdeRevisionSchema = z.object({
  revisionCode: z.string().trim().min(1).max(32),
  processingRunId: z.string().uuid(),
  resultArtifactId: z.string().uuid(),
}).strict();

export const cdeTransitionSchema = z.object({
  action: z.enum(["approve", "reject", "withdraw"]),
  expectedVersion: z.number().int().nonnegative(),
  toState: cdeStateSchema.optional(),
  suitabilityCode: cdeSuitabilitySchema.optional(),
  revisionCode: z.string().trim().min(1).max(32).optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === "approve" && (!value.toState || !value.suitabilityCode || !value.revisionCode)) {
    ctx.addIssue({ code: "custom", message: "approve için toState, suitabilityCode ve revisionCode zorunludur." });
  }
  if (value.action === "reject" && !value.reason) {
    ctx.addIssue({ code: "custom", message: "reject için gerekçe zorunludur." });
  }
  if (value.action === "withdraw" && (!value.reason || !value.revisionCode)) {
    ctx.addIssue({ code: "custom", message: "withdraw için gerekçe ve revisionCode zorunludur." });
  }
});

export type CdeProjectRole = z.infer<typeof cdeProjectRoleSchema>;
export type CdeDiscipline = z.infer<typeof cdeDisciplineSchema>;
export type CdeTransitionAction = z.infer<typeof cdeTransitionSchema>["action"];

export interface CdeRevisionScope {
  revisionCode: string;
  documentChecksumSha256: string;
  sourceHash: string;
  ruleHash: string;
  resultHash: string;
  codeHash: string;
}

/** Canonical, order-independent identity for every input that can alter a CDE decision. */
export function canonicalCdeScopeHash(scope: CdeRevisionScope): string {
  const canonical = JSON.stringify({
    codeHash: scope.codeHash,
    documentChecksumSha256: scope.documentChecksumSha256,
    revisionCode: scope.revisionCode,
    resultHash: scope.resultHash,
    ruleHash: scope.ruleHash,
    sourceHash: scope.sourceHash,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function canonicalCdeTransitionRequestHash(input: {
  action: string;
  expectedVersion: number;
  toState?: string;
  suitabilityCode?: string;
  revisionCode?: string;
  reason?: string;
}): string {
  return createHash("sha256").update(JSON.stringify({
    action: input.action,
    expectedVersion: input.expectedVersion,
    reason: input.reason ?? null,
    revisionCode: input.revisionCode ?? null,
    suitabilityCode: input.suitabilityCode ?? null,
    toState: input.toState ?? null,
  }), "utf8").digest("hex");
}

export function transitionMetadata(input: z.infer<typeof cdeTransitionSchema>): {
  toState: CdeState;
  suitabilityCode: SuitabilityCode;
  revisionCode: string;
} | null {
  if (input.action === "reject") return null;
  if (input.action === "withdraw") {
    return { toState: "WIP", suitabilityCode: "S0", revisionCode: input.revisionCode! };
  }
  return { toState: input.toState!, suitabilityCode: input.suitabilityCode!, revisionCode: input.revisionCode! };
}
