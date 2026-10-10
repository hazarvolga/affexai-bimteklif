import { fetchWithAuth } from '../lib/api';

export const stages = [
  { id: 'lead', label: 'Lead' }, { id: 'contacted', label: 'İletişim' },
  { id: 'quotation_sent', label: 'Teklif gönderildi' }, { id: 'negotiation', label: 'Pazarlık' },
  { id: 'won', label: 'Kazanıldı' }, { id: 'lost', label: 'Kaybedildi' },
];
export interface Deal {
  id: string; name: string; stage: string; value: string | null;
  probability: string | null; riskLevel: string | null; aiInsights: string | null;
  quotationId: string | null;
}
export interface Activity { id: string; type: string; description: string; createdAt: string }
export async function crmRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(path, options);
  if (!response.ok) throw new Error(response.status === 404 ? 'Kayıt bulunamadı veya erişim izniniz yok.' : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.');
  return response.json();
}
export const money = (value: string | number | null) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('tr-TR') : '—';
export const stageLabel = (value: string) => stages.find(stage => stage.id === value)?.label ?? value;
