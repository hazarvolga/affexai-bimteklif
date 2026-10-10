import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, FileText, RefreshCw, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Activity, crmRequest, Deal, money, stageLabel, stages } from './crm-view';

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const canMutate = ['owner', 'admin', 'manager'].includes(role ?? '');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState('lead');
  const load = useCallback(async () => {
    setLoading(true); setError(''); setDeal(null);
    try {
      const result = await crmRequest<Deal>(`/api/crm/deals/${id}`);
      const history = await crmRequest<Activity[]>(`/api/crm/deals/${id}/activities`);
      if (!Array.isArray(history) || result.id !== id) throw new Error('Geçersiz fırsat verisi.');
      setDeal(result); setStage(result.stage); setActivities(history);
    } catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function changeStage(event: React.FormEvent) {
    event.preventDefault(); if (busy || !deal) return;
    setBusy('stage');
    try {
      const updated = await crmRequest<Deal>('/api/crm/deals/update-stage', { method: 'POST', body: JSON.stringify({ dealId: id, stage }) });
      setDeal(updated); toast.success('Aşama güncellendi.');
      setActivities(await crmRequest<Activity[]>(`/api/crm/deals/${id}/activities`));
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(''); }
  }
  async function addNote(event: React.FormEvent) {
    event.preventDefault(); if (busy || !note.trim()) return;
    setBusy('note');
    try {
      const activity = await crmRequest<Activity>('/api/crm/activities', { method: 'POST', body: JSON.stringify({ dealId: id, description: note }) });
      setActivities(current => [activity, ...current]); setNote(''); toast.success('Not kaydedildi.');
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(''); }
  }
  async function analyze() {
    if (busy || !deal?.quotationId) return;
    setBusy('analysis');
    try {
      const analysis = await crmRequest<{ probability: number; riskLevel: string; insights: string }>('/api/crm/analyze-deal', { method: 'POST', body: JSON.stringify({ dealId: id }) });
      if (!analysis.insights || !Number.isFinite(analysis.probability)) throw new Error('Analiz sonucu alınamadı.');
      setDeal(current => current ? { ...current, aiInsights: analysis.insights, probability: String(analysis.probability), riskLevel: analysis.riskLevel } : current);
      toast.success('Analiz güncellendi.');
    } catch { toast.error('Analiz yapılamadı. Mevcut analiz değiştirilmedi.'); }
    finally { setBusy(''); }
  }

  return <PageContainer className="min-w-0 [&_*]:tracking-normal">
    <Link to="/app/crm" className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-300"><ArrowLeft size={16} /> CRM'e dön</Link>
    {loading ? <p role="status">Fırsat yükleniyor…</p> : error || !deal ? <div role="alert" className="space-y-4"><p>{error || 'Fırsat bulunamadı.'}</p><Button onClick={load} variant="outline"><RefreshCw size={16} /> Tekrar dene</Button></div> : <>
      <header className="mb-8 border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-semibold text-white [overflow-wrap:anywhere]">{deal.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">{stageLabel(deal.stage)} · {money(deal.value)} TRY</p>
      </header>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <section className="space-y-4 border-b border-zinc-800 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-medium">AI analizi</h2>
              {canMutate && deal.quotationId && <Button variant="outline" disabled={Boolean(busy)} onClick={analyze}><BrainCircuit size={16} />{busy === 'analysis' ? 'Analiz ediliyor…' : 'Analiz et'}</Button>}
            </div>
            {deal.aiInsights ? <><p className="whitespace-pre-wrap break-words text-sm text-zinc-300">{deal.aiInsights}</p>
              <p className="text-sm text-zinc-400">Tahmini olasılık: %{Math.round(Number(deal.probability) * 100)} · Risk: {({ low: 'Düşük', medium: 'Orta', high: 'Yüksek' } as Record<string, string>)[deal.riskLevel ?? ''] ?? 'Belirtilmedi'}</p>
            </> : <p className="text-sm text-zinc-400">{deal.quotationId ? 'Henüz AI analizi yok.' : 'Analiz için bağlı teklif bulunmuyor.'}</p>}
          </section>
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Aktivite geçmişi</h2>
            {canMutate && <form onSubmit={addNote} className="space-y-3">
              <label htmlFor="deal-note" className="text-sm text-zinc-300">Yeni not</label>
              <textarea id="deal-note" required maxLength={4000} value={note} onChange={event => setNote(event.target.value)} rows={3} className="block w-full resize-y rounded border border-zinc-700 bg-zinc-900 p-3 text-sm" />
              <Button type="submit" disabled={Boolean(busy) || !note.trim()}><Send size={16} /> {busy === 'note' ? 'Kaydediliyor…' : 'Not ekle'}</Button>
            </form>}
            {!activities.length && <p className="text-sm text-zinc-400">Henüz aktivite yok.</p>}
            <ol className="divide-y divide-zinc-800">{activities.map(activity => <li key={activity.id} className="py-4">
              <p className="mb-2 text-xs text-zinc-400">{new Date(activity.createdAt).toLocaleString('tr-TR')}</p>
              <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{activity.description}</p>
            </li>)}</ol>
          </section>
        </div>
        <aside className="min-w-0 space-y-6">
          {deal.quotationId && <Link to={`/app/quotes/${deal.quotationId}`} className="inline-flex items-center gap-2 text-emerald-400"><FileText size={18} /> Bağlı teklifi aç</Link>}
          {canMutate && <form onSubmit={changeStage} className="space-y-3 border-t border-zinc-800 pt-4">
            <label htmlFor="detail-stage" className="block text-sm">Satış aşaması</label>
            <select id="detail-stage" value={stage} onChange={event => setStage(event.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-900 p-3 text-sm">
              {stages.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}
            </select>
            <Button type="submit" disabled={Boolean(busy) || stage === deal.stage}><Save size={16} />{busy === 'stage' ? 'Kaydediliyor…' : 'Aşamayı kaydet'}</Button>
          </form>}
        </aside>
      </div>
    </>}
  </PageContainer>;
}
