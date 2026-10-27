/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useState } from 'react';
import { AlertCircle, Calculator, Plus, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { fetchWithAuth } from '@/lib/api';
import { Currency, type Client } from '@/types';
import type { CalculationResult } from '@/lib/calculations';

export const CURRENCY_LABELS: Record<string, string> = { [Currency.TRY]: "Türk Lirası (₺)", [Currency.USD]: "Dolar ($)", [Currency.EUR]: "Euro (€)" };
export const DELIVERY_LEVEL_LABELS = { none: "Kapsam yok", as_built: "As-built teslim", cobie: "COBie veri teslimi", digital_twin: "Dijital ikiz hazırlığı" } as const;
export const PROCUREMENT_PROFILE_LABELS = { standard: "Standart", low_carbon: "Düşük karbon hedefi", high_carbon_risk: "Yüksek karbon riski" } as const;

/** Quotation header fields edited in the side panel of the new-quotation screen. */
export interface QuoteFormState {
  clientId: string;
  projectName: string;
  quoteNumber: string;
  date: string;
  expiryDate: string;
  currency: Currency;
  projectDurationMonths: number;
  escalationVolatilityPercent: number;
  procurementProfile: keyof typeof PROCUREMENT_PROFILE_LABELS;
  carbonRiskPremiumPercent: number;
  informationDeliveryLevel: keyof typeof DELIVERY_LEVEL_LABELS;
  informationDeliveryCostPercent: number;
  overheadProfitPercent: number;
  notes: string;
}

interface QuoteGeneralSettingsProps {
  formData: QuoteFormState;
  setFormData: (next: QuoteFormState) => void;
  clients: readonly Client[];
  onClientCreated?: (client: Client) => void;
}

/** Genel taslak bilgileri: temel alanlar açık, risk ve bilgi teslimi varsayımları "Gelişmiş" içinde (M-12.4). */
export function QuoteGeneralSettings({ formData, setFormData, clients, onClientCreated }: QuoteGeneralSettingsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientSaving, setQuickClientSaving] = useState(false);

  const handleQuickCreateClient = async () => {
    if (!quickClientName.trim() || quickClientSaving) return;
    setQuickClientSaving(true);
    try {
      const res = await fetchWithAuth('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickClientName.trim(),
          type: 'company',
          email: quickClientEmail.trim() || null,
          pipelineStage: 'lead',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || 'Müşteri oluşturulamadı.');
      }
      onClientCreated?.(data);
      setFormData({ ...formData, clientId: data.id });
      setQuickClientName('');
      setQuickClientEmail('');
      setQuickClientOpen(false);
      toast.success(`"${data.name}" eklendi ve teklife atandı.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Müşteri oluşturulamadı.');
    } finally {
      setQuickClientSaving(false);
    }
  };
  // Hidden values still change the cost and margin, so the closed section says what they are.
  // Company risk settings may omit a field, so every value is read defensively.
  const percentLabel = (value: unknown) => `%${(Number(value) || 0).toLocaleString('tr-TR')}`;
  const advancedSummary = [
    `${Number(formData.projectDurationMonths) || 1} ay`,
    `${percentLabel(formData.escalationVolatilityPercent)} aylık volatilite`,
    `${percentLabel(formData.carbonRiskPremiumPercent)} karbon primi`,
    !formData.informationDeliveryLevel || formData.informationDeliveryLevel === 'none'
      ? 'bilgi teslimi yok'
      : `${DELIVERY_LEVEL_LABELS[formData.informationDeliveryLevel]} · ${percentLabel(formData.informationDeliveryCostPercent)}`,
  ].join(' · ');

  return (
      <SectionWrapper title="Genel Taslak Bilgileri" description="Teklifin temel parametrelerini belirleyin.">
        <Card className="bg-card border border-border shadow-none">
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="quote-client" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={12} className="text-primary" /> Müşteri İlişkilendirme
                </Label>
                <button
                  type="button"
                  id="quick-inline-client-btn"
                  onClick={() => setQuickClientOpen((prev) => !prev)}
                  className="text-[10px] font-mono font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={11} /> Hızlı Müşteri Ekle
                </button>
              </div>
              <Select value={formData.clientId} onValueChange={(v) => setFormData({...formData, clientId: v})} items={Object.fromEntries(clients.map(c => [c.id, c.name]))}>
                <SelectTrigger id="quote-client" className="bg-background border-border text-foreground focus:ring-primary h-11 text-xs font-semibold">
                  <SelectValue placeholder="Bir müşteri atayın..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {quickClientOpen && (
                <div className="mt-2 border border-border bg-background p-3 space-y-2">
                  <Input
                    placeholder="Müşteri / Firma ünvanı"
                    value={quickClientName}
                    onChange={(e) => setQuickClientName(e.target.value)}
                    className="h-9 text-xs bg-card border-border"
                  />
                  <Input
                    type="email"
                    placeholder="E-posta (isteğe bağlı)"
                    value={quickClientEmail}
                    onChange={(e) => setQuickClientEmail(e.target.value)}
                    className="h-9 text-xs bg-card border-border"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQuickClientOpen(false)} className="h-7 text-[10px] font-mono">
                      Vazgeç
                    </Button>
                    <Button type="button" size="sm" disabled={quickClientSaving || !quickClientName.trim()} onClick={() => void handleQuickCreateClient()} className="h-7 text-[10px] font-mono">
                      {quickClientSaving ? 'Kaydediliyor...' : 'Ekle ve Ata'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Field
              label={<span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest"><Calculator size={12} className="text-primary" /> Proje Başlığı</span>}
            >
              <Input
                aria-label="Proje başlığı"
                value={formData.projectName}
                onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                className="bg-background border-border text-foreground focus:border-primary h-11 text-xs font-semibold"
                placeholder="Örn: Villa Restorasyonu Faz 1"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quote-currency" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Para Birimi</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v as Currency})} items={CURRENCY_LABELS}>
                  <SelectTrigger id="quote-currency" className="bg-background border-border text-foreground h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {Object.entries(CURRENCY_LABELS).map(([value, label]) => <SelectItem key={value} value={value} className="text-xs font-medium">{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">KDV Oranı</Label>
                <div className="h-11 flex items-center px-3 bg-muted/30 border border-border text-xs font-mono font-bold text-foreground">
                  %20 (Standart)
                </div>
              </div>
            </div>
            <Field label="Kâr ve Genel Gider %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Müşteri fiyatına eklenir ve KDV'ye dahil edilir. ÇŞB birim fiyatlarında %25 zaten dahildir; tekrar eklemeyin.">
              <Input
                type="number" min="0" max="100" step="0.01"
                aria-label="Müteahhitlik kârı ve genel gider yüzdesi"
                value={formData.overheadProfitPercent}
                onChange={(e) => setFormData({...formData, overheadProfitPercent: Math.min(100, Math.max(0, Math.round((Number(e.target.value) || 0) * 100) / 100))})}
                className="bg-background border-border text-foreground h-11 font-mono text-xs"
              />
            </Field>
            {/* M-12.4: first-quote basics stay visible; risk and delivery assumptions are one click away. */}
            <details
              data-testid="quote-advanced"
              className="border border-border bg-background"
              open={advancedOpen}
              onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                Gelişmiş · süre, risk primleri, bilgi teslimi
                <span className="mt-1 block normal-case tracking-normal font-normal text-muted-foreground" data-testid="quote-advanced-summary">
                  {advancedSummary}
                </span>
              </summary>
              <div className="space-y-5 border-t border-border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quote-delivery-level" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Bilgi Teslimi</Label>
                    <Select value={formData.informationDeliveryLevel} onValueChange={(value) => setFormData({...formData, informationDeliveryLevel: value as typeof formData.informationDeliveryLevel, informationDeliveryCostPercent: value === 'as_built' ? 1 : value === 'cobie' ? 2 : value === 'digital_twin' ? 4 : 0})} items={DELIVERY_LEVEL_LABELS}>
                      <SelectTrigger id="quote-delivery-level" className="bg-background border-border text-foreground h-11 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {Object.entries(DELIVERY_LEVEL_LABELS).map(([value, label]) => <SelectItem key={value} value={value} className="text-xs font-medium">{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Teslim Maliyeti %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Şirket kapsam varsayımıdır; ISO/COBie uygunluğu değildir.">
                    <Input type="number" min="0" step="0.1" value={formData.informationDeliveryCostPercent} onChange={(e) => setFormData({...formData, informationDeliveryCostPercent: Math.max(0, Number(e.target.value) || 0)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quote-procurement-profile" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Tedarik Profili</Label>
                    <Select value={formData.procurementProfile} onValueChange={(value) => setFormData({...formData, procurementProfile: value as typeof formData.procurementProfile, carbonRiskPremiumPercent: value === 'high_carbon_risk' ? 4 : 0})} items={PROCUREMENT_PROFILE_LABELS}>
                      <SelectTrigger id="quote-procurement-profile" className="bg-background border-border text-foreground h-11 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {Object.entries(PROCUREMENT_PROFILE_LABELS).map(([value, label]) => <SelectItem key={value} value={value} className="text-xs font-medium">{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Karbon Risk Primi %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Senaryo katsayısıdır; vergi/uyum kararı değildir.">
                    <Input type="number" min="0" step="0.1" value={formData.carbonRiskPremiumPercent} onChange={(e) => setFormData({...formData, carbonRiskPremiumPercent: Math.max(0, Number(e.target.value) || 0)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Süre (Ay)" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                    <Input type="number" min="1" value={formData.projectDurationMonths} onChange={(e) => setFormData({...formData, projectDurationMonths: Math.max(1, Number(e.target.value) || 1)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                  <Field label="Aylık Volatilite %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Şirket varsayımıdır; otomatik piyasa verisi değildir.">
                    <Input type="number" min="0" step="0.1" value={formData.escalationVolatilityPercent} onChange={(e) => setFormData({...formData, escalationVolatilityPercent: Math.max(0, Number(e.target.value) || 0)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>
      </SectionWrapper>
  );
}

interface QuoteSummaryCardProps {
  totals: CalculationResult;
  currency: string;
  overheadProfitPercent: number;
  costInputsComplete: boolean;
  estimatedMargin: number;
}

export function QuoteSummaryCard({ totals, currency, overheadProfitPercent, costInputsComplete, estimatedMargin }: QuoteSummaryCardProps) {
  return (
    <>
        {/* Pricing Summary Card */}
        <Card className="bg-card text-card-foreground border border-border shadow-none">
          <CardContent className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Ara Toplam</span>
                <span className="font-mono text-xs text-foreground font-semibold tabular-nums">{totals.subtotal.toLocaleString('tr-TR')} {currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">İndirimler</span>
                <span className="font-mono text-xs text-destructive font-semibold tabular-nums">-{totals.discountTotal.toLocaleString('tr-TR')} {currency}</span>
              </div>
              {totals.overheadProfitTotal > 0 && (
                <div className="flex justify-between items-center" data-testid="create-quote-overhead-profit">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Kâr ve Genel Gider (%{overheadProfitPercent.toLocaleString('tr-TR')})</span>
                  <span className="font-mono text-xs text-foreground font-semibold tabular-nums">+{totals.overheadProfitTotal.toLocaleString('tr-TR')} {currency}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Yasal Vergi (KDV)</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">+{totals.vatTotal.toLocaleString('tr-TR')} {currency}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.25em] mb-2 leading-none">Net Teklif Toplamı</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-serif tracking-tight text-foreground tabular-nums">
                  {totals.grandTotal.toLocaleString('tr-TR')}
                </h2>
                <span className="text-lg font-mono text-muted-foreground">{currency}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5 p-3 border border-border bg-muted/20 text-xs font-mono">
              {costInputsComplete ? <TrendingUp size={15} className="text-primary shrink-0" /> : <AlertCircle size={15} className="text-muted-foreground shrink-0" />}
              <span className={costInputsComplete ? "text-foreground font-medium" : "text-muted-foreground"}>
                {costInputsComplete ? `Risk primleri dahil marj: %${estimatedMargin.toFixed(1)}` : 'Maliyet birim fiyatlarını girin; marj hesaplanmaz.'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <div className="bg-card border border-border p-4 flex gap-3 items-start shadow-none">
          <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-mono font-bold text-foreground uppercase tracking-wider mb-1">Profesyonel İpucu</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              İndirim ve pazarlık payını kendi maliyet yapınıza ve marj hedefinize göre belirleyin.
            </p>
          </div>
        </div>
    </>
  );
}
