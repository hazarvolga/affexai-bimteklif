import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  EyeOff,
  Landmark,
  Package,
  Plus,
  Power,
  Receipt,
  Save,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { adminPlansSchema, readAdminResponse } from './admin-data';
import {
  formatBillingCycleLabel,
  type BillingCycleId,
} from '../../services/billing/billing-periods';

interface BankAccountFormItem {
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

interface AdminPaymentRequest {
  requestId: string;
  referenceCode: string;
  companyId: string;
  companyName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amountTry: number;
  billingCycle: BillingCycleId;
  status: 'awaiting_transfer' | 'pending_approval' | 'approved' | 'rejected';
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

export function PlansList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Deactivate / Subscriber Migration Modal State
  const [deactivatingPlan, setDeactivatingPlan] = useState<any>(null);
  const [deactivateMode, setDeactivateMode] = useState<'hide_only' | 'deactivate_and_migrate'>('deactivate_and_migrate');
  const [replacementPlanId, setReplacementPlanId] = useState<string>('');
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<BankAccountFormItem[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [savingBanks, setSavingBanks] = useState(false);

  // Payment Requests State
  const [paymentRequests, setPaymentRequests] = useState<AdminPaymentRequest[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadPlans = () => {
    setLoading(true);
    setError(null);
    fetchWithAuth('/api/admin/plans')
      .then((res) => readAdminResponse(res, adminPlansSchema))
      .then(setPlans)
      .catch(() => {
        setPlans([]);
        setError('Paketler yüklenemedi. Yetkinizi ve bağlantınızı kontrol edip tekrar deneyin.');
      })
      .finally(() => setLoading(false));
  };

  const loadBankAccounts = async () => {
    setLoadingBanks(true);
    try {
      const res = await fetchWithAuth('/api/admin/billing/bank-accounts');
      if (res.ok) {
        const body = await res.json();
        const rawList = Array.isArray(body) ? body : Array.isArray(body?.accounts) ? body.accounts : [];
        setBankAccounts(
          rawList.map((item: any) => ({
            ...item,
            description: item.descriptionNote ?? item.description ?? null,
            descriptionNote: item.descriptionNote ?? item.description ?? null,
          })),
        );
      }
    } catch {
      // ignore
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadPaymentRequests = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetchWithAuth('/api/admin/billing/payment-requests');
      if (res.ok) {
        const body = await res.json();
        const rawList = Array.isArray(body) ? body : Array.isArray(body?.requests) ? body.requests : [];
        setPaymentRequests(
          rawList.map((item: any) => ({
            ...item,
            transferReference: item.receiptNumber ?? item.transferReference ?? null,
            adminNote: item.adminDecisionNote ?? item.adminNote ?? null,
          })),
        );
      }
    } catch {
      // ignore
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadPlans();
    void loadBankAccounts();
    void loadPaymentRequests();
  }, []);

  const openPlanEditor = (plan?: any) => {
    if (plan?.id) {
      navigate(`/admin/plans/${plan.id}`);
    } else {
      navigate('/admin/plans/new');
    }
  };

  const openDeactivateModal = (plan: any) => {
    const alternativePlans = plans.filter((p) => p.isActive && p.id !== plan.id);
    setDeactivatingPlan(plan);
    setDeactivateMode('deactivate_and_migrate');
    setReplacementPlanId(alternativePlans[0]?.id ?? '');
  };

  const handleQuickActivate = async (plan: any) => {
    setTogglingPlanId(plan.id);
    try {
      const res = await fetchWithAuth(`/api/admin/plans/${plan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true, isPublished: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Paket aktif edilemedi.');
        return;
      }
      toast.success(`"${plan.name}" paketi aktif edildi ve vitrinde yayına alındı.`);
      loadPlans();
    } catch {
      toast.error('Sistemsel bir hata oluştu.');
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingPlan) return;
    const subCount = deactivatingPlan.subscriberCount ?? 0;

    if (deactivateMode === 'hide_only') {
      setTogglingPlanId(deactivatingPlan.id);
      try {
        const res = await fetchWithAuth(`/api/admin/plans/${deactivatingPlan.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isPublished: false, isActive: true }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body.error || 'Paket vitrinden gizlenemedi.');
          return;
        }
        toast.success(
          `"${deactivatingPlan.name}" yeni satışa kapatıldı. Mevcut ${subCount} firma paketlerini kullanmaya devam edebilir.`,
        );
        setDeactivatingPlan(null);
        loadPlans();
      } catch {
        toast.error('Sistemsel bir hata oluştu.');
      } finally {
        setTogglingPlanId(null);
      }
      return;
    }

    if (subCount > 0 && !replacementPlanId) {
      toast.error('Mevcut müşterilerin aktarılacağı alternatif bir aktif paket seçmelisiniz.');
      return;
    }

    setTogglingPlanId(deactivatingPlan.id);
    try {
      const payload: Record<string, unknown> = {
        isActive: false,
        isPublished: false,
      };
      if (replacementPlanId) {
        payload.replacementPlanId = replacementPlanId;
      }

      const res = await fetchWithAuth(`/api/admin/plans/${deactivatingPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Paket pasife alınamadı.');
        return;
      }

      const migratedCount = typeof body.migratedCount === 'number' ? body.migratedCount : subCount;
      const targetPlanName = plans.find((p) => p.id === replacementPlanId)?.name;
      if (migratedCount > 0 && targetPlanName) {
        toast.success(
          `"${deactivatingPlan.name}" pasife alındı ve ${migratedCount} firma "${targetPlanName}" paketine kesintisiz aktarıldı.`,
        );
      } else {
        toast.success(`"${deactivatingPlan.name}" paketi pasife alındı.`);
      }
      setDeactivatingPlan(null);
      loadPlans();
    } catch {
      toast.error('Sistemsel bir hata oluştu.');
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleAddBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        id: `bank-${Date.now()}`,
        bankName: '',
        branchName: '',
        accountHolder: 'BIMPlan Mühendislik ve Teknoloji A.Ş.',
        iban: 'TR',
        currency: 'TRY',
        description: 'Açıklama kısmına Sipariş Referans Kodunuzu yazınız.',
        descriptionNote: 'Açıklama kısmına Sipariş Referans Kodunuzu yazınız.',
        isActive: true,
      },
    ]);
  };

  const handleUpdateBankField = <K extends keyof BankAccountFormItem>(
    index: number,
    field: K,
    value: BankAccountFormItem[K],
  ) => {
    setBankAccounts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleRemoveBankAccount = (index: number) => {
    if (bankAccounts.length <= 1) {
      toast.error('En az bir banka hesabı bulunmalıdır.');
      return;
    }
    setBankAccounts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveBankAccounts = async () => {
    setSavingBanks(true);
    try {
      const payloadAccounts = bankAccounts.map((acc) => ({
        ...acc,
        descriptionNote: acc.description ?? acc.descriptionNote ?? null,
      }));
      const res = await fetchWithAuth('/api/admin/billing/bank-accounts', {
        method: 'PUT',
        body: JSON.stringify({ accounts: payloadAccounts }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Banka hesapları kaydedilemedi.');
      }
      const savedList = Array.isArray(body) ? body : Array.isArray(body?.accounts) ? body.accounts : null;
      if (savedList) {
        setBankAccounts(
          savedList.map((item: any) => ({
            ...item,
            description: item.descriptionNote ?? item.description ?? null,
            descriptionNote: item.descriptionNote ?? item.description ?? null,
          })),
        );
      }
      toast.success('Banka hesap bilgileri kaydedildi ve tüm müşteriler için güncellendi.');
    } catch (err: any) {
      toast.error(err.message || 'Banka hesapları güncellenirken hata oluştu.');
    } finally {
      setSavingBanks(false);
    }
  };

  const handleReviewPayment = async (requestId: string, decision: 'approved' | 'rejected') => {
    setReviewingId(requestId);
    try {
      const res = await fetchWithAuth(`/api/admin/billing/payment-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          adminNote:
            decision === 'approved'
              ? 'Havale / EFT ödemesi onaylandı ve paket kotaları aktif edildi.'
              : 'Havale / EFT ödemesi doğrulanamadı.',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Ödeme durumu güncellenemedi.');
      }
      toast.success(
        decision === 'approved'
          ? 'Ödeme onaylandı! Firmanın paketi ve SmartCheck kotaları aktif edildi.'
          : 'Ödeme bildirimi reddedildi.',
      );
      await loadPaymentRequests();
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız oldu.');
    } finally {
      setReviewingId(null);
    }
  };

  const [syncingCatalog, setSyncingCatalog] = useState(false);

  const handleSyncCatalog = async () => {
    setSyncingCatalog(true);
    try {
      const res = await fetchWithAuth('/api/admin/plans/sync-catalog', {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Standart paket kataloğu senkronize edilemedi.');
      }
      toast.success('5 standart paket güncel fiyat ve sunucu kotalarıyla senkronize edildi.');
      await loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Katalog senkronizasyonu başarısız oldu.');
    } finally {
      setSyncingCatalog(false);
    }
  };

  const pendingPaymentsCount = paymentRequests.filter(
    (r) => r.status === 'pending_approval' || r.status === 'awaiting_transfer',
  ).length;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Paket, Havale/EFT & Banka Hesap Yönetimi"
          description="SaaS abonelik paketlerini, müşterilere gösterilen çoklu IBAN hesaplarını ve gelen Havale/EFT dekont bildirimlerini yönetin."
          icon={Package}
        />
        <div className="flex items-center gap-2 mt-2">
          <Button
            onClick={() => void handleSyncCatalog()}
            disabled={syncingCatalog}
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
          >
            <ArrowRightLeft size={15} className="mr-2" />
            {syncingCatalog ? 'Eşitleniyor...' : 'Standart Katalogla Eşitle'}
          </Button>
          <Button onClick={() => openPlanEditor()} className="bg-indigo-600 text-white hover:bg-indigo-700">
            <Plus size={16} className="mr-2" /> Yeni Paket Ekle
          </Button>
        </div>
      </div>

      {/* 1. ABONELİK PAKETLERİ */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-4">
        {loading ? (
          <div className="text-muted-foreground">Yükleniyor...</div>
        ) : error ? (
          <div role="alert" className="col-span-full rounded-xl border border-red-500/30 p-5 text-red-300">
            <p>{error}</p>
            <Button onClick={loadPlans} variant="outline" className="mt-3">
              Tekrar dene
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div role="status" className="col-span-full rounded-xl border border-border p-5 text-foreground dark:text-muted-foreground">
            Henüz paket tanımlanmamış. Paket ekleyin veya platform yöneticisinden başlangıç kataloğunu yüklemesini isteyin.
          </div>
        ) : (
          plans.map((plan) => {
            const subCount = plan.subscriberCount ?? 0;
            const subscribers: Array<{ companyId: string; companyName: string; status: string }> = Array.isArray(
              plan.subscribers,
            )
              ? plan.subscribers
              : [];

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                  plan.isActive ? 'border-border bg-card' : 'border-red-500/25 bg-red-950/10'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <Link
                      to={`/admin/plans/${plan.id}`}
                      className="text-base font-bold text-foreground hover:text-indigo-300 leading-tight transition-colors"
                    >
                      {plan.name}
                    </Link>
                    {!plan.isActive ? (
                      <span className="text-[10px] uppercase font-bold text-red-300 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded shrink-0">
                        Pasif
                      </span>
                    ) : plan.monthlyPrice === 0 ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20 shrink-0">
                        Trial
                      </span>
                    ) : plan.name.includes('Standart Denetçi') ? (
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20 shrink-0">
                        Mikro
                      </span>
                    ) : plan.name.includes('5D BIM') ? (
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded border border-indigo-400/20 shrink-0">
                        Popüler
                      </span>
                    ) : plan.name.includes('Kurumsal') ? (
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20 shrink-0">
                        Kurumsal
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Durum & Müşteri Rozetleri */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                        plan.isActive && plan.isPublished
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : plan.isActive && !plan.isPublished
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-surface-elevated text-muted-foreground border-border'
                      }`}
                    >
                      {plan.isActive && plan.isPublished
                        ? 'Vitrin: Yayında'
                        : plan.isActive && !plan.isPublished
                          ? 'Vitrin: Gizli (Mevcutlara Açık)'
                          : 'Satışa ve Kullanıma Kapalı'}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                        subCount > 0
                          ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30'
                          : 'bg-surface-elevated text-muted-foreground border-border'
                      }`}
                    >
                      <Users size={10} />
                      {subCount} Firma
                    </span>
                  </div>

                  <div className="mb-4 mt-2">
                    <div className="flex items-baseline gap-1">
                      {plan.monthlyPrice === 0 ? (
                        <span className="text-2xl font-black text-emerald-400">Ücretsiz</span>
                      ) : (
                        <>
                          <span className="text-2xl font-black text-foreground">₺{plan.monthlyPrice}</span>
                          <span className="text-muted-foreground text-xs">/ ay</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs text-foreground dark:text-muted-foreground">
                      {plan.monthlyQuoteLimit === 0 ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          <span className="text-muted-foreground">Teklif Modülü Dahil Değil</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>
                            <strong className="text-foreground">
                              {`${plan.monthlyQuoteLimit.toLocaleString('tr-TR')} Adet`}
                            </strong>{' '}
                            Teklif Kotası
                          </span>
                        </>
                      )}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-foreground dark:text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>
                        <strong className="text-foreground">
                          {plan.monthlyIfcLimit === null ? 'Paket limiti tanımsız' : `${plan.monthlyIfcLimit} Adet`}
                        </strong>{' '}
                        {plan.monthlyQuoteLimit === 0 ? 'İsimlendirme Denetimi' : 'IFC Analizi'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-foreground dark:text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>
                        Maks <strong className="text-foreground">{Math.min(plan.ifcMaxFileMb, 100)} MB</strong> Dosya
                        {plan.ifcMaxFileMb > 100 && (
                          <span className="text-amber-400">
                            {' '}
                            (kayıt {plan.ifcMaxFileMb} MB; sunucu tavanı uygulanır)
                          </span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-foreground dark:text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>
                        <strong className="text-foreground">{plan.ifcMaxConcurrent ?? 1}</strong> Eşzamanlı İş
                      </span>
                    </li>
                  </ul>

                  {/* Bu paketi kullanan firmalar özeti */}
                  {subCount > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Bu Paketteki Firmalar:</p>
                      <div className="flex flex-wrap gap-1">
                        {subscribers.slice(0, 3).map((sub) => (
                          <Link
                            key={sub.companyId}
                            to={`/admin/tenants/${sub.companyId}`}
                            className="inline-flex items-center rounded bg-surface-elevated hover:bg-zinc-700 px-1.5 py-0.5 text-[10px] text-indigo-300 font-medium truncate max-w-[120px]"
                            title={sub.companyName}
                          >
                            {sub.companyName}
                          </Link>
                        ))}
                        {subscribers.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                            +{subscribers.length - 3} firma
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => openPlanEditor(plan)}
                    variant="outline"
                    className="flex-1 border-border bg-transparent text-foreground hover:bg-zinc-800 text-xs py-1.5 h-8"
                  >
                    Detaylı Düzenle
                  </Button>
                  {plan.isActive && !plan.isPublished && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={togglingPlanId === plan.id}
                      onClick={() => void handleQuickActivate(plan)}
                      className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-xs py-1.5 h-8 px-2.5 font-semibold"
                      title="Paketi vitrinde (/pricing ve /register) tekrar yayına al"
                    >
                      <Power size={12} className="mr-1" />
                      {togglingPlanId === plan.id ? 'Açılıyor...' : 'Vitrine Aç'}
                    </Button>
                  )}
                  {plan.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={togglingPlanId === plan.id}
                      onClick={() => openDeactivateModal(plan)}
                      className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs py-1.5 h-8 px-2.5"
                      title="Paketi pasife al veya mevcut müşterileri başka pakete aktar"
                    >
                      <Power size={12} className="mr-1" />
                      Pasife Al
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={togglingPlanId === plan.id}
                      onClick={() => void handleQuickActivate(plan)}
                      className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-xs py-1.5 h-8 px-2.5 font-semibold"
                    >
                      <Power size={12} className="mr-1" />
                      {togglingPlanId === plan.id ? 'Açılıyor...' : 'Aktif Et'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. BEKLEYEN HAVALE / EFT ÖDEME BİLDİRİMLERİ */}
      <section className="mt-10 rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt size={18} className="text-amber-400" />
              Havale / EFT Ödeme Bildirimleri & Paket Aktivasyonu
              {pendingPaymentsCount > 0 && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                  {pendingPaymentsCount} Bekleyen
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kayıt sırasında veya çalışma alanından ücretli paket seçip dekont bildiren firmaları tek tıkla onaylayarak paketlerini aktif edin.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadPaymentRequests()} className="text-xs">
            Listeyi Yenile
          </Button>
        </div>

        {loadingPayments ? (
          <p className="text-xs text-muted-foreground">Ödeme bildirimleri yükleniyor...</p>
        ) : paymentRequests.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
            Henüz oluşturulmuş bir Havale / EFT sipariş veya dekont bildirimi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Referans Kodu</th>
                  <th className="p-3">Firma / Kullanıcı</th>
                  <th className="p-3">Talep Edilen Paket</th>
                  <th className="p-3">Tutar</th>
                  <th className="p-3">Gönderen & Dekont Bilgisi</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground dark:text-muted-foreground">
                {paymentRequests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-zinc-900/40">
                    <td className="p-3 font-mono font-bold text-amber-300">{req.referenceCode}</td>
                    <td className="p-3">
                      <Link
                        to={`/admin/tenants/${req.companyId}`}
                        className="font-bold text-indigo-300 hover:underline flex items-center gap-1"
                      >
                        <Building2 size={13} />
                        {req.companyName}
                      </Link>
                      <span className="block text-[11px] text-muted-foreground">{req.userEmail}</span>
                    </td>
                    <td className="p-3 font-semibold text-foreground">{req.planName}</td>
                    <td className="p-3 tabular-nums font-bold text-emerald-300">
                      ₺{req.amountTry.toLocaleString('tr-TR')}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({formatBillingCycleLabel(req.billingCycle)})
                      </span>
                    </td>
                    <td className="p-3 text-foreground dark:text-muted-foreground">
                      {req.senderName ? (
                        <div>
                          <span className="font-semibold text-foreground">{req.senderName}</span>
                          {req.bankName && <span className="text-muted-foreground"> · {req.bankName}</span>}
                          {req.transferReference && (
                            <span className="block text-[11px] font-mono text-amber-200">
                              Dekont No: {req.transferReference}
                            </span>
                          )}
                          {(req.taxOffice || req.taxNumber) && (
                            <span className="block text-[10px] text-muted-foreground">
                              VD: {req.taxOffice || '—'} / VKN: {req.taxNumber || '—'}
                            </span>
                          )}
                          {req.notes && <span className="block text-[10px] text-muted-foreground italic">"{req.notes}"</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Henüz dekont formu doldurulmadı</span>
                      )}
                    </td>
                    <td className="p-3">
                      {req.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 size={11} /> Onaylandı & Aktif
                        </span>
                      ) : req.status === 'pending_approval' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <Clock size={11} /> Dekont Geldi (Onay Bekliyor)
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
                      <span className="block text-[10px] text-muted-foreground mt-1">
                        {new Date(req.updatedAt).toLocaleString('tr-TR')}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {req.status !== 'approved' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={reviewingId === req.requestId}
                            onClick={() => void handleReviewPayment(req.requestId, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold h-8 px-3"
                          >
                            Ödemeyi Onayla & Paketi Aktif Et
                          </Button>
                          {req.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={reviewingId === req.requestId}
                              onClick={() => void handleReviewPayment(req.requestId, 'rejected')}
                              className="border-red-500/30 text-red-300 hover:bg-red-500/10 text-[11px] h-8 px-2.5"
                            >
                              Reddet
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold">Paket Aktif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. ÇOKLU BANKA HESAPLARI YÖNETİMİ (SÜPER ADMİN) */}
      <section className="mt-8 rounded-2xl border border-indigo-500/25 bg-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Landmark size={18} className="text-indigo-400" />
              Banka Hesapları Yönetimi (Havale / EFT IBAN Listesi)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kayıt ve Faturalandırma ekranlarında müşterilere gösterilen Banka Adı, Alıcı Ünvanı ve IBAN bilgilerini buradan dilediğiniz zaman değiştirebilir, birden fazla banka ekleyebilirsiniz.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBankAccount}
              className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs"
            >
              <Plus size={14} className="mr-1.5" /> Yeni Banka Hesabı Ekle
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingBanks}
              onClick={() => void handleSaveBankAccounts()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              <Save size={14} className="mr-1.5" />
              {savingBanks ? 'Kaydediliyor...' : 'Banka Hesaplarını Kaydet'}
            </Button>
          </div>
        </div>

        {loadingBanks ? (
          <p className="text-xs text-muted-foreground">Banka hesapları yükleniyor...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bankAccounts.map((acc, idx) => (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  acc.isActive ? 'border-border bg-background' : 'border-red-500/20 bg-red-950/10 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                      Hesap #{idx + 1}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acc.isActive}
                        onChange={(e) => handleUpdateBankField(idx, 'isActive', e.target.checked)}
                        className="rounded border-border bg-card text-indigo-600"
                      />
                      Aktif (Müşterilere Göster)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBankAccount(idx)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                    title="Banka hesabını sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Banka Adı *</label>
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => handleUpdateBankField(idx, 'bankName', e.target.value)}
                      placeholder="Örn: Garanti BBVA / İş Bankası"
                      className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Para Birimi</label>
                    <select
                      value={acc.currency}
                      onChange={(e) =>
                        handleUpdateBankField(idx, 'currency', e.target.value as 'TRY' | 'USD' | 'EUR')
                      }
                      className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                    >
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Alıcı Resmi Ünvanı *
                    </label>
                    <input
                      type="text"
                      value={acc.accountHolder}
                      onChange={(e) => handleUpdateBankField(idx, 'accountHolder', e.target.value)}
                      placeholder="Örn: BIMPlan Mühendislik A.Ş."
                      className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Şube Adı / Kodu</label>
                    <input
                      type="text"
                      value={acc.branchName ?? ''}
                      onChange={(e) => handleUpdateBankField(idx, 'branchName', e.target.value || null)}
                      placeholder="Örn: Kurumsal / 0412"
                      className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">IBAN *</label>
                  <input
                    type="text"
                    value={acc.iban}
                    onChange={(e) => handleUpdateBankField(idx, 'iban', e.target.value)}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className="w-full rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Müşteriye Gösterilecek Not / Açıklama
                  </label>
                  <input
                    type="text"
                    value={acc.description ?? ''}
                    onChange={(e) => handleUpdateBankField(idx, 'description', e.target.value || null)}
                    placeholder="Örn: Açıklama kısmına Sipariş Referans Kodunuzu yazınız."
                    className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground dark:text-muted-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PAKETİ PASİFE AL & MEVCUT MÜŞTERİLERİ AKTARMA MODALI */}
      {deactivatingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-background border border-border p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 mb-2">
                  <AlertTriangle size={12} /> Paket Durumu & Abone Yönetimi
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  "{deactivatingPlan.name}" Paketini Pasife Al
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu paketi yeni satışa kapatabilir veya tamamen pasife alarak mevcut müşterileri alternatif bir pakete kesintisiz aktarabilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeactivatingPlan(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mevcut Aboneler Özeti */}
            <div className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground dark:text-muted-foreground flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-400" />
                  Bu Paketi Kullanan Firma Sayısı:
                </span>
                <span className="font-bold text-foreground">
                  {deactivatingPlan.subscriberCount ?? 0} Firma
                </span>
              </div>
              {Array.isArray(deactivatingPlan.subscribers) && deactivatingPlan.subscribers.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-border flex flex-wrap gap-1.5">
                  {deactivatingPlan.subscribers.map((sub: any) => (
                    <span
                      key={sub.companyId}
                      className="inline-flex items-center gap-1 rounded bg-surface-elevated px-2 py-0.5 text-[11px] text-indigo-200 font-medium"
                    >
                      <Building2 size={11} className="text-indigo-400" />
                      {sub.companyName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* İki Kurgusal Seçenek */}
            <div className="space-y-3">
              <label
                onClick={() => setDeactivateMode('deactivate_and_migrate')}
                className={`block cursor-pointer rounded-xl border p-3.5 transition-all ${
                  deactivateMode === 'deactivate_and_migrate'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-border bg-card hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="deactivateMode"
                    checked={deactivateMode === 'deactivate_and_migrate'}
                    onChange={() => setDeactivateMode('deactivate_and_migrate')}
                    className="mt-0.5 text-amber-500"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ArrowRightLeft size={13} className="text-amber-400" />
                      Paketi Tamamen Pasife Al {(deactivatingPlan.subscriberCount ?? 0) > 0 ? '& Müşterileri Alternatif Pakete Taşı' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Paket tamamen kullanım dışı bırakılır (`isActive: false`) ve vitrinden kaldırılır.{' '}
                      {(deactivatingPlan.subscriberCount ?? 0) > 0
                        ? 'Mevcut firmalar seçtiğiniz alternatif aktif pakete otomatik olarak aktarılır; hiçbir müşteri hizmet kesintisi yaşamaz.'
                        : 'Bu pakete bağlı müşteri bulunmadığı için doğrudan pasife alınır.'}
                    </p>

                    {deactivateMode === 'deactivate_and_migrate' &&
                      (deactivatingPlan.subscriberCount ?? 0) > 0 && (
                        <div className="mt-3 pt-3 border-t border-amber-500/20">
                          <label className="block text-[11px] font-bold text-amber-200 mb-1.5">
                            Mevcut {deactivatingPlan.subscriberCount} Firmanın Aktarılacağı Alternatif Paket *
                          </label>
                          <select
                            value={replacementPlanId}
                            onChange={(e) => setReplacementPlanId(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                          >
                            <option value="">-- Alternatif Aktif Paket Seçin --</option>
                            {plans
                              .filter((p) => p.isActive && p.id !== deactivatingPlan.id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {p.monthlyPrice === 0 ? 'Ücretsiz' : `₺${p.monthlyPrice}/ay`} (
                                  {p.monthlyIfcLimit ?? 0} IFC / {p.monthlyQuoteLimit ?? 0} Teklif)
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                  </div>
                </div>
              </label>

              {deactivatingPlan.isPublished && (
                <label
                  onClick={() => setDeactivateMode('hide_only')}
                  className={`block cursor-pointer rounded-xl border p-3.5 transition-all ${
                    deactivateMode === 'hide_only'
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-border bg-card hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="deactivateMode"
                      checked={deactivateMode === 'hide_only'}
                      onChange={() => setDeactivateMode('hide_only')}
                      className="mt-0.5 text-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <EyeOff size={13} className="text-indigo-400" />
                        Sadece Yeni Satışa Kapat (Mevcut Müşteriler Aynen Devam Etsin)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Paket kayıt ve fiyatlandırma sayfasından gizlenir (`isPublished: false`), ancak mevcut{' '}
                        {deactivatingPlan.subscriberCount ?? 0} firma kendi paket kotalarını kullanmaya devam eder.
                      </p>
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setDeactivatingPlan(null)} className="text-xs">
                Vazgeç
              </Button>
              <Button
                type="button"
                disabled={
                  togglingPlanId === deactivatingPlan.id ||
                  (deactivateMode === 'deactivate_and_migrate' &&
                    (deactivatingPlan.subscriberCount ?? 0) > 0 &&
                    !replacementPlanId)
                }
                onClick={() => void handleConfirmDeactivate()}
                className={
                  deactivateMode === 'hide_only'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold'
                    : 'bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold'
                }
              >
                {togglingPlanId === deactivatingPlan.id
                  ? 'İşleniyor...'
                  : deactivateMode === 'hide_only'
                    ? 'Yeni Satışa Kapat (Vitrinden Gizle)'
                    : (deactivatingPlan.subscriberCount ?? 0) > 0
                      ? `${deactivatingPlan.subscriberCount} Firmayı Taşı ve Paketi Pasife Al`
                      : 'Paketi Pasife Al'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
