import { z } from 'zod';
import { subscriptionStatusEnum } from '../../db/schema';

const nonnegativeInteger = z.number().int().min(0).max(2147483647);
const planFields = z.object({
  name: z.string().trim().min(1).max(120),
  monthlyQuoteLimit: nonnegativeInteger,
  monthlyPrice: nonnegativeInteger,
  monthlyIfcLimit: nonnegativeInteger.nullable().optional(),
  ifcMaxFileMb: z.number().int().min(1).max(1024).optional(),
  ifcMaxConcurrent: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean(),
}).strict();

export const createPlanInput = planFields.extend({
  isActive: z.boolean().default(true),
  ifcMaxFileMb: z.number().int().min(1).max(1024).default(50),
  ifcMaxConcurrent: z.number().int().min(1).max(10).default(1),
});
export const updatePlanInput = planFields.partial().refine(value => Object.keys(value).length > 0);
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

