import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Landmark,
  Receipt,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import {
  BILLING_PERIOD_OPTIONS,
  type BillingCycleId,
  calculateBillingPeriodPricing,
  formatBillingCycleLabel,
  normalizeBillingCycle,
} from '@/services/billing/billing-periods';
import { UsageStat, usageDisplay, usageHints, usageLabels } from './billing-usage';
import { hasSelectedBankAccount } from './billing-transfer-state';
import { formatUsagePeriodUtc } from './billing-period-display';

interface BillingData {
  plan: string;
  usage: UsageStat[];
  totalMonthlyCost: number;
  period: { start: string; end: string; timezone?: string };
}

interface PublicPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  monthlyQuoteLimit: number | null;
  monthlyIfcLimit: number | null;
  ifcMaxFileMb: number;
  ifcMaxConcurrent: number;
  isFeatured: boolean;
  displayOrder: number;
  marketingBadge: string | null;
  marketingDescription: string | null;
}

interface BankAccount {
  id: string;
  bankName: string;
  branchName: string | null;
  accountHolder: string;
  iban: string;
  currency: 'TRY' | 'USD' | 'EUR';
  description?: string | null;
  descriptionNote?: string | null;
  isActive: boolean;
}

interface PaymentRequestItem {
  requestId: string;
  referenceCode: string;
  companyId: string;
  planId: string;
  planName: string;
  amountTry: number;
  billingCycle: BillingCycleId;
  status: 'awaiting_transfer' | 'pending_approval' | 'approved' | 'rejected';
  bankAccountId: string | null;
  bankName: string | null;
  senderName: string | null;
  transferReference?: string | null;
  receiptNumber?: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  notes: string | null;
  adminNote?: string | null;
  adminDecisionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatIbanDisplay(iban: string): string {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function Billing() {
  const [searchParams] = useSearchParams();
  const initialPlanIdFromUrl = searchParams.get('planId') || '';
  const initialCycleFromUrl = searchParams.get('cycle');

  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanIdFromUrl);
  const [activeOrder, setActiveOrder] = useState<PaymentRequestItem | null>(null);
  const [initializingOrder, setInitializingOrder] = useState(false);

  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>(() =>
    initialCycleFromUrl ? normalizeBillingCycle(initialCycleFromUrl) : 'yearly',
  );
  const [senderName, setSenderName] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetchWithAuth('/api/billing/usage-stats');
      if (!response.ok) throw new Error('Billing unavailable');
      const result = await response.json();
      if (!Array.isArray(result.usage) || typeof result.plan !== 'string' || !result.period) {
        throw new Error('Invalid billing data');
      }
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogAndPayments() {
    try {
      const [plansRes, banksRes, requestsRes] = await Promise.all([
        fetch('/api/public/plans', {
          cache: 'no-store',
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        }),
        fetchWithAuth('/api/billing/bank-accounts'),
        fetchWithAuth('/api/billing/payment-requests'),
      ]);

      let loadedPlans: PublicPlan[] = [];
      if (plansRes.ok) {
        const body = await plansRes.json();
        if (Array.isArray(body)) {
          loadedPlans = body;
          setPlans(body);
        }
      }

      if (banksRes.ok) {
        const body = await banksRes.json();
        const accountsList: BankAccount[] = Array.isArray(body)
          ? body
          : Array.isArray(body?.accounts)
            ? body.accounts
            : [];
        setBankAccounts(accountsList);
        if (accountsList.length > 0 && !selectedBankId) {
          setSelectedBankId(accountsList[0].id);
        }
      }

      let loadedRequests: PaymentRequestItem[] = [];
      if (requestsRes.ok) {
        const body = await requestsRes.json();
        const requestsList: PaymentRequestItem[] = Array.isArray(body)
          ? body
          : Array.isArray(body?.requests)
            ? body.requests
            : [];
        loadedRequests = requestsList;
        setPaymentRequests(requestsList);
      }

      if (initialPlanIdFromUrl) {
        const existingOrder = loadedRequests.find(
          (r) =>
            r.planId === initialPlanIdFromUrl &&
            (r.status === 'awaiting_transfer' || r.status === 'pending_approval'),
        );
        if (existingOrder) {
          setActiveOrder(existingOrder);
          setSelectedPlanId(existingOrder.planId);
          if (!initialCycleFromUrl && existingOrder.billingCycle) {
            setBillingCycle(normalizeBillingCycle(existingOrder.billingCycle));
          }
        } else {
          const targetPlan = loadedPlans.find((p) => p.id === initialPlanIdFromUrl && p.monthlyPrice > 0);
          if (targetPlan) {
            void handleSelectPlanForTransfer(targetPlan.id);
          }
        }
      } else {
        const latestOpen = loadedRequests.find(
          (r) => r.status === 'awaiting_transfer' || r.status === 'pending_approval',
        );
        if (latestOpen) {
          setActiveOrder(latestOpen);
          setSelectedPlanId(latestOpen.planId);
          if (latestOpen.billingCycle) {
            setBillingCycle(normalizeBillingCycle(latestOpen.billingCycle));
          }
        }
      }
    } catch {
      // Keep usage view functional even if secondary endpoints fail
    }
  }

  useEffect(() => {
    void load();
    void loadCatalogAndPayments();
  }, []);

  const handleSelectPlanForTransfer = async (planId: string) => {
    setSelectedPlanId(planId);
    const existing = paymentRequests.find(
      (r) => r.planId === planId && (r.status === 'awaiting_transfer' || r.status === 'pending_approval'),
    );
    if (existing) {
      setActiveOrder(existing);
      return;
    }

    setInitializingOrder(true);
    try {
      const res = await fetchWithAuth('/api/billing/payment-requests/init', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Sipariş referans kodu oluşturulamadı.');
      }
      const body = await res.json();
      const order: PaymentRequestItem | null = body?.order ?? (body?.requestId ? body : null);
      if (order) {
        setActiveOrder(order);
        setPaymentRequests((prev) => [
          order,
          ...prev.filter((item) => item.requestId !== order.requestId),
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Sipariş başlatılamadı.');
    } finally {
      setInitializingOrder(false);
    }
  };

  const handleCopy = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} panoya kopyalandı.`);
      window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000);
    } catch {
      toast.error('Kopyalama başarısız oldu.');
    }
  };

  const handleSubmitNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSelectedBankAccount(bankAccounts, selectedBankId)) {
      toast.error('Doğrulanmış banka hesabı seçilemiyor. Daha önce ödeme yaptıysanız lütfen destekle iletişime geçin.');
      return;
    }
    const targetPlanId = activeOrder?.planId || selectedPlanId;
    if (!targetPlanId) {
      toast.error('Lütfen önce geçiş yapmak istediğiniz paketi seçin.');
      return;
    }
    if (!activeOrder?.requestId) {
      toast.error('Lütfen önce paket için sipariş referansı oluşturun.');
      return;
    }
    if (!senderName.trim()) {
      toast.error('Lütfen havale/EFT göndericisinin ad soyad veya firma ünvanını girin.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetchWithAuth('/api/billing/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          requestId: activeOrder.requestId,
          planId: targetPlanId,
          billingCycle,
          bankAccountId: selectedBankId || null,
          senderName: senderName.trim(),
          receiptNumber: transferReference.trim() || null,
          transferReference: transferReference.trim() || null,
          taxOffice: taxOffice.trim() || null,
          taxNumber: taxNumber.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Ödeme bildirimi gönderilemedi.');
      }

      toast.success('Havale / EFT dekont bildiriminiz alındı! Süper Admin onayından sonra paketiniz aktif edilecektir.');
      const savedReq: PaymentRequestItem | null = body?.request ?? (body?.requestId ? body : null);
      if (savedReq) {
        setActiveOrder(savedReq);
        setPaymentRequests((prev) => [
          savedReq,
          ...prev.filter((item) => item.requestId !== savedReq.requestId),
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Ödeme bildirimi sırasında hata oluştu.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const selectedPlanObj = plans.find((p) => p.id === (activeOrder?.planId || selectedPlanId));

  return (
    <PageContainer className="min-w-0 [&_*]:tracking-normal">
      <header className="mb-8 flex items-center gap-3">
        <CreditCard className="shrink-0 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-semibold">Faturalandırma, Paketler & Havale Bildirimi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aktif paket kotalarınızı takip edin, üst pakete geçin ve banka havalesi / EFT dekont bildiriminizi iletin.
          </p>
        </div>
      </header>

      {loading ? (
        <p role="status">Kullanım yükleniyor…</p>
      ) : error || !data ? (
        <div role="alert" className="space-y-4">
          <p>Kullanım verileri yüklenemedi.</p>
          <Button onClick={load} variant="outline">
            <RefreshCw size={16} /> Tekrar dene
          </Button>
        </div>
      ) : (
        <>
          <section className="mb-8 border-y border-border py-5 flex flex-wrap justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">Kullanım özeti</h2>
              <p className="text-sm text-muted-foreground">
                Kullanım dönemi başlangıcı: {formatUsagePeriodUtc(data.period.start) ?? 'Bilgi alınamadı'}
              </p>
              <p className="text-sm text-muted-foreground">
                Kullanım dönemi sonu: {formatUsagePeriodUtc(data.period.end) ?? 'Bilgi alınamadı'}
              </p>
              <p className="text-xs text-muted-foreground">
                Kullanım sayaçları UTC takvim ayına göre hesaplanır; aboneliğinizin bitiş tarihi farklı olabilir.
              </p>
            </div>
            <p className="max-w-full break-words text-sm text-foreground dark:text-muted-foreground">
              Plan: {data.plan === 'unavailable' ? 'Belirtilmedi' : data.plan}
            </p>
          </section>

          <div className="space-y-6">
            {data.usage.map((stat) => {
              const view = usageDisplay(stat);
              return (
                <section
                  key={stat.feature}
                  className="border-b border-border pb-5 space-y-3"
                  aria-label={usageLabels[stat.feature] ?? stat.feature}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-medium break-words">
                      {usageLabels[stat.feature] ?? stat.feature.replaceAll('_', ' ')}
                    </h3>
                    <span className="text-sm tabular-nums">
                      {stat.current.toLocaleString('tr-TR')} / {view.limitLabel}
                    </span>
                  </div>
                  {view.percentage !== null && (
                    <progress
                      aria-label={`${usageLabels[stat.feature] ?? stat.feature} kullanımı`}
                      max={100}
                      value={view.percentage}
                      className="block h-2 w-full accent-emerald-500"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {stat.enforced ? 'Paketinize dahil aylık hak' : 'Bilgilendirme; bu limit uygulanmıyor'}
                    {usageHints[stat.feature] ? ` · ${usageHints[stat.feature]}` : ''}
                  </p>
                  {view.alert && (
                    <p role="status" className="flex items-start gap-2 text-sm text-amber-300">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      {view.alert === 'unavailable'
                        ? 'Kullanım izni yok. Abonelik ve plan durumunuzu yöneticinizle kontrol edin.'
                        : view.alert === 'exhausted'
                          ? 'Kota doldu. Bu dönem yeni teklif oluşturulamıyor.'
                          : `Kota kullanımınız %${Math.floor(view.percentage!)} seviyesinde.`}
                    </p>
                  )}
                </section>
              );
            })}
          </div>


          {/* Paket Seçimi ve Yükseltme Kataloğu */}
          {plans.length > 0 && (
            <section className="py-8 border-b border-border space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-400" />
                    Abonelik Paketleri & Kota Yükseltme
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    İhtiyacınıza uygun paketi ve ödeme periyodunu seçip Banka Havalesi / EFT ile ödeme bildirimi gönderebilirsiniz.
                  </p>
                </div>

                {/* Ödeme Periyodu Seçici (Aylık %0 / 6 Aylık %10 / 1 Yıllık %20 / 2 Yıllık %30) */}
                <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5" role="tablist" aria-label="Faturalama dönemi">
                  {BILLING_PERIOD_OPTIONS.map((option) => {
                    const active = billingCycle === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setBillingCycle(option.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                          active
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-white hover:bg-surface-elevated'
                        }`}
                      >
                        <span>{option.label}</span>
                        {option.badge && (
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {option.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {plans.map((plan) => {
                  const isCurrentPlan = data.plan === plan.name;
                  const isSelectedForTransfer = (activeOrder?.planId || selectedPlanId) === plan.id;
                  const isFree = plan.monthlyPrice === 0;
                  const planPricing = calculateBillingPeriodPricing(plan.monthlyPrice, billingCycle);

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                        isCurrentPlan
                          ? 'border-emerald-500/50 bg-emerald-950/20'
                          : isSelectedForTransfer
                            ? 'border-indigo-500 bg-indigo-950/25 ring-1 ring-indigo-500/40'
                            : 'border-border bg-card hover:border-border'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-bold text-foreground leading-snug">{plan.name}</h3>
                          {isCurrentPlan ? (
                            <span className="shrink-0 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              Aktif Paket
                            </span>
                          ) : plan.marketingBadge ? (
                            <span className="shrink-0 rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                              {plan.marketingBadge}
                            </span>
                          ) : null}
                        </div>

                        <div className="my-3">
                          {isFree ? (
                            <span className="text-xl font-black text-emerald-400">0 ₺ (14 Gün)</span>
                          ) : (
                            <div>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                {planPricing.discountPercent > 0 && (
                                  <span className="text-xs font-mono text-muted-foreground line-through tabular-nums">
                                    ₺{planPricing.baseMonthlyPriceTry.toLocaleString('tr-TR')}
                                  </span>
                                )}
                                <span className="text-xl font-black text-foreground tabular-nums">
                                  ₺{planPricing.effectiveMonthlyPriceTry.toLocaleString('tr-TR')}
                                </span>
                                <span className="text-xs text-muted-foreground">/ ay + KDV</span>
                              </div>
                              {planPricing.months > 1 && (
                                <p className="mt-1 text-[11px] font-mono text-emerald-300">
                                  {planPricing.label}: <strong>₺{planPricing.totalPayableTry.toLocaleString('tr-TR')}</strong>{' '}
                                  <span className="text-muted-foreground">(-₺{planPricing.discountAmountTry.toLocaleString('tr-TR')})</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <ul className="space-y-1.5 text-xs text-foreground dark:text-muted-foreground border-t border-border pt-3">
                          <li>
                            •{' '}
                            <strong>
                              {plan.monthlyIfcLimit === null ? 'Özel' : `${plan.monthlyIfcLimit} Adet`}
                            </strong>{' '}
                            IFC / e-PYS Denetimi
                          </li>
                          <li>
                            • Maks. <strong>{Math.min(plan.ifcMaxFileMb, 100)} MB</strong> IFC Boyutu
                          </li>
                          <li>
                            •{' '}
                            {plan.monthlyQuoteLimit === 0 ? (
                              <span className="text-muted-foreground">Teklif Modülü Yok (Yalnız Denetim)</span>
                            ) : (
                              <>
                                <strong>{plan.monthlyQuoteLimit?.toLocaleString('tr-TR')} Adet</strong> Aylık Teklif
                              </>
                            )}
                          </li>
                          <li>
                            • <strong>{plan.ifcMaxConcurrent}</strong> Eşzamanlı İşlem Kuyruğu
                          </li>
                        </ul>
                      </div>

                      <div className="mt-4 pt-2">
                        {isCurrentPlan ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled
                            className="w-full text-xs border-emerald-500/30 text-emerald-300"
                          >
                            Mevcut Paketiniz
                          </Button>
                        ) : isFree ? (
                          <Button type="button" variant="outline" disabled className="w-full text-xs">
                            Kayıt Başlangıç Paketi
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={initializingOrder}
                            onClick={() => void handleSelectPlanForTransfer(plan.id)}
                            className={`w-full text-xs font-bold ${
                              isSelectedForTransfer
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-surface-elevated hover:bg-surface-elevated text-white'
                            }`}
                          >
                            {isSelectedForTransfer ? 'Seçili Paket (Havale Yap)' : 'Bu Pakete Geç (Havale/EFT)'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tahsilat: yalnız Havale/EFT canlı; kart/taksit altyapısı yok (denetim P0-4) */}
          <section className="py-8 border-b border-border space-y-6">
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Ödeme yöntemi: Banka havalesi / EFT.</strong>{' '}
              Kartla ödeme henüz yayında değildir; yayına alındığında burada duyurulacaktır.
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Landmark size={19} className="text-indigo-400" />
                  Banka Havalesi / EFT & Dekont Bildirimi
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Aşağıdaki kurumsal banka hesaplarımızdan birine sipariş referans kodunuzu açıklama kısmına yazarak EFT/Havale yapabilirsiniz.
                </p>
              </div>
              {activeOrder && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 flex items-center gap-3">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-amber-300">
                      Sipariş Referans Kodu (Açıklamaya Yazınız)
                    </span>
                    <span className="font-mono text-base font-black text-foreground">{activeOrder.referenceCode}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('ref', activeOrder.referenceCode, 'Sipariş referans kodu')}
                    className="border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 text-xs h-8"
                  >
                    {copiedKey === 'ref' ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                </div>
              )}
            </div>

            {/* Banka Hesap Kartları */}
            {bankAccounts.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                Doğrulanmış aktif banka hesabı bilgisi bulunamadı. Ödeme yapmadan önce yöneticiyle iletişime geçin. Daha önce ödeme yaptıysanız dekontunuzu destek ekibine iletin.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className={`rounded-xl border p-4 space-y-3 transition-all ${
                      selectedBankId === bank.id
                        ? 'border-indigo-500/50 bg-indigo-950/15'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-400" />
                        <h3 className="text-sm font-bold text-foreground">{bank.bankName}</h3>
                      </div>
                      <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                        {bank.currency} Hesabı
                      </span>
                    </div>

                    {bank.branchName && (
                      <p className="text-xs text-muted-foreground">
                        Şube: <span className="text-foreground">{bank.branchName}</span>
                      </p>
                    )}

                    <div className="rounded-lg border border-border bg-background p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-muted-foreground">Alıcı Ünvanı</span>
                        <span className="text-xs font-semibold text-foreground break-words">{bank.accountHolder}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(`holder-${bank.id}`, bank.accountHolder, 'Alıcı ünvanı')}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {copiedKey === `holder-${bank.id}` ? <Check size={13} /> : <Copy size={13} />}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-background p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-muted-foreground">IBAN</span>
                        <span className="font-mono text-xs font-bold text-emerald-300 break-all">
                          {formatIbanDisplay(bank.iban)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(`iban-${bank.id}`, bank.iban, 'IBAN')}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {copiedKey === `iban-${bank.id}` ? <Check size={13} /> : <Copy size={13} />}
                      </Button>
                    </div>

                    {(bank.descriptionNote ?? bank.description) && (
                      <p className="text-[11px] text-muted-foreground">{bank.descriptionNote ?? bank.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Dekont / Havale Bildirim Formu */}
            {selectedPlanObj && selectedPlanObj.monthlyPrice > 0 ? (() => {
              const selectedPricing = calculateBillingPeriodPricing(selectedPlanObj.monthlyPrice, billingCycle);
              return (
                <form
                  onSubmit={handleSubmitNotification}
                  className="rounded-2xl border border-indigo-500/30 bg-indigo-950/10 p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Receipt size={16} className="text-indigo-400" />
                        Havale / EFT Dekont Bildirimi Gönder
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Seçili Paket: <strong className="text-foreground">{selectedPlanObj.name}</strong> ·{' '}
                        <strong className="text-emerald-300">
                          {selectedPricing.label} Toplam: ₺{selectedPricing.totalPayableTry.toLocaleString('tr-TR')}
                        </strong>{' '}
                        (Aylık Efektif: ₺{selectedPricing.effectiveMonthlyPriceTry.toLocaleString('tr-TR')}/ay
                        {selectedPricing.discountAmountTry > 0
                          ? ` · %${selectedPricing.discountPercent} İskonto ile ₺${selectedPricing.discountAmountTry.toLocaleString('tr-TR')} Kazanç`
                          : ''}
                        )
                      </p>
                    </div>
                    {activeOrder?.status === 'pending_approval' && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Clock size={13} /> Süper Admin Onayı Bekleniyor
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">
                        Gönderim Yapılan Banka
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      >
                        {!hasSelectedBankAccount(bankAccounts, selectedBankId) && <option value="">Banka hesabı seçin</option>}
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} ({b.currency})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">Faturalama Dönemi & İskonto</label>
                      <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(normalizeBillingCycle(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      >
                        {BILLING_PERIOD_OPTIONS.map((opt) => {
                          const p = calculateBillingPeriodPricing(selectedPlanObj.monthlyPrice, opt.id);
                          return (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} ({opt.discountPercent > 0 ? `%${opt.discountPercent} İndirim · ` : ''}
                              ₺{p.effectiveMonthlyPriceTry.toLocaleString('tr-TR')}/ay → Toplam ₺{p.totalPayableTry.toLocaleString('tr-TR')})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="billing-sender-name" className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">
                        Gönderen Ad Soyad / Firma Ünvanı *
                      </label>
                      <input
                        id="billing-sender-name"
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Örn: Drone Mühendislik Ltd. Şti."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-transfer-reference" className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">
                        Dekont / İşlem Referans No *
                      </label>
                      <input
                        id="billing-transfer-reference"
                        type="text"
                        required
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        placeholder="Banka dekont / sorgu numarası"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-tax-office" className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">Fatura Vergi Dairesi</label>
                      <input
                        id="billing-tax-office"
                        type="text"
                        value={taxOffice}
                        onChange={(e) => setTaxOffice(e.target.value)}
                        placeholder="Örn: Kadıköy V.D."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-tax-number" className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">
                        Vergi Kimlik No (VKN / TCKN)
                      </label>
                      <input
                        id="billing-tax-number"
                        type="text"
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        placeholder="10 veya 11 haneli numara"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="billing-notes" className="block text-xs font-medium text-foreground dark:text-muted-foreground mb-1">Ek Not / Açıklama</label>
                    <input
                      id="billing-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Varsa ödeme veya fatura ile ilgili notunuz..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submittingPayment || !hasSelectedBankAccount(bankAccounts, selectedBankId)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2"
                    >
                      <Send size={14} />
                      {submittingPayment
                        ? 'Gönderiliyor...'
                        : `Ödeme Bildirimini Gönder (₺${selectedPricing.totalPayableTry.toLocaleString('tr-TR')} · Süper Admin Onayına İlet)`}
                    </Button>
                  </div>
                </form>
              );
            })() : (
              <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                Havale / EFT bildirimi göndermek için yukarıdaki ücretli paketlerden birini (<strong>Bu Pakete Geç</strong>) seçin.
              </div>
            )}

            {/* Ödeme Bildirim Geçmişi */}
            {paymentRequests.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-foreground">Sipariş & Ödeme Bildirimi Geçmişi</h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-card text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3">Referans Kodu</th>
                        <th className="p-3">Paket</th>
                        <th className="p-3">Tutar & Periyot</th>
                        <th className="p-3">Gönderen / Dekont</th>
                        <th className="p-3">Durum</th>
                        <th className="p-3">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground dark:text-muted-foreground">
                      {paymentRequests.map((req) => (
                        <tr key={req.requestId}>
                          <td className="p-3 font-mono font-bold text-amber-300">{req.referenceCode}</td>
                          <td className="p-3 font-medium text-foreground">{req.planName}</td>
                          <td className="p-3 tabular-nums">
                            ₺{req.amountTry.toLocaleString('tr-TR')} ({formatBillingCycleLabel(req.billingCycle)})
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {req.senderName || '—'}
                            {(req.receiptNumber ?? req.transferReference) && (
                              <span className="block text-[10px] font-mono text-muted-foreground">
                                Dekont: {req.receiptNumber ?? req.transferReference}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {req.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                <CheckCircle2 size={11} /> Onaylandı & Aktif
                              </span>
                            ) : req.status === 'pending_approval' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                <Clock size={11} /> Onay Bekliyor
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
                                <XCircle size={11} /> Reddedildi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-surface-elevated border border-border px-2 py-0.5 text-[10px] font-bold text-foreground dark:text-muted-foreground">
                                Havale Bekleniyor
                              </span>
                            )}
                            {(req.adminDecisionNote ?? req.adminNote) && (
                              <span className="block text-[10px] text-muted-foreground mt-1">
                                {req.adminDecisionNote ?? req.adminNote}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(req.updatedAt).toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </PageContainer>
  );
}
