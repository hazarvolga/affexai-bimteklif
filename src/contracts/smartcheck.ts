import { z } from "zod";

/**
 * Versioned boundary contracts shared by the current Express pilot and the
 * future NestJS SmartCheck module. Keep these schemas transport-focused:
 * domain/database models must not leak into the web contract.
 */
export const SMARTCHECK_CONTRACT_VERSION = "smartcheck.v1" as const;

const boundedText = (max: number) => z.string().trim().max(max);

export const smartcheckUploadRequestSchema = z.object({
  fileName: boundedText(255).min(1),
  mimeType: boundedText(255).toLowerCase(),
  fileSizeBytes: z.coerce.number().int().min(1),
}).passthrough();

export const smartcheckCompleteRequestSchema = z.object({
  checksumSha256: z.string().trim().toLowerCase().regex(/^[a-f0-9]{64}$/),
}).passthrough();

const mappingText = boundedText(120).optional();

export const smartcheckMappingRequestSchema = z.object({
  profileId: mappingText,
  sheet: mappingText,
  positionCode: mappingText,
  description: mappingText,
  unit: mappingText,
  quantity: mappingText,
  price: mappingText,
  wastePercent: mappingText,
  headerRow: z.coerce.number().int().min(1).max(100).optional(),
}).passthrough();

const correctionSchema = z.object({
  positionCode: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  unit: z.string().max(120).optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  wastePercent: z.union([z.string(), z.number()]).optional(),
}).strict();

export const smartcheckRowReviewRequestSchema = z.object({
  status: z.enum(["approved", "rejected", "accepted_exception"]),
  notes: z.string().trim().max(2000).nullable().optional(),
  correction: correctionSchema.optional(),
}).passthrough();

const transferOverrideSchema = z.object({
  quantity: z.unknown().optional(),
  unitPrice: z.unknown().optional(),
  costUnitPrice: z.unknown().optional(),
  wastePercent: z.unknown().optional(),
  vatPercent: z.unknown().optional(),
  priceSnapshotId: z.string().optional(),
}).passthrough();

export const smartcheckTransferRequestSchema = z.object({
  quotationId: z.string().trim().min(1),
  rowIds: z.array(z.string().trim().min(1)).min(1).max(5000),
  overrides: z.record(transferOverrideSchema).optional(),
}).passthrough();

export type SmartCheckUploadRequest = z.infer<typeof smartcheckUploadRequestSchema>;
export type SmartCheckCompleteRequest = z.infer<typeof smartcheckCompleteRequestSchema>;
export type SmartCheckMappingRequest = z.infer<typeof smartcheckMappingRequestSchema>;
export type SmartCheckRowReviewRequest = z.infer<typeof smartcheckRowReviewRequestSchema>;
export type SmartCheckTransferRequest = z.infer<typeof smartcheckTransferRequestSchema>;
