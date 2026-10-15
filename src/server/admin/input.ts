import { z } from 'zod';
import { subscriptionStatusEnum } from '../../db/schema';

const nonnegativeInteger = z.number().int().min(0).max(2147483647);
const planFields = z.object({
  name: z.string().trim().min(1).max(120),
  monthlyQuoteLimit: nonnegativeInteger,
  monthlyPrice: nonnegativeInteger,
  monthlyIfcLimit: nonnegativeInteger.nullable().optional(),
  ifcMaxFileMb: z.number().int().min(1).max(100).optional(),
  ifcMaxConcurrent: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
  marketingBadge: z.string().trim().min(1).max(40).nullable().optional(),
  marketingDescription: z.string().trim().min(1).max(280).nullable().optional(),
  monthlyAiLimit: nonnegativeInteger.nullable().optional(),
  monthlyPdfLimit: nonnegativeInteger.nullable().optional(),
  monthlyCrmLimit: nonnegativeInteger.nullable().optional(),
  monthlyRegulationLimit: nonnegativeInteger.nullable().optional(),
  monthlyProfitAnalysisLimit: nonnegativeInteger.nullable().optional(),
  storageMaxBytes: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullable().optional(),
  maxDocuments: z.number().int().min(1).max(2147483647).nullable().optional(),
  isTrial: z.boolean().optional(),
}).strict();

export const createPlanInput = planFields.extend({
  isActive: z.boolean().default(true),
  ifcMaxFileMb: z.number().int().min(1).max(100).default(50),
  ifcMaxConcurrent: z.number().int().min(1).max(10).default(1),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(10000).default(0),
});
export const updatePlanInput = planFields
  .partial()
  .extend({
    replacementPlanId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine(value => Object.keys(value).length > 0);
export const updateSubscriptionInput = z.object({
  planId: z.string().uuid().nullable().optional(),
  status: z.enum(subscriptionStatusEnum.enumValues).optional(),
  bonusQuoteLimit: nonnegativeInteger.optional(),
  bonusIfcLimit: nonnegativeInteger.optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export const updateCompanyAdminInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().max(120).nullable().optional(),
  taxNumber: z.string().trim().max(50).nullable().optional(),
  taxOffice: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().max(1000).nullable().optional(),
  isSmartcheckEnabled: z.boolean().optional(),
  adminNotes: z.string().max(4000).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);

