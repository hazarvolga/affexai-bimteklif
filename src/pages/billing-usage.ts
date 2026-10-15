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
  QUOTATION_CREATED: 'Teklif',
  AI_GENERATION: 'AI üretimi',
  AI_QUOTE_GENERATED: 'AI teklif',
  AI_QUOTATION_GENERATED: 'AI Teklif Üretimi',
  PDF_GENERATED: 'PDF / PDF-A Çıktısı',
  CRM_ACTION_EXECUTED: 'CRM işlemi',
  REGULATION_CHECK_RUN: 'Mevzuat Denetimi',
  PROFIT_ANALYSIS_RUN: 'Kârlılık Analizi',
  IFC_IMPORTED: 'IFC Model Analizi',
};

