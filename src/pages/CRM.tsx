import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Target, ChevronRight, Users, UserPlus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { crmRequest, Deal, money, stages } from './crm-view';
import { useCrmCollection } from './crm-collection';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
}

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  pipelineStage?: string | null;
}

export function CRM() {
  const { role, company, user } = useAuth();
  const canMutate = ['owner', 'admin', 'manager'].includes(role ?? '');
  const navigate = useNavigate();
  const scope = company?.id && user?.id ? `${company.id}:${user.id}:${role ?? ''}` : null;
  const pipeline = useCrmCollection<Deal>('/api/crm/pipeline', scope);
  const leadData = useCrmCollection<Lead>('/api/crm/leads', scope);
  const clientData = useCrmCollection<Client>('/api/clients', scope);
  const deals = pipeline.data;
  const leads = leadData.data;
  const clients = clientData.data;
  const [tab, setTab] = useState('pipeline');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ clientId: '', name: '', value: '', stage: 'lead' });
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientSaving, setQuickClientSaving] = useState(false);
  const [quickClient, setQuickClient] = useState({ name: '', email: '', phone: '' });
  const scopeVersion = useRef({ scope, generation: 0 });
  if (scopeVersion.current.scope !== scope) scopeVersion.current = { scope, generation: scopeVersion.current.generation + 1 };
  const mutations = useRef(new Set<AbortController>());
  useEffect(() => {
    setOpen(false);
    setQuickClientOpen(false);
    setDraft({ clientId: '', name: '', value: '', stage: 'lead' });
    setQuickClient({ name: '', email: '', phone: '' });
    setSaving(false);
    setQuickClientSaving(false);
    return () => { for (const controller of mutations.current) controller.abort(); mutations.current.clear(); };
  }, [scope]);

  function newDeal(stage = 'lead', preselectedClientId = '', preselectedName = '') {
    setDraft({
      clientId: preselectedClientId,
      name: preselectedName,
      value: '',
      stage,
    });
    setQuickClientOpen(false);
    setOpen(true);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !draft.name.trim() || !draft.clientId) return;
    setSaving(true);
    const generation = scopeVersion.current.generation;
    const controller = new AbortController(); mutations.current.add(controller);
    try {
      const deal = await crmRequest<Deal>('/api/crm/deals', {
        method: 'POST', signal: controller.signal,
        body: JSON.stringify({ ...draft, value: draft.value || undefined }),
      });
      if (scopeVersion.current.generation !== generation) return;
      toast.success('Fırsat oluşturuldu.');
      setOpen(false);
      navigate(`/app/crm/deals/${deal.id}`);
    } catch (err) {
      if (scopeVersion.current.generation === generation && !controller.signal.aborted) toast.error((err as Error).message);
    } finally {
      mutations.current.delete(controller);
      if (scopeVersion.current.generation === generation) setSaving(false);
    }
  }

  async function handleQuickClientCreate(event: React.FormEvent) {
    event.preventDefault();
    if (quickClientSaving || !quickClient.name.trim()) return;
    setQuickClientSaving(true);
    const generation = scopeVersion.current.generation;
    const controller = new AbortController(); mutations.current.add(controller);
    try {
      const res = await fetchWithAuth('/api/clients', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickClient.name.trim(),
          type: 'company',
          email: quickClient.email.trim() || undefined,
          phone: quickClient.phone.trim() || undefined,
          pipelineStage: 'lead',
        }),
      });
      if (!res.ok) throw new Error('Müşteri kaydedilemedi.');
      const created: Client = await res.json();
      if (scopeVersion.current.generation !== generation) return;
      clientData.append(created);
      setDraft((prev) => ({
        ...prev,
        clientId: created.id,
        name: prev.name || `${created.name} — Yeni Fırsat`,
      }));
      setQuickClient({ name: '', email: '', phone: '' });
      setQuickClientOpen(false);
      toast.success('Müşteri eklendi ve fırsat için seçildi.');
    } catch (err) {
      if (scopeVersion.current.generation === generation && !controller.signal.aborted) toast.error((err as Error).message);
    } finally {
      mutations.current.delete(controller);
      if (scopeVersion.current.generation === generation) setQuickClientSaving(false);
    }
  }

  const potentialClients = clients.filter(
    (c) => !c.pipelineStage || c.pipelineStage === 'lead' || c.pipelineStage === 'new_lead',
  );
  const poolReady = leadData.status === 'ready' && clientData.status === 'ready';
  const totalLeadPoolCount = leads.length + potentialClients.length;

  return (
    <PageContainer className="min-w-0 [&_*]:tracking-normal">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Target className="shrink-0 text-emerald-400" /> Müşteriler & Fırsatlar
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Satış hunisindeki aktif fırsatları ve potansiyel müşteri (lead) havuzunu yönetin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/app/clients')}>
            <Users size={16} /> Müşteriler{clientData.status === 'ready' ? ` (${clients.length})` : ''}
          </Button>
          {canMutate && (
            <Button onClick={() => newDeal()}>
              <Plus size={16} /> Yeni fırsat
            </Button>
          )}
        </div>
      </header>

      <div
        role="tablist"
        aria-label="CRM görünümü"
        className="mb-6 flex gap-2 border-b border-border pb-3"
      >
        {['pipeline', 'leads'].map((value) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? 'secondary' : 'ghost'}
            onClick={() => setTab(value)}
          >
            {value === 'pipeline' ? 'Fırsatlar' : `Lead havuzu${poolReady ? ` (${totalLeadPoolCount})` : ''}`}
          </Button>
        ))}
      </div>

      {tab === 'pipeline' && pipeline.status === 'loading' ? (
        <p role="status">Fırsatlar yükleniyor…</p>
      ) : tab === 'pipeline' && pipeline.status === 'error' ? (
        <div role="alert" className="space-y-3">
          <p>Fırsatlar yüklenemedi.</p>
          <Button variant="outline" onClick={pipeline.retry}>
            <RefreshCw size={16} /> Tekrar dene
          </Button>
        </div>
      ) : tab === 'pipeline' ? (
        <div
          role="tabpanel"
          className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {stages.map((stage) => (
            <section key={stage.id} className="min-w-0 border-t border-border pt-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {stage.label}{' '}
                  <span className="text-muted-foreground">
                    ({deals.filter((deal) => deal.stage === stage.id).length})
                  </span>
                </h2>
                {canMutate && (
                  <Button
                    size="icon"
                    variant="ghost"
                    title={`${stage.label}: fırsat ekle`}
                    aria-label={`${stage.label}: fırsat ekle`}
                    onClick={() => newDeal(stage.id)}
                  >
                    <Plus size={16} />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {deals
                  .filter((deal) => deal.stage === stage.id)
                  .map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/app/crm/deals/${deal.id}`}
                      className="block rounded-lg border border-border bg-card p-4 hover:border-emerald-600 focus-visible:outline focus-visible:outline-emerald-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 break-words font-medium text-foreground">
                          {deal.name}
                        </h3>
                        <ChevronRight size={16} className="shrink-0" />
                      </div>
                      <p className="mt-2 text-sm text-foreground dark:text-muted-foreground">
                        {money(deal.value)} TRY
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {deal.aiInsights ? 'AI analizi mevcut' : 'AI analizi yapılmadı'}
                      </p>
                    </Link>
                  ))}
                {!deals.some((deal) => deal.stage === stage.id) && (
                  <p className="py-4 text-sm text-muted-foreground">Bu aşamada fırsat yok.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div role="tabpanel" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientData.status === 'loading' && <p role="status">Müşteriler yükleniyor…</p>}
          {clientData.status === 'error' && <div role="alert" className="space-y-2"><p>Müşteriler yüklenemedi; müşteri kaynaklı kayıtlar gösterilemiyor.</p><Button variant="outline" onClick={clientData.retry}>Müşterileri tekrar dene</Button></div>}
          {leadData.status === 'loading' && <p role="status">Lead kayıtları yükleniyor…</p>}
          {leadData.status === 'error' && <div role="alert" className="space-y-2"><p>Lead kayıtları yüklenemedi.</p><Button variant="outline" onClick={leadData.retry}>Lead kayıtlarını tekrar dene</Button></div>}
          {poolReady && !leads.length && !potentialClients.length && (
            <p className="text-muted-foreground">Henüz potansiyel müşteri yok.</p>
          )}
          {potentialClients.map((client) => (
            <article
              key={`client-${client.id}`}
              className="min-w-0 rounded-lg border border-border bg-card p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/app/clients/${client.id}`}
                    className="font-semibold text-foreground hover:text-emerald-400 break-words flex items-center gap-1"
                  >
                    {client.name} <ExternalLink size={12} className="shrink-0" />
                  </Link>
                  <span className="text-[10px] rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-400 font-medium shrink-0">
                    Potansiyel Müşteri
                  </span>
                </div>
                <p className="text-sm text-muted-foreground break-all">
                  {client.email || 'E-posta belirtilmedi'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {client.phone || 'Telefon belirtilmedi'}
                </p>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <Link
                  to={`/app/clients/${client.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Müşteri Kartı & Notlar
                </Link>
                {canMutate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => newDeal('lead', client.id, `${client.name} — Yeni Fırsat`)}
                  >
                    <Plus size={13} /> Fırsat Aç
                  </Button>
                )}
              </div>
            </article>
          ))}
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="min-w-0 rounded-lg border border-border p-4 space-y-2"
            >
              <h2 className="font-semibold break-words">{lead.name}</h2>
              <p className="text-sm text-muted-foreground break-all">
                {lead.email || 'E-posta belirtilmedi'}
              </p>
              <p className="text-sm text-muted-foreground">
                {lead.phone || 'Telefon belirtilmedi'}
              </p>
              {lead.source && (
                <p className="text-xs text-muted-foreground break-words">{lead.source}</p>
              )}
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto bg-background text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni fırsat</DialogTitle>
          </DialogHeader>
          {clientData.status === 'loading' ? (
            <p role="status">Müşteriler yükleniyor…</p>
          ) : clientData.status === 'error' ? (
            <div role="alert" className="space-y-3"><p>Müşteriler yüklenemedi. Fırsat oluşturmak için tekrar deneyin.</p><Button variant="outline" onClick={clientData.retry}>Müşterileri tekrar dene</Button></div>
          ) : !clients.length && !quickClientOpen ? (
            <div className="space-y-4">
              <p>
                Müşteri kaydı bulunamadı.{' '}
                <Link className="underline" to="/app/clients">
                  Müşteriler
                </Link>
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickClientOpen(true)}
                className="w-full"
              >
                <UserPlus size={15} /> Buradan Hızlı Müşteri Ekle
              </Button>
            </div>
          ) : quickClientOpen ? (
            <form onSubmit={handleQuickClientCreate} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Yeni müşteriyi kaydedin; otomatik olarak fırsat formunda seçilecektir.
              </p>
              <label className="block text-sm" htmlFor="quick-client-name">
                Müşteri / Firma Adı
              </label>
              <Input
                id="quick-client-name"
                required
                value={quickClient.name}
                onChange={(e) => setQuickClient({ ...quickClient, name: e.target.value })}
                placeholder="Örn: Aluplan Mühendislik Ltd."
              />
              <label className="block text-sm" htmlFor="quick-client-email">
                E-posta (İsteğe Bağlı)
              </label>
              <Input
                id="quick-client-email"
                type="email"
                value={quickClient.email}
                onChange={(e) => setQuickClient({ ...quickClient, email: e.target.value })}
                placeholder="info@firma.com.tr"
              />
              <label className="block text-sm" htmlFor="quick-client-phone">
                Telefon (İsteğe Bağlı)
              </label>
              <Input
                id="quick-client-phone"
                value={quickClient.phone}
                onChange={(e) => setQuickClient({ ...quickClient, phone: e.target.value })}
                placeholder="+90 5XX XXX XX XX"
              />
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickClientOpen(false)}
                  className="flex-1"
                >
                  Vazgeç
                </Button>
                <Button type="submit" disabled={quickClientSaving} className="flex-1">
                  {quickClientSaving ? 'Ekleniyor…' : 'Müşteriyi Kaydet'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={create} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm" htmlFor="deal-client">
                  Müşteri
                </label>
                <button
                  type="button"
                  onClick={() => setQuickClientOpen(true)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <UserPlus size={12} /> Yeni müşteri ekle
                </button>
              </div>
              <select
                id="deal-client"
                required
                value={draft.clientId}
                onChange={(event) => setDraft({ ...draft, clientId: event.target.value })}
                className="w-full rounded border border-border bg-card p-2"
              >
                <option value="">Müşteri seçin</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <label className="block text-sm" htmlFor="deal-name">
                Fırsat adı
              </label>
              <Input
                id="deal-name"
                required
                maxLength={300}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <label className="block text-sm" htmlFor="deal-value">
                Tahmini değer (TRY)
              </label>
              <Input
                id="deal-value"
                type="number"
                min="0"
                max={Number.MAX_SAFE_INTEGER}
                step="0.01"
                value={draft.value}
                onChange={(event) => setDraft({ ...draft, value: event.target.value })}
              />
              <label className="block text-sm" htmlFor="deal-stage">
                Aşama
              </label>
              <select
                id="deal-stage"
                value={draft.stage}
                onChange={(event) => setDraft({ ...draft, stage: event.target.value })}
                className="w-full rounded border border-border bg-card p-2"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Kaydediliyor…' : 'Fırsatı kaydet'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
