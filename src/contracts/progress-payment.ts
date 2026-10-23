import { createHash } from "node:crypto";
import { z } from "zod";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const decimal4Schema = z.string().regex(/^(0|[1-9]\d{0,15})(\.\d{1,4})?$/);
const positiveDecimal4Schema = decimal4Schema.refine((value) => !/^0(?:\.0{1,4})?$/.test(value), "Miktar sıfırdan büyük olmalıdır.");
const moneySchema = z.string().regex(/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/);

export const createConstructionContractSchema = z.object({
  sourceQuotationId: z.string().uuid().optional(),
  contractNumber: z.string().trim().min(1).max(80),
  projectName: z.string().trim().min(1).max(240),
  currency: z.enum(["TRY", "USD", "EUR"]),
  regime: z.string().trim().min(1).max(80),
  initialAmount: moneySchema,
  sourceDocumentHash: sha256Schema,
  items: z.array(z.object({
    sourceQuotationItemId: z.string().uuid().optional(),
    itemCode: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(1000),
    unit: z.string().trim().min(1).max(32),
    contractQuantity: decimal4Schema,
    unitPrice: moneySchema,
    sourceHash: sha256Schema,
  }).strict()).min(1).max(500),
}).strict();

export const createProgressPeriodSchema = z.object({
  paymentNumber: z.number().int().positive().max(100_000),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).strict().superRefine((value, ctx) => {
  if (value.periodEnd < value.periodStart) ctx.addIssue({ code: "custom", message: "Dönem bitişi başlangıçtan önce olamaz." });
});

export const saveProgressDraftSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  measurements: z.array(z.object({
    contractItemId: z.string().uuid(),
    location: z.string().trim().min(1).max(240),
    elementKey: z.string().trim().max(240).optional(),
    sourceType: z.enum(["manual", "ifc", "xlsx", "pdf", "field_record"]),
    quantity: positiveDecimal4Schema,
    unit: z.string().trim().min(1).max(32),
    sourceDocumentId: z.string().uuid().optional(),
    sourceProcessingRunId: z.string().uuid().optional(),
    sourceQuantityRowId: z.string().uuid().optional(),
    sourceCellRange: z.string().trim().max(160).optional(),
    sourceIdentity: z.string().trim().min(1).max(320),
  }).strict().superRefine((value, ctx) => {
    const external = value.sourceType !== "manual";
    if (external && (!value.sourceDocumentId || !value.sourceProcessingRunId || !value.sourceCellRange)) {
      ctx.addIssue({ code: "custom", message: `${value.sourceType} ölçümü için belge, işlem koşusu ve kaynak konumu zorunludur.` });
    }
    if (["ifc", "xlsx"].includes(value.sourceType) && !value.sourceQuantityRowId) {
      ctx.addIssue({ code: "custom", message: `${value.sourceType} ölçümü için doğrulanmış kaynak satırı zorunludur.` });
    }
    if (value.sourceType === "manual" && (value.sourceDocumentId || value.sourceProcessingRunId || value.sourceQuantityRowId)) {
      ctx.addIssue({ code: "custom", message: "Manuel ölçüm harici belge kimliği taşıyamaz." });
    }
  })).min(1).max(2_000),
}).strict();

export const reviewProgressMeasurementsSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  decisions: z.array(z.object({
    measurementId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().min(1).max(2000),
  }).strict()).min(1).max(2_000),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.decisions.map((decision) => decision.measurementId)).size !== value.decisions.length) {
    ctx.addIssue({ code: "custom", message: "Aynı ölçüm için birden fazla karar gönderilemez." });
  }
});

export const progressTransitionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "cancel"]),
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (["reject", "cancel"].includes(value.action) && !value.reason) {
    ctx.addIssue({ code: "custom", message: `${value.action} işlemi için gerekçe zorunludur.` });
  }
});

export const correctProgressPeriodSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(2000),
}).strict();

export function canonicalProgressRequestHash(value: unknown): string {
  const canonical = (input: unknown): string => {
    if (Array.isArray(input)) return `[${input.map(canonical).join(",")}]`;
    if (input instanceof Date) return JSON.stringify(input.toISOString());
    if (input && typeof input === "object") {
      return `{${Object.entries(input as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
    }
    return JSON.stringify(input) ?? "null";
  };
  return createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

export type CreateConstructionContractInput = z.infer<typeof createConstructionContractSchema>;
export type CreateProgressPeriodInput = z.infer<typeof createProgressPeriodSchema>;
export type SaveProgressDraftInput = z.infer<typeof saveProgressDraftSchema>;
export type ReviewProgressMeasurementsInput = z.infer<typeof reviewProgressMeasurementsSchema>;
export type ProgressTransitionInput = z.infer<typeof progressTransitionSchema>;
