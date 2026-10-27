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
const printable = (maximum: number, minimum = 0) => z.string()
  .refine(value => !/[\u0000-\u001f\u007f]/u.test(value), 'Kontrol karakterleri kabul edilmez.')
  .transform(value => value.trim()).pipe(z.string().min(minimum).max(maximum));
const optionalText = (maximum: number) => printable(maximum).transform(value => value || null).nullable().optional();
const optionalEmail = z.union([
  z.string().refine(value => !/[\u0000-\u001f\u007f]/u.test(value), 'Kontrol karakterleri kabul edilmez.')
    .transform(value => value.trim()).pipe(z.union([z.string().email().max(255), z.literal('')])),
  z.null(),
]).optional().transform(value => value || null);
export const leadInput = z.strictObject({
  name: printable(255, 1),
  email: optionalEmail,
  phone: optionalText(50),
  source: optionalText(100),
  notes: optionalText(5000),
});

const integerQuery = (minimum: number, maximum: number, fallback: number) => z.union([
  z.undefined().transform(() => fallback),
  z.string().regex(/^(0|[1-9]\d*)$/).transform(Number).pipe(z.number().int().min(minimum).max(maximum)),
]).optional().transform(value => value ?? fallback);
export const leadPaginationInput = z.strictObject({
  limit: integerQuery(1, 200, 100),
  // Bound OFFSET scan work until this endpoint moves to a cursor contract.
  offset: integerQuery(0, 1_000, 0),
});
export const dealIntelligenceInput = z.object({
  probability: z.number().finite().min(0).max(1), riskLevel: z.enum(['low', 'medium', 'high']),
  recommendedAction: z.string().trim().min(1), expectedCloseValue: z.number().finite().nonnegative(),
  insights: z.string().trim().min(1),
});
