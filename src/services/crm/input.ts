import { z } from 'zod';

export const crmStages = ['lead', 'contacted', 'quotation_sent', 'negotiation', 'won', 'lost'] as const;
const id = z.string().uuid();
const money = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number<string | number>().finite().min(0).max(Number.MAX_SAFE_INTEGER));
export const dealInput = z.object({
  clientId: id, name: z.string().trim().min(1).max(300), value: money.default(0),
  stage: z.enum(crmStages).default('lead'),
  expectedCloseDate: z.string().datetime({ offset: true }).transform(value => new Date(value)).nullable().optional(),
});
export const activityInput = z.object({ dealId: id, description: z.string().trim().min(1).max(4000) });
export const stageInput = z.object({ dealId: id, stage: z.enum(crmStages) });
export const dealIdInput = z.object({ dealId: id });
export const leadInput = z.object({
  name: z.string().trim().min(1, 'Lead adı zorunludur.').max(255),
  email: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  source: z.string().trim().max(100).nullable().optional(),
  status: z.string().trim().max(50).default('new'),
  notes: z.string().trim().max(5000).nullable().optional(),
});
export const dealIntelligenceInput = z.object({
  probability: z.number().finite().min(0).max(1), riskLevel: z.enum(['low', 'medium', 'high']),
  recommendedAction: z.string().trim().min(1), expectedCloseValue: z.number().finite().nonnegative(),
  insights: z.string().trim().min(1),
});
