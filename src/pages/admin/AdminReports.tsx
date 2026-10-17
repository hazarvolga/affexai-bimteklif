import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'sonner';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Building2,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MonthlyTrend {
  period: string;
  quoteCount: number;
  ifcCount: number;
}

interface TopTenant {
  id: string;
  name: string;
  planName: string;
  status: string;
  quoteUsage: number;
  ifcUsage: number;
  bonusQuotes: number;
  bonusIfc: number;
}

export function AdminReports() {
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/admin/reports/usage');
      if (!res.ok) {
        throw new Error('Rapor verileri alınamadı');
      }
      const data = await res.json();
      setTrends(data.monthlyTrends || []);
      setTopTenants(data.topTenants || []);
    } catch (err: any) {
      toast.error(err.message || 'Rapor yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleCsvExport = async () => {
    try {
      setExporting(true);
      const res = await fetchWithAuth('/api/admin/reports/export');
      if (!res.ok) {
        throw new Error('CSV aktarımı başarısız oldu');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teklifpro_usage_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Kullanım raporu CSV olarak indirildi');
    } catch (err: any) {
      toast.error(err.message || 'İndirme başarısız');
    } finally {
      setExporting(false);
    }
  };

  // Find max value for bar scaling
  const maxQuoteCount = Math.max(...trends.map((t) => t.quoteCount), 1);
  const maxIfcCount = Math.max(...trends.map((t) => t.ifcCount), 1);

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="text-indigo-400" size={26} />
            Kullanım ve Kapasite Raporları
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Platform genelinde teklif üretimi, IFC analizi ve firma bazlı kaynak tüketimi
          </p>
        </div>

        <Button
          onClick={handleCsvExport}
          disabled={exporting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
        >
          <Download size={15} className={`mr-2 ${exporting ? 'animate-bounce' : ''}`} />
          {exporting ? 'Dışa Aktarılıyor...' : 'CSV Olarak Dışa Aktar'}
        </Button>
      </div>

      {/* Monthly Trends Section */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" />
            Aylık Hacim Trendi (Son 6 Ay)
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-indigo-500" />
              <span className="text-muted-foreground">Teklif Sayısı</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-amber-500" />
              <span className="text-muted-foreground">IFC Dosya Sayısı</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock size={20} className="animate-spin mx-auto mb-2 text-indigo-400" />
            Rapor verileri hesaplanıyor...
          </div>
        ) : trends.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Henüz trend verisi bulunmuyor.</p>
        ) : (
          <div className="space-y-4 pt-2">
            {trends.map((t) => (
              <div key={t.period} className="rounded-lg border border-border bg-background p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-foreground">{t.period}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-indigo-400">{t.quoteCount} Teklif</span>
                    <span className="text-amber-400">{t.ifcCount} IFC</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {/* Quote Bar */}
                  <div className="h-2 w-full rounded-full bg-card overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((t.quoteCount / maxQuoteCount) * 100, 100)}%` }}
                    />
                  </div>

                  {/* IFC Bar */}
                  <div className="h-2 w-full rounded-full bg-card overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((t.ifcCount / maxIfcCount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 10 Active Tenants */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
          <Layers size={16} className="text-indigo-400" />
          En Çok Kaynak Kullanan İlk 10 Firma
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-background text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Firma</th>
                <th className="px-5 py-3">Paket</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">Bu Ayki Teklif</th>
                <th className="px-5 py-3">Bu Ayki IFC</th>
                <th className="px-5 py-3">Bonus Limitler</th>
                <th className="px-5 py-3 text-right">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground dark:text-muted-foreground">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Kayıtlar yükleniyor...
                  </td>
                </tr>
              ) : topTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Henüz kullanım verisi bulunan firma yok.
                  </td>
                </tr>
              ) : (
                topTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-surface-elevated transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground">{tenant.name}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase">
                        {tenant.planName}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {tenant.status === 'active' ? (
                        <span className="text-emerald-400 font-medium">Aktif</span>
                      ) : tenant.status === 'past_due' ? (
                        <span className="text-amber-400 font-medium">Ödeme Bekliyor</span>
                      ) : (
                        <span className="text-muted-foreground">{tenant.status}</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {tenant.quoteUsage}
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-amber-400">
                      {tenant.ifcUsage}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                      +{tenant.bonusQuotes} Teklif / +{tenant.bonusIfc} IFC
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link to={`/admin/tenants/${tenant.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-indigo-400 hover:text-indigo-300 text-xs px-2"
                        >
                          İncele <ArrowUpRight size={13} className="ml-0.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
