import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  Building2,
  CheckCircle2,
  Clock,
  Landmark,
  Package,
  Plus,
  Receipt,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { adminPlansSchema, readAdminResponse } from './admin-data';

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
  billingCycle: 'monthly' | 'yearly';
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
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [limit, setLimit] = useState(0);
  const [monthlyIfcLimit, setMonthlyIfcLimit] = useState(5);
  const [ifcMaxFileMb, setIfcMaxFileMb] = useState(100);
  const [ifcMaxConcurrent, setIfcMaxConcurrent] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [marketingBadge, setMarketingBadge] = useState('');
  const [marketingDescription, setMarketingDescription] = useState('');

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

  const openModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setName(plan.name);
      setPrice(plan.monthlyPrice);
      setLimit(plan.monthlyQuoteLimit);
      setMonthlyIfcLimit(plan.monthlyIfcLimit ?? 5);
      setIfcMaxFileMb(plan.ifcMaxFileMb ?? 100);
      setIfcMaxConcurrent(plan.ifcMaxConcurrent ?? 1);
      setIsActive(plan.isActive);
      setIsPublished(plan.isPublished);
      setIsFeatured(plan.isFeatured);
      setDisplayOrder(plan.displayOrder);
      setMarketingBadge(plan.marketingBadge ?? '');
      setMarketingDescription(plan.marketingDescription ?? '');
    } else {
      setEditingPlan(null);
      setName('');
      setPrice(0);
      setLimit(15);
      setMonthlyIfcLimit(5);
      setIfcMaxFileMb(100);
      setIfcMaxConcurrent(1);
      setIsActive(true);
      setIsPublished(false);
      setIsFeatured(false);
      setDisplayOrder(0);
      setMarketingBadge('');
      setMarketingDescription('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name,
      monthlyPrice: Number(price),
      monthlyQuoteLimit: Number(limit),
      monthlyIfcLimit: Number(monthlyIfcLimit),
      ifcMaxFileMb: Number(ifcMaxFileMb),
      ifcMaxConcurrent: Number(ifcMaxConcurrent),
      isActive,
      isPublished,
      isFeatured,
      displayOrder: Number(displayOrder),
      marketingBadge: marketingBadge.trim() || null,
      marketingDescription: marketingDescription.trim() || null,
    };

    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PATCH' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingPlan ? 'Paket güncellendi.' : 'Yeni paket oluşturuldu.');
        setIsModalOpen(false);
        loadPlans();
      } else {
        toast.error('İşlem başarısız oldu.');
      }
    } catch {
      toast.error('Sistemsel bir hata oluştu.');
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

  const pendingPaymentsCount = paymentRequests.filter(
    (r) => r.status === 'pending_approval' || r.status === 'awaiting_transfer',
  ).length;

  return (
    <PageContainer>
      <div className="flex items-start justify-between">
        <PageHeader
          title="Paket, Havale/EFT & Banka Hesap Yönetimi"
          description="SaaS abonelik paketlerini, müşterilere gösterilen çoklu IBAN hesaplarını ve gelen Havale/EFT dekont bildirimlerini yönetin."
          icon={Package}
        />
        <Button onClick={() => openModal()} className="bg-indigo-600 text-white hover:bg-indigo-700 mt-2">
          <Plus size={16} className="mr-2" /> Yeni Paket Ekle
        </Button>
      </div>

      {/* 1. ABONELİK PAKETLERİ */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-4">
        {loading ? (
          <div className="text-zinc-500">Yükleniyor...</div>
        ) : error ? (
          <div role="alert" className="col-span-full rounded-xl border border-red-500/30 p-5 text-red-300">
            <p>{error}</p>
            <Button onClick={loadPlans} variant="outline" className="mt-3">
              Tekrar dene
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div role="status" className="col-span-full rounded-xl border border-zinc-700 p-5 text-zinc-300">
            Henüz paket tanımlanmamış. Paket ekleyin veya platform yöneticisinden başlangıç kataloğunu yüklemesini isteyin.
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 flex flex-col justify-between ${
                plan.isActive ? 'border-zinc-700 bg-zinc-900/60' : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <h3 className="text-base font-bold text-white leading-tight">{plan.name}</h3>
                  {!plan.isActive ? (
                    <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
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
                  ) : null}
                </div>

                <div className="mb-5 mt-3">
                  <div className="flex items-baseline gap-1">
                    {plan.monthlyPrice === 0 ? (
                      <span className="text-2xl font-black text-emerald-400">Ücretsiz</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-white">₺{plan.monthlyPrice}</span>
                        <span className="text-zinc-500 text-xs">/ ay</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2 text-xs text-zinc-300">
                    {plan.monthlyQuoteLimit === 0 ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        <span className="text-zinc-400">Teklif Modülü Dahil Değil</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>
                          <strong className="text-white">
                            {`${plan.monthlyQuoteLimit.toLocaleString('tr-TR')} Adet`}
                          </strong>{' '}
                          Teklif Kotası
                        </span>
                      </>
                    )}
                  </li>
                  <li className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>
                      <strong className="text-white">
                        {plan.monthlyIfcLimit === null ? 'Paket limiti tanımsız' : `${plan.monthlyIfcLimit} Adet`}
                      </strong>{' '}
                      {plan.monthlyQuoteLimit === 0 ? 'İsimlendirme Denetimi' : 'IFC Analizi'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>
                      Maks <strong className="text-white">{Math.min(plan.ifcMaxFileMb, 100)} MB</strong> Dosya
                      {plan.ifcMaxFileMb > 100 && (
                        <span className="text-amber-400">
                          {' '}
                          (kayıt {plan.ifcMaxFileMb} MB; sunucu tavanı uygulanır)
                        </span>
                      )}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>
                      <strong className="text-white">{plan.ifcMaxConcurrent ?? 1}</strong> Eşzamanlı İş
                    </span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => openModal(plan)}
                variant="outline"
                className="w-full mt-5 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 text-xs py-1.5"
              >
                Düzenle
              </Button>
            </div>
          ))
        )}
      </div>

      {/* 2. BEKLEYEN HAVALE / EFT ÖDEME BİLDİRİMLERİ */}
      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt size={18} className="text-amber-400" />
              Havale / EFT Ödeme Bildirimleri & Paket Aktivasyonu
              {pendingPaymentsCount > 0 && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                  {pendingPaymentsCount} Bekleyen
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Kayıt sırasında veya çalışma alanından ücretli paket seçip dekont bildiren firmaları tek tıkla onaylayarak paketlerini aktif edin.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadPaymentRequests()} className="text-xs">
            Listeyi Yenile
          </Button>
        </div>

        {loadingPayments ? (
          <p className="text-xs text-zinc-500">Ödeme bildirimleri yükleniyor...</p>
        ) : paymentRequests.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400">
            Henüz oluşturulmuş bir Havale / EFT sipariş veya dekont bildirimi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
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
              <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
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
                      <span className="block text-[11px] text-zinc-500">{req.userEmail}</span>
                    </td>
                    <td className="p-3 font-semibold text-white">{req.planName}</td>
                    <td className="p-3 tabular-nums font-bold text-emerald-300">
                      ₺{req.amountTry.toLocaleString('tr-TR')}{' '}
                      <span className="text-[10px] font-normal text-zinc-400">
                        ({req.billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'})
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300">
                      {req.senderName ? (
                        <div>
                          <span className="font-semibold text-white">{req.senderName}</span>
                          {req.bankName && <span className="text-zinc-400"> · {req.bankName}</span>}
                          {req.transferReference && (
                            <span className="block text-[11px] font-mono text-amber-200">
                              Dekont No: {req.transferReference}
                            </span>
                          )}
                          {(req.taxOffice || req.taxNumber) && (
                            <span className="block text-[10px] text-zinc-400">
                              VD: {req.taxOffice || '—'} / VKN: {req.taxNumber || '—'}
                            </span>
                          )}
                          {req.notes && <span className="block text-[10px] text-zinc-400 italic">"{req.notes}"</span>}
                        </div>
                      ) : (
                        <span className="text-zinc-500">Henüz dekont formu doldurulmadı</span>
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
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                          Havale Bekleniyor
                        </span>
                      )}
                      <span className="block text-[10px] text-zinc-500 mt-1">
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
      <section className="mt-8 rounded-2xl border border-indigo-500/25 bg-zinc-900/50 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark size={18} className="text-indigo-400" />
              Banka Hesapları Yönetimi (Havale / EFT IBAN Listesi)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
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
          <p className="text-xs text-zinc-500">Banka hesapları yükleniyor...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bankAccounts.map((acc, idx) => (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  acc.isActive ? 'border-zinc-800 bg-zinc-950/80' : 'border-red-500/20 bg-red-950/10 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                      Hesap #{idx + 1}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acc.isActive}
                        onChange={(e) => handleUpdateBankField(idx, 'isActive', e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                      />
                      Aktif (Müşterilere Göster)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBankAccount(idx)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                    title="Banka hesabını sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Banka Adı *</label>
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => handleUpdateBankField(idx, 'bankName', e.target.value)}
                      placeholder="Örn: Garanti BBVA / İş Bankası"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Para Birimi</label>
                    <select
                      value={acc.currency}
                      onChange={(e) =>
                        handleUpdateBankField(idx, 'currency', e.target.value as 'TRY' | 'USD' | 'EUR')
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Alıcı Resmi Ünvanı *
                    </label>
                    <input
                      type="text"
                      value={acc.accountHolder}
                      onChange={(e) => handleUpdateBankField(idx, 'accountHolder', e.target.value)}
                      placeholder="Örn: BIMPlan Mühendislik A.Ş."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Şube Adı / Kodu</label>
                    <input
                      type="text"
                      value={acc.branchName ?? ''}
                      onChange={(e) => handleUpdateBankField(idx, 'branchName', e.target.value || null)}
                      placeholder="Örn: Kurumsal / 0412"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">IBAN *</label>
                  <input
                    type="text"
                    value={acc.iban}
                    onChange={(e) => handleUpdateBankField(idx, 'iban', e.target.value)}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Müşteriye Gösterilecek Not / Açıklama
                  </label>
                  <input
                    type="text"
                    value={acc.description ?? ''}
                    onChange={(e) => handleUpdateBankField(idx, 'description', e.target.value || null)}
                    placeholder="Örn: Açıklama kısmına Sipariş Referans Kodunuzu yazınız."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">
                {editingPlan ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Paket Adı</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
                  placeholder="Örn: Kurumsal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Aylık Fiyat (₺)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Aylık Teklif Kotası</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Aylık IFC Kotası</label>
                  <input
                    type="number"
                    min={0}
                    value={monthlyIfcLimit}
                    onChange={(e) => setMonthlyIfcLimit(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Maks IFC (MB)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={ifcMaxFileMb}
                    onChange={(e) => setIfcMaxFileMb(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Eşzamanlı İş</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ifcMaxConcurrent}
                    onChange={(e) => setIfcMaxConcurrent(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-zinc-950"
                />
                <label htmlFor="isActive" className="text-sm text-zinc-300">
                  Aktif (Satışa ve Kullanıma Açık)
                </label>
              </div>
              {!isActive && (
                <p className="text-xs text-red-400 mt-1">
                  Dikkat: Bu paketi kullanan müşterilerin kota gerektiren işlemleri de engellenir.
                </p>
              )}
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3">
                <p className="text-xs font-semibold text-indigo-200">Web sitesi görünümü</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600"
                    />
                    Web sitesinde yayınla
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600"
                    />
                    Öne çıkan paket
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Gösterim sırası</label>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Rozet</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={marketingBadge}
                      onChange={(e) => setMarketingBadge(e.target.value)}
                      placeholder="Örn: En çok tercih edilen"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Kısa açıklama</label>
                  <textarea
                    maxLength={280}
                    value={marketingDescription}
                    onChange={(e) => setMarketingDescription(e.target.value)}
                    placeholder="Paketin landing sayfasında görünecek kısa açıklaması"
                    className="min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
