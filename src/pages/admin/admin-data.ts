import { z } from 'zod';
const count = z.number().int().nonnegative();
export const adminPlansSchema = z.array(z.object({
  id: z.string(), name: z.string(), monthlyPrice: count, monthlyQuoteLimit: count,
  monthlyIfcLimit: count.nullable(), ifcMaxFileMb: count, ifcMaxConcurrent: count, isActive: z.boolean(),
}));
export const adminDashboardSchema = z.object({
  totalTenants: count, statusCounts: z.record(count), totalMRR: z.number().nonnegative(),
  totalQuotesThisMonth: count, totalIfcThisMonth: count,
  planDistribution: z.array(z.object({ name: z.string(), count })),
  queueStats: z.object({ queued: count, running: count, failed24h: count, succeeded24h: count }),
});
export async function readAdminResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let value: unknown;
  try { value = await response.json(); } catch { throw new Error('ADMIN_RESPONSE_INVALID'); }
  const result = schema.safeParse(value);
  if (!result.success) throw new Error('ADMIN_RESPONSE_INVALID');
  return result.data;
}
