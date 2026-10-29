/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, User, Mail, Phone, MapPin, Save, Plus,
  MessageSquarePlus, Target, FileText, Clock, ChevronRight, RefreshCw,
  AlertTriangle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ClientDeletionImpact } from '@/components/clients/ClientDeletionImpact';
import type { Client } from '@/types';
import {
  CLIENT_STAGE_LIST, CLIENT_STAGE_MAP, normalizeClientStageKey,
  parseClientNotes, type ClientStageKey,
} from '@/lib/client-notes';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { crmRequest, Deal, money, stages } from './crm-view';

interface ClientQuotationSummary {
  id: string; quoteNumber: string; projectName?: string | null;
  status?: string | null; currency?: string | null;
  grandTotal?: string | number | null; total?: string | number | null;
}

interface ClientDetailPayload extends Client {
  deals?: Deal[]; quotations?: ClientQuotationSummary[];
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canMutate = ['owner', 'admin', 'manager'].includes(role ?? '');

  const [client, setClient] = useState<ClientDetailPayload | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [quotes, setQuotes] = useState<ClientQuotationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'company' as 'company' | 'person',
    email: '',
    phone: '',
    address: '',
    pipelineStage: 'lead' as ClientStageKey,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [noteFilterStage, setNoteFilterStage] = useState<ClientStageKey | 'all'>('all');
  const [noteStage, setNoteStage] = useState<ClientStageKey>('lead');
  const [noteText, setNoteText] = useState('');
  const [syncStageOnNote, setSyncStageOnNote] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealDraft, setDealDraft] = useState({ name: '', value: '', stage: 'lead' });
  const [savingDeal, setSavingDeal] = useState(false);

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const clientRes = await fetchWithAuth(`/api/clients/${id}`);
      if (!clientRes.ok) throw new Error('Müşteri bulunamadı');
      const clientData: ClientDetailPayload = await clientRes.json();
      setClient(clientData);
      const stage = normalizeClientStageKey(clientData.pipelineStage);
      setForm({
        name: clientData.name || '',
        type: clientData.type === 'person' ? 'person' : 'company',
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        pipelineStage: stage,
      });
      setNoteStage(stage);
      setDeals(Array.isArray(clientData.deals) ? clientData.deals : []);
      setQuotes(Array.isArray(clientData.quotations) ? clientData.quotations : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [id]);

  const handleSaveProfile = async (overrideStage?: ClientStageKey) => {
    if (!client || !form.name.trim()) {
      toast.error('Müşteri adı zorunludur.');
      return;
    }
    const targetStage = overrideStage ?? form.pipelineStage;
    setSavingProfile(true);
    try {
      const res = await fetchWithAuth(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          pipelineStage: targetStage,
        }),
      });
      if (!res.ok) throw new Error('Güncelleme başarısız');
      const updated: ClientDetailPayload = await res.json();
      setClient((prev) => (prev ? { ...prev, ...updated } : updated));
      setForm((prev) => ({
        ...prev,
        pipelineStage: normalizeClientStageKey(updated.pipelineStage),
      }));
      toast.success('Müşteri bilgileri güncellendi.');
    } catch {
      toast.error('Müşteri bilgileri kaydedilemedi.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetchWithAuth(`/api/clients/${client.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: noteStage,
          content: noteText.trim(),
          updatePipelineStage: syncStageOnNote,
        }),
      });
      if (!res.ok) throw new Error('Not eklenemedi');
      const updated: ClientDetailPayload = await res.json();
      setClient((prev) => (prev ? { ...prev, ...updated } : updated));
      if (syncStageOnNote) {
        setForm((prev) => ({ ...prev, pipelineStage: noteStage }));
      }
      setNoteText('');
      toast.success('Görüşme notu zaman tüneline eklendi.');
    } catch {
      toast.error('Not kaydedilemedi.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !dealDraft.name.trim() || savingDeal) return;
    setSavingDeal(true);
    try {
      const created = await crmRequest<Deal>('/api/crm/deals', {
        method: 'POST',
        body: JSON.stringify({
          clientId: client.id,
          name: dealDraft.name.trim(),
          value: dealDraft.value || undefined,
          stage: dealDraft.stage,
        }),
      });
      toast.success('Fırsat oluşturuldu.');
      setDealModalOpen(false);
      setDealDraft({ name: '', value: '', stage: 'lead' });
      setDeals((prev) => [created, ...prev]);
    } catch (err) {
      toast.error((err as Error).message || 'Fırsat oluşturulamadı.');
    } finally {
      setSavingDeal(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-24 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Müşteri Kartı Yükleniyor…
          </p>
        </div>
      </PageContainer>
    );
  }

  if (error || !client) {
    return (
      <PageContainer>
        <Card className="bg-card border-border p-10 text-center space-y-4">
          <AlertTriangle className="mx-auto text-red-500" size={32} />
          <p className="text-sm font-black uppercase tracking-widest text-foreground">
            Müşteri kaydı bulunamadı veya yüklenemedi
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/app/clients')}>
              <ArrowLeft size={14} /> Müşterilere Dön
            </Button>
            <Button onClick={loadAll}>
              <RefreshCw size={14} /> Tekrar Dene
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  const timelineNotes = parseClientNotes(client.notes, client.pipelineStage, client.createdAt);
  const filteredNotes =
    noteFilterStage === 'all'
      ? timelineNotes
      : timelineNotes.filter((n) => n.stage === noteFilterStage);
  const currentStageMeta = CLIENT_STAGE_MAP[form.pipelineStage];

  return (
    <PageContainer className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/clients')}
            className="h-9 px-3 text-xs font-bold gap-1.5"
          >
            <ArrowLeft size={14} /> Müşteriler
          </Button>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
            {form.type === 'company' ? <Building2 size={20} /> : <User size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-black text-foreground uppercase tracking-tight">
                {client.name}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest border',
                  currentStageMeta.badgeClass,
                )}
              >
                {currentStageMeta.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Kayıt: {new Date(client.createdAt).toLocaleDateString('tr-TR')} •{' '}
              {form.type === 'company' ? 'Kurumsal Müşteri' : 'Bireysel Müşteri'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/crm')}
            className="h-9 text-xs font-bold gap-1.5"
          >
            <Target size={14} className="text-emerald-400" /> Müşteriler & Fırsatlar
          </Button>
          {canMutate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDealDraft({
                  name: `${client.name} — Yeni Proje Fırsatı`,
                  value: '',
                  stage: form.pipelineStage === 'lead' ? 'lead' : 'qualified',
                });
                setDealModalOpen(true);
              }}
              className="h-9 text-xs font-bold gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Plus size={14} /> Fırsat Aç
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate(`/app/quotes/new?clientId=${client.id}`)}
            className="h-9 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold gap-1.5"
          >
            <FileText size={14} /> Bu Müşteriye Teklif Hazırla
          </Button>
        </div>
      </div>

      {['owner', 'admin'].includes(role ?? '') && <ClientDeletionImpact key={client.id} clientId={client.id} />}

      {/* Interactive 6-Stage Pipeline Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {CLIENT_STAGE_LIST.map((meta) => {
          const active = form.pipelineStage === meta.id;
          const stageNoteCount = timelineNotes.filter((n) => n.stage === meta.id).length;
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, pipelineStage: meta.id }));
                setNoteStage(meta.id);
                if (canMutate) void handleSaveProfile(meta.id);
              }}
              className={cn(
                'rounded-xl border p-3 text-left transition-all flex flex-col justify-between gap-1.5',
                active
                  ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                  : 'border-border bg-card hover:bg-surface-elevated',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                  {meta.label}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                  {stageNoteCount} not
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {active ? '● Aktif Aşama' : 'Bu aşamaya geçir'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editable Profile */}
        <Card className="lg:col-span-4 bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-foreground">
                İletişim & Kimlik Bilgileri
              </h2>
              <span className="text-[10px] text-muted-foreground">Düzenlenebilir</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Müşteri / Firma Ünvanı
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!canMutate}
                  className="h-9 bg-background border-border text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Müşteri Tipi
                  </Label>
                  <select
                    aria-label="Müşteri Tipi"
                    value={form.type}
                    disabled={!canMutate}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as 'company' | 'person' })
                    }
                    className="w-full h-9 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground"
                  >
                    <option value="company">Kurumsal (Şirket)</option>
                    <option value="person">Bireysel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Pipeline Adımı
                  </Label>
                  <select
                    aria-label="Pipeline Adımı"
                    value={form.pipelineStage}
                    disabled={!canMutate}
                    onChange={(e) => {
                      const nextStage = e.target.value as ClientStageKey;
                      setForm({ ...form, pipelineStage: nextStage });
                      setNoteStage(nextStage);
                    }}
                    className="w-full h-9 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground"
                  >
                    {CLIENT_STAGE_LIST.map((meta) => (
                      <option key={meta.id} value={meta.id}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Mail size={11} /> E-posta Adresi
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  disabled={!canMutate}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="info@firma.com.tr"
                  className="h-9 bg-background border-border text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Phone size={11} /> Telefon
                </Label>
                <Input
                  value={form.phone}
                  disabled={!canMutate}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+90 5XX XXX XX XX"
                  className="h-9 bg-background border-border text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <MapPin size={11} /> Adres / Şantiye Lokasyonu
                </Label>
                <textarea
                  rows={2}
                  value={form.address}
                  disabled={!canMutate}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="İl, ilçe, şantiye veya merkez ofis adresi..."
                  className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:border-orange-500"
                />
              </div>

              {canMutate && (
                <Button
                  onClick={() => handleSaveProfile()}
                  disabled={savingProfile}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest h-9 gap-1.5"
                >
                  <Save size={14} /> {savingProfile ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Center Column: 6-Stage Timeline Notes */}
        <Card className="lg:col-span-5 bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground">
                  Aşama Bazlı Görüşme & Süreç Notları
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Potansiyel → Görüşüldü → Teklifli → Pazarlık → Kazanıldı / Kaybedildi tarihçesi
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {timelineNotes.length} Kayıt
              </Badge>
            </div>

            {/* Add Note Composer */}
            {canMutate && (
              <form
                onSubmit={handleAddNote}
                className="rounded-xl border border-border bg-background/60 p-3.5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                    <MessageSquarePlus size={13} /> Yeni Aşama Notu Ekle
                  </span>
                  <select
                    aria-label="Not aşaması"
                    value={noteStage}
                    onChange={(e) => setNoteStage(e.target.value as ClientStageKey)}
                    className="h-7 rounded border border-border bg-card px-2 text-[11px] font-bold text-foreground"
                  >
                    {CLIENT_STAGE_LIST.map((meta) => (
                      <option key={meta.id} value={meta.id}>
                        Aşama: {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`${CLIENT_STAGE_MAP[noteStage].label} aşaması için toplantı özeti, revize talebi, fiyat pazarlığı veya karar notu...`}
                  className="w-full rounded-md border border-border bg-card p-2.5 text-xs text-foreground focus:outline-none focus:border-orange-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncStageOnNote}
                      onChange={(e) => setSyncStageOnNote(e.target.checked)}
                      className="rounded border-border"
                    />
                    Müşteri aşamasını da <strong>{CLIENT_STAGE_MAP[noteStage].label}</strong> yap
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingNote || !noteText.trim()}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold gap-1.5"
                  >
                    <Plus size={13} /> {savingNote ? 'Ekleniyor…' : 'Notu Kaydet'}
                  </Button>
                </div>
              </form>
            )}

            {/* Stage Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNoteFilterStage('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors',
                  noteFilterStage === 'all'
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground',
                )}
              >
                Tümü ({timelineNotes.length})
              </button>
              {CLIENT_STAGE_LIST.map((meta) => {
                const count = timelineNotes.filter((n) => n.stage === meta.id).length;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => setNoteFilterStage(meta.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors',
                      noteFilterStage === meta.id
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {meta.shortLabel} ({count})
                  </button>
                );
              })}
            </div>

            {/* Notes List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    Bu aşama filtresinde henüz kayıtlı görüşme notu bulunmuyor.
                  </p>
                </div>
              ) : (
                filteredNotes.map((entry) => {
                  const meta = CLIENT_STAGE_MAP[entry.stage];
                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border bg-background/50 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest border',
                            meta.badgeClass,
                          )}
                        >
                          {meta.label}
                        </Badge>
                        {entry.createdAt !== new Date(0).toISOString() && (
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(entry.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {entry.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Linked Deals & Quotations */}
        <div className="lg:col-span-3 space-y-6">
          {/* Linked Deals */}
          <Card className="bg-card border-border">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Target size={14} className="text-emerald-400" /> Fırsatlar ({deals.length})
                </h2>
                {canMutate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDealDraft({
                        name: `${client.name} — Fırsat`,
                        value: '',
                        stage: 'lead',
                      });
                      setDealModalOpen(true);
                    }}
                    className="h-7 px-2 text-[11px] font-bold text-emerald-400"
                  >
                    <Plus size={12} /> Ekle
                  </Button>
                )}
              </div>

              {deals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">
                  Bu müşteriye bağlı fırsat kartı henüz açılmadı.
                </p>
              ) : (
                <div className="space-y-2">
                  {deals.map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/app/crm/deals/${deal.id}`}
                      className="block rounded-lg border border-border bg-background/60 p-3 hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-foreground break-words">
                          {deal.name}
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{money(deal.value)} TRY</span>
                        <span className="uppercase font-mono text-[10px]">{deal.stage}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Quotations */}
          <Card className="bg-card border-border">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <FileText size={14} className="text-orange-400" /> Teklifler ({quotes.length})
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/app/quotes/new?clientId=${client.id}`)}
                  className="h-7 px-2 text-[11px] font-bold text-orange-400"
                >
                  <Sparkles size={12} /> Yeni Teklif
                </Button>
              </div>

              {quotes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">
                  Bu müşteriye henüz resmi teklif oluşturulmadı.
                </p>
              ) : (
                <div className="space-y-2">
                  {quotes.map((quote) => (
                    <Link
                      key={quote.id}
                      to={`/app/quotes/${quote.id}`}
                      className="block rounded-lg border border-border bg-background/60 p-3 hover:border-orange-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-foreground break-words">
                          {quote.projectName || quote.quoteNumber}
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono">{quote.quoteNumber}</span>
                        <span>
                          {Number(quote.grandTotal ?? quote.total ?? 0).toLocaleString('tr-TR')}{' '}
                          {quote.currency || 'TRY'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Deal Modal */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              {client.name} İçin Yeni Fırsat
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Fırsat / İhale Adı</Label>
              <Input
                required
                value={dealDraft.name}
                onChange={(e) => setDealDraft({ ...dealDraft, name: e.target.value })}
                placeholder="Örn: Kadıköy Konut Blokları Kaba İnşaat"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tahmini Sözleşme Bedeli (TRY)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={dealDraft.value}
                onChange={(e) => setDealDraft({ ...dealDraft, value: e.target.value })}
                placeholder="Örn: 14500000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fırsat Aşaması</Label>
              <select
                aria-label="Fırsat Aşaması"
                value={dealDraft.stage}
                onChange={(e) => setDealDraft({ ...dealDraft, stage: e.target.value })}
                className="w-full h-10 rounded-md border border-border bg-card px-3 text-xs text-foreground"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDealModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={savingDeal}>
                {savingDeal ? 'Kaydediliyor…' : 'Fırsatı Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
