import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { pricingLayout, publicPlansForDisplay } from './presentation';

export type PublicPlan = {
  id: string; name: string; monthlyPrice: number; monthlyQuoteLimit: number; monthlyIfcLimit: number | null;
  ifcMaxFileMb: number; ifcMaxConcurrent: number; isActive: true; isPublished: true; isFeatured: boolean;
  displayOrder: number; marketingBadge: string | null; marketingDescription: string | null;
};

const publicPlanSchema = z.object({
  id: z.string().uuid(), name: z.string().min(1), monthlyPrice: z.number().int().nonnegative(),
  monthlyQuoteLimit: z.number().int().nonnegative(), monthlyIfcLimit: z.number().int().nonnegative().nullable(),
  ifcMaxFileMb: z.number().int().positive(), ifcMaxConcurrent: z.number().int().positive(),
  isActive: z.literal(true), isPublished: z.literal(true), isFeatured: z.boolean(), displayOrder: z.number().int().nonnegative(),
  marketingBadge: z.string().max(40).nullable(), marketingDescription: z.string().max(280).nullable(),
});

function formatQuantity(value: number): string {
  return value.toLocaleString('tr-TR');
}

function PlanCard({ plan }: { plan: PublicPlan }) {
  const navigate = useNavigate();
  const features = [
    plan.monthlyQuoteLimit === 0 ? 'Teklif modülü dahil değil' : `${formatQuantity(plan.monthlyQuoteLimit)} adet teklif kotası`,
    plan.monthlyIfcLimit === null
      ? 'IFC kotası tanımsız'
      : `${formatQuantity(plan.monthlyIfcLimit)} adet ${plan.monthlyQuoteLimit === 0 ? 'model isimlendirme denetimi' : 'IFC analizi'}`,
    `Maks. ${plan.ifcMaxFileMb} MB model dosyası`,
    `${plan.ifcMaxConcurrent} eşzamanlı işlem kapasitesi`,
  ];
  const cta = plan.monthlyPrice === 0 ? 'Ücretsiz Başlayın' : 'Paketi İnceleyin';

  return (
    <article className={`relative flex min-h-[330px] flex-col justify-between rounded-md border bg-card p-5 ${plan.isFeatured ? 'border-2 border-primary bg-primary/5 shadow-lg' : 'border-border'}`}>
      {plan.isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xs bg-primary px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-white">
          {plan.marketingBadge || 'Öne çıkan'}
        </span>
      )}
      <div className={plan.isFeatured ? 'mt-1' : ''}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
          {!plan.isFeatured && plan.marketingBadge && <span className="shrink-0 rounded-xs border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">{plan.marketingBadge}</span>}
        </div>
        <div className="mb-4">
          <span className={`font-mono text-2xl font-bold tabular-nums ${plan.monthlyPrice === 0 ? 'text-emerald-400' : 'text-foreground'}`}>
            {plan.monthlyPrice === 0 ? 'Ücretsiz' : `₺${formatQuantity(plan.monthlyPrice)}`}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">{plan.monthlyPrice === 0 ? '/ deneme' : '/ ay'}</span>
        </div>
        {plan.marketingDescription && <p className="mb-4 min-h-10 text-xs leading-relaxed text-muted-foreground">{plan.marketingDescription}</p>}
        <ul className="space-y-2.5 text-xs text-muted-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-primary" /><span>{feature}</span></li>
          ))}
        </ul>
      </div>
      <Button onClick={() => navigate(`/register?planId=${encodeURIComponent(plan.id)}`)} variant={plan.isFeatured ? 'default' : 'outline'} className="mt-5 w-full text-xs">
        {cta}
      </Button>
    </article>
  );
}

export function PublicPricingSection() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const carouselRef = useRef<HTMLDivElement>(null);

  const loadPlans = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/public/plans', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('PUBLIC_PLANS_UNAVAILABLE');
      const data: unknown = await response.json();
      const parsed = z.array(publicPlanSchema).safeParse(data);
      if (!parsed.success) throw new Error('PUBLIC_PLANS_INVALID');
      setPlans(publicPlansForDisplay(parsed.data as PublicPlan[]));
      setStatus('ready');
    } catch {
      setPlans([]);
      setStatus('error');
    }
  }, []);

  useEffect(() => { void loadPlans(); }, [loadPlans]);
  const layout = pricingLayout(plans.length);
  const scroll = (direction: -1 | 1) => carouselRef.current?.scrollBy({ left: direction * Math.max(300, carouselRef.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <section id="pricing" className="border-b border-border bg-card/30 px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary">ŞEFFAF VE ESNEK PAKETLER</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">Her İhtiyaca Uygun Mühendislik Paketleri</h2>
          <p className="mt-3 text-base text-muted-foreground">Yalnızca platform yöneticisinin yayına aldığı güncel paketleri inceleyin. Kredi kartı gerekmez.</p>
        </div>
        {status === 'loading' && <div aria-live="polite" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-[330px] animate-pulse rounded-md border border-border bg-muted/30" />)}</div>}
        {status === 'error' && <div role="alert" className="mx-auto max-w-xl rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-muted-foreground">Paketler şu anda yüklenemedi. <button type="button" onClick={() => void loadPlans()} className="ml-1 font-semibold text-primary underline">Tekrar deneyin</button></div>}
        {status === 'ready' && layout === 'empty' && <div className="mx-auto max-w-xl rounded-md border border-border bg-card p-5 text-center text-sm text-muted-foreground">Yayınlanmış paket yakında burada görünecek.</div>}
        {status === 'ready' && layout === 'grid' && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>}
        {status === 'ready' && layout === 'carousel' && <div className="relative"><div ref={carouselRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 pr-1 [scrollbar-width:thin]">{plans.map((plan) => <div key={plan.id} className="w-[min(86vw,320px)] shrink-0 snap-start"><PlanCard plan={plan} /></div>)}</div><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="outline" size="icon" aria-label="Önceki paketler" onClick={() => scroll(-1)}><ChevronLeft size={16} /></Button><Button type="button" variant="outline" size="icon" aria-label="Sonraki paketler" onClick={() => scroll(1)}><ChevronRight size={16} /></Button></div></div>}
      </div>
    </section>
  );
}
