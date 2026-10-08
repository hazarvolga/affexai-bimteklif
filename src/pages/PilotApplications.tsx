import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ClipboardList, Mail, Phone, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

type PilotApplication = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string | null;
  teamSize: string | null;
  currentWorkflow: string | null;
  status: string;
  offerAmount: string | null;
  offerCurrency: string;
  paymentStatus: string;
  provisionedCompanyId: string | null;
  createdAt: string;
};
type PilotMetrics = { total: number; converted: number; paid: number; newLeads: number; bottleneckContacted: number; conversionRate: number; paidRate: number; averageDaysToConvert: number | null };

const statuses = [
  { value: 'new', label: 'Yeni', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  { value: 'contacted', label: 'İletişimde', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  { value: 'qualified', label: 'Nitelikli', className: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  { value: 'converted', label: 'Müşteriye Dönüştü', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  { value: 'rejected', label: 'Uygun değil', className: 'border-zinc-700 bg-zinc-800/50 text-zinc-400' },
];
// "converted" statüsüne yalnızca gerçek hesap oluşturma eylemiyle ulaşılır — dropdown'dan seçilemez.
const selectableStatuses = statuses.filter((status) => status.value !== 'converted');
const paymentStatuses = [
  { value: 'not_offered', label: 'Teklif yok' },
  { value: 'offered', label: 'Teklif gönderildi' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'declined', label: 'Reddedildi' },
];

export function PilotApplications() {
  const [applications, setApplications] = useState<PilotApplication[]>([]);
  const [metrics, setMetrics] = useState<PilotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const [response, metricsResponse] = await Promise.all([fetchWithAuth('/api/pilot-applications'), fetchWithAuth('/api/pilot-applications/metrics')]);
      if (!response.ok || !metricsResponse.ok) throw new Error('Başvurular yüklenemedi.');
      setApplications(await response.json());
      setMetrics(await metricsResponse.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Başvurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, []);

  const updateApplication = async (id: string, changes: Record<string, string>) => {
    try {
      const response = await fetchWithAuth(`/api/pilot-applications/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      if (!response.ok) throw new Error('Durum güncellenemedi.');
      const updated = await response.json();
      setApplications((current) => current.map((application) => application.id === id ? updated : application));
      toast.success('Pilot kaydı güncellendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Durum güncellenemedi.');
    }
  };

  const convertApplication = async (application: PilotApplication) => {
    setConvertingId(application.id);
    try {
      const response = await fetchWithAuth(`/api/pilot-applications/${application.id}/convert`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Hesap oluşturulamadı.');
      setApplications((current) => current.map((item) => item.id === application.id ? body.application : item));
      if (body.setPasswordUrl) {
        toast.success(`${body.company.name} için hesap oluşturuldu.`, {
          description: 'E-posta webhook\'u yapılandırılmadığı için parola bağlantısı gönderilmedi — aşağıdan kopyalayıp elle iletin.',
          action: {
            label: 'Bağlantıyı kopyala',
            onClick: () => { navigator.clipboard.writeText(body.setPasswordUrl); toast.info('Bağlantı kopyalandı.'); },
          },
          duration: 15000,
        });
      } else {
        toast.success(`${body.company.name} için hesap oluşturuldu. Parola belirleme e-postası gönderildi.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hesap oluşturulamadı.');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Deneme Sürümü & Müşteriler"
        description="Platformunuza başvuran deneme sürümü taleplerini yönetin ve ödeme yapan müşterilere (SaaS kiracılarına) dönüştürün."
        icon={ClipboardList}
        actions={<Button variant="outline" onClick={loadApplications} disabled={loading} className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"><RefreshCw size={16} className={loading ? 'mr-2 animate-spin' : 'mr-2'} />Yenile</Button>}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Health / Overview */}
        <div className="border border-zinc-800 bg-zinc-950 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Dönüşüm Sağlığı</p>
            <p className="text-3xl font-black text-white">{metrics ? `${metrics.conversionRate.toFixed(1)}%` : '—'}</p>
          </div>
          <p className="text-xs text-zinc-500 mt-4 border-t border-zinc-800/50 pt-3">Toplam <span className="text-white font-medium">{metrics?.total || 0}</span> başvurudan <span className="text-emerald-400 font-medium">{metrics?.converted || 0}</span> firma pilota alındı.</p>
        </div>

        {/* Actionable / New */}
        <div className="border border-blue-500/30 bg-blue-500/5 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
          {(metrics?.newLeads || 0) > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/20 blur-2xl rounded-full -mr-8 -mt-8" />}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Aksiyon Bekleyen (Yeni)</p>
            <p className="text-3xl font-black text-white">{metrics?.newLeads || 0}</p>
          </div>
          <p className="text-xs text-zinc-500 mt-4 border-t border-blue-500/10 pt-3">Hemen iletişime geçip nitelendirmeniz gereken taze başvurular.</p>
        </div>

        {/* Bottleneck */}
        <div className="border border-amber-500/30 bg-amber-500/5 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
          {(metrics?.bottleneckContacted || 0) > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/20 blur-2xl rounded-full -mr-8 -mt-8" />}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Darboğaz: İletişimde Bekleyen</p>
            <p className="text-3xl font-black text-white">{metrics?.bottleneckContacted || 0}</p>
          </div>
          <p className="text-xs text-zinc-500 mt-4 border-t border-amber-500/10 pt-3">Görüşülen ama "Pilota Dönüştürülmeyen" firmalar. Takip maili atın.</p>
        </div>

        {/* Performance */}
        <div className="border border-emerald-500/30 bg-emerald-500/5 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Ödeme Performansı</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">{metrics?.paid || 0}</p>
              <span className="text-sm font-medium text-emerald-500">({metrics ? `${metrics.paidRate.toFixed(1)}%` : '—'})</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-4 border-t border-emerald-500/10 pt-3">Pilota alınan firmalar içinden ödeme yapanların oranı.</p>
        </div>
      </div>

      {loading ? (
        <div className="border border-zinc-800 bg-zinc-900/30 p-12 text-center text-sm text-zinc-500">Başvurular yükleniyor...</div>
      ) : applications.length === 0 ? (
        <div className="border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <ClipboardList className="mx-auto text-zinc-600" size={32} />
          <p className="mt-4 font-medium text-zinc-300">Henüz pilot başvurusu yok.</p>
          <p className="mt-2 text-sm text-zinc-600">Public pilot formundan gelen başvurular burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const meta = statuses.find((item) => item.value === application.status) || statuses[0];
            const isConverted = Boolean(application.provisionedCompanyId);
            return (
              <article key={application.id} className="border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-white">{application.fullName}</h2>
                      <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>{meta.label}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
                      <span className="inline-flex items-center gap-2"><Building2 size={14} className="text-zinc-600" />{application.companyName}</span>
                      <a href={`mailto:${application.email}`} className="inline-flex items-center gap-2 hover:text-orange-400"><Mail size={14} className="text-zinc-600" />{application.email}</a>
                      {application.phone && <span className="inline-flex items-center gap-2"><Phone size={14} className="text-zinc-600" />{application.phone}</span>}
                    </div>
                    <p className="mt-3 text-xs text-zinc-600">Başvuru: {new Date(application.createdAt).toLocaleString('tr-TR')} {application.teamSize ? `· Ekip: ${application.teamSize}` : ''}</p>
                    {application.currentWorkflow && <p className="mt-4 max-w-3xl border-l-2 border-orange-500/40 pl-3 text-sm leading-relaxed text-zinc-400">{application.currentWorkflow}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                    <label className="text-xs text-zinc-500">Durum
                      <select value={application.status} disabled={isConverted} onChange={(event) => updateApplication(application.id, { status: event.target.value })} className="mt-2 block h-10 min-w-44 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-50">
                        {selectableStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-zinc-500">Ödeme durumu
                      <select value={application.paymentStatus} onChange={(event) => updateApplication(application.id, { paymentStatus: event.target.value })} className="mt-2 block h-10 min-w-44 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500">
                        {paymentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-zinc-500">Pilot teklif tutarı ({application.offerCurrency})
                      <input defaultValue={application.offerAmount || ''} onBlur={(event) => updateApplication(application.id, { offerAmount: event.target.value })} inputMode="decimal" placeholder="Örn. 25000" className="mt-2 block h-10 min-w-44 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-orange-500" />
                    </label>
                    {isConverted ? (
                      <div className="mt-1 flex items-center gap-2 text-xs font-medium text-emerald-400">
                        <CheckCircle2 size={14} /> Müşteri hesabı oluşturuldu
                      </div>
                    ) : (
                      <Button
                        onClick={() => convertApplication(application)}
                        disabled={convertingId === application.id}
                        className="h-10 min-w-44 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <UserPlus size={14} /> {convertingId === application.id ? 'Oluşturuluyor…' : 'Hesap Oluştur (Deneme Başlat)'}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
