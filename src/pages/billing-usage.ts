export interface UsageStat {
  feature: string;
  current: number;
  limit: number | null;
  cost: number;
  enforced: boolean;
  available?: boolean;
  reason?: string | null;
}

export function usageDisplay(stat: Pick<UsageStat, 'current' | 'limit' | 'enforced' | 'available' | 'reason'>) {
  const limit = stat.limit !== null && Number.isFinite(stat.limit) && stat.limit >= 0 ? stat.limit : null;
  const current = Number.isFinite(stat.current) ? Math.max(0, stat.current) : 0;
  const percentage = limit === null ? null : limit === 0 ? (current > 0 ? 100 : 0) : Math.min(100, current / limit * 100);
  const unavailable = stat.available === false && stat.reason !== 'QUOTA_EXCEEDED';
  const alert = !stat.enforced ? null : unavailable || limit === null ? 'unavailable'
    : current >= limit ? 'exhausted' : percentage! >= 80 ? 'near' : null;
  return { percentage, limitLabel: limit === null ? 'Belirtilmedi' : limit.toLocaleString('tr-TR'), alert };
}

export const usageLabels: Record<string, string> = {
  QUOTATION_CREATED: 'Teklif', AI_GENERATION: 'AI üretimi', PDF_GENERATED: 'PDF',
  AI_QUOTE_GENERATED: 'AI teklif', CRM_ACTION_EXECUTED: 'CRM işlemi',
};
