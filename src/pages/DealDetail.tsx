import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Target, 
  Clock, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  BrainCircuit,
  MessageSquare,
  Zap,
  CheckCircle2,
  Phone,
  Mail,
  MoreVertical,
  ArrowRight,
  History,
  Send,
  FileText,
  Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { StatusBadge } from '@/components/business/StatusBadge';

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUpMsg, setFollowUpMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDealData();
  }, [id]);

  const fetchDealData = async () => {
    setLoading(true);
    try {
      // In a real app we'd have a specific GET /api/crm/deals/:id
      // For now we'll fetch all and find, but ideally we'd add the endpoint
      const res = await fetch(`/api/crm/pipeline?companyId=${deal?.companyId || ''}`);
      const deals = await res.json();
      const foundDeal = deals.find((d: any) => d.id === id);
      
      if (foundDeal) {
        setDeal(foundDeal);
        const activitiesRes = await fetch(`/api/crm/deals/${id}/activities`);
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }
    } catch (e) {
      toast.error("Veriler alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeDeal = async () => {
    toast.info("AI Analiz ediliyor...");
    try {
      const res = await fetch("/api/crm/analyze-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: id })
      });
      const data = await res.json();
      setDeal({ ...deal, ...data });
      toast.success("Analiz güncellendi.");
    } catch (e) {
      toast.error("Analiz başarısız.");
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Zap className="animate-pulse text-orange-500" size={48} />
    </div>
  );

  if (!deal) return <div className="p-10 text-white">Deal bulunamadı.</div>;

  return (
    <PageContainer>
      <PageHeader
        title={deal.name}
        description={`Fırsat ID: #${deal.id.split('-')[0]} | Aşama: ${deal.stage}`}
        icon={Briefcase}
        backButton={{
          label: "CRM'e Dön",
          onClick: () => navigate("/app/crm")
        }}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold text-xs h-10 px-6">
              DÜZENLE
            </Button>
            <Button onClick={analyzeDeal} className="bg-white hover:bg-orange-500 text-black hover:text-white font-black text-xs h-10 px-6 gap-2 transition-all">
              <BrainCircuit size={18} /> AI ANALİZİ
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Details & Insights */}
        <div className="lg:col-span-8 space-y-8">
          {/* AI Insights Card */}
          <Card className="bg-zinc-900 border-emerald-500/20 shadow-2xl shadow-emerald-950/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="text-emerald-500" size={18} /> DEAL INTELLIGENCE
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Risk Durumu</p>
                     <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase text-white",
                          deal.riskLevel === 'high' ? 'bg-red-500' : 
                          deal.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        )}>
                          {deal.riskLevel}
                        </span>
                     </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Önerilen Aksiyon</p>
                     <p className="text-xs font-bold text-white flex items-center gap-2">
                       <ArrowRight size={14} className="text-orange-500" />
                       Teklifin revize edilmesi ve marjın %15 üzerine çekilmesi önerilir.
                     </p>
                  </div>
               </div>

               <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800 shadow-inner">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MessageSquare size={12} /> Stratejik Analiz
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed italic">
                    "{deal.aiInsights || "AI analizi yapılmadı. Lütfen yukarıdaki butona tıklayarak analizi başlatın."}"
                  </p>
               </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="text-zinc-500" size={18} /> AKTİVİTE GEÇMİŞİ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[400px]">
                  <div className="p-6 space-y-8 relative">
                     <div className="absolute left-8 top-8 bottom-8 w-px bg-zinc-800"></div>
                     
                     {activities.length > 0 ? activities.map((activity, idx) => (
                        <div key={activity.id} className="relative pl-10">
                           <div className="absolute left-[-5px] top-0 w-3 h-3 rounded-full bg-zinc-900 border-2 border-orange-500 z-10"></div>
                           <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{activity.type}</span>
                                <span className="text-[9px] text-zinc-600 font-mono tracking-tighter">{new Date(activity.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-zinc-300 font-medium">{activity.description}</p>
                           </div>
                        </div>
                     )) : (
                        <div className="text-center py-10 opacity-30">
                           <History size={48} className="mx-auto mb-4" />
                           <p className="text-xs font-black uppercase tracking-widest">Henüz aktivite yok</p>
                        </div>
                     )}
                  </div>
               </ScrollArea>
               <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 rounded-b-xl">
                  <div className="flex gap-2">
                     <input 
                      type="text" 
                      placeholder="Not veya aktivite ekle..." 
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-4 text-xs text-white focus:outline-none focus:border-orange-500"
                     />
                     <Button className="bg-orange-600 hover:bg-orange-700 h-9 px-4">
                       <Send size={16} />
                     </Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Mini Widgets */}
        <div className="lg:col-span-4 space-y-6">
           {/* Link to Quotation */}
           {deal.quotationId && (
             <Card 
              className="bg-orange-600 hover:bg-orange-700 border-none cursor-pointer transition-all group"
              onClick={() => navigate(`/app/quotes/${deal.quotationId}`)}
             >
                <CardContent className="p-6">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-orange-200 uppercase tracking-widest">Bağlı Teklif</p>
                         <h3 className="text-sm font-black text-white">TEKLİF DOSYASI</h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <FileText className="text-white" size={20} />
                      </div>
                   </div>
                </CardContent>
             </Card>
           )}

           {/* Quick Actions */}
           <Card className="bg-zinc-900 border-zinc-800">
             <CardHeader className="pb-3">
               <CardTitle className="text-[10px] font-black text-zinc-500 uppercase tracking-widest inline-flex items-center gap-2">
                 <Zap size={10} className="text-orange-500" /> HIZLI TAKİP SİSTEMİ
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-between h-10 border-zinc-800 text-[10px] font-black uppercase tracking-widest group">
                   <span>Email Takibi Başlat</span>
                   <Mail size={14} className="text-zinc-600 group-hover:text-blue-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-10 border-zinc-800 text-[10px] font-black uppercase tracking-widest group">
                   <span>Arama Kaydı Oluştur</span>
                   <Phone size={14} className="text-zinc-600 group-hover:text-emerald-500" />
                </Button>
                <div className="pt-4 border-t border-zinc-800">
                   <p className="text-[9px] font-bold text-zinc-500 mb-2">AŞAMA DEĞİŞTİR</p>
                   <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" className="h-8 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 uppercase">WON</Button>
                      <Button variant="ghost" className="h-8 text-[9px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500 uppercase">LOST</Button>
                   </div>
                </div>
             </CardContent>
           </Card>

           {/* Follow-up Suggestion */}
           <Card className="bg-zinc-900/50 border-orange-500/10 border-dashed">
              <CardContent className="p-6 text-center">
                 <div className="w-12 h-12 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="text-orange-500" size={24} />
                 </div>
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">AI Takip Asistanı</p>
                 <p className="text-[11px] text-zinc-500 mb-6 leading-relaxed">
                   Müşteri 3 gündür dönüş yapmadı. Nazik bir takip mesajı oluşturmak ister misiniz?
                 </p>
                 <Button className="w-full h-9 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] uppercase tracking-widest">
                   MESAJ OLUŞTUR
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </PageContainer>
  );
}
