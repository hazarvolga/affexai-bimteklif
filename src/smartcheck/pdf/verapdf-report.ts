import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const VeraPdfValidationReportSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("verapdf_validation"),
  status: z.enum(["completed", "unavailable"]),
  tool: z.object({
    name: z.literal("veraPDF"),
    version: z.string().min(1).nullable(),
    status: z.enum(["available", "unavailable"]),
  }),
  profile: z.object({
    code: z.enum(["1a", "1b", "2a", "2b", "2u", "3a", "3b", "3u", "4", "4e", "4f"]),
    name: z.string().min(1).nullable(),
  }),
  source: z.object({
    fileName: z.string().min(1),
    checksumSha256: Sha256Schema,
    sizeBytes: z.number().int().nonnegative(),
    preserved: z.literal(true),
  }),
  validation: z.object({
    isCompliant: z.boolean().nullable(),
    scanComplete: z.boolean(),
    passedRules: z.number().int().nonnegative().nullable(),
    failedRules: z.number().int().nonnegative().nullable(),
    passedChecks: z.number().int().nonnegative().nullable(),
    failedChecks: z.number().int().nonnegative().nullable(),
    statement: z.string().nullable(),
  }),
  conversion: z.object({
    status: z.literal("disabled_requires_licensed_provider"),
    outputCreated: z.literal(false),
    sourceOverwritten: z.literal(false),
  }),
  unavailableReason: z.enum(["not_configured", "executable_unavailable", "version_unavailable"]).nullable(),
}).strict().superRefine((value, context) => {
  if (value.status === "completed") {
    if (value.tool.status !== "available" || value.tool.version === null || !value.validation.scanComplete || value.validation.isCompliant === null || value.unavailableReason !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Completed veraPDF reports require a complete, determinate validation." });
    }
  } else if (value.tool.status !== "unavailable" || value.validation.scanComplete || value.validation.isCompliant !== null || value.unavailableReason === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Unavailable veraPDF reports must remain indeterminate." });
  }
});

export type VeraPdfValidationReport = z.infer<typeof VeraPdfValidationReportSchema>;
