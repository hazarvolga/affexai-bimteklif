import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { 
  Users, 
  Target, 
  MoreVertical,
  Plus,
  BrainCircuit,
  Zap,
  ChevronRight,
  Mail,
  Phone
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

const STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-zinc-500' },
  { id: 'contacted', label: 'İletişim', color: 'bg-blue-500' },
  { id: 'quotation_sent', label: 'Teklif Gönderildi', color: 'bg-amber-500' },
  { id: 'negotiation', label: 'Pazarlık', color: 'bg-purple-500' },
  { id: 'won', label: 'Kazanıldı', color: 'bg-emerald-500' },
  { id: 'lost', label: 'Kaybedildi', color: 'bg-red-500' }
];

export function CRM() {
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'leads'>('pipeline');
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({ clientId: '', name: '', value: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [dealsRes, leadsRes, clientsRes] = await Promise.all([
        fetch(`/api/crm/pipeline`, { headers }),
        fetch(`/api/crm/leads`, { headers }),
        fetch(`/api/clients`, { headers }),
      ]);

      const dealsData = dealsRes.ok ? await dealsRes.json() : [];
      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const clientsData = clientsRes.ok ? await clientsRes.json() : [];

      setDeals(dealsData);
      setLeads(leadsData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (e) {
      toast.error("CRM verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!newDeal.clientId || !newDeal.name) {
      toast.error("Müşteri ve fırsat adı zorunludur.");
      return;
    }
    setCreatingDeal(true);
    try {
      const response = await fetchWithAuth("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newDeal.clientId, name: newDeal.name, value: newDeal.value || undefined }),
      });
      if (!response.ok) throw new Error();
      toast.success("Fırsat oluşturuldu.");
      setDealDialogOpen(false);
      setNewDeal({ clientId: '', name: '', value: '' });
      fetchData();
    } catch (e) {
      toast.error("Fırsat oluşturulamadı.");
    } finally {
      setCreatingDeal(false);
    }
  };

  const analyzeDeal = async (dealId: string) => {
    toast.info("AI Analizi başlatıldı...");
    try {
      await fetchWithAuth("/api/crm/analyze-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId })
      });
      toast.success("AI Analizi tamamlandı");
      fetchData();
    } catch (e) {
      toast.error("Analiz başarısız.");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
             <Zap className="animate-pulse text-orange-500" size={32} />
             <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase">CRM Yükleniyor...</span>
          </div>
        </div>
      );
    }

    if (activeTab === 'pipeline') {
      if (deals.length === 0) {
        return (
          <EmptyState 
            icon={Target}
            title="Pipeline Henüz Boş"
            description="Satış sürecinizi yönetmek için yeni fırsatlar ekleyin veya tekliflerinizi buraya aktarın."
            actionText="YENİ FIRSAT EKLE"
            onAction={() => setDealDialogOpen(true)}
          />
        );
      }

      return (
        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <div className="flex gap-4 min-w-[1200px]">
            {STAGES.map(stage => (
              <div key={stage.id} className="flex-1 min-w-[200px]">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", stage.color)}></span>
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stage.label}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-zinc-800 text-zinc-500 bg-transparent px-1.5 h-4">
                    {deals.filter(d => d.stage === stage.id).length}
                  </Badge>
                </div>
                
                <div className="space-y-3 min-h-[500px] p-2 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                  {deals.filter(d => d.stage === stage.id).map(deal => (
                    <Card key={deal.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group relative overflow-hidden shadow-none">
                      <div className={cn(
                        "absolute top-0 right-0 w-1 h-full",
                        deal.riskLevel === 'high' ? 'bg-red-500' : 
                        deal.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      )}></div>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="text-xs font-bold text-white group-hover:text-orange-500 transition-colors line-clamp-1">{deal.name}</h4>
                           <Button variant="ghost" size="icon" className="h-4 w-4 text-zinc-600">
                             <MoreVertical size={12} />
                           </Button>
                        </div>
                        <div className="flex items-center gap-1.5 mb-3">
                           <span className="text-[10px] font-black text-white">{Number(deal.value).toLocaleString()} <span className="text-[8px] text-zinc-600">TRY</span></span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1">
                             <BrainCircuit size={10} className="text-orange-500" />
                             <span className="text-[9px] font-black text-zinc-500">%{Math.round(Number(deal.probability) * 100)}</span>
                           </div>
                           <Badge className="text-[8px] h-3.5 px-1 bg-zinc-800 text-zinc-500 font-black tracking-widest uppercase border-none">{stage.label}</Badge>
                        </div>
                        <Progress value={Number(deal.probability) * 100} className="h-0.5 bg-zinc-800" />
                        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                           <div className="flex -space-x-1">
                             {[1, 2].map(i => (
                               <div key={i} className="w-5 h-5 rounded-full border border-zinc-900 bg-zinc-800 flex items-center justify-center shadow-sm">
                                 <span className="text-[8px] font-bold text-zinc-400">U{i}</span>
                               </div>
                             ))}
                           </div>
                           <div className="flex items-center gap-1">
                             <Button variant="ghost" size="icon" title="3D IFC Modeli Yükle & Teklif Hazırla" className="h-6 w-6 text-zinc-500 hover:text-primary" onClick={(e) => { e.stopPropagation(); navigate(`/app/dosyadan-teklif-demo?dealId=${deal.id}`); }}>
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                             </Button>
                             <Button variant="ghost" size="icon" title="AI Analizi" className="h-6 w-6 text-zinc-500 hover:text-orange-500" onClick={(e) => { e.stopPropagation(); analyzeDeal(deal.id); }}>
                               <Zap size={12} />
                             </Button>
                             <Button variant="ghost" size="icon" title="Detay" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => navigate(`/app/crm/deals/${deal.id}`)}>
                               <ChevronRight size={14} />
                             </Button>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="ghost" className="w-full h-8 border border-dashed border-zinc-800 text-[10px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest">
                    <Plus size={10} className="mr-1" /> KART EKLE
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      if (leads.length === 0) {
        return (
          <EmptyState 
            icon={Users}
            title="Henüz Potansiyel Müşteri Yok"
            description="Leads havuzunuzu doldurarak satış pipeline'ınızı besleyin. AI size pazar analizi ile yardımcı olabilir."
            actionText="YENİ LEAD EKLE"
            onAction={() => {}}
          />
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map(lead => (
            <Card key={lead.id} className="bg-zinc-900 border-zinc-800 overflow-hidden group shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center border border-orange-500/20">
                    <Users className="text-orange-500" size={20} />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500 uppercase tracking-widest font-black h-4 px-1.5">{lead.source}</Badge>
                </div>
                <h3 className="text-sm font-black text-white mb-1 group-hover:text-orange-500 transition-colors uppercase tracking-tight">{lead.name}</h3>
                <p className="text-xs text-zinc-500 mb-4 font-medium">{lead.contactPerson || "İletişim kişisi belirtilmedi"}</p>
                <div className="space-y-2 mb-6 border-t border-zinc-800/50 pt-4">
                   <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">
                     <Mail size={12} className="text-zinc-600" /> {lead.email || "Email yok"}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">
                     <Phone size={12} className="text-zinc-600" /> {lead.phone || "Telefon yok"}
                   </div>
                </div>
                <Button variant="outline" className="w-full text-[10px] h-8 border-zinc-800 hover:bg-orange-600 hover:text-white transition-all font-black uppercase tracking-widest">
                  FIRSATA DÖNÜŞTÜR
                </Button>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-zinc-900/30 border-dashed border-zinc-800 flex items-center justify-center p-8 cursor-pointer hover:bg-zinc-900/50 transition-colors shadow-none">
            <div className="text-center">
              <Plus className="mx-auto text-zinc-600 mb-2 shadow-sm" size={24} />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Yenİ Lead Ekle</p>
            </div>
          </Card>
        </div>
      );
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Müşteriler & Fırsatlar (CRM)" 
        description="Müşteri portföyünüzü ve devam eden satış fırsatlarınızı yönetin."
        icon={Target}
        actions={
          <>
            <div className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex gap-1 mr-2">
              <Button 
                variant={activeTab === 'pipeline' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="text-[10px] font-black h-8 uppercase tracking-widest" 
                onClick={() => setActiveTab('pipeline')}
              >
                Pipeline
              </Button>
              <Button 
                variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="text-[10px] font-black h-8 uppercase tracking-widest" 
                onClick={() => setActiveTab('leads')}
              >
                Leads
              </Button>
            </div>
            <Button
              className="bg-orange-700 hover:bg-orange-800 text-white font-black text-xs uppercase tracking-widest gap-2 h-10 px-6"
              onClick={() => setDealDialogOpen(true)}
            >
              <Plus size={16} /> Yeni Fırsat
            </Button>
          </>
        }
      />

      {renderContent()}

      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-zinc-900 bg-zinc-900/50">
            <DialogTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Target size={18} className="text-orange-500" /> Yeni Fırsat
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="deal-client" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Müşteri</Label>
              <Select value={newDeal.clientId} onValueChange={(v) => setNewDeal({ ...newDeal, clientId: v })}>
                <SelectTrigger id="deal-client" className="h-12 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} className="text-xs font-bold">{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Fırsat Adı" labelClassName="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <Input
                placeholder="Örn: Vega Residence B Blok Kaba İnşaat"
                value={newDeal.name}
                className="h-12 bg-zinc-900 border-zinc-800 focus:border-orange-500/50"
                onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
              />
            </Field>
            <Field label="Tahmini Değer (TRY)" labelClassName="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <Input
                type="number"
                placeholder="Örn: 500000"
                value={newDeal.value}
                className="h-12 bg-zinc-900 border-zinc-800 focus:border-orange-500/50"
                onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-900">
            <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-black text-[10px] uppercase tracking-widest h-11 px-6" onClick={() => setDealDialogOpen(false)}>İptal</Button>
            <Button
              className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-11 px-8 shadow-lg shadow-orange-900/20"
              onClick={handleCreateDeal}
              disabled={creatingDeal}
            >
              {creatingDeal ? 'Kaydediliyor...' : 'Fırsatı Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
