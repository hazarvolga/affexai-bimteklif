import { reserveFeatureUsage } from './feature-quota';

export const AI_USAGE_FEATURE = 'AI_QUOTATION_GENERATED';

// Failed/time-out/crashed provider attempts keep their reservation because provider
// spending may already have happened; AI reservations are never released.
export function reserveAiUsage(companyId: string, userId: string) {
  return reserveFeatureUsage(companyId, userId, AI_USAGE_FEATURE);
}
