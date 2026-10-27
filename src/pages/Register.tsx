import React, { useEffect, useRef, useState } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mail,
  Lock,
  Loader2,
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PublicMetadata } from '@/components/PublicMetadata';
import {
  BILLING_PERIOD_OPTIONS,
  type BillingCycleId,
  calculateBillingPeriodPricing,
  normalizeBillingCycle,
} from '@/services/billing/billing-periods';

interface PublicPlanOption {
  id: string;
  name: string;
  monthlyPrice: number;
  monthlyQuoteLimit: number;
  monthlyIfcLimit: number | null;
  ifcMaxFileMb: number;
  ifcMaxConcurrent: number;
  isFeatured: boolean;
  displayOrder: number;
  marketingBadge: string | null;
  marketingDescription: string | null;
}

interface PublicBankAccount {
  id: string;
  bankName: string;
  branchName: string | null;
  accountHolder: string;
  iban: string;
  currency: 'TRY' | 'USD' | 'EUR';
  descriptionNote: string | null;
}

// Only the free trial is kept offline; paid plans are shown from the live catalogue only (marka.md M-7.11).
const FALLBACK_PLANS: PublicPlanOption[] = [
  {
    id: '2b507e20-83d1-4b21-9fc1-000000000001',
    name: '14 Günlük Ücretsiz Deneme',
    monthlyPrice: 0,
    monthlyQuoteLimit: 3,
    monthlyIfcLimit: 1,
    ifcMaxFileMb: 25,
    ifcMaxConcurrent: 1,
    isFeatured: false,
    displayOrder: 10,
    marketingBadge: '0 ₺ · Anında Aktif',
    marketingDescription: 'Teklif, PDF/A ve IFC e-PYS ön kontrol akışını kendi projenizle ücretsiz deneyin.',
  },
];

function formatIbanDisplay(iban: string): string {
  return iban.replace(/[\s-]+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [plans, setPlans] = useState<PublicPlanOption[]>(FALLBACK_PLANS);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<PublicBankAccount[]>([]);

  const formStartedAt = useRef(Date.now());
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPilot = searchParams.get('intent') === 'pilot';
  const isAcademy = ACADEMY_ENABLED && searchParams.get('intent') === 'academy';
  const requestedPlanId = searchParams.get('planId');
  const requestedCycle = searchParams.get('cycle');
  const requestedNext = searchParams.get('next');

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    requestedPlanId || FALLBACK_PLANS[0].id,
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>(() =>
    requestedCycle ? normalizeBillingCycle(requestedCycle) : 'yearly',
  );

  useEffect(() => {
    let active = true;
    const fetchPlansAndBanks = () => {
      fetch('/api/public/plans', {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active) return;
          if (!Array.isArray(data) || data.length === 0) {
            setCatalogUnavailable(true);
            return;
          }
          setCatalogUnavailable(false);
          setPlans(data);
          setSelectedPlanId((prev) => {
            if (requestedPlanId && data.some((p: PublicPlanOption) => p.id === requestedPlanId)) {
              return requestedPlanId;
            }
            if (prev && data.some((p: PublicPlanOption) => p.id === prev)) {
              return prev;
            }
            const trial = data.find((p: PublicPlanOption) => p.monthlyPrice === 0) ?? data[0];
            return trial ? trial.id : prev;
          });
        })
        .catch(() => { if (active) setCatalogUnavailable(true); });

      fetch('/api/public/bank-accounts', {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active || !Array.isArray(data)) return;
          setBankAccounts(data);
        })
        .catch(() => {});
    };

    fetchPlansAndBanks();
    window.addEventListener('focus', fetchPlansAndBanks);

    return () => {
      active = false;
      window.removeEventListener('focus', fetchPlansAndBanks);
    };
  }, [requestedPlanId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? FALLBACK_PLANS[0];
  const isPaidPlanSelected = selectedPlan.monthlyPrice > 0;
  const selectedPricing = calculateBillingPeriodPricing(selectedPlan.monthlyPrice, billingCycle);
  const nextPath = isAcademy
    ? '/app/academy/allplan'
    : requestedNext?.startsWith('/app/')
      ? requestedNext
      : isPaidPlanSelected
        ? `/app/billing?planId=${encodeURIComponent(selectedPlan.id)}&cycle=${encodeURIComponent(billingCycle)}`
        : '/app/smartcheck';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          companyName,
          intent: isAcademy ? 'academy' : 'workspace',
          selectedPlanId: !isAcademy ? selectedPlan.id : undefined,
          selectedBillingCycle: !isAcademy && isPaidPlanSelected ? billingCycle : 'monthly',
          termsAccepted,
          privacyAccepted,
          marketingConsent,
          website,
          formStartedAt: formStartedAt.current,
          acquisitionId: localStorage.getItem('academyAcquisitionId'),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user, data.company, 'owner', data.accountType);
        if (data.pendingPaymentOrder?.referenceCode) {
          toast.success(
            `${selectedPlan.name} (${selectedPricing.label}) siparişi oluşturuldu (Kod: ${data.pendingPaymentOrder.referenceCode}). Havale/EFT bildirim ekranına yönlendiriliyorsunuz; bu sırada 14 günlük deneme kotanız aktiftir.`,
          );
        } else {
          toast.success(
            '14 Günlük Ücretsiz Deneme paketiniz ve SmartCheck (1 IFC / 25 MB, 3 Teklif) kotanız aktif edildi!',
          );
        }
        navigate(nextPath);
      } else {
        toast.error(data.error || 'Kayıt başarısız.');
      }
    } catch {
      toast.error('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background bg-hairline-grid flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 relative">
      <PublicMetadata
        title="Kayıt Ol — 14 Günlük Ücretsiz Deneme | BIMMetraj"
        description="BIMMetraj 14 günlük ücretsiz deneme hesabı oluşturun ve IFC/Excel tabanlı metraj ile teklif hazırlamaya başlayın."
        canonicalPath="/register"
        noIndex
      />
      <div className={`w-full ${isAcademy ? 'max-w-md' : 'max-w-5xl'} space-y-6 relative z-10`}>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <Link to="/" className="inline-flex items-center gap-3 focus:outline-none">
            <span className="flex h-8 w-8 items-center justify-center border border-primary bg-primary text-xs font-mono font-bold text-primary-foreground">
              {isAcademy ? 'BP' : 'BM'}
            </span>
            <span className="font-display-serif text-2xl text-foreground tracking-tight">
              {isAcademy ? 'BIMPlan Academy' : 'BIMMetraj'}
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="text-center space-y-2">
          <div className="eyebrow justify-center">
            <span className="status-dot" />
            <span>01 / YENİ PROJE OFİSİ VE ÇALIŞMA ALANI KAYDI</span>
          </div>
          <h1 className="font-display-serif text-3xl sm:text-5xl text-foreground">
            {isAcademy
              ? 'Ücretsiz Öğrenci Hesabı'
              : isPilot
                ? 'Pilot Hesabınızı ve Paketinizi Seçin'
                : 'Çalışma Alanınızı ve Paketinizi Seçin'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            {isAcademy
              ? 'Doğrulanmış Allplan derslerine hemen erişin. Kredi kartı gerekmez.'
              : '0 ₺ bedelle 14 Günlük Ücretsiz Deneme paketini anında başlatabilir veya kurumsal paketlerde %30’a varan uzun dönem indirimleriyle aboneliğinizi başlatabilirsiniz.'}
          </p>
        </div>

        <div className={`grid gap-6 ${isAcademy ? 'grid-cols-1' : 'lg:grid-cols-12 items-start'}`}>
          {/* Sol Sütun: Paket Seçimi (Workspace Kaydı İçin) */}
          {!isAcademy && (
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Sparkles size={14} /> 1. Adım: Paket ve Ödeme Periyodunuzu Seçin
                </h2>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Uzun dönem alımlarda %30&apos;a varan iskonto
                </span>
              </div>

              {/* Ödeme Periyodu Seçici (Aylık %0 / 6 Aylık %10 / 1 Yıllık %20 / 2 Yıllık %30) */}
              <div className="rounded-md border border-border bg-card/80 p-2 space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="tablist" aria-label="Ödeme periyodu seçimi">
                  {BILLING_PERIOD_OPTIONS.map((option) => {
                    const active = billingCycle === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setBillingCycle(option.id)}
                        className={`flex flex-col items-center justify-center rounded px-2.5 py-2 text-xs font-semibold transition-all border ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                            : 'border-transparent bg-background/60 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                      >
                        <span>{option.label}</span>
                        <span
                          className={`mt-0.5 font-mono text-[10px] font-bold ${
                            active
                              ? 'text-primary-foreground'
                              : option.discountPercent > 0
                                ? 'text-emerald-400'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {option.badge || '%0 Standart'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                {catalogUnavailable && (
                  <p role="status" className="border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-foreground">
                    Ücretli paket bilgileri şu anda yüklenemedi. Ücretsiz denemeyle başlayabilir veya sayfayı yenileyerek tekrar deneyebilirsiniz.
                  </p>
                )}
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlan.id;
                  const isFree = plan.monthlyPrice === 0;
                  const planPricing = calculateBillingPeriodPricing(plan.monthlyPrice, billingCycle);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full text-left rounded-md border p-4 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                            }`}
                          >
                            {isSelected && <CheckCircle2 size={12} />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{plan.name}</span>
                              {plan.marketingBadge && (
                                <span
                                  className={`rounded-xs px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                                    isFree
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-background text-primary border border-primary/30'
                                  }`}
                                >
                                  {plan.marketingBadge}
                                </span>
                              )}
                            </div>
                            {plan.marketingDescription && (
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                {plan.marketingDescription}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isFree ? (
                            <>
                              <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
                                0 ₺
                              </span>
                              <span className="block text-[10px] font-mono text-muted-foreground">
                                14 Gün Ücretsiz
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-baseline justify-end gap-1.5">
                                {planPricing.discountPercent > 0 && (
                                  <span className="font-mono text-xs text-muted-foreground line-through tabular-nums">
                                    ₺{planPricing.baseMonthlyPriceTry.toLocaleString('tr-TR')}
                                  </span>
                                )}
                                <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                                  ₺{planPricing.effectiveMonthlyPriceTry.toLocaleString('tr-TR')}
                                </span>
                              </div>
                              <span className="block text-[10px] font-mono text-muted-foreground">
                                / ay (+KDV)
                              </span>
                              {planPricing.months > 1 && (
                                <span className="mt-0.5 block text-[10px] font-mono font-semibold text-emerald-400">
                                  {planPricing.label}: ₺{planPricing.totalPayableTry.toLocaleString('tr-TR')} (₺{planPricing.discountAmountTry.toLocaleString('tr-TR')} indirim)
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
                        <span className="rounded bg-background/80 px-2 py-0.5 border border-border">
                          IFC Analizi: <strong className="text-foreground">{plan.monthlyIfcLimit ?? 0} adet/ay</strong>
                        </span>
                        <span className="rounded bg-background/80 px-2 py-0.5 border border-border">
                          Maks. Model: <strong className="text-foreground">{plan.ifcMaxFileMb} MB</strong>
                        </span>
                        <span className="rounded bg-background/80 px-2 py-0.5 border border-border">
                          Teklif Kotası:{' '}
                          <strong className="text-foreground">
                            {plan.monthlyQuoteLimit === 0
                              ? 'Yok (Sadece Denetim)'
                              : plan.monthlyQuoteLimit >= 99999
                                ? 'Sınırsız'
                                : `${plan.monthlyQuoteLimit} adet/ay`}
                          </strong>
                        </span>
                        <span className="rounded bg-background/80 px-2 py-0.5 border border-border">
                          Eşzamanlı İşlem: <strong className="text-foreground">{plan.ifcMaxConcurrent}</strong>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Seçili Pakete Göre Bilgilendirme Kutusu */}
              {isPaidPlanSelected ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-amber-300">
                    <div className="flex items-center gap-2">
                      <Landmark size={16} className="shrink-0" />
                      <span>Banka Havalesi / EFT ile Aktivasyon ({selectedPlan.name} · {selectedPricing.label})</span>
                    </div>
                    <span className="font-mono text-xs text-emerald-300">
                      Ödenecek Tutar: ₺{selectedPricing.totalPayableTry.toLocaleString('tr-TR')}
                      {selectedPricing.discountAmountTry > 0 && ` (-₺${selectedPricing.discountAmountTry.toLocaleString('tr-TR')} İskonto)`}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Kaydınızı tamamladığınızda sistem size özel bir <strong>Sipariş Referans Kodu</strong> üretir ve
                    sizi <strong>Faturalandırma & Havale Bildirimi</strong> sayfasına yönlendirir. Dekontunuz Superadmin
                    tarafından onaylanana kadar mağdur olmamanız için <strong>14 Günlük Ücretsiz Deneme (1 IFC / 25 MB)</strong>{' '}
                    kotanız anında açık başlar.
                  </p>
                  {bankAccounts.length > 0 && (
                    <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                      <p className="text-[11px] font-mono uppercase text-amber-300 font-semibold">
                        Aktif Banka Hesaplarımız:
                      </p>
                      {bankAccounts.slice(0, 2).map((acc) => (
                        <div
                          key={acc.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded bg-background/70 px-2.5 py-1.5 border border-border font-mono text-[11px]"
                        >
                          <span className="font-semibold text-foreground">{acc.bankName} ({acc.currency})</span>
                          <span className="text-muted-foreground">{formatIbanDisplay(acc.iban)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3 text-xs">
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-300">
                      0 ₺ Bedelle Anında SmartCheck & e-PYS Aktivasyonu
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Kredi kartı veya havale gerekmez. Kayıt olduğunuz anda <strong>1 adet IFC modeli (maks. 25 MB)</strong>,{' '}
                      <strong>3 adet PDF/A ön kontrolü</strong> ve <strong>3 adet teklif</strong> hakkınız otomatik tanımlanır.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sağ Sütun: Hesap ve Firma Kayıt Formu */}
          <div className={isAcademy ? 'w-full' : 'lg:col-span-5'}>
            <Card className="border border-border bg-card shadow-lg rounded-md">
              <CardContent className="pt-6 space-y-4">
                {!isAcademy && (
                  <div className="rounded-sm border border-primary/30 bg-primary/5 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          2. Adım · Seçili Paket & Periyot
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {selectedPlan.name} {isPaidPlanSelected ? `(${selectedPricing.label})` : ''}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-primary">
                        {selectedPlan.monthlyPrice === 0
                          ? '0 ₺ (14 Gün)'
                          : `₺${selectedPricing.effectiveMonthlyPriceTry.toLocaleString('tr-TR')}/ay`}
                      </span>
                    </div>
                    {isPaidPlanSelected && (
                      <div className="flex items-center justify-between border-t border-primary/20 pt-1.5 text-[11px] font-mono">
                        <span className="text-muted-foreground">
                          Toplam ({selectedPricing.months} Ay Peşin):{' '}
                          <strong className="text-foreground">
                            ₺{selectedPricing.totalPayableTry.toLocaleString('tr-TR')}
                          </strong>
                        </span>
                        {selectedPricing.discountAmountTry > 0 && (
                          <span className="text-emerald-400 font-semibold">
                            %{selectedPricing.discountPercent} İndirim (-₺{selectedPricing.discountAmountTry.toLocaleString('tr-TR')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="absolute -left-[10000px]" aria-hidden="true">
                    <label>
                      Web sitesi
                      <input
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        aria-label="Web sitesi"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="register-fullname" className="text-xs font-medium text-foreground">Ad Soyad</label>
                    <div className="relative group">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        size={16}
                      />
                      <input
                        id="register-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors"
                        placeholder="Ahmet Yılmaz"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="register-company" className="text-xs font-medium text-foreground">
                      {isAcademy ? 'Okul / Şirket (isteğe bağlı)' : 'Şirket / Ofis Adı'}
                    </label>
                    <div className="relative group">
                      <Building2
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        size={16}
                      />
                      <input
                        id="register-company"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required={!isAcademy}
                        className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors"
                        placeholder={isAcademy ? 'Üniversite veya kurumunuz' : 'Örn: Yılmaz İnşaat Taahhüt Ltd.'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="register-email" className="text-xs font-medium text-foreground">E-posta Adresi</label>
                    <div className="relative group">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        size={16}
                      />
                      <input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors"
                        placeholder="ahmet@sirketiniz.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="register-password" className="text-xs font-medium text-foreground">Şifre (En az 8 karakter)</label>
                    <div className="relative group">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        size={16}
                      />
                      <input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                    <label htmlFor="register-terms" className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        id="register-terms"
                        aria-label="Kullanım koşullarını okudum ve kabul ediyorum"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(event) => setTermsAccepted(event.target.checked)}
                        required
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        <Link to="/terms" target="_blank" className="text-primary underline underline-offset-2 hover:opacity-80">
                          Kullanım koşullarını
                        </Link>{' '}
                        okudum ve kabul ediyorum.
                      </span>
                    </label>
                    <label htmlFor="register-privacy" className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        id="register-privacy"
                        aria-label="Gizlilik bildirimini okudum ve kabul ediyorum"
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(event) => setPrivacyAccepted(event.target.checked)}
                        required
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2 hover:opacity-80">
                          Gizlilik bildirimini
                        </Link>{' '}
                        okudum ve kabul ediyorum.
                      </span>
                    </label>
                    <label htmlFor="register-marketing" className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        id="register-marketing"
                        aria-label="Ürün ve teknik eğitim duyurularını e-posta ile almak istiyorum"
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(event) => setMarketingConsent(event.target.checked)}
                        className="mt-0.5 accent-primary"
                      />
                      <span>Ürün ve teknik eğitim duyurularını e-posta ile almak istiyorum.</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 h-10 text-primary-foreground font-semibold text-sm gap-2 shadow-xs"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        {isAcademy
                          ? 'Ücretsiz Öğrenci Kaydı'
                          : isPaidPlanSelected
                            ? 'Kaydı Tamamla & Havale Bilgilerine Geç'
                            : '14 Günlük Ücretsiz Denemeyi Başlat (0 ₺)'}{' '}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-3 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    Zaten hesabınız var mı?{' '}
                    <Link to="/login" className="text-primary font-medium underline underline-offset-2 hover:opacity-80">
                      Oturum Açın
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
