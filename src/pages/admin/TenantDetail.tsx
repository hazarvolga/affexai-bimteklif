import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
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
  ShieldAlert
} from 'lucide-react';

interface TenantDetailData {
  company: {
    id: string;
    name: string;
    createdAt: string;
    is_smartcheck_enabled: boolean;
    admin_notes: string | null;
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
  users: Array<{
    id: string;
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
    id: string;
    kind: string;
    fileName: string;
    status: string;
    attempts: number;
    createdAt: string;
    finishedAt: string | null;
    errorMessage: string | null;
  }>;
}

export function TenantDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<TenantDetailData | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);

  // Form states
  const [adminNotes, setAdminNotes] = useState('');
  const [isSmartcheckEnabled, setIsSmartcheckEnabled] = useState(false);
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editBonusQuotes, setEditBonusQuotes] = useState(0);
  const [editBonusIfc, setEditBonusIfc] = useState(0);

  // Impersonation modal
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
        throw new Error('Firma bilgileri alınamadı');
      }

      const tenantData: TenantDetailData = await tenantRes.json();
      const plansData = await plansRes.json();

      setData(tenantData);
      setPlans(plansData);

      setAdminNotes(tenantData.company.admin_notes || '');
      setIsSmartcheckEnabled(Boolean(tenantData.company.is_smartcheck_enabled));
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

  const handleSaveCompanySettings = async () => {
    if (!companyId) return;
    try {
      setSavingNotes(true);
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          adminNotes,
          isSmartcheckEnabled
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ayarlar kaydedilemedi');
      }

      toast.success('Firma ayarları başarıyla güncellendi');
      loadTenant();
    } catch (err: any) {
      toast.error(err.message || 'Güncelleme başarısız');
    } finally {
      setSavingNotes(false);
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

      toast.success('Abonelik ve limitler güncellendi');
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

      toast.success(`${data?.company.name} adına oturum açıldı`);
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
          Firma detayları yükleniyor...
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-zinc-400">
          <AlertTriangle className="mx-auto mb-3 text-amber-400" size={32} />
          Firma bulunamadı veya yüklenirken bir sorun oluştu.
          <div className="mt-4">
            <Link to="/admin/tenants">
              <Button variant="outline">Firmalar Listesine Dön</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/tenants')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={18} className="mr-1" /> Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="text-indigo-400" size={24} />
              {data.company.name}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              ID: {data.company.id} • Kayıt: {new Date(data.company.createdAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setImpersonateModalOpen(true)}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg text-xs font-bold"
        >
          <LogIn size={16} className="mr-2" />
          Firmaya Giriş Yap (Impersonate)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: Firma Ayarları & Notlar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              Firma Özellikleri & SmartCheck
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div>
                  <div className="text-xs font-bold text-white">SmartCheck Modülü</div>
                  <div className="text-[11px] text-zinc-500">IFC kural denetimi ve metraj aktarımı</div>
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

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Platform Admin Notları (Dahili)
                </label>
                <textarea
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Müşteriyle ilgili operasyonel notlar, özel talepler vb."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <Button
                onClick={handleSaveCompanySettings}
                disabled={savingNotes}
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <Save size={14} className="mr-1.5" />
                {savingNotes ? 'Kaydediliyor...' : 'Firma Ayarlarını Kaydet'}
              </Button>
            </div>
          </div>

          {/* Kullanıcılar Listesi */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3 flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              Firma Kullanıcıları ({data.users.length})
            </h3>
            <div className="divide-y divide-zinc-800">
              {data.users.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-white truncate">{u.fullName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                  </div>
                  <span className="shrink-0 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Abonelik & IFC Limitleri & Kullanım Geçmişi */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-indigo-400" />
              Abonelik ve Kota Yönetimi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Paket</label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                >
                  <option value="">Paket Atanmamış</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.monthlyPrice} ₺ / ay)
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

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Bonus Teklif Kotası</label>
                <input
                  type="number"
                  min={0}
                  value={editBonusQuotes}
                  onChange={(e) => setEditBonusQuotes(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Paket kotasına ilave hak</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Bonus IFC Kotası</label>
                <input
                  type="number"
                  min={0}
                  value={editBonusIfc}
                  onChange={(e) => setEditBonusIfc(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Paket IFC sınırına ilave hak</p>
              </div>
            </div>

            {data.plan && (
              <div className="rounded-lg border border-indigo-950/60 bg-indigo-950/20 p-3 mb-4 text-xs text-indigo-300 flex flex-wrap gap-4">
                <div>Paket Kotası: <strong>{data.plan.quotesLimit ?? 'Sınırsız'}</strong> teklif</div>
                <div>Aylık IFC: <strong>{data.plan.monthlyIfcLimit ?? 'Sınırsız'}</strong> adet</div>
                <div>Maks Dosya: <strong>{data.plan.ifcMaxFileMb} MB</strong></div>
                <div>Eşzamanlı İş: <strong>{data.plan.ifcMaxConcurrent}</strong></div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSubscription}
                disabled={savingSubscription}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <Save size={14} className="mr-1.5" />
                {savingSubscription ? 'Kaydediliyor...' : 'Abonelik Değişikliklerini Kaydet'}
              </Button>
            </div>
          </div>

          {/* Kullanım Geçmişi */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-indigo-400" />
              Aylık Kullanım Geçmişi
            </h3>
            {data.usageHistory.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">Henüz kayıtlı kullanım kaydı yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="pb-2 font-medium">Dönem</th>
                      <th className="pb-2 font-medium">Oluşturulan Teklif</th>
                      <th className="pb-2 font-medium">İşlenen IFC</th>
                      <th className="pb-2 font-medium">Son Aktivite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {data.usageHistory.map((u, i) => (
                      <tr key={i}>
                        <td className="py-2.5 font-medium text-white">{u.period}</td>
                        <td className="py-2.5">{u.quoteCount}</td>
                        <td className="py-2.5">{u.ifcCount}</td>
                        <td className="py-2.5 text-zinc-500">
                          {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('tr-TR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Son IFC / Belge İşlemleri */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3 flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              Son IFC & SmartCheck İşlemleri
            </h3>
            {data.recentRuns.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">Henüz işlem bulunmuyor.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="pb-2 font-medium">Tür / Dosya</th>
                      <th className="pb-2 font-medium">Durum</th>
                      <th className="pb-2 font-medium">Deneme</th>
                      <th className="pb-2 font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {data.recentRuns.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5">
                          <span className="font-medium text-white">{r.fileName}</span>
                          <span className="block text-[10px] text-zinc-500">{r.kind}</span>
                        </td>
                        <td className="py-2.5">
                          {r.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <CheckCircle2 size={13} /> Başarılı
                            </span>
                          ) : r.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-red-400 text-[11px]" title={r.errorMessage || ''}>
                              <XCircle size={13} /> Hatalı
                            </span>
                          ) : r.status === 'running' ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                              <Clock size={13} className="animate-spin" /> Çalışıyor
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">{r.status}</span>
                          )}
                        </td>
                        <td className="py-2.5">{r.attempts}</td>
                        <td className="py-2.5 text-zinc-500">
                          {new Date(r.createdAt).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    Müşterinin verilerinde herhangi bir değişiklik (silme, ekleme, güncelleme) yapılmasını engeller. Yalnızca inceleme amaçlıdır.
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
