import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Target, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { crmRequest, Deal, money, stages } from './crm-view';

interface Lead { id: string; name: string; email: string | null; phone: string | null; source: string | null }
interface Client { id: string; name: string }

export function CRM() {
  const { role } = useAuth();
  const canMutate = ['owner', 'admin', 'manager'].includes(role ?? '');
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('pipeline');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ clientId: '', name: '', value: '', stage: 'lead' });

  async function load() {
    setLoading(true); setError(false);
    try {
      const result = await Promise.all([
        crmRequest<Deal[]>('/api/crm/pipeline'), crmRequest<Lead[]>('/api/crm/leads'), crmRequest<Client[]>('/api/clients'),
      ]);
      if (!result.every(Array.isArray)) throw new Error('Invalid CRM response');
      setDeals(result[0]); setLeads(result[1]); setClients(result[2]);
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function newDeal(stage = 'lead') {
    setDraft({ clientId: '', name: '', value: '', stage }); setOpen(true);
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !draft.name.trim() || !draft.clientId) return;
    setSaving(true);
    try {
      const deal = await crmRequest<Deal>('/api/crm/deals', { method: 'POST', body: JSON.stringify({ ...draft, value: draft.value || undefined }) });
      toast.success('Fırsat oluşturuldu.'); setOpen(false);
      navigate(`/app/crm/deals/${deal.id}`);
    } catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  }

  return <PageContainer className="min-w-0 [&_*]:tracking-normal">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Target className="shrink-0 text-emerald-400" /> Müşteriler & Fırsatlar</h1>
      {canMutate && <Button onClick={() => newDeal()}><Plus size={16} /> Yeni fırsat</Button>}
    </header>
    <div role="tablist" aria-label="CRM görünümü" className="mb-6 flex gap-2 border-b border-border pb-3">
      {['pipeline', 'leads'].map(value => <Button key={value} role="tab" aria-selected={tab === value} variant={tab === value ? 'secondary' : 'ghost'} onClick={() => setTab(value)}>{value === 'pipeline' ? 'Fırsatlar' : 'Lead havuzu'}</Button>)}
    </div>
    {loading ? <p role="status">CRM yükleniyor…</p> : error ? <div role="alert" className="space-y-3">
      <p>CRM verileri yüklenemedi.</p><Button variant="outline" onClick={load}><RefreshCw size={16} /> Tekrar dene</Button>
    </div> : tab === 'pipeline' ? <div role="tabpanel" className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {stages.map(stage => <section key={stage.id} className="min-w-0 border-t border-border pt-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{stage.label} <span className="text-muted-foreground">({deals.filter(deal => deal.stage === stage.id).length})</span></h2>
          {canMutate && <Button size="icon" variant="ghost" title={`${stage.label}: fırsat ekle`} aria-label={`${stage.label}: fırsat ekle`} onClick={() => newDeal(stage.id)}><Plus size={16} /></Button>}
        </div>
        <div className="space-y-3">
          {deals.filter(deal => deal.stage === stage.id).map(deal => <Link key={deal.id} to={`/app/crm/deals/${deal.id}`} className="block rounded-lg border border-border bg-card p-4 hover:border-emerald-600 focus-visible:outline focus-visible:outline-emerald-500">
            <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words font-medium text-foreground">{deal.name}</h3><ChevronRight size={16} className="shrink-0" /></div>
            <p className="mt-2 text-sm text-foreground dark:text-muted-foreground">{money(deal.value)} TRY</p>
            <p className="mt-3 text-xs text-muted-foreground">{deal.aiInsights ? 'AI analizi mevcut' : 'AI analizi yapılmadı'}</p>
          </Link>)}
          {!deals.some(deal => deal.stage === stage.id) && <p className="py-4 text-sm text-muted-foreground">Bu aşamada fırsat yok.</p>}
        </div>
      </section>)}
    </div> : <div role="tabpanel" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {!leads.length && <p className="text-muted-foreground">Henüz potansiyel müşteri yok.</p>}
      {leads.map(lead => <article key={lead.id} className="min-w-0 rounded-lg border border-border p-4 space-y-2">
        <h2 className="font-semibold break-words">{lead.name}</h2>
        <p className="text-sm text-muted-foreground break-all">{lead.email || 'E-posta belirtilmedi'}</p>
        <p className="text-sm text-muted-foreground">{lead.phone || 'Telefon belirtilmedi'}</p>
        {lead.source && <p className="text-xs text-muted-foreground break-words">{lead.source}</p>}
      </article>)}
    </div>}
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-background text-foreground sm:max-w-md">
        <DialogHeader><DialogTitle>Yeni fırsat</DialogTitle></DialogHeader>
        {!clients.length ? <p>Müşteri kaydı bulunamadı. <Link className="underline" to="/app/clients">Müşteriler</Link></p> : <form onSubmit={create} className="space-y-4">
          <label className="block text-sm" htmlFor="deal-client">Müşteri</label>
          <select id="deal-client" required value={draft.clientId} onChange={event => setDraft({ ...draft, clientId: event.target.value })} className="w-full rounded border border-border bg-card p-2">
            <option value="">Müşteri seçin</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <label className="block text-sm" htmlFor="deal-name">Fırsat adı</label>
          <Input id="deal-name" required maxLength={300} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
          <label className="block text-sm" htmlFor="deal-value">Tahmini değer (TRY)</label>
          <Input id="deal-value" type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="0.01" value={draft.value} onChange={event => setDraft({ ...draft, value: event.target.value })} />
          <label className="block text-sm" htmlFor="deal-stage">Aşama</label>
          <select id="deal-stage" value={draft.stage} onChange={event => setDraft({ ...draft, stage: event.target.value })} className="w-full rounded border border-border bg-card p-2">
            {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
          <Button type="submit" disabled={saving} className="w-full">{saving ? 'Kaydediliyor…' : 'Fırsatı kaydet'}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </PageContainer>;
}
