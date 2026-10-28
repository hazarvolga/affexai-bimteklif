import { z } from 'zod';

const original = z.object({ description: z.string().max(1000), unit: z.string().max(40), quantity: z.number().finite().nonnegative().max(1e12), unitPrice: z.number().finite().nonnegative().max(1e12) });
const payload = z.object({ kind: z.literal('ai_estimate'), original, changedFields: z.array(z.enum(['description', 'unit', 'quantity', 'unitPrice'])).max(4) });

/** Only explicitly allowed fields leave the server; no raw evidence metadata is exposed. */
export function publicAiEvidence(value: unknown) {
  const result = payload.safeParse(value);
  return result.success ? { original: result.data.original, changedFields: result.data.changedFields } : null;
}
