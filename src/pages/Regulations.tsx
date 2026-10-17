import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import { 
  RefreshCw, 
  Calendar, 
  ArrowUpRight, 
  Loader2,
  FileSearch,
  MessageSquare,
  ShieldCheck,
  Zap,
  Scale
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SourceIntelligencePanel } from '@/components/smartcheck/SourceIntelligencePanel';
import { RegulationImpactPanel } from '@/components/smartcheck/RegulationImpactPanel';

interface RegulationAlert {
  id: string;
  title: string;
  category: string;
  effectiveDate: string;
  impactLevel: 'low' | 'medium' | 'high';
  summary: string;
  affectedModules: string[];
  actionSuggestion?: string;
  createdAt: string;
  sourceUrl?: string;
}

export function Regulations() {
  const [alerts, setAlerts] = useState<RegulationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [sourceRefresh, setSourceRefresh] = useState(0);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/regulations/alerts");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("Mevzuat verileri yüklenemedi.");
      setAlerts(data);
    } catch (e) {
      toast.error("Mevzuat verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetchWithAuth("/api/regulations/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaynak okunamadı.");
      toast.success(data.idempotent ? "Bu belge zaten inceleme kuyruğunda veya incelenmiş." : "Belge insan incelemesi için kuyruğa alındı; hiçbir kural değiştirilmedi.");
      setLastFetchedAt(new Date().toISOString());
      setSourceRefresh(value => value + 1);
      fetchAlerts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Senkronizasyon başarısız.");
    } finally {
      setSyncing(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      tax: "Vergi / Harç",
      labor: "İşçilik / SGK",
      material: "Malzeme Birim",
      procurement: "Kamu İhale",
      legal: "Hukuki Mevzuat"
    };
    return labels[cat] || cat;
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Mevzuat İstihbaratı" 
        description="Resmî kaynak değişiklikleri advisory olarak izlenir; reviewer onayı olmadan tekliflere veya kanonik kurallara uygulanmaz."
        icon={Scale}
        actions={
          <Button 
            onClick={handleSync} 
            disabled={syncing || !sourceUrl.trim()}
            className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-10 px-6 gap-2 shadow-lg shadow-orange-900/20"
          >
            {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Belgeyi incelemeye al
          </Button>
        }
      />

      <section className="mb-6 space-y-2">
        <label htmlFor="regulation-source" className="text-sm text-foreground dark:text-muted-foreground">Resmî Gazete HTML belge bağlantısı</label>
        <input id="regulation-source" type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://www.resmigazete.gov.tr/eskiler/2026/10/20261011-4.htm" className="w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        <p className="text-xs text-muted-foreground">UTF-8 HTML bağlantısından gerçek belge okunur ve kaynak özeti inceleme kuyruğuna alınır. Otomatik güncel mevzuat keşfi, hukuki geçerlilik veya lisans doğrulaması yapılmaz.</p>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Zap size={12} className="text-orange-500" /> Son Mevzuat Gelişmeleri
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Son belge okuma: {lastFetchedAt ? new Date(lastFetchedAt).toLocaleTimeString("tr-TR") : "Bu oturumda yapılmadı"}</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-card rounded-2xl border border-border border-dashed">
              <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Veriler Analiz Ediliyor...</p>
            </div>
          ) : alerts.length === 0 ? (
            <Card className="bg-card border-border border-dashed rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center p-16 text-muted-foreground text-center">
                <FileSearch size={48} className="mb-6 opacity-10" />
                <p className="text-sm font-bold text-muted-foreground mb-2">Henüz bir mevzuat güncellemesi kayıtlı değil.</p>
                <p className="text-xs text-muted-foreground mb-6 max-w-xs">Kaynak değişikliğini önce advisory olarak inceleyin; reviewer onayı olmadan hiçbir kural veya fiyat değişmez.</p>
                <Button onClick={handleSync} disabled={syncing || !sourceUrl.trim()} className="bg-surface-elevated hover:bg-zinc-700 text-foreground dark:text-muted-foreground font-bold text-[10px] tracking-widest uppercase h-9 px-6">Belgeyi İncelemeye Al</Button>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={cn(
                  "bg-card border-border hover:border-border transition-all duration-300 group overflow-hidden",
                  alert.impactLevel === 'high' && "border-l-4 border-l-red-500/50",
                  alert.impactLevel === 'medium' && "border-l-4 border-l-amber-500/50",
                  alert.impactLevel === 'low' && "border-l-4 border-l-emerald-500/50"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-background border-border text-muted-foreground group-hover:border-border transition-colors">
                          {getCategoryLabel(alert.category)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 font-mono">
                          <Calendar size={12} className="text-foreground" />
                          {new Date(alert.effectiveDate).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-foreground group-hover:text-orange-500 transition-colors uppercase leading-tight">
                        {alert.title}
                      </h4>
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-black tracking-widest px-2 py-0.5 uppercase border",
                      alert.impactLevel === 'high' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      alert.impactLevel === 'medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                      {alert.impactLevel} Impact Risk
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium">
                    {alert.summary}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {alert.affectedModules?.map((mod, i) => (
                      <span key={i} className="text-[10px] font-black bg-background text-muted-foreground px-2 py-1 rounded border border-border uppercase tracking-widest">
                        #{mod}
                      </span>
                    ))}
                  </div>

                  {alert.actionSuggestion && (
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 flex gap-4 items-start mb-2 group-hover:bg-orange-500/[0.08] transition-colors">
                      <div className="p-1.5 bg-orange-600/20 rounded-lg shrink-0">
                        <ShieldCheck size={16} className="text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5">Maliyetler Üzerinde AI Analizi</p>
                        <p className="text-xs text-foreground dark:text-muted-foreground font-medium leading-relaxed">{alert.actionSuggestion}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-6 pt-5 border-t border-border">
                    {alert.sourceUrl ? <a href={alert.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-orange-400">Resmî kaynak <ArrowUpRight size={14} /></a> : <span className="text-xs text-muted-foreground">Eski kayıtta kaynak bağlantısı bulunmuyor.</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right Column: Status & Sources */}
        <div className="space-y-8">
          <SourceIntelligencePanel key={sourceRefresh} />
          <RegulationImpactPanel />

          <Card className="bg-card border-border overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-600/20 transition-all duration-700"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/20 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground leading-none">Compliance AI</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-tighter mt-1">Oto-Revizyon Sistemi</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed font-medium">
                Mevzuat diff'i tespit edildiğinde, reviewer onayından sonra etkilenen teklifler için advisory revizyon önerileri ve maliyet simülasyonları hazırlanır.
              </p>
              <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border group-hover:border-border transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Oto-Analiz</span>
                  <span className="text-[10px] text-amber-500 font-black uppercase flex items-center gap-1.5 tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ADVISORY
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">İnsan incelemesi gerekli</span>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-br from-zinc-900 to-[#09090b] p-6 rounded-2xl border border-border text-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-surface-elevated opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <MessageSquare size={32} className="text-foreground mx-auto mb-4 group-hover:text-orange-500 transition-colors" />
             <h5 className="text-[11px] font-black text-foreground mb-2 uppercase tracking-widest">Hukuki Danışmanlık?</h5>
             <p className="text-[10px] text-muted-foreground mb-6 px-2 font-medium leading-relaxed uppercase"> Karmaşık mevzuat sorularınız için yetkili bir uzmana danışın. Uygulama içi danışman hizmeti bağlı değildir.</p>
             <Button disabled variant="outline" className="w-full text-[10px] font-black h-10 border-border bg-background hover:bg-card hover:text-foreground tracking-widest uppercase transition-all">
                Danışman hizmeti bağlı değil
             </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
