import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Building2, Search, X } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export function TenantsList() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editBonus, setEditBonus] = useState(0);
  const [editAdminNotes, setEditAdminNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchWithAuth('/api/admin/tenants').then(r => r.json()),
      fetchWithAuth('/api/admin/plans').then(r => r.json())
    ]).then(([tData, pData]) => {
      setTenants(tData);
      setPlans(pData);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateNotes = async () => {
    try {
      const res = await fetchWithAuth(`/api/admin/tenants/${selectedTenant.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: editAdminNotes })
      });
      if (res.ok) {
        toast.success('Admin notu güncellendi');
        loadData();
      }
    } catch (e) { toast.error('Hata oluştu'); }
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
    const csvHeader = "Firma Adi,Email,Paket,Durum,Kota,Kullanilan,Bonus\n";
    const csvContent = tenants.map(t => [
      escapeCsvCell(t.name),
      escapeCsvCell(t.owner_email || ''),
      escapeCsvCell(t.plan_name || ''),
      escapeCsvCell(t.subscription_status),
      escapeCsvCell(t.plan_quota || 0),
      escapeCsvCell(t.usage_count || 0),
      escapeCsvCell(t.bonus_quota || 0),
    ].join(',')).join('\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tenants_export.csv");
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
          bonusQuoteLimit: Number(editBonus)
        })
      });
      if (res.ok) {
        toast.success("Firma başarıyla güncellendi.");
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error("Güncelleme başarısız.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Firmalar (Tenants)" description="Platformu kullanan müşteri firmaları, abonelik durumları ve kotaları yönetin." icon={Building2} />
      
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input type="text" placeholder="Firma adı veya yetkili ara..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-medium">Firma / Yetkili</th>
              <th className="px-6 py-4 font-medium">Paket</th>
              <th className="px-6 py-4 font-medium">Aylık Kota (Kullanım)</th>
              <th className="px-6 py-4 font-medium">Durum</th>
              <th className="px-6 py-4 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center">Henüz müşteri firması yok.</td></tr>
            ) : tenants.map((tenant) => {
              const usage = tenant.current_usage;
              const totalLimit = tenant.quota_limit;
              const ratio = totalLimit === null ? 0 : totalLimit > 0 ? usage / totalLimit : 1;
              const isWarning = ratio > 0.8;
              const isDanger = ratio >= 1;
              
              return (
                <tr key={tenant.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/admin/tenants/${tenant.id}`} className="font-semibold text-white hover:text-indigo-400 transition-colors">
                      {tenant.name}
                    </Link>
                    <div className="text-xs text-zinc-500 mt-1">{tenant.owner_email || 'Kullanıcı atanmamış'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      {tenant.plan_name || 'Yok'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="text-white font-medium">{usage} <span className="text-zinc-600 font-normal">/ {totalLimit ?? 'Belirsiz'}</span></div>
                      <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tenant.subscription_status === 'active' ? (
                      <span className="text-emerald-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> Aktif</span>
                    ) : tenant.subscription_status === 'canceled' ? (
                      <span className="text-red-400">İptal</span>
                    ) : tenant.subscription_status === 'past_due' ? (
                      <span className="text-amber-400">Ödeme bekliyor</span>
                    ) : (
                      <span className="text-zinc-500 capitalize">{tenant.subscription_status}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/tenants/${tenant.id}`}>
                        <Button variant="outline" size="sm" className="border-indigo-600/40 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 text-xs">
                          Detay
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => openManageModal(tenant)} className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 text-xs">
                        Hızlı Düzenle
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{selectedTenant.name} Yönetimi</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Paket Ataması</label>
                <select value={editPlanId} onChange={e => setEditPlanId(e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white">
                  <option value="">Paket Yok</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₺{p.monthlyPrice})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Abonelik Durumu</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white">
                  <option value="active">Aktif</option>
                  <option value="past_due">Ödeme bekliyor</option>
                  <option value="canceled">İptal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Bonus Kota Ekle</label>
                <input type="number" min={0} max={2147483647} step={1} value={editBonus} onChange={e => setEditBonus(Number(e.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white" />
                <p className="text-xs text-zinc-500 mt-1">Paket limitine ek olarak verilecek ekstra teklif hakkı.</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Değişiklikleri Kaydet</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
