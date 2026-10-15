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
import { UsageStat, usageDisplay, usageLabels } from './billing-usage';

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
  billingCycle: 'monthly' | 'yearly';
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
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
        body: JSON.stringify({ planId }),
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
    const targetPlanId = activeOrder?.planId || selectedPlanId;
    if (!targetPlanId) {
      toast.error('Lütfen önce geçiş yapmak istediğiniz paketi seçin.');
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
          requestId: activeOrder?.requestId,
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

  const cost = (value: number) =>
    Number.isFinite(value)
      ? `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
      : 'Belirtilmedi';

  const selectedPlanObj = plans.find((p) => p.id === (activeOrder?.planId || selectedPlanId));

  return (
    <PageContainer className="min-w-0 [&_*]:tracking-normal">
      <header className="mb-8 flex items-center gap-3">
        <CreditCard className="shrink-0 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-semibold">Faturalandırma, Paketler & Havale Bildirimi</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
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
          <section className="mb-8 border-y border-zinc-800 py-5 flex flex-wrap justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">Kullanım özeti</h2>
              <p className="text-sm text-zinc-400">
                Dönem başlangıcı: {new Date(data.period.start).toLocaleDateString('tr-TR', { timeZone: 'UTC' })} (UTC)
              </p>
            </div>
            <p className="max-w-full break-words text-sm text-zinc-300">
              Plan: {data.plan === 'unavailable' ? 'Belirtilmedi' : data.plan}
            </p>
          </section>

          <div className="space-y-6">
            {data.usage.map((stat) => {
              const view = usageDisplay(stat);
              return (
                <section
                  key={stat.feature}
                  className="border-b border-zinc-800 pb-5 space-y-3"
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
                  <p className="text-xs text-zinc-400">
                    {stat.enforced ? 'Uygulanan kota' : 'Bilgilendirme; bu limit uygulanmıyor'} · Tahmini işlem maliyeti:{' '}
                    {cost(stat.cost)}
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

          <section className="py-8 border-b border-zinc-800 space-y-2">
            <h2 className="text-lg font-medium">Tahmini işlem maliyeti</h2>
            <p className="text-xl tabular-nums">{cost(data.totalMonthlyCost)}</p>
            <p className="text-sm text-zinc-400">Bu tutar fatura veya kart tahsilatı değildir.</p>
          </section>

          {/* Paket Seçimi ve Yükseltme Kataloğu */}
          {plans.length > 0 && (
            <section className="py-8 border-b border-zinc-800 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-400" />
                  Abonelik Paketleri & Kota Yükseltme
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  İhtiyacınıza uygun paketi seçip Banka Havalesi / EFT ile ödeme bildirimi gönderebilirsiniz. Dekontunuz onaylandığında kotalarınız anında tanımlanır.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {plans.map((plan) => {
                  const isCurrentPlan = data.plan === plan.name;
                  const isSelectedForTransfer = (activeOrder?.planId || selectedPlanId) === plan.id;
                  const isFree = plan.monthlyPrice === 0;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                        isCurrentPlan
                          ? 'border-emerald-500/50 bg-emerald-950/20'
                          : isSelectedForTransfer
                            ? 'border-indigo-500 bg-indigo-950/25 ring-1 ring-indigo-500/40'
                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-bold text-white leading-snug">{plan.name}</h3>
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
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-white">
                                ₺{plan.monthlyPrice.toLocaleString('tr-TR')}
                              </span>
                              <span className="text-xs text-zinc-500">/ ay + KDV</span>
                            </div>
                          )}
                        </div>

                        <ul className="space-y-1.5 text-xs text-zinc-300 border-t border-zinc-800/80 pt-3">
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
                              <span className="text-zinc-500">Teklif Modülü Yok (Yalnız Denetim)</span>
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
                                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
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

          {/* Havale / EFT Ödeme Bilgileri ve Dekont Bildirim Formu */}
          <section className="py-8 border-b border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Landmark size={19} className="text-indigo-400" />
                  Banka Havalesi / EFT & Dekont Bildirimi
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Aşağıdaki kurumsal banka hesaplarımızdan birine sipariş referans kodunuzu açıklama kısmına yazarak EFT/Havale yapabilirsiniz.
                </p>
              </div>
              {activeOrder && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 flex items-center gap-3">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-amber-300">
                      Sipariş Referans Kodu (Açıklamaya Yazınız)
                    </span>
                    <span className="font-mono text-base font-black text-white">{activeOrder.referenceCode}</span>
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
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400">
                Aktif banka hesabı bilgisi bulunamadı. Lütfen yöneticiyle iletişime geçin.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className={`rounded-xl border p-4 space-y-3 transition-all ${
                      selectedBankId === bank.id
                        ? 'border-indigo-500/50 bg-indigo-950/15'
                        : 'border-zinc-800 bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">{bank.bankName}</h3>
                      </div>
                      <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                        {bank.currency} Hesabı
                      </span>
                    </div>

                    {bank.branchName && (
                      <p className="text-xs text-zinc-400">
                        Şube: <span className="text-zinc-200">{bank.branchName}</span>
                      </p>
                    )}

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-zinc-500">Alıcı Ünvanı</span>
                        <span className="text-xs font-semibold text-zinc-200 break-words">{bank.accountHolder}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(`holder-${bank.id}`, bank.accountHolder, 'Alıcı ünvanı')}
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-white shrink-0"
                      >
                        {copiedKey === `holder-${bank.id}` ? <Check size={13} /> : <Copy size={13} />}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-zinc-500">IBAN</span>
                        <span className="font-mono text-xs font-bold text-emerald-300 break-all">
                          {formatIbanDisplay(bank.iban)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(`iban-${bank.id}`, bank.iban, 'IBAN')}
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-white shrink-0"
                      >
                        {copiedKey === `iban-${bank.id}` ? <Check size={13} /> : <Copy size={13} />}
                      </Button>
                    </div>

                    {(bank.descriptionNote ?? bank.description) && (
                      <p className="text-[11px] text-zinc-400">{bank.descriptionNote ?? bank.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Dekont / Havale Bildirim Formu */}
            {selectedPlanObj && selectedPlanObj.monthlyPrice > 0 ? (
              <form
                onSubmit={handleSubmitNotification}
                className="rounded-2xl border border-indigo-500/30 bg-indigo-950/10 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt size={16} className="text-indigo-400" />
                      Havale / EFT Dekont Bildirimi Gönder
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Seçili Paket: <strong className="text-white">{selectedPlanObj.name}</strong> (
                      {billingCycle === 'yearly'
                        ? `₺${(selectedPlanObj.monthlyPrice * 10).toLocaleString('tr-TR')} / yıl — 2 ay bedava`
                        : `₺${selectedPlanObj.monthlyPrice.toLocaleString('tr-TR')} / ay`}
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
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Gönderim Yapılan Banka
                    </label>
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Faturalama Dönemi</label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                    >
                      <option value="monthly">
                        Aylık Abonelik (₺{selectedPlanObj.monthlyPrice.toLocaleString('tr-TR')} / ay)
                      </option>
                      <option value="yearly">
                        Yıllık Abonelik — 2 Ay Hediye (₺{(selectedPlanObj.monthlyPrice * 10).toLocaleString('tr-TR')} / yıl)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Gönderen Ad Soyad / Firma Ünvanı *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Örn: Drone Mühendislik Ltd. Şti."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Dekont / İşlem Referans No
                    </label>
                    <input
                      type="text"
                      value={transferReference}
                      onChange={(e) => setTransferReference(e.target.value)}
                      placeholder="Banka dekont / sorgu numarası"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Fatura Vergi Dairesi</label>
                    <input
                      type="text"
                      value={taxOffice}
                      onChange={(e) => setTaxOffice(e.target.value)}
                      placeholder="Örn: Kadıköy V.D."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Vergi Kimlik No (VKN / TCKN)
                    </label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="10 veya 11 haneli numara"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Ek Not / Açıklama</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Varsa ödeme veya fatura ile ilgili notunuz..."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={submittingPayment}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2"
                  >
                    <Send size={14} />
                    {submittingPayment
                      ? 'Gönderiliyor...'
                      : 'Ödeme Bildirimini Gönder (Süper Admin Onayına İlet)'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-400">
                Havale / EFT bildirimi göndermek için yukarıdaki ücretli paketlerden birini (<strong>Bu Pakete Geç</strong>) seçin.
              </div>
            )}

            {/* Ödeme Bildirim Geçmişi */}
            {paymentRequests.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-white">Sipariş & Ödeme Bildirimi Geçmişi</h3>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="p-3">Referans Kodu</th>
                        <th className="p-3">Paket</th>
                        <th className="p-3">Tutar</th>
                        <th className="p-3">Gönderen / Dekont</th>
                        <th className="p-3">Durum</th>
                        <th className="p-3">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {paymentRequests.map((req) => (
                        <tr key={req.requestId}>
                          <td className="p-3 font-mono font-bold text-amber-300">{req.referenceCode}</td>
                          <td className="p-3 font-medium text-white">{req.planName}</td>
                          <td className="p-3 tabular-nums">
                            ₺{req.amountTry.toLocaleString('tr-TR')} ({req.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'})
                          </td>
                          <td className="p-3 text-zinc-400">
                            {req.senderName || '—'}
                            {(req.receiptNumber ?? req.transferReference) && (
                              <span className="block text-[10px] font-mono text-zinc-500">
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
                              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                                Havale Bekleniyor
                              </span>
                            )}
                            {(req.adminDecisionNote ?? req.adminNote) && (
                              <span className="block text-[10px] text-zinc-400 mt-1">
                                {req.adminDecisionNote ?? req.adminNote}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-zinc-500">
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
