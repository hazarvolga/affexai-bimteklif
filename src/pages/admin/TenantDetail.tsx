import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';
import { previewChanges, PREVIEW_STALE_NOTICE, planIdentity } from './admin-change-preview';
import { toast } from 'sonner';
import { TenantDeletePanel } from './TenantDeletePanel';
import { formatBillingCycleLabel } from '../../services/billing/billing-periods';
import {
  Building2,
  ArrowLeft,
  Users,
  CreditCard,
  FileSpreadsheet,
  Cpu,
  LogIn,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Receipt,
  UserCheck,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

interface TenantDetailData {
  company: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    taxNumber: string | null;
    taxOffice: string | null;
    address: string | null;
    defaultCurrency: string;
    defaultVatRate: number;
    createdAt: string;
    is_smartcheck_enabled?: boolean;
    isSmartcheckEnabled?: boolean;
    admin_notes?: string | null;
    adminNotes?: string | null;
  };
  subscription: {
    id: string;
    status: string;
    planId: string | null;
    bonusQuoteLimit: number;
    bonusIfcLimit: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
    monthlyPrice: number;
    monthlyQuoteLimit: number | null;
    monthlyIfcLimit: number | null;
    ifcMaxFileMb: number;
    ifcMaxConcurrent: number;
  } | null;
  members: Array<{
    userId: string;
    fullName: string;
    email: string;
    role: string;
    isExpertReviewer?: boolean;
    createdAt: string;
  }>;
  usageHistory: Array<{
    period: string;
    quoteCount: number;
    ifcCount: number;
    lastActiveAt: string | null;
  }>;
  recentRuns: Array<{
    runId: string;
    documentId: string;
    fileName: string;
    status: string;
    currentStage: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
}

export function TenantDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<TenantDetailData | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);

  // Editable Profile States
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSmartcheckEnabled, setIsSmartcheckEnabled] = useState(false);

  // Subscription States
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editBonusQuotes, setEditBonusQuotes] = useState(0);
  const [editBonusIfc, setEditBonusIfc] = useState(0);

  // Impersonation Modal
  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [impersonateReadOnly, setImpersonateReadOnly] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  // Payment Requests for this Tenant
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);

  const loadTenant = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [tenantRes, plansRes, paymentsRes] = await Promise.all([
        fetchWithAuth(`/api/admin/tenants/${companyId}`),
        fetchWithAuth('/api/admin/plans'),
        fetchWithAuth(`/api/admin/billing/payment-requests?companyId=${encodeURIComponent(companyId)}`),
      ]);

      if (!tenantRes.ok) {
        let errMessage = 'Firma profil bilgileri alınamadı';
        try {
          const errData = await tenantRes.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          // Ignore non-json body
        }
        throw new Error(errMessage);
      }

      const tenantData: TenantDetailData = await tenantRes.json();
      let plansData: any[] = [];
      try {
        if (plansRes.ok) {
          const parsedPlans = await plansRes.json();
          if (Array.isArray(parsedPlans)) {
            plansData = parsedPlans;
          }
        }
      } catch {
        // Fallback to empty plans
      }

      try {
        if (paymentsRes.ok) {
          const paymentsBody = await paymentsRes.json();
          const rawList = Array.isArray(paymentsBody)
            ? paymentsBody
            : Array.isArray(paymentsBody?.requests)
              ? paymentsBody.requests
              : [];
          setPaymentRequests(
            rawList.map((item: any) => ({
              ...item,
              transferReference: item.receiptNumber ?? item.transferReference ?? null,
              adminNote: item.adminDecisionNote ?? item.adminNote ?? null,
            })),
          );
        }
      } catch {
        // Ignore payment fetch failure
      }

      setData({
        ...tenantData,
        members: Array.isArray(tenantData.members) ? tenantData.members : [],
        usageHistory: Array.isArray(tenantData.usageHistory) ? tenantData.usageHistory : [],
        recentRuns: Array.isArray(tenantData.recentRuns) ? tenantData.recentRuns : [],
      });
      setPlans(plansData);

      // Populate form fields
      setCompanyName(tenantData.company.name || '');
      setCompanyPhone(tenantData.company.phone || '');
      setCompanyEmail(tenantData.company.email || '');
      setTaxOffice(tenantData.company.taxOffice || '');
      setTaxNumber(tenantData.company.taxNumber || '');
      setAddress(tenantData.company.address || '');
      setAdminNotes(tenantData.company.admin_notes || tenantData.company.adminNotes || '');
      setIsSmartcheckEnabled(Boolean(tenantData.company.is_smartcheck_enabled ?? tenantData.company.isSmartcheckEnabled));

      setEditPlanId(tenantData.subscription?.planId || '');
      setEditStatus(tenantData.subscription?.status || 'active');
      setEditBonusQuotes(tenantData.subscription?.bonusQuoteLimit || 0);
      setEditBonusIfc(tenantData.subscription?.bonusIfcLimit || 0);
    } catch (err: any) {
      toast.error(err.message || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [companyId]);

  const handleReviewPayment = async (requestId: string, decision: 'approved' | 'rejected') => {
    setReviewingPaymentId(requestId);
    try {
      const res = await fetchWithAuth(`/api/admin/billing/payment-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          adminNote:
            decision === 'approved'
              ? 'Havale / EFT ödemesi onaylandı ve paket aktif edildi.'
              : 'Havale / EFT ödemesi doğrulanamadı.',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Ödeme durumu güncellenemedi.');
      toast.success(
        decision === 'approved'
          ? 'Ödeme onaylandı ve firmanın yeni paketi aktif edildi!'
          : 'Ödeme bildirimi reddedildi.',
      );
      await loadTenant();
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız oldu.');
    } finally {
      setReviewingPaymentId(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!companyId) return;
    try {
      setSavingProfile(true);
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: companyName.trim(),
          phone: companyPhone.trim() || null,
          email: companyEmail.trim() || null,
          taxOffice: taxOffice.trim() || null,
          taxNumber: taxNumber.trim() || null,
          address: address.trim() || null,
          adminNotes: adminNotes.trim() || null,
          isSmartcheckEnabled
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Profil güncellenemedi');
      }

      toast.success('Firma iletişim ve profil bilgileri kaydedildi');
      loadTenant();
    } catch (err: any) {
      toast.error(err.message || 'Güncelleme başarısız');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!companyId) return;
    const before = { planId: planIdentity(data?.plan?.name, data?.subscription?.planId), status: data?.subscription?.status, bonusQuoteLimit: data?.subscription?.bonusQuoteLimit, bonusIfcLimit: data?.subscription?.bonusIfcLimit };
    const after = { planId: planIdentity(plans.find(plan => plan.id === editPlanId)?.name, editPlanId || null), status: editStatus, bonusQuoteLimit: Number(editBonusQuotes), bonusIfcLimit: Number(editBonusIfc) };
    if (!window.confirm(`Firma aboneliği önizlemesi\n\n${previewChanges(before, after, Object.keys(after))}\n\nEtkilenen firma: ${data?.company.name ?? 'Bilinmiyor'}\nEtkilenen kullanıcı sayısı: Bilinmiyor\n${PREVIEW_STALE_NOTICE}\nDeğişiklik kaydedilsin mi?`)) return;
    try {
      setSavingSubscription(true);
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          planId: editPlanId || null,
          status: editStatus,
          bonusQuoteLimit: Number(editBonusQuotes),
          bonusIfcLimit: Number(editBonusIfc)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Abonelik kaydedilemedi');
      }

      toast.success('Abonelik paketi ve limitler güncellendi');
      loadTenant();
    } catch (err: any) {
      toast.error(err.message || 'Güncelleme başarısız');
    } finally {
      setSavingSubscription(false);
    }
  };

  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!companyId || !window.confirm(`${email} firmadan çıkarılsın mı? Başka firması ve bağlı kaydı yoksa hesabı da kalıcı olarak silinir.`)) return;
    try {
      setUpdatingMemberId(userId);
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}/members/${userId}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Kullanıcı firmadan çıkarılamadı');
      setData((prev) => (prev ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) } : prev));
      toast.success(body.userDeleted ? 'Kullanıcı firmadan çıkarıldı ve hesabı silindi.' : 'Kullanıcı firmadan çıkarıldı. Hesabı başka kayıtlara bağlı olduğu için korundu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kullanıcı firmadan çıkarılamadı');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleUpdateMember = async (
    userId: string,
    patch: { role?: string; isExpertReviewer?: boolean },
  ) => {
    if (!companyId) return;
    try {
      setUpdatingMemberId(userId);
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Kullanıcı yetkisi güncellenemedi');
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.userId === userId
                  ? {
                      ...m,
                      ...(patch.role !== undefined ? { role: patch.role } : {}),
                      ...(patch.isExpertReviewer !== undefined
                        ? { isExpertReviewer: patch.isExpertReviewer }
                        : {}),
                    }
                  : m,
              ),
            }
          : prev,
      );
      if (patch.isExpertReviewer !== undefined) {
        toast.success(
          patch.isExpertReviewer
            ? 'Kullanıcıya UZMAN önizleme yetkisi tanımlandı'
            : 'Kullanıcının UZMAN önizleme yetkisi kaldırıldı',
        );
      } else if (patch.role !== undefined) {
        toast.success(`Kullanıcının şirket rolü ${patch.role.toUpperCase()} olarak güncellendi`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Kullanıcı yetkisi güncellenemedi');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleImpersonate = async () => {
    if (!companyId) return;
    try {
      setImpersonating(true);
      const res = await fetchWithAuth('/api/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({
          targetCompanyId: companyId,
          companyId,
          readOnly: impersonateReadOnly,
          allowWrite: !impersonateReadOnly
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Impersonate başarısız oldu');
      }

      // The server switched the HttpOnly session cookie to the impersonation session; the admin session stays in its own cookie.
      await res.json();

      toast.success(`${data?.company.name} adına geçiş yapıldı`);
      window.location.href = '/app';
    } catch (err: any) {
      toast.error(err.message || 'Geçiş başarısız');
      setImpersonating(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Clock className="animate-spin mr-2" size={20} />
          Firma profili ve detayları yükleniyor...
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto mb-3 text-amber-400" size={32} />
          Firma bulunamadı.
          <div className="mt-4">
            <Link to="/admin/tenants">
              <Button variant="outline">Firmalar Listesine Dön</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Primary contact / owner
  const primaryOwner = data.members.find((m) => m.role === 'owner') || data.members[0];

  return (
    <PageContainer>
      {/* Top Breadcrumb & Action Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/tenants')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={18} className="mr-1" /> Firmalar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Building2 className="text-indigo-400" size={26} />
                {data.company.name}
              </h1>
              {data.subscription?.status === 'active' ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                  Aktif Firma
                </span>
              ) : (
                <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {data.subscription?.status || 'Paketsiz'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Firma ID: <span className="font-mono text-muted-foreground">{data.company.id}</span> • Kayıt:{' '}
              {new Date(data.company.createdAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setImpersonateModalOpen(true)}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-foreground shadow-lg text-xs font-bold"
        >
          <LogIn size={15} className="mr-2" />
          Firmaya Giriş Yap (Impersonate)
        </Button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: Firma Yetkilisi & İletişim Bilgileri (Düzenlenebilir) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Birincil Yetkili Kartı */}
          <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-2">
              <UserCheck size={16} className="text-indigo-400" />
              Firma Sahibi / Birincil Yetkili
            </h3>
            {primaryOwner ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
                    {primaryOwner.fullName?.charAt(0).toUpperCase() || 'Y'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {primaryOwner.fullName}
                      <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase">
                        {primaryOwner.role === 'owner' ? 'Firma Sahibi' : primaryOwner.role}
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} className="text-muted-foreground" />
                      {primaryOwner.email}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-muted-foreground border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Yetkili Kayıt Tarihi</span>
                  <span>{new Date(primaryOwner.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Bu firmaya henüz yetkili kullanıcı atanmamış.</p>
            )}
          </div>

          {/* 2. Firma İletişim & Profil Bilgileri Formu */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
              <Building2 size={17} className="text-indigo-400" />
              Firma Profil & İletişim Bilgileri
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Firma Resmi Ünvanı</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Örn: ABC İnşaat A.Ş."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <Phone size={12} className="inline mr-1 text-muted-foreground" />
                  Telefon Numarası
                </label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="+90 (___) ___ __ __"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <Mail size={12} className="inline mr-1 text-muted-foreground" />
                  Firma İletişim E-Postası
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="info@sirketiniz.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <Receipt size={12} className="inline mr-1 text-muted-foreground" />
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Kadıköy V.D."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <Receipt size={12} className="inline mr-1 text-muted-foreground" />
                  Vergi Kimlik Numarası (VKN / TCKN)
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="10 veya 11 haneli vergi numarası"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <MapPin size={12} className="inline mr-1 text-muted-foreground" />
                  Resmi Tebligat & Şirket Adresi
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Şirket resmi fatura adresi..."
                />
              </div>

              {/* SmartCheck Modül Anahtarı */}
              <div className="sm:col-span-2 rounded-lg border border-border bg-background p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-400" />
                    SmartCheck BIM & Kural Doğrulama Modülü
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Bu firmanın IFC ve Excel kural denetimi, e-PYS ve metraj aktarım modülüne erişimi
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isSmartcheckEnabled}
                    onChange={(e) => setIsSmartcheckEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-surface-elevated peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {/* Admin Notları */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Platform Admin Notları (Yalnızca Süper Admin Görür)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Müşteriyle yapılan görüşmeler, özel indirimler, taahhütler vb."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Save size={14} className="mr-1.5" />
                {savingProfile ? 'Kaydediliyor...' : 'Firma Bilgilerini Kaydet'}
              </Button>
            </div>
          </div>

          {/* 3. Firma Kullanıcıları Tablosu */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                Firma Kullanıcıları ({data.members.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Uzman Önizlemesi (/app/uzman-onizleme) yalnızca <strong>UZMAN</strong> yetkisi verilen kullanıcılara görünür.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="pb-2.5 font-medium">Kullanıcı</th>
                    <th className="pb-2.5 font-medium">E-Posta</th>
                    <th className="pb-2.5 font-medium">Şirket Rolü</th>
                    <th className="pb-2.5 font-medium">Uzman Önizleme Yetkisi</th>
                    <th className="pb-2.5 font-medium">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground dark:text-muted-foreground">
                  {data.members.map((u) => {
                    const ownerCount = data.members.filter((m) => m.role === 'owner').length;
                    const isSoleOwner = u.role === 'owner' && ownerCount <= 1;
                    const isBusy = updatingMemberId === u.userId;
                    const isExpert = Boolean(u.isExpertReviewer);

                    return (
                      <tr key={u.userId}>
                        <td className="py-2.5 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {isExpert && (
                              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-400">
                                UZMAN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          <span>{u.email}</span>
                          <button
                            type="button"
                            disabled={isBusy || isSoleOwner}
                            data-testid={`remove-member-${u.userId}`}
                            title={isSoleOwner ? 'Firmanın tek sahibi çıkarılamaz' : 'Kullanıcıyı firmadan çıkar'}
                            onClick={() => handleRemoveMember(u.userId, u.email)}
                            className="ml-2 text-[10px] font-semibold text-destructive underline underline-offset-2 disabled:opacity-40 disabled:no-underline"
                          >
                            Çıkar
                          </button>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-bold text-foreground dark:text-muted-foreground uppercase">
                              {u.role}
                            </span>
                            <select
                              aria-label={`${u.email} şirket rolü`}
                              data-testid={`member-role-select-${u.userId}`}
                              value={u.role}
                              disabled={isBusy || isSoleOwner}
                              title={
                                isSoleOwner
                                  ? 'Firmanın tek sahibi (OWNER) başka bir role düşürülemez; uzmanlık için yanındaki UZMAN butonunu kullanın.'
                                  : 'Kullanıcının şirket içi rolünü değiştirin'
                              }
                              onChange={(e) =>
                                handleUpdateMember(u.userId, { role: e.target.value })
                              }
                              className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                            >
                              <option value="owner">OWNER</option>
                              <option value="admin">ADMIN</option>
                              <option value="manager">MANAGER</option>
                              <option value="viewer">VIEWER</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            data-testid={`toggle-expert-${u.userId}`}
                            onClick={() =>
                              handleUpdateMember(u.userId, { isExpertReviewer: !isExpert })
                            }
                            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-bold uppercase transition-colors disabled:opacity-50 ${
                              isExpert
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                : 'border-border bg-surface-elevated text-muted-foreground hover:border-indigo-500/50 hover:text-foreground'
                            }`}
                          >
                            <UserCheck size={12} />
                            {isExpert ? 'UZMAN Açık · Kaldır' : 'UZMAN Ata'}
                          </button>
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Paket, Kotalar & İşlemler */}
        <div className="space-y-6">
          {/* Havale / EFT Ödeme Bildirimleri */}
          {paymentRequests.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200 flex items-center gap-2">
                <Receipt size={16} className="text-amber-400" />
                Havale / EFT Sipariş & Dekont Bildirimleri ({paymentRequests.length})
              </h3>
              <div className="space-y-2.5">
                {paymentRequests.map((req: any) => (
                  <div
                    key={req.requestId}
                    className="rounded-lg border border-border bg-background p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-amber-300">{req.referenceCode}</span>
                      <span className="font-bold text-emerald-300">
                        ₺{Number(req.amountTry).toLocaleString('tr-TR')}{' '}
                        <span className="text-[10px] text-muted-foreground">
                          ({formatBillingCycleLabel(req.billingCycle)})
                        </span>
                      </span>
                    </div>
                    <div className="text-foreground font-semibold">{req.planName}</div>
                    {req.senderName && (
                      <div className="text-[11px] text-muted-foreground">
                        Gönderen: <span className="text-foreground">{req.senderName}</span>
                        {req.transferReference && (
                          <span className="block font-mono text-amber-200">Dekont: {req.transferReference}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        {req.status === 'approved'
                          ? 'Onaylandı'
                          : req.status === 'pending_approval'
                            ? 'Dekont Onayı Bekliyor'
                            : req.status === 'rejected'
                              ? 'Reddedildi'
                              : 'Havale Bekleniyor'}
                      </span>
                      {req.status !== 'approved' && (
                        <Button
                          size="sm"
                          disabled={reviewingPaymentId === req.requestId}
                          onClick={() => void handleReviewPayment(req.requestId, 'approved')}
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5"
                        >
                          Onayla & Paketi Aktif Et
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sahip Olduğu Paket & Kota Yönetimi */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-400" />
                Mevcut Paket & Kotalar
              </h3>
              {data.plan ? (
                <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase">
                  {data.plan.name}
                </span>
              ) : (
                <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 text-[10px] text-muted-foreground">
                  Paket Yok
                </span>
              )}
            </div>

            {/* Paket Fiyat ve Özellik Özeti */}
            {data.plan && (
              <div className="rounded-lg border border-indigo-950/70 bg-indigo-950/20 p-4 mb-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Aylık Ücret</span>
                  <span className="text-lg font-black text-foreground">₺{data.plan.monthlyPrice} <span className="text-xs text-muted-foreground font-normal">/ ay</span></span>
                </div>
                <div className="border-t border-indigo-900/40 pt-2 space-y-1 text-xs text-indigo-300">
                  <div className="flex justify-between">
                    <span>Aylık Teklif Kotası:</span>
                    <strong>{data.plan.monthlyQuoteLimit == null ? 'Bilinmiyor' : `${data.plan.monthlyQuoteLimit} adet`}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Aylık IFC Analiz:</span>
                    <strong>{data.plan.monthlyIfcLimit ?? 'Sınırsız'} adet</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Maksimum IFC Boyutu:</span>
                    <strong>{data.plan.ifcMaxFileMb} MB</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Eşzamanlı İş:</span>
                    <strong>{data.plan.ifcMaxConcurrent}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Abonelik Ayar Formu */}
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Paket Değiştir</label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="">Paket Atanmamış</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₺{p.monthlyPrice} / ay)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Abonelik Durumu</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="active">Aktif (Kullanım Açık)</option>
                  <option value="past_due">Ödeme Bekliyor</option>
                  <option value="canceled">İptal Edildi (Salt-Okunur)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bonus Teklif</label>
                  <input
                    type="number"
                    min={0}
                    value={editBonusQuotes}
                    onChange={(e) => setEditBonusQuotes(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">+Hak</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bonus IFC</label>
                  <input
                    type="number"
                    min={0}
                    value={editBonusIfc}
                    onChange={(e) => setEditBonusIfc(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">+Hak</span>
                </div>
              </div>

              <Button
                onClick={handleSaveSubscription}
                disabled={savingSubscription}
                size="sm"
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Save size={14} className="mr-1.5" />
                {savingSubscription ? 'Kaydediliyor...' : 'Aboneliği & Kotaları Güncelle'}
              </Button>
            </div>
          </div>

          {/* Aylık Kullanım Geçmişi */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-indigo-400" />
              Aylık Kullanım Geçmişi
            </h3>
            {data.usageHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Kayıtlı kullanım bulunmuyor.</p>
            ) : (
              <div className="space-y-2.5">
                {data.usageHistory.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{u.period}</span>
                      <div className="text-[10px] text-muted-foreground">
                        {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString('tr-TR') : 'Aktif'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-indigo-400 font-bold">{u.quoteCount} Teklif</div>
                      <div className="text-amber-400 font-bold text-[11px]">{u.ifcCount} IFC</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Son IFC / Belge İşlemleri */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              Son İşlemler
            </h3>
            {data.recentRuns.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Henüz işlem kaydı yok.</p>
            ) : (
              <div className="space-y-2">
                {data.recentRuns.map((r) => (
                  <div key={r.runId} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground truncate max-w-[140px]">{r.fileName}</span>
                      {r.status === 'completed' ? (
                        <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={11} /> Başarılı
                        </span>
                      ) : r.status === 'failed' ? (
                        <span className="text-red-400 font-bold text-[10px] flex items-center gap-1">
                          <XCircle size={11} /> Hata
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                          <Clock size={11} className="animate-spin" /> {r.status}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Impersonation Modal */}
      {impersonateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-bold text-foreground">Müşteri Hesabına Geçiş (Impersonate)</h3>
            </div>

            <p className="text-xs text-foreground dark:text-muted-foreground leading-relaxed mb-4">
              <strong>{data.company.name}</strong> adına oturum açacaksınız. Bu oturum 15 dakika boyunca geçerlidir ve yapılan tüm denetim loglarına kaydedilir.
            </p>

            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 mb-5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={impersonateReadOnly}
                  onChange={(e) => setImpersonateReadOnly(e.target.checked)}
                  className="mt-0.5 rounded border-border bg-card text-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-amber-200">Salt-Okunur Mod (Önerilen)</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Müşterinin verilerinde herhangi bir değişiklik yapılmasını engeller. Yalnızca inceleme amaçlıdır.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImpersonateModalOpen(false)}
                disabled={impersonating}
              >
                İptal
              </Button>
              <Button
                onClick={handleImpersonate}
                disabled={impersonating}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {impersonating ? 'Geçiş Yapılıyor...' : 'Onayla ve Geçiş Yap'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6"><TenantDeletePanel companyId={companyId ?? data.company.id} companyName={data.company.name} /></div>
    </PageContainer>
  );
}
