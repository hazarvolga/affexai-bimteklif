import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, ClipboardList, Download, Mail, Phone, RefreshCw, Search, UserPlus } from 'lucide-react';
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
  source?: string | null;
  status: string;
  offerAmount: string | null;
  offerCurrency: string;
  paymentStatus: string;
  provisionedCompanyId: string | null;
  createdAt: string;
};
type PilotMetrics = { total: number; converted: number; paid: number; newLeads: number; bottleneckContacted: number; conversionRate: number; paidRate: number; averageDaysToConvert: number | null };

const statuses = [
  { value: 'new', label: 'Yeni Ön Kayıt', className: 'border-primary/40 bg-primary/10 text-primary' },
  { value: 'contacted', label: 'İletişimde', className: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  { value: 'qualified', label: 'Nitelikli Aday', className: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' },
  { value: 'converted', label: 'Müşteriye Dönüştü', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  { value: 'rejected', label: 'Arşiv / Uygun Değil', className: 'border-border bg-card text-muted-foreground' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const [response, metricsResponse] = await Promise.all([fetchWithAuth('/api/pilot-applications'), fetchWithAuth('/api/pilot-applications/metrics')]);
      if (!response.ok || !metricsResponse.ok) throw new Error('Ön kayıt ve aday listesi yüklenemedi.');
      setApplications(await response.json());
      setMetrics(await metricsResponse.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ön kayıt listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, []);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (!q) return true;
      return (
        app.email.toLowerCase().includes(q) ||
        app.fullName.toLowerCase().includes(q) ||
        app.companyName.toLowerCase().includes(q) ||
        (app.teamSize || '').toLowerCase().includes(q) ||
        (app.currentWorkflow || '').toLowerCase().includes(q)
      );
    });
  }, [applications, searchQuery, statusFilter]);

  const handleExportCsv = () => {
    if (filteredApplications.length === 0) {
      toast.info('Dışa aktarılacak kayıt bulunmuyor.');
      return;
    }
    const headers = ['Kayit Tarihi', 'E-Posta', 'Ad Soyad', 'Firma / Ofis', 'Uzmanlik / Ekip', 'Kaynak', 'Durum', 'Not'];
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredApplications.map((a) => [
      new Date(a.createdAt).toLocaleString('tr-TR'),
      a.email,
      a.fullName,
      a.companyName,
      a.teamSize || '',
      a.source === 'landing_waitlist' ? 'Ana Sayfa Ön Kayıt' : 'Pilot Başvuru Formu',
      statuses.find((s) => s.value === a.status)?.label || a.status,
      a.currentWorkflow || '',
    ]);
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows.map((r) => r.map(escapeCsv).join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bimmetraj-on-kayit-adaylar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateApplication = async (id: string, changes: Record<string, string>) => {
    try {
      const response = await fetchWithAuth(`/api/pilot-applications/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      if (!response.ok) throw new Error('Durum güncellenemedi.');
      const updated = await response.json();
      setApplications((current) => current.map((application) => application.id === id ? updated : application));
      toast.success('Aday kaydı güncellendi.');
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
        title="Ön Kayıt & Potansiyel Müşteri Listesi (Erken Erişim / Pilot)"
        description="Ana sayfadaki 'Geliştirme Aşaması Ön Kayıt' formundan ve '/pilot' sayfasından e-posta bırakan potansiyel müşterileri görüntüleyin, CSV olarak dışa aktarın veya tek tıkla deneme hesabına dönüştürün."
        icon={ClipboardList}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={loading || filteredApplications.length === 0}>
              <Download size={15} className="mr-2" />
              CSV İndir ({filteredApplications.length})
            </Button>
            <Button variant="outline" onClick={loadApplications} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'mr-2 animate-spin' : 'mr-2'} />
              Yenile
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              01 / TOPLAM ÖN KAYIT &amp; ADAY
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums text-foreground">{metrics?.total ?? applications.length}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
            Toplam <strong className="text-foreground">{metrics?.total || 0}</strong> ön kayıttan{' '}
            <strong className="text-primary">{metrics?.converted || 0}</strong> firma aktif hesaba dönüştürüldü.
          </p>
        </div>

        <div className="border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">
              02 / YENİ ÖN KAYITLAR
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums text-foreground">{metrics?.newLeads || 0}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
            Ana sayfadan veya pilot formundan yeni e-posta bırakan potansiyel müşteriler.
          </p>
        </div>

        <div className="border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              03 / İLETİŞİMDE BEKLEYEN
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums text-foreground">{metrics?.bottleneckContacted || 0}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
            Bilgilendirme / erken erişim daveti gönderilen ve geri dönüş beklenen adaylar.
          </p>
        </div>

        <div className="border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              04 / DÖNÜŞÜM ORANI
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {metrics ? `%${metrics.conversionRate.toFixed(1)}` : '—'}
              </p>
              <span className="font-mono text-xs text-muted-foreground">({metrics?.paid || 0} ücretli)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
            Ön kayıttan aktif SaaS kiracısına (tenant) dönüşenlerin oranı.
          </p>
        </div>
      </div>

      {/* Arama ve Durum Filtresi */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="E-posta, ad soyad, firma veya uzmanlık alanına göre ara..."
            className="h-10 w-full border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { value: 'all', label: `Tümü (${applications.length})` },
            { value: 'new', label: 'Yeni Ön Kayıt' },
            { value: 'contacted', label: 'İletişimde' },
            { value: 'qualified', label: 'Nitelikli' },
            { value: 'converted', label: 'Müşteriye Dönüştü' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === tab.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Ön kayıt ve potansiyel müşteri listesi yükleniyor...
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-12 text-center">
          <ClipboardList className="mx-auto text-muted-foreground" size={32} />
          <p className="mt-4 font-semibold text-foreground">Kayıt bulunamadı.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ana sayfadaki &ldquo;Ön Kayıt Oluştur&rdquo; formundan veya /pilot sayfasından bırakılan e-postalar otomatik olarak burada listelenir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const meta = statuses.find((item) => item.value === application.status) || statuses[0];
            const isConverted = Boolean(application.provisionedCompanyId);
            const isLandingWaitlist = application.source === 'landing_waitlist' || application.companyName === 'Erken Erişim Ön Kayıt';
            return (
              <article key={application.id} className="border border-border bg-card p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-bold text-foreground">{application.email}</h2>
                      <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
                        {meta.label}
                      </span>
                      <span className="border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {isLandingWaitlist ? 'ANA SAYFA ÖN KAYIT' : 'PİLOT BAŞVURUSU'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                        Ad / İlgili: <strong>{application.fullName}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 size={13} className="text-primary" />
                        {application.companyName}
                      </span>
                      <a href={`mailto:${application.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <Mail size={13} />
                        {application.email}
                      </a>
                      {application.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={13} />
                          {application.phone}
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 font-mono text-[11px] text-muted-foreground">
                      KAYIT TARİHİ: {new Date(application.createdAt).toLocaleString('tr-TR')}{' '}
                      {application.teamSize ? `· UZMANLIK / EKİP: ${application.teamSize}` : ''}
                    </p>
                    {application.currentWorkflow && (
                      <p className="mt-3 max-w-3xl border-l-2 border-primary pl-3 text-xs leading-relaxed text-foreground">
                        {application.currentWorkflow}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Durum
                      <select
                        value={application.status}
                        disabled={isConverted}
                        onChange={(event) => updateApplication(application.id, { status: event.target.value })}
                        className="mt-1.5 block h-9 min-w-44 border border-border bg-background px-3 font-sans text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
                      >
                        {selectableStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Ödeme durumu
                      <select
                        value={application.paymentStatus}
                        onChange={(event) => updateApplication(application.id, { paymentStatus: event.target.value })}
                        className="mt-1.5 block h-9 min-w-44 border border-border bg-background px-3 font-sans text-xs text-foreground outline-none focus:border-primary"
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Teklif tutarı ({application.offerCurrency})
                      <input
                        defaultValue={application.offerAmount || ''}
                        onBlur={(event) => updateApplication(application.id, { offerAmount: event.target.value })}
                        inputMode="decimal"
                        placeholder="Örn. 25000"
                        className="mt-1.5 block h-9 min-w-44 border border-border bg-background px-3 font-sans text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                      />
                    </label>
                    {isConverted ? (
                      <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-primary">
                        <CheckCircle2 size={14} /> Müşteri hesabı oluşturuldu
                      </div>
                    ) : (
                      <Button
                        onClick={() => convertApplication(application)}
                        disabled={convertingId === application.id}
                        className="h-9 min-w-44 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-xs"
                      >
                        <UserPlus size={14} />
                        {convertingId === application.id ? 'Oluşturuluyor…' : 'Hesap Oluştur (Deneme Başlat)'}
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
