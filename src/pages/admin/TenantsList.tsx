import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { AlertTriangle, Building2, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export function TenantsList() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editBonus, setEditBonus] = useState(0);
  const [editAdminNotes, setEditAdminNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, pRes] = await Promise.all([
        fetchWithAuth('/api/admin/tenants'),
        fetchWithAuth('/api/admin/plans'),
      ]);

      if (!tRes.ok) {
        const errBody = await tRes.json().catch(() => ({}));
        if (tRes.status === 401 || tRes.status === 403) {
          setError(
            'Süper Admin oturumu doğrulanamadı (başka bir sekmede normal müşteri hesabıyla giriş yapılmış olabilir). Lütfen Süper Admin hesabınızla tekrar giriş yapın.',
          );
        } else {
          setError(errBody.error || 'Firma listesi yüklenemedi. Lütfen tekrar deneyin.');
        }
        setTenants([]);
        return;
      }

      const tData = await tRes.json().catch(() => []);
      const pData = pRes.ok ? await pRes.json().catch(() => []) : [];

      setTenants(Array.isArray(tData) ? tData : []);
      setPlans(Array.isArray(pData) ? pData : []);
    } catch {
      setError('Sunucu bağlantısı kurulurken bir hata oluştu.');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRestoreAdminBackup = async () => {
    // The server ends the impersonation session and puts the admin session cookie back.
    try {
      await fetch('/api/auth/impersonate/exit', { method: 'POST', credentials: 'same-origin' });
    } catch { /* offline: reload decides */ }
    window.location.reload();
  };

  const handleUpdateNotes = async () => {
    try {
      const res = await fetchWithAuth(`/api/admin/tenants/${selectedTenant.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: editAdminNotes }),
      });
      if (res.ok) {
        toast.success('Admin notu güncellendi');
        void loadData();
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  const handleCsvExport = () => {
    const csvHeader = 'Firma Adi,Email,Paket,Durum,Kota,Kullanilan,Bonus\n';
    const csvContent = tenants
      .map((t) =>
        [
          escapeCsvCell(t.name),
          escapeCsvCell(t.owner_email || ''),
          escapeCsvCell(t.plan_name || ''),
          escapeCsvCell(t.subscription_status),
          escapeCsvCell(t.plan_quota || 0),
          escapeCsvCell(t.usage_count || 0),
          escapeCsvCell(t.bonus_quota || 0),
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'tenants_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openManageModal = (tenant: any) => {
    setSelectedTenant(tenant);
    setEditPlanId(tenant.plan_id || '');
    setEditStatus(tenant.subscription_status || 'active');
    setEditBonus(tenant.bonus_quote_limit || 0);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetchWithAuth(`/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          planId: editPlanId || null,
          status: editStatus,
          bonusQuoteLimit: Number(editBonus),
        }),
      });
      if (res.ok) {
        toast.success('Firma başarıyla güncellendi.');
        setIsModalOpen(false);
        void loadData();
      } else {
        toast.error('Güncelleme başarısız.');
      }
    } catch {
      toast.error('Bir hata oluştu.');
    }
  };

  const safeTenants = Array.isArray(tenants) ? tenants : [];
  const filteredTenants = safeTenants.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(t.name || '').toLowerCase().includes(q) ||
      String(t.owner_email || '').toLowerCase().includes(q) ||
      String(t.plan_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Firmalar (Tenants)"
          description="Platformu kullanan müşteri firmaları, abonelik durumları, SmartCheck erişimleri ve kotaları yönetin."
          icon={Building2}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData()}
          className="mt-2 border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated text-xs"
        >
          <RefreshCw size={14} className="mr-1.5" /> Yenile
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Firma adı, paket veya yetkili e-posta ara..."
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-amber-100 text-sm mb-1">Firma listesi alınamadı</p>
              <p>{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10 text-xs"
            >
              Tekrar Dene
            </Button>
            <Button
              size="sm"
              onClick={handleRestoreAdminBackup}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Süper Admin Girişi Yap
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm text-muted-foreground">
          <thead className="bg-card text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Firma / Yetkili</th>
              <th className="px-6 py-4 font-medium">Paket & SmartCheck</th>
              <th className="px-6 py-4 font-medium">Aylık Kota (Teklif & IFC)</th>
              <th className="px-6 py-4 font-medium">Durum</th>
              <th className="px-6 py-4 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  Yükleniyor...
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  {searchQuery ? 'Arama kriterine uygun firma bulunamadı.' : 'Henüz müşteri firması yok.'}
                </td>
              </tr>
            ) : (
              filteredTenants.map((tenant) => {
                const usage = Number(tenant.current_usage || 0);
                const totalLimit = tenant.quota_limit;
                const ratio = totalLimit === null ? 0 : totalLimit > 0 ? usage / totalLimit : 1;
                const isWarning = ratio > 0.8;
                const isDanger = ratio >= 1;
                const ifcUsage = Number(tenant.current_ifc_usage || 0);
                const ifcLimit = tenant.ifc_limit;

                return (
                  <tr key={tenant.id} className="hover:bg-surface-elevated transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/tenants/${tenant.id}`}
                        className="font-semibold text-foreground hover:text-indigo-400 transition-colors"
                      >
                        {tenant.name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1">
                        {tenant.owner_email || 'Kullanıcı atanmamış'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                          {tenant.plan_name || 'Paket Atanmamış'}
                        </span>
                        {tenant.is_smartcheck_enabled && (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            <Sparkles size={10} /> SmartCheck Açık
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 text-xs">
                          <div className="text-foreground font-medium w-28">
                            Teklif: {usage}{' '}
                            <span className="text-muted-foreground font-normal">/ {totalLimit ?? '∞'}</span>
                          </div>
                          <div className="h-1.5 w-20 bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-amber-300/90 font-mono">
                          IFC: {ifcUsage} / {ifcLimit ?? '∞'} (Maks {tenant.ifc_max_file_mb ?? 35} MB)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tenant.subscription_status === 'active' ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Aktif
                        </span>
                      ) : tenant.subscription_status === 'canceled' ? (
                        <span className="text-red-400">İptal</span>
                      ) : tenant.subscription_status === 'past_due' ? (
                        <span className="text-amber-400">Ödeme bekliyor</span>
                      ) : (
                        <span className="text-muted-foreground capitalize">{tenant.subscription_status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/tenants/${tenant.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-indigo-600/40 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 text-xs"
                          >
                            Detay & Paket
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageModal(tenant)}
                          className="border-border bg-transparent text-foreground dark:text-muted-foreground hover:bg-surface-elevated text-xs"
                        >
                          Hızlı Düzenle
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-background border border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">{selectedTenant.name} Yönetimi</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Paket Ataması</label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground"
                >
                  <option value="">Paket Yok</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₺{p.monthlyPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Abonelik Durumu</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground"
                >
                  <option value="active">Aktif</option>
                  <option value="past_due">Ödeme bekliyor</option>
                  <option value="canceled">İptal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Bonus Kota Ekle</label>
                <input
                  type="number"
                  min={0}
                  max={2147483647}
                  step={1}
                  value={editBonus}
                  onChange={(e) => setEditBonus(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paket limitine ek olarak verilecek ekstra teklif hakkı.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
