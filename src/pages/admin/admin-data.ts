import { z } from 'zod';
const count = z.number().int().nonnegative();
export const workerSignalsSchema = z.array(z.object({ kind: z.enum(['worker', 'ifc-worker']), lastSeen: z.string().datetime().nullable(), activeInstances: count, revision: z.string().nullable(), revisionSource: z.enum(['build', 'env']).nullable() })).length(2).refine(rows => new Set(rows.map(row => row.kind)).size === 2);
export const adminPlansSchema = z.array(z.object({
  id: z.string(), name: z.string(), monthlyPrice: count, monthlyQuoteLimit: count,
  monthlyIfcLimit: count.nullable(), ifcMaxFileMb: count, ifcMaxConcurrent: count, isActive: z.boolean(),
  isPublished: z.boolean(), isFeatured: z.boolean(), displayOrder: count,
  marketingBadge: z.string().nullable(), marketingDescription: z.string().nullable(),
  monthlyAiLimit: count.nullable().optional(),
  monthlyPdfLimit: count.nullable().optional(),
  monthlyCrmLimit: count.nullable().optional(),
  monthlyRegulationLimit: count.nullable().optional(),
  monthlyProfitAnalysisLimit: count.nullable().optional(),
  storageMaxBytes: count.nullable().optional(),
  maxDocuments: count.nullable().optional(),
  isTrial: z.boolean().optional(),
  subscriberCount: count.optional(),
  subscribers: z.array(z.object({
    companyId: z.string(),
    companyName: z.string(),
    status: z.string(),
  })).optional(),
}));
export const adminDashboardSchema = z.object({
  totalTenants: count, statusCounts: z.record(z.string(), count), totalMRR: z.number().nonnegative().nullable(), missingPlanCount: count.optional(),
  approvedTransfersTotal: z.object({ amountTry: z.number().nonnegative().nullable(), count: count.nullable(), complete: z.boolean() }).optional(),
  workerSignals: workerSignalsSchema.nullable().optional(),
  totalQuotesThisMonth: count, totalIfcThisMonth: count,
  planDistribution: z.array(z.object({ name: z.string(), count })),
  queueStats: z.object({ queued: count, running: count, failed24h: count, succeeded24h: count, oldestQueuedAt: z.string().nullable().optional(), oldestQueuedAgeSeconds: z.number().nonnegative().nullable().optional() }),
});
export async function readAdminResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let value: unknown;
  try { value = await response.json(); } catch { throw new Error('ADMIN_RESPONSE_INVALID'); }
  const result = schema.safeParse(value);
  if (!result.success) throw new Error('ADMIN_RESPONSE_INVALID');
  return result.data;
}
