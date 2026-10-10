import React, { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { UsageStat, usageDisplay, usageLabels } from './billing-usage';

interface BillingData {
  plan: string; usage: UsageStat[]; totalMonthlyCost: number;
  period: { start: string; end: string; timezone?: string };
}

export function Billing() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function load() {
    setLoading(true); setError(false);
    try {
      const response = await fetchWithAuth('/api/billing/usage-stats');
      if (!response.ok) throw new Error('Billing unavailable');
      const result = await response.json();
      if (!Array.isArray(result.usage) || typeof result.plan !== 'string' || !result.period) throw new Error('Invalid billing data');
      setData(result);
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const cost = (value: number) => Number.isFinite(value) ? `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : 'Belirtilmedi';
  return <PageContainer className="min-w-0 [&_*]:tracking-normal">
    <header className="mb-8 flex items-center gap-3"><CreditCard className="shrink-0 text-emerald-400" /><h1 className="text-2xl font-semibold">Faturalandırma & Kullanım</h1></header>
    {loading ? <p role="status">Kullanım yükleniyor…</p> : error || !data ? <div role="alert" className="space-y-4">
      <p>Kullanım verileri yüklenemedi.</p><Button onClick={load} variant="outline"><RefreshCw size={16} /> Tekrar dene</Button>
    </div> : <>
      <section className="mb-8 border-y border-zinc-800 py-5 flex flex-wrap justify-between gap-4">
        <div><h2 className="text-lg font-medium">Kullanım özeti</h2><p className="text-sm text-zinc-400">Dönem başlangıcı: {new Date(data.period.start).toLocaleDateString('tr-TR', { timeZone: 'UTC' })} (UTC)</p></div>
        <p className="max-w-full break-words text-sm text-zinc-300">Plan: {data.plan === 'unavailable' ? 'Belirtilmedi' : data.plan}</p>
      </section>
      <div className="space-y-6">
        {data.usage.map(stat => {
          const view = usageDisplay(stat);
          return <section key={stat.feature} className="border-b border-zinc-800 pb-5 space-y-3" aria-label={usageLabels[stat.feature] ?? stat.feature}>
            <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium break-words">{usageLabels[stat.feature] ?? stat.feature.replaceAll('_', ' ')}</h3>
              <span className="text-sm tabular-nums">{stat.current.toLocaleString('tr-TR')} / {view.limitLabel}</span>
            </div>
            {view.percentage !== null && <progress aria-label={`${usageLabels[stat.feature] ?? stat.feature} kullanımı`} max={100} value={view.percentage} className="block h-2 w-full accent-emerald-500" />}
            <p className="text-xs text-zinc-400">{stat.enforced ? 'Uygulanan kota' : 'Bilgilendirme; bu limit uygulanmıyor'} · Tahmini işlem maliyeti: {cost(stat.cost)}</p>
            {view.alert && <p role="status" className="flex items-start gap-2 text-sm text-amber-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />
              {view.alert === 'unavailable' ? 'Kullanım izni yok. Abonelik ve plan durumunuzu yöneticinizle kontrol edin.' : view.alert === 'exhausted' ? 'Kota doldu. Bu dönem yeni teklif oluşturulamıyor.' : `Kota kullanımınız %${Math.floor(view.percentage!)} seviyesinde.`}
            </p>}
          </section>;
        })}
      </div>
      <section className="py-8 border-b border-zinc-800 space-y-2"><h2 className="text-lg font-medium">Tahmini işlem maliyeti</h2><p className="text-xl tabular-nums">{cost(data.totalMonthlyCost)}</p><p className="text-sm text-zinc-400">Bu tutar fatura veya kart tahsilatı değildir.</p></section>
      <section className="py-8 space-y-3"><h2 className="text-lg font-medium">Ödeme durumu</h2><p className="text-sm text-zinc-400">Online ödeme ve otomatik abonelik bağlı değil. Plan değişikliği için çalışma alanı yöneticinizle iletişime geçin.</p></section>
    </>}
  </PageContainer>;
}
