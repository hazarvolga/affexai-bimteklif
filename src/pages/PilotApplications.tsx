import { useEffect, useState } from 'react';
import { Building2, ClipboardList, Mail, Phone, RefreshCw } from 'lucide-react';
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
  createdAt: string;
};

const statuses = [
  { value: 'new', label: 'Yeni', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  { value: 'contacted', label: 'İletişimde', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  { value: 'qualified', label: 'Nitelikli', className: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  { value: 'converted', label: 'Pilota dönüştü', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  { value: 'rejected', label: 'Uygun değil', className: 'border-zinc-700 bg-zinc-800/50 text-zinc-400' },
];
const paymentStatuses = [
  { value: 'not_offered', label: 'Teklif yok' },
  { value: 'offered', label: 'Teklif gönderildi' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'declined', label: 'Reddedildi' },
];

export function PilotApplications() {
  const [applications, setApplications] = useState<PilotApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/pilot-applications');
      if (!response.ok) throw new Error('Başvurular yüklenemedi.');
      setApplications(await response.json());
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

  return <PageContainer><PageHeader title="Pilot Başvuruları" description="BIMPlan Academy pilot başvurularını takip edin, niteliklendirin ve gerçek pilot dönüşümünü ölçün." icon={ClipboardList} actions={<Button variant="outline" onClick={loadApplications} disabled={loading} className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"><RefreshCw size={16} className={loading ? 'mr-2 animate-spin' : 'mr-2'} />Yenile</Button>} />
    <div className="mb-6 grid gap-3 sm:grid-cols-4">{['new', 'contacted', 'qualified', 'converted'].map((status) => { const meta = statuses.find((item) => item.value === status)!; return <div key={status} className="border border-zinc-800 bg-zinc-900/40 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{meta.label}</p><p className="mt-2 text-2xl font-semibold text-white">{applications.filter((application) => application.status === status).length}</p></div>; })}</div>
    {loading ? <div className="border border-zinc-800 bg-zinc-900/30 p-12 text-center text-sm text-zinc-500">Başvurular yükleniyor...</div> : applications.length === 0 ? <div className="border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center"><ClipboardList className="mx-auto text-zinc-600" size={32} /><p className="mt-4 font-medium text-zinc-300">Henüz pilot başvurusu yok.</p><p className="mt-2 text-sm text-zinc-600">Public pilot formundan gelen başvurular burada görünecek.</p></div> : <div className="space-y-4">{applications.map((application) => { const meta = statuses.find((item) => item.value === application.status) || statuses[0]; return <article key={application.id} className="border border-zinc-800 bg-zinc-900/40 p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-white">{application.fullName}</h2><span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>{meta.label}</span></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400"><span className="inline-flex items-center gap-2"><Building2 size={14} className="text-zinc-600" />{application.companyName}</span><a href={`mailto:${application.email}`} className="inline-flex items-center gap-2 hover:text-orange-400"><Mail size={14} className="text-zinc-600" />{application.email}</a>{application.phone && <span className="inline-flex items-center gap-2"><Phone size={14} className="text-zinc-600" />{application.phone}</span>}</div><p className="mt-3 text-xs text-zinc-600">Başvuru: {new Date(application.createdAt).toLocaleString('tr-TR')} {application.teamSize ? `· Ekip: ${application.teamSize}` : ''}</p>{application.currentWorkflow && <p className="mt-4 max-w-3xl border-l-2 border-orange-500/40 pl-3 text-sm leading-relaxed text-zinc-400">{application.currentWorkflow}</p>}</div><div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col"><label className="text-xs text-zinc-500">Durum<select value={application.status} onChange={(event) => updateApplication(application.id, { status: event.target.value })} className="mt-2 block h-10 min-w-44 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="text-xs text-zinc-500">Ödeme durumu<select value={application.paymentStatus} onChange={(event) => updateApplication(application.id, { paymentStatus: event.target.value })} className="mt-2 block h-10 min-w-44 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500">{paymentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="text-xs text-zinc-500">Pilot teklif tutarı ({application.offerCurrency})<input defaultValue={application.offerAmount || ''} onBlur={(event) => updateApplication(application.id, { offerAmount: event.target.value })} inputMode="decimal" placeholder="Örn. 25000" className="mt-2 block h-10 min-w-44 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-orange-500" /></label></div></div></article>; })}</div>}
  </PageContainer>;
}
