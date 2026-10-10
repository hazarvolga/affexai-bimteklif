import { z } from 'zod';
import { subscriptionStatusEnum } from '../../db/schema';

const nonnegativeInteger = z.number().int().min(0).max(2147483647);
const planFields = z.object({
  name: z.string().trim().min(1).max(120),
  monthlyQuoteLimit: nonnegativeInteger,
  monthlyPrice: nonnegativeInteger,
  isActive: z.boolean(),
}).strict();

export const createPlanInput = planFields.extend({ isActive: z.boolean().default(true) });
export const updatePlanInput = planFields.partial().refine(value => Object.keys(value).length > 0);
export const updateSubscriptionInput = z.object({
  planId: z.string().uuid().nullable().optional(),
  status: z.enum(subscriptionStatusEnum.enumValues).optional(),
  bonusQuoteLimit: nonnegativeInteger.optional(),
}).strict().refine(value => Object.keys(value).length > 0);
