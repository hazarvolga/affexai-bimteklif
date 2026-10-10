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
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-4">
        {loading ? (
          <div className="text-zinc-500">Yükleniyor...</div>
        ) : plans.map((plan) => (
          <div key={plan.id} className={`rounded-xl border p-5 flex flex-col justify-between ${plan.isActive ? 'border-zinc-700 bg-zinc-900/60' : 'border-red-500/20 bg-red-500/5'}`}>
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <h3 className="text-base font-bold text-white leading-tight">{plan.name}</h3>
                {!plan.isActive ? (
                  <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Pasif</span>
                ) : plan.monthlyPrice === 0 ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20 shrink-0">Trial</span>
                ) : plan.name.includes("Standart Denetçi") ? (
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20 shrink-0">Mikro</span>
                ) : plan.name.includes("5D BIM") ? (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded border border-indigo-400/20 shrink-0">Popüler</span>
                ) : plan.name.includes("Kurumsal") ? (
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20 shrink-0">Kurumsal</span>
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
                          {plan.monthlyQuoteLimit >= 99999 ? 'Sınırsız' : `${plan.monthlyQuoteLimit} Adet`}
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
                      {plan.monthlyIfcLimit ? `${plan.monthlyIfcLimit} Adet` : 'Sınırsız'}
                    </strong>{' '}
                    {plan.monthlyQuoteLimit === 0 ? 'İsimlendirme Denetimi' : 'IFC Analizi'}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    Maks <strong className="text-white">{plan.ifcMaxFileMb ?? 50} MB</strong> Dosya
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

            <Button onClick={() => openModal(plan)} variant="outline" className="w-full mt-5 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 text-xs py-1.5">
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
