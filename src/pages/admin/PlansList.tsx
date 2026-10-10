import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Package, Plus, X } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export function PlansList() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [limit, setLimit] = useState(0);
  const [monthlyIfcLimit, setMonthlyIfcLimit] = useState(5);
  const [ifcMaxFileMb, setIfcMaxFileMb] = useState(100);
  const [ifcMaxConcurrent, setIfcMaxConcurrent] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const loadPlans = () => {
    setLoading(true);
    fetchWithAuth('/api/admin/plans')
      .then(res => res.json())
      .then(setPlans)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
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
    } else {
      setEditingPlan(null);
      setName('');
      setPrice(0);
      setLimit(15);
      setMonthlyIfcLimit(5);
      setIfcMaxFileMb(100);
      setIfcMaxConcurrent(1);
      setIsActive(true);
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
      isActive
    };

    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PATCH' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success(editingPlan ? "Paket güncellendi." : "Yeni paket oluşturuldu.");
        setIsModalOpen(false);
        loadPlans();
      } else {
        toast.error("İşlem başarısız oldu.");
      }
    } catch (e) {
      toast.error("Sistemsel bir hata oluştu.");
    }
  };

  return (
    <PageContainer>
      <div className="flex items-start justify-between">
        <PageHeader title="Paket Yönetimi" description="SaaS platformunuzdaki abonelik paketlerini, fiyatları ve kotaları yönetin." icon={Package} />
        <Button onClick={() => openModal()} className="bg-indigo-600 text-white hover:bg-indigo-700 mt-2">
          <Plus size={16} className="mr-2" /> Yeni Paket Ekle
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mt-4">
        {loading ? (
          <div className="text-zinc-500">Yükleniyor...</div>
        ) : plans.map((plan) => (
          <div key={plan.id} className={`rounded-xl border p-6 flex flex-col ${plan.isActive ? 'border-zinc-700 bg-zinc-900/60' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              {!plan.isActive && <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Pasif</span>}
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₺{plan.monthlyPrice}</span>
                <span className="text-zinc-500 text-sm">/ ay</span>
              </div>
            </div>

            <ul className="space-y-3 flex-1">
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <strong className="text-white">{plan.monthlyQuoteLimit}</strong> Aylık Teklif Kotası
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <strong className="text-white">{plan.monthlyIfcLimit ?? 5}</strong> Aylık IFC Analizi
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Maks <strong className="text-white">{plan.ifcMaxFileMb ?? 100} MB</strong> IFC Boyutu
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Sınırsız Kullanıcı Ekleme
              </li>
            </ul>

            <Button onClick={() => openModal(plan)} variant="outline" className="w-full mt-6 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800">
              Düzenle
            </Button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{editingPlan ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Paket Adı</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500" placeholder="Örn: Kurumsal" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Aylık Fiyat (₺)</label>
                  <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Aylık Teklif Kotası</label>
                  <input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Aylık IFC Kotası</label>
                  <input type="number" min={0} value={monthlyIfcLimit} onChange={e => setMonthlyIfcLimit(Number(e.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Maks IFC (MB)</label>
                  <input type="number" min={1} max={500} value={ifcMaxFileMb} onChange={e => setIfcMaxFileMb(Number(e.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Eşzamanlı İş</label>
                  <input type="number" min={1} max={10} value={ifcMaxConcurrent} onChange={e => setIfcMaxConcurrent(Number(e.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-zinc-950" />
                <label htmlFor="isActive" className="text-sm text-zinc-300">Aktif (Satışa ve Kullanıma Açık)</label>
              </div>
              {!isActive && <p className="text-xs text-red-400 mt-1">Dikkat: Bu paket pasife alındığında, bu paketi kullanan müşteriler etkilenmez ancak yeni atanmalarda görünmez.</p>}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Kaydet</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
