import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { LayoutDashboard, Building2, CreditCard, Activity, Users } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { adminDashboardSchema, readAdminResponse } from './admin-data';

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    fetchWithAuth('/api/admin/dashboard')
      .then(res => readAdminResponse(res, adminDashboardSchema))
      .then(setData)
      .catch(() => { setData(null); setError('Platform metrikleri yüklenemedi. Sıfır değer gösterilmiyor; tekrar deneyin.'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadDashboard(); }, []);

  return (
    <PageContainer>
      <PageHeader title="Platform Genel Bakış" description="TeklifPro platformunun genel durumunu, aktif firmaları ve gelir metriklerini takip edin." icon={LayoutDashboard} />
      
      {loading ? (
        <div className="flex h-40 items-center justify-center text-zinc-500">Yükleniyor...</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-500/30 p-5 text-red-300">
          <p>{error}</p><Button onClick={loadDashboard} variant="outline" className="mt-3">Tekrar dene</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-indigo-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Toplam Tenant</p>
              </div>
              <p className="text-3xl font-black text-white">{data?.totalTenants || 0}</p>
              <div className="mt-4 flex gap-3 text-xs text-zinc-500 border-t border-indigo-500/10 pt-3">
                <span className="text-emerald-400">{data?.statusCounts?.active || 0} aktif</span>
                <span className="text-amber-400">{data?.statusCounts?.past_due || 0} ödeme bekliyor</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={16} className="text-emerald-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Tahmini MRR (Aylık Gelir)</p>
              </div>
              <p className="text-3xl font-black text-white">₺{(data?.totalMRR || 0).toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-4 border-t border-emerald-500/10 pt-3">Aktif aboneliklerin aylık bedel toplamı.</p>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-blue-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Bu Ay Oluşturulan Teklif</p>
              </div>
              <p className="text-3xl font-black text-white">{data?.totalQuotesThisMonth || 0}</p>
              <p className="text-xs text-zinc-500 mt-4 border-t border-blue-500/10 pt-3">Platform genelinde sistem yükü.</p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-amber-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Bu Ay İşlenen IFC</p>
              </div>
              <p className="text-3xl font-black text-white">{data?.totalIfcThisMonth || 0}</p>
              <p className="text-xs text-zinc-500 mt-4 border-t border-amber-500/10 pt-3">Python IfcOpenShell BIM analiz yükü.</p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-purple-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Paket Dağılımı</p>
              </div>
              <div className="flex flex-col gap-1 text-sm text-zinc-300">
                {data?.planDistribution?.length ? data.planDistribution.map((p: any) => (
                  <div key={p.name} className="flex justify-between border-b border-purple-500/10 pb-1 last:border-0">
                    <span>{p.name}</span>
                    <span className="font-bold text-white">{p.count}</span>
                  </div>
                )) : (
                  <span className="text-zinc-500">Aktif paket aboneliği yok</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-4 border-t border-purple-500/10 pt-3">Paket dağılım oranları.</p>
            </div>

          </div>

          {/* Kuyruk Özeti Kartı */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
                IFC ve Belge Kuyruk Durumu
              </h3>
              <div className="flex items-center gap-5 text-xs text-zinc-400 mt-2">
                <span>Bekleyen: <strong className="text-white">{data.queueStats.queued}</strong></span>
                <span>Çalışan: <strong className="text-amber-400">{data.queueStats.running}</strong></span>
                <span>Başarısız (24 saat): <strong className={data.queueStats.failed24h ? "text-red-400" : "text-zinc-400"}>{data.queueStats.failed24h}</strong></span>
              </div>
            </div>

            <a
              href="/admin/queue"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
            >
              Kuyruğu İzle & Yönet →
            </a>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
