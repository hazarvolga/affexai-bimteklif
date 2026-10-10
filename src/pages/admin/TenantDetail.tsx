import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'sonner';
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
    quotesLimit: number | null;
    monthlyIfcLimit: number | null;
    ifcMaxFileMb: number;
    ifcMaxConcurrent: number;
  } | null;
  members: Array<{
    userId: string;
    fullName: string;
    email: string;
    role: string;
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

  const loadTenant = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [tenantRes, plansRes] = await Promise.all([
        fetchWithAuth(`/api/admin/tenants/${companyId}`),
        fetchWithAuth('/api/admin/plans')
      ]);

      if (!tenantRes.ok) {
        throw new Error('Firma profil bilgileri alınamadı');
      }

      const tenantData: TenantDetailData = await tenantRes.json();
      const plansData = await plansRes.json();

      setData(tenantData);
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

  const handleImpersonate = async () => {
    if (!companyId) return;
    try {
      setImpersonating(true);
      const res = await fetchWithAuth('/api/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          readOnly: impersonateReadOnly
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Impersonate başarısız oldu');
      }

      const resData = await res.json();
      const currentToken = localStorage.getItem('token') || '';
      localStorage.setItem('admin_session_backup', currentToken);
      localStorage.setItem('token', resData.token);

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
        <div className="flex h-64 items-center justify-center text-zinc-400">
          <Clock className="animate-spin mr-2" size={20} />
          Firma profili ve detayları yükleniyor...
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-zinc-400">
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
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={18} className="mr-1" /> Firmalar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Building2 className="text-indigo-400" size={26} />
                {data.company.name}
              </h1>
              {data.subscription?.status === 'active' ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                  Aktif Firma
                </span>
              ) : (
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-bold text-zinc-400">
                  {data.subscription?.status || 'Paketsiz'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Firma ID: <span className="font-mono text-zinc-400">{data.company.id}</span> • Kayıt:{' '}
              {new Date(data.company.createdAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setImpersonateModalOpen(true)}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg text-xs font-bold"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
                    {primaryOwner.fullName?.charAt(0).toUpperCase() || 'Y'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {primaryOwner.fullName}
                      <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase">
                        {primaryOwner.role === 'owner' ? 'Firma Sahibi' : primaryOwner.role}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} className="text-zinc-500" />
                      {primaryOwner.email}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-zinc-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Yetkili Kayıt Tarihi</span>
                  <span>{new Date(primaryOwner.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Bu firmaya henüz yetkili kullanıcı atanmamış.</p>
            )}
          </div>

          {/* 2. Firma İletişim & Profil Bilgileri Formu */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 mb-4 flex items-center gap-2">
              <Building2 size={17} className="text-indigo-400" />
              Firma Profil & İletişim Bilgileri
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Firma Resmi Ünvanı</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Örn: ABC İnşaat A.Ş."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Phone size={12} className="inline mr-1 text-zinc-500" />
                  Telefon Numarası
                </label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="+90 (___) ___ __ __"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Mail size={12} className="inline mr-1 text-zinc-500" />
                  Firma İletişim E-Postası
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="info@sirketiniz.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Receipt size={12} className="inline mr-1 text-zinc-500" />
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Kadıköy V.D."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Receipt size={12} className="inline mr-1 text-zinc-500" />
                  Vergi Kimlik Numarası (VKN / TCKN)
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="10 veya 11 haneli vergi numarası"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <MapPin size={12} className="inline mr-1 text-zinc-500" />
                  Resmi Tebligat & Şirket Adresi
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Şirket resmi fatura adresi..."
                />
              </div>

              {/* SmartCheck Modül Anahtarı */}
              <div className="sm:col-span-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-400" />
                    SmartCheck BIM & Kural Doğrulama Modülü
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
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
                  <div className="h-6 w-11 rounded-full bg-zinc-700 peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {/* Admin Notları */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Platform Admin Notları (Yalnızca Süper Admin Görür)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Müşteriyle yapılan görüşmeler, özel indirimler, taahhütler vb."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              Firma Kullanıcıları ({data.members.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="pb-2.5 font-medium">Kullanıcı</th>
                    <th className="pb-2.5 font-medium">E-Posta</th>
                    <th className="pb-2.5 font-medium">Rol</th>
                    <th className="pb-2.5 font-medium">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {data.members.map((u) => (
                    <tr key={u.userId}>
                      <td className="py-2.5 font-medium text-white">{u.fullName}</td>
                      <td className="py-2.5 text-zinc-400">{u.email}</td>
                      <td className="py-2.5">
                        <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300 uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Paket, Kotalar & İşlemler */}
        <div className="space-y-6">
          {/* Sahip Olduğu Paket & Kota Yönetimi */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-400" />
                Mevcut Paket & Kotalar
              </h3>
              {data.plan ? (
                <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase">
                  {data.plan.name}
                </span>
              ) : (
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                  Paket Yok
                </span>
              )}
            </div>

            {/* Paket Fiyat ve Özellik Özeti */}
            {data.plan && (
              <div className="rounded-lg border border-indigo-950/70 bg-indigo-950/20 p-4 mb-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-400">Aylık Ücret</span>
                  <span className="text-lg font-black text-white">₺{data.plan.monthlyPrice} <span className="text-xs text-zinc-500 font-normal">/ ay</span></span>
                </div>
                <div className="border-t border-indigo-900/40 pt-2 space-y-1 text-xs text-indigo-300">
                  <div className="flex justify-between">
                    <span>Aylık Teklif Kotası:</span>
                    <strong>{data.plan.quotesLimit ?? 'Sınırsız'} adet</strong>
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">Paket Değiştir</label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">Abonelik Durumu</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                >
                  <option value="active">Aktif (Kullanım Açık)</option>
                  <option value="past_due">Ödeme Bekliyor</option>
                  <option value="canceled">İptal Edildi (Salt-Okunur)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Bonus Teklif</label>
                  <input
                    type="number"
                    min={0}
                    value={editBonusQuotes}
                    onChange={(e) => setEditBonusQuotes(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">+Hak</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Bonus IFC</label>
                  <input
                    type="number"
                    min={0}
                    value={editBonusIfc}
                    onChange={(e) => setEditBonusIfc(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">+Hak</span>
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-indigo-400" />
              Aylık Kullanım Geçmişi
            </h3>
            {data.usageHistory.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Kayıtlı kullanım bulunmuyor.</p>
            ) : (
              <div className="space-y-2.5">
                {data.usageHistory.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-white">{u.period}</span>
                      <div className="text-[10px] text-zinc-500">
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              Son İşlemler
            </h3>
            {data.recentRuns.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Henüz işlem kaydı yok.</p>
            ) : (
              <div className="space-y-2">
                {data.recentRuns.map((r) => (
                  <div key={r.runId} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white truncate max-w-[140px]">{r.fileName}</span>
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
                    <div className="text-[10px] text-zinc-500">
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
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-bold text-white">Müşteri Hesabına Geçiş (Impersonate)</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              <strong>{data.company.name}</strong> adına oturum açacaksınız. Bu oturum 15 dakika boyunca geçerlidir ve yapılan tüm denetim loglarına kaydedilir.
            </p>

            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 mb-5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={impersonateReadOnly}
                  onChange={(e) => setImpersonateReadOnly(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-amber-200">Salt-Okunur Mod (Önerilen)</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
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
    </PageContainer>
  );
}
