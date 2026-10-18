import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  BILLING_PERIOD_OPTIONS,
  type BillingCycleId,
  calculateBillingPeriodPricing,
} from '@/services/billing/billing-periods';
import { pricingLayout, publicPlansForDisplay } from './presentation';

export type PublicPlan = {
  id: string; name: string; monthlyPrice: number; monthlyQuoteLimit: number; monthlyIfcLimit: number | null;
  ifcMaxFileMb: number; ifcMaxConcurrent: number; isActive: true; isPublished: true; isFeatured: boolean;
  displayOrder: number; marketingBadge: string | null; marketingDescription: string | null;
};

const publicPlanSchema = z.object({
  id: z.string(), name: z.string().min(1), monthlyPrice: z.number().int().nonnegative(),
  monthlyQuoteLimit: z.number().int().nonnegative(), monthlyIfcLimit: z.number().int().nonnegative().nullable(),
  ifcMaxFileMb: z.number().int().nonnegative(), ifcMaxConcurrent: z.number().int().nonnegative(),
  isActive: z.boolean(), isPublished: z.boolean(), isFeatured: z.boolean(), displayOrder: z.number().int().nonnegative(),
  marketingBadge: z.string().nullable().optional().transform((v) => v ?? null),
  marketingDescription: z.string().nullable().optional().transform((v) => v ?? null),
});

function formatQuantity(value: number): string {
  return value.toLocaleString('tr-TR');
}

function PlanCard({ plan, billingCycle }: { plan: PublicPlan; billingCycle: BillingCycleId }) {
  const navigate = useNavigate();
  const isFree = plan.monthlyPrice === 0;
  const pricing = calculateBillingPeriodPricing(plan.monthlyPrice, billingCycle);
  const features = [
    plan.monthlyQuoteLimit === 0 ? 'Teklif modülü dahil değil' : `${formatQuantity(plan.monthlyQuoteLimit)} adet aylık teklif kotası`,
    plan.monthlyIfcLimit === null
      ? 'IFC kotası tanımsız'
      : `${formatQuantity(plan.monthlyIfcLimit)} adet/ay ${plan.monthlyQuoteLimit === 0 ? 'model isimlendirme denetimi' : 'IFC 5D & e-PYS analizi'}`,
    `Maks. ${plan.ifcMaxFileMb} MB IFC model dosyası`,
    `${plan.ifcMaxConcurrent} eşzamanlı işlem kuyruğu`,
  ];
  const cta = isFree ? 'Ücretsiz Başlayın' : 'Paketi Seç & Başla';
  const registerUrl = isFree
    ? `/register?planId=${encodeURIComponent(plan.id)}`
    : `/register?planId=${encodeURIComponent(plan.id)}&cycle=${encodeURIComponent(billingCycle)}`;

  return (
    <article className={`relative flex min-h-[360px] flex-col justify-between rounded-md border bg-card p-5 ${plan.isFeatured ? 'border-2 border-primary bg-primary/5 shadow-lg' : 'border-border'}`}>
      {plan.isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xs bg-primary px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-primary-foreground">
          {plan.marketingBadge || 'Öne çıkan'}
        </span>
      )}
      <div className={plan.isFeatured ? 'mt-1' : ''}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
          {!plan.isFeatured && plan.marketingBadge && <span className="shrink-0 rounded-xs border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">{plan.marketingBadge}</span>}
        </div>
        <div className="mb-4">
          {isFree ? (
            <div>
              <span className="font-mono text-2xl font-bold tabular-nums text-emerald-400">Ücretsiz</span>
              <span className="ml-1 text-xs text-muted-foreground">/ 14 gün deneme</span>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                {pricing.discountPercent > 0 && (
                  <span className="font-mono text-xs text-muted-foreground line-through tabular-nums">
                    ₺{formatQuantity(pricing.baseMonthlyPriceTry)}
                  </span>
                )}
                <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  ₺{formatQuantity(pricing.effectiveMonthlyPriceTry)}
                </span>
                <span className="text-xs text-muted-foreground">/ ay</span>
                {pricing.discountPercent > 0 && (
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                    -%{pricing.discountPercent}
                  </span>
                )}
              </div>
              {pricing.months > 1 ? (
                <p className="mt-1 font-mono text-[11px] text-emerald-400">
                  {pricing.label} Toplam: <strong>₺{formatQuantity(pricing.totalPayableTry)}</strong>{' '}
                  <span className="text-muted-foreground">(₺{formatQuantity(pricing.discountAmountTry)} kazanç)</span>
                </p>
              ) : (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Aylık faturalandırma (+KDV)
                </p>
              )}
            </div>
          )}
        </div>
        {plan.marketingDescription && <p className="mb-4 min-h-10 text-xs leading-relaxed text-muted-foreground">{plan.marketingDescription}</p>}
        <ul className="space-y-2.5 text-xs text-muted-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-primary" /><span>{feature}</span></li>
          ))}
        </ul>
      </div>
      <Button onClick={() => navigate(registerUrl)} variant={plan.isFeatured ? 'default' : 'outline'} className="mt-5 w-full text-xs">
        {cta}
      </Button>
    </article>
  );
}

export function PublicPricingSection() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>('yearly');
  const carouselRef = useRef<HTMLDivElement>(null);

  const loadPlans = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try {
      const response = await fetch('/api/public/plans', {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) throw new Error('PUBLIC_PLANS_UNAVAILABLE');
      const data: unknown = await response.json();
      const parsed = z.array(publicPlanSchema).safeParse(data);
      if (!parsed.success) throw new Error('PUBLIC_PLANS_INVALID');
      setPlans(publicPlansForDisplay(parsed.data as PublicPlan[]));
      setStatus('ready');
    } catch {
      if (!silent) {
        setPlans([]);
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    const handleFocus = () => {
      void loadPlans(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadPlans]);
  const layout = pricingLayout(plans.length);
  const scroll = (direction: -1 | 1) => carouselRef.current?.scrollBy({ left: direction * Math.max(300, carouselRef.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <section id="pricing" className="border-b border-border bg-card/30 px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary">ŞEFFAF VE ESNEK PAKETLER</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">Her İhtiyaca Uygun Mühendislik Paketleri</h2>
          <p className="mt-3 text-base text-muted-foreground">
            0 ₺ bedelle 14 günlük deneme başlatın veya uzun dönemli alımlarda %30&apos;a varan kurumsal iskonto avantajından yararlanın.
          </p>

          {/* Ödeme Periyodu Seçici (Aylık %0 / 6 Aylık %10 / 1 Yıllık %20 / 2 Yıllık %30) */}
          <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-border bg-background/90 p-1.5 shadow-sm" role="tablist" aria-label="Ödeme periyodu seçimi">
            {BILLING_PERIOD_OPTIONS.map((option) => {
              const active = billingCycle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setBillingCycle(option.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        active
                          ? 'bg-primary-foreground/15 text-primary-foreground'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {option.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {billingCycle !== 'monthly' && (
            <p className="mt-2.5 text-xs font-mono text-emerald-400 flex items-center justify-center gap-1">
              <Sparkles size={13} />
              Uzun dönem peşin alımda kurumsal fiyat sabitleme + net %{BILLING_PERIOD_OPTIONS.find((o) => o.id === billingCycle)?.discountPercent} iskonto uygulanır.
            </p>
          )}
        </div>
        {status === 'loading' && <div aria-live="polite" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-[360px] animate-pulse rounded-md border border-border bg-muted/30" />)}</div>}
        {status === 'error' && <div role="alert" className="mx-auto max-w-xl rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-muted-foreground">Paketler şu anda yüklenemedi. <button type="button" onClick={() => void loadPlans()} className="ml-1 font-semibold text-primary underline">Tekrar deneyin</button></div>}
        {status === 'ready' && layout === 'empty' && <div className="mx-auto max-w-xl rounded-md border border-border bg-card p-5 text-center text-sm text-muted-foreground">Yayınlanmış paket yakında burada görünecek.</div>}
        {status === 'ready' && layout === 'grid' && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} billingCycle={billingCycle} />)}</div>}
        {status === 'ready' && layout === 'carousel' && <div className="relative"><div ref={carouselRef} tabIndex={0} role="region" aria-label="Abonelik paketleri listesi" className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 pr-1 [scrollbar-width:thin]">{plans.map((plan) => <div key={plan.id} className="w-[min(86vw,320px)] shrink-0 snap-start"><PlanCard plan={plan} billingCycle={billingCycle} /></div>)}</div><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="outline" size="icon" aria-label="Önceki paketler" onClick={() => scroll(-1)}><ChevronLeft size={16} /></Button><Button type="button" variant="outline" size="icon" aria-label="Sonraki paketler" onClick={() => scroll(1)}><ChevronRight size={16} /></Button></div></div>}
      </div>
    </section>
  );
}

