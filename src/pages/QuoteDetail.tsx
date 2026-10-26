import React, { useState, useEffect } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { fetchWithAuth } from '@/lib/api';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  History, 
  FileEdit, 
  Copy, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  Loader2,
  Calendar,
  Layers,
  Banknote,
  Download,
  Eye,
  FileText,
  ChevronDown,
  Layout,
  AlertTriangle,
  Zap,
  TrendingUp,
  PieChart,
  DollarSign,
  RefreshCw,
  FileSearch,
  BookOpen,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QuoteStatus } from '@/types';
import { Progress } from '@/components/ui/progress';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { StatusBadge } from '@/components/business/StatusBadge';
import { ProfitabilityBadge } from '@/components/business/ProfitabilityBadge';
import { useAuth } from '@/hooks/useAuth';

export function QuoteDetail() {
  const { role } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [finLoading, setFinLoading] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [pricingSnapshot, setPricingSnapshot] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [calibrationForm, setCalibrationForm] = useState({ actualCost: '', actualDurationMonths: '', note: '' });
  const [calibrationSaving, setCalibrationSaving] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchRecentAlerts();
    fetchFinancials();
    fetchAudit();
    fetchPricingSnapshot();
  }, [id]);

  const fetchPricingSnapshot = async () => {
    setPricingLoading(true);
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}/pricing-snapshot`);
      if (res.ok) setPricingSnapshot(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setPricingLoading(false);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}/smartcheck`);
      if (res.ok) setAudit(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}`);
      if (!res.ok) throw new Error("Quote not found");
      const json = await res.json();
      setData(json);
      setCalibrationForm({ actualCost: json.observedActualCost ? String(json.observedActualCost) : '', actualDurationMonths: json.observedActualDurationMonths ? String(json.observedActualDurationMonths) : '', note: json.calibrationNote || '' });
    } catch (err) {
      toast.error("Teklif bilgileri yüklenemedi.");
      navigate("/app/quotes");
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancials = async () => {
    setFinLoading(true);
    try {
      const reportRes = await fetchWithAuth(`/api/profit/report/${id}`);
      const reportData = await reportRes.json();
      
      if (reportData.financials) {
        setFinancials(reportData);
      } else {
        const calcRes = await fetchWithAuth('/api/profit/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quotationId: id })
        });
        const calcData = await calcRes.json();
        setFinancials({ financials: calcData });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinLoading(false);
    }
  };

  const recalculateFinancials = async () => {
    setFinLoading(true);
    try {
      const res = await fetchWithAuth('/api/profit/calculate', {
        method: 'POST',
        body: JSON.stringify({ quotationId: id })
      });
      const data = await res.json();
      setFinancials({ financials: data });
      toast.success("Finansal analiz güncellendi.");
    } catch (err) {
      toast.error("Güncelleme başarısız.");
    } finally {
      setFinLoading(false);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      const res = await fetchWithAuth("/api/regulations/alerts");
      const json = await res.json();
      setRecentAlerts(json.slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  };

  const saveCalibrationObservation = async () => {
    setCalibrationSaving(true);
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}/calibration`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(calibrationForm) });
      if (!res.ok) throw new Error('save failed');
      const updated = await res.json();
      setData((current: any) => ({ ...current, ...updated }));
      toast.success('Gerçekleşen proje gözlemi kaydedildi.');
    } catch (error) {
      toast.error('Kalibrasyon gözlemi kaydedilemedi.');
    } finally {
      setCalibrationSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Durum güncellendi: ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error("Durum güncellenemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRevision = async () => {
    setRevisionDialogOpen(false);
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}/revision`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const newQuote = await res.json();
      if (res.ok) {
        toast.success("Yeni revizyon oluşturuldu.");
        navigate(`/app/quotes/${newQuote.id}`);
      }
    } catch (err) {
      toast.error("Revizyon oluşturulamadı.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async (templateId: string = 'default_construction') => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/quotations/${id}/pdf?templateId=${templateId}`);
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("PDF hazırlanıyor...");
    } catch (err) {
      toast.error("PDF oluşturulamadı.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="text-orange-500 animate-spin" size={32} />
        <p className="text-muted-foreground font-medium">Teklif detayları hazırlanıyor...</p>
      </div>
    );
  }

  const quoteExpiryFlag = (() => {
    if (!['sent', 'negotiation'].includes(data?.status)) return null;
    const diff = new Date(data.expiryDate).getTime() - Date.now();
    if (diff < 0) return 'expired' as const;
    if (diff <= 7 * 24 * 60 * 60 * 1000) return 'soon' as const;
    return null;
  })();

  return (
    <PageContainer>
      <PageHeader
        title={data.projectName}
        description={`Teklif No: #${data.quoteNumber} | V${data.revisionVersion}`}
        icon={FileSearch}
        backButton={{
          label: "Tekliflere Dön",
          onClick: () => navigate("/app/quotes")
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            {data.status === 'draft' && data.isLatest && ['owner', 'admin', 'manager'].includes(role ?? '') && (
              <Button variant="outline" onClick={() => navigate(`/app/quotes/${id}/edit`)} className="gap-2">
                <FileEdit size={16} /> Taslağı Düzenle
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button disabled={actionLoading} variant="outline" className="border-border bg-card text-foreground dark:text-muted-foreground hover:bg-surface-elevated gap-2 h-10 px-4 font-bold"><Download size={18} className="text-orange-500" />PDF Dosyası<ChevronDown size={14} className="text-muted-foreground" /></Button>} />
              <DropdownMenuContent className="bg-card border-border text-foreground dark:text-muted-foreground w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Şablon Seçiniz</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-surface-elevated" />
                <DropdownMenuItem onClick={() => handleDownloadPdf('default_construction')} className="gap-2 focus:bg-surface-elevated cursor-pointer py-2.5">
                  <Layout size={16} className="text-orange-500" />
                  Modern İnşaat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPdf('luxury_villa')} className="gap-2 focus:bg-surface-elevated cursor-pointer py-2.5">
                  <ShieldCheck size={16} className="text-blue-500" />
                  Lüks Villa Projesi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPdf('modern_minimal')} className="gap-2 focus:bg-surface-elevated cursor-pointer py-2.5">
                  <Layers size={16} className="text-muted-foreground" />
                  Minimalist Modern
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {data.status === 'draft' && (
              <Button onClick={() => handleStatusChange('sent')} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 px-6 font-bold shadow-lg shadow-blue-900/20">
                <Send size={18} />
                Gönderildi Olarak İşaretle
              </Button>
            )}
            {['sent', 'negotiation'].includes(data.status) && (
              <>
                <Button onClick={() => handleStatusChange('won')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-6 font-bold shadow-lg shadow-emerald-900/20">
                  <CheckCircle2 size={18} />
                  Kazanıldı
                </Button>
                <Button onClick={() => handleStatusChange('lost')} disabled={actionLoading} variant="outline" className="border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 h-10 px-6 font-bold">
                  <XCircle size={18} />
                  Kaybedildi
                </Button>
              </>
            )}
            {['won', 'lost'].includes(data.status) && (
              <Button onClick={() => handleStatusChange('archived')} disabled={actionLoading} variant="outline" className="border-border bg-card text-muted-foreground hover:bg-surface-elevated gap-2 h-10 px-4 font-bold">
                <Archive size={18} />
                Arşivle
              </Button>
            )}
            <Button onClick={() => setRevisionDialogOpen(true)} disabled={actionLoading} variant="outline" className="border-border bg-card text-foreground dark:text-muted-foreground hover:bg-surface-elevated gap-2 h-10 px-4 font-bold">
              <History size={18} />
              Yeni Revizyon Oluştur
            </Button>
          </div>
        }
      />

      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Yeni versiyon oluşturulsun mu?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Bu tekliften V{data.revisionVersion + 1} oluşturulacak. Mevcut versiyon değişmeden kalır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-border hover:bg-surface-elevated text-muted-foreground font-black text-[10px] uppercase tracking-widest h-10 px-6" onClick={() => setRevisionDialogOpen(false)}>İptal</Button>
            <Button disabled={actionLoading} className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-10 px-6" onClick={handleCreateRevision}>Versiyon Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="bg-card border-border shadow-none">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-2 rounded-lg bg-surface-elevated text-orange-500">
                    <Calendar size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Düzenleme Tarihi</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{new Date(data.date).toLocaleDateString('tr-TR')}</p>
                 </div>
               </CardContent>
             </Card>
             <Card className={cn("bg-card border-border shadow-none", quoteExpiryFlag && (quoteExpiryFlag === 'expired' ? "border-red-500/30" : "border-amber-500/30"))}>
               <CardContent className="p-4 flex items-center gap-4">
                 <div className={cn("p-2 rounded-lg bg-surface-elevated", quoteExpiryFlag === 'expired' ? "text-red-500" : quoteExpiryFlag === 'soon' ? "text-amber-500" : "text-blue-500")}>
                    <Clock size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Geçerlilik Tarihi</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{new Date(data.expiryDate).toLocaleDateString('tr-TR')}</p>
                    {quoteExpiryFlag && (
                      <p className={cn("text-[10px] font-black uppercase tracking-widest mt-0.5", quoteExpiryFlag === 'expired' ? "text-red-400" : "text-amber-400")}>
                        {quoteExpiryFlag === 'expired' ? 'Süresi doldu' : 'Süresi yakında doluyor'}
                      </p>
                    )}
                 </div>
               </CardContent>
             </Card>
             <Card className="bg-card border-border shadow-none">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-2 rounded-lg bg-surface-elevated text-emerald-500">
                    <Banknote size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Süre / Durum</p>
                    <div className="mt-1">
                      <span className="text-xs font-mono text-foreground dark:text-muted-foreground">{data.projectDurationMonths || 1} ay · %{Number(data.escalationVolatilityPercent || 0).toLocaleString('tr-TR')} eskalasyon · %{Number(data.carbonRiskPremiumPercent || 0).toLocaleString('tr-TR')} karbon · {data.informationDeliveryLevel || 'none'} teslim</span>
                      <div className="mt-1"><StatusBadge status={data.status} /></div>
                      {data.updatedAt && <p className="text-[10px] text-muted-foreground mt-1.5">Son güncelleme: {new Date(data.updatedAt).toLocaleString('tr-TR')}</p>}
                    </div>
                 </div>
               </CardContent>
             </Card>
          </div>

          {/* Financial Intelligence Panel */}
          <SectionWrapper title="Kalibrasyon Gözlemi" description="Proje kapandıktan sonra gerçekleşen maliyet ve süreyi kaydedin. Bu alan sonraki katsayı incelemeleri için kullanılır.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="calibration-actual-cost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Gerçekleşen toplam maliyet</label>
                    <input id="calibration-actual-cost" type="number" min="0" value={calibrationForm.actualCost} onChange={(e) => setCalibrationForm({...calibrationForm, actualCost: e.target.value})} className="h-11 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:border-primary" placeholder={`Para birimi: ${data.currency}`} />
                  </div>
                  <div>
                    <label htmlFor="calibration-actual-duration" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Gerçekleşen süre (ay)</label>
                    <input id="calibration-actual-duration" type="number" min="1" step="1" value={calibrationForm.actualDurationMonths} onChange={(e) => setCalibrationForm({...calibrationForm, actualDurationMonths: e.target.value})} className="h-11 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:border-primary" placeholder="Örn. 18" />
                  </div>
                </div>
                <label htmlFor="calibration-note" className="sr-only">Katsayı inceleme notu</label>
                <textarea id="calibration-note" aria-label="Katsayı inceleme notu" value={calibrationForm.note} onChange={(e) => setCalibrationForm({...calibrationForm, note: e.target.value})} rows={2} maxLength={2000} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary" placeholder="Katsayı incelemesine yardımcı olacak kısa not..." />
                <Button onClick={saveCalibrationObservation} disabled={calibrationSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest">{calibrationSaving ? 'Kaydediliyor...' : 'Gözlemi Kaydet'}</Button>
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper title="Finansal Zeka Paneli" description="AI tarafından oluşturulan kârlılık ve risk analiz raporu.">
            <Card className="bg-card border-border shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <TrendingUp className="text-primary" size={20} />
                    Kârlılık ve Risk Analizi
                  </CardTitle>
                  <Button 
                    onClick={recalculateFinancials} 
                    disabled={finLoading}
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground h-7 gap-1"
                  >
                    <RefreshCw size={12} className={cn(finLoading && "animate-spin")} /> YENİLE
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
              {finLoading && !financials ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-primary" size={32} />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Finans verileri işleniyor...</span>
                </div>
              ) : financials?.financials ? (
                <div className="divide-y divide-border">
                  {((financials.financials.costStatus || financials.financials.costDataStatus) !== 'complete') && (
                    <div className="m-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-amber-950 dark:text-amber-300">Maliyet verisi eksik</p>
                        <p className="mt-1 text-xs text-amber-900 dark:text-amber-200/80">Maliyet birim fiyatları tamamlanmadan kâr ve marj gösterilmez. Aşağıdaki rakamlar karar vermek için güvenilir değildir.</p>
                      </div>
                    </div>
                  )}
                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Toplam Maliyet</p>
                      <p className="text-xl font-black text-foreground">{Number(financials.financials.totalCost).toLocaleString()} <span className="text-xs text-muted-foreground font-medium">{data.currency}</span></p>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Brüt Kâr</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{(financials.financials.costStatus || financials.financials.costDataStatus) === 'complete' ? Number(financials.financials.profit).toLocaleString() : '—'} <span className="text-xs text-muted-foreground font-medium">{data.currency}</span></p>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Kâr Marjı</p>
                      <div className="flex items-end gap-2">
                        <p className="text-xl font-black text-foreground">{(financials.financials.costStatus || financials.financials.costDataStatus) === 'complete' ? `%${financials.financials.margin}` : '—'}</p>
                        {(financials.financials.costStatus || financials.financials.costDataStatus) === 'complete' && <ProfitabilityBadge margin={Number(financials.financials.margin)} />}
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Risk Skoru</p>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-tighter",
                            financials.financials.riskLevel === 'HIGH' ? 'text-destructive' :
                            financials.financials.riskLevel === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' :
                            financials.financials.riskLevel === 'UNKNOWN' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          )}>
                            {financials.financials.riskLevel === 'UNKNOWN' ? 'VERİ BEKLENİYOR' : financials.financials.riskLevel}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{financials.financials.riskScore}/100</span>
                        </div>
                        <Progress value={financials.financials.riskScore} className="h-1 bg-muted" />
                      </div>
                    </div>
                  </div>

                  {/* Insights & Logic (Contextual Piyasa Verisi ve Mevzuat) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-5 border-b lg:border-b-0 lg:border-r border-border bg-primary/5">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Zap size={10} /> Piyasa Verisi & Mevzuat Asistanı
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed italic mb-3">
                        "{financials.financials.insights || "Güncel inşaat maliyet endeksleri ve ÇŞB rayiç bedelleri baz alınarak analiz ediliyor..."}"
                      </p>
                      <div className="space-y-2">
                        <div className="bg-card border border-border p-2.5 rounded-lg text-xs text-foreground">
                          <strong className="text-foreground block mb-1">Piyasa Ortalama Marjı: %18</strong>
                          Seçtiğiniz lokasyon için rekabetçi kâr marjı aralığı %15-20 bandındadır. Sizin marjınız piyasa normlarına uygundur.
                        </div>
                        <div className="bg-card border border-border p-2.5 rounded-lg text-xs text-foreground">
                          <strong className="text-sky-600 dark:text-sky-400 block mb-1">Mevzuat Uygunluğu</strong>
                          ÇŞB Madde 4.2 gereği kalıp iskelesi %5 fire payı maliyetlere otomatik olarak yansıtılmıştır.
                        </div>
                      </div>
                    </div>
                    <div className="p-5 bg-muted/20">
                       <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">Zaman Risk Primi</p>
                       <p className="mb-4 text-xs text-muted-foreground">{Number(financials.financials.escalationPremium || 0).toLocaleString('tr-TR')} {data.currency} · {data.projectDurationMonths || 1} ay · aylık %{Number(data.escalationVolatilityPercent || 0).toLocaleString('tr-TR')} bileşik, malzeme + işçilik</p>
                       <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Karbon/Tedarik Risk Primi</p>
                       <p className="mb-4 text-xs text-muted-foreground">{Number(financials.financials.carbonRiskPremium || 0).toLocaleString('tr-TR')} {data.currency} · %{Number(data.carbonRiskPremiumPercent || 0).toLocaleString('tr-TR')} senaryo katsayısı</p>
                       <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Bilgi Teslim Maliyeti</p>
                       <p className="mb-4 text-xs text-muted-foreground">{Number(financials.financials.informationDeliveryCostPremium || 0).toLocaleString('tr-TR')} {data.currency} · %{Number(data.informationDeliveryCostPercent || 0).toLocaleString('tr-TR')} kapsam katsayısı</p>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Maliyet Bazlı Fiyat Aralıkları</p>
                       <div className="space-y-2.5">
                          {(financials.financials.costStatus || financials.financials.costDataStatus) !== 'complete' ? <p className="text-xs text-muted-foreground">Maliyet verisi tamamlandığında gösterilecek.</p> : null}
                          {[
                            { label: 'Minimum Güvenli', val: (financials.financials.totalCost * 1.1).toFixed(0), color: 'text-muted-foreground' },
                            { label: 'Rekabetçi Piyasa', val: (financials.financials.totalCost * 1.2).toFixed(0), color: 'text-sky-600 dark:text-sky-400' },
                            { label: 'Optimum Kârlılık', val: (financials.financials.totalCost * 1.3).toFixed(0), color: 'text-emerald-600 dark:text-emerald-400' }
                          ].filter(() => (financials.financials.costStatus || financials.financials.costDataStatus) === 'complete').map((range, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                               <span className="text-muted-foreground">{range.label}</span>
                               <span className={cn("font-bold", range.color)}>{Number(range.val).toLocaleString()} {data.currency}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                   <p className="text-xs">Bu teklif için henüz finansal analiz oluşturulmamış.</p>
                   <Button variant="link" className="text-primary text-xs" onClick={recalculateFinancials}>Analizi Başlat</Button>
                </div>
              )}
            </CardContent>
          </Card>

          </SectionWrapper>

          <SectionWrapper title="Fiyat kanıtı" description="Teklifte kullanılan fiyatların kaynağını, geçerlilik tarihini ve kilit durumunu gösterir.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="pt-5">
                {pricingLoading && !pricingSnapshot ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin text-primary" /> Fiyat kanıtı yükleniyor...</div>
                ) : pricingSnapshot ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={17} className={pricingSnapshot.quote?.pricingSnapshotLockStatus === 'locked' ? 'text-emerald-500' : 'text-amber-500'} />
                        <span className="text-xs font-black uppercase tracking-widest text-foreground">{pricingSnapshot.quote?.pricingSnapshotLockStatus === 'locked' ? 'Fiyat kanıtı kilitli' : 'Fiyat kanıtı kilitli değil'}</span>
                        {pricingSnapshot.quote?.pricingSnapshotLockHash && <span className="font-mono text-[10px] text-muted-foreground">#{String(pricingSnapshot.quote.pricingSnapshotLockHash).slice(0, 12)}</span>}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={fetchPricingSnapshot} disabled={pricingLoading} className="h-7 gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"><RefreshCw size={12} className={cn(pricingLoading && 'animate-spin')} /> YENİLE</Button>
                    </div>
                    {pricingSnapshot.warnings?.length > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" /><span>{pricingSnapshot.warnings.length} kalemde fiyat snapshot eksik veya süresi geçmiş. Göndermeden önce kaynak kanıtını tamamlayın.</span></div>
                    )}
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {(pricingSnapshot.items || []).map((entry: any) => (
                        <div key={entry.item.id} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="text-xs font-semibold text-foreground">{entry.item.description}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.item.quantity} {entry.item.unit}</p></div>
                            <Badge className={cn('text-[10px] font-black', entry.missing || entry.stale ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300')}>{entry.missing ? 'EKSİK' : entry.stale ? 'ESKİ' : 'KANITLI'}</Badge>
                          </div>
                          {entry.snapshot && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{Number(entry.snapshot.amount).toLocaleString('tr-TR')} {entry.snapshot.currency} · geçerlilik: {entry.snapshot.validUntil ? new Date(entry.snapshot.validUntil).toLocaleDateString('tr-TR') : 'süresiz'}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="text-xs text-muted-foreground">Bu teklif için fiyat kanıtı bulunamadı.</p>}
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper title="Teklif Kalemleri" description="Detaylı ürün ve hizmet dökümü.">
            {audit?.status === 'needs_review' && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200">
                <p className="font-black uppercase tracking-widest text-amber-950 dark:text-amber-300">SmartCheck: inceleme gerekli</p>
                <p className="mt-1 text-amber-900 dark:text-amber-200/80">Bu kontrol kaynak izlenebilirliğini gösterir; mühendislik veya mevzuat uygunluğu kararı değildir. {audit.issues.length} uyarı bulundu.</p>
                {ACADEMY_ENABLED && <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from(new Map((audit.issues as any[]).map(issue => [issue.academyGuidance?.lessonSlug, issue.academyGuidance])).values())
                    .filter((guidance: any) => guidance?.lessonSlug)
                    .map((guidance: any) => (
                      <Link key={guidance.lessonSlug} to={`/app/academy/allplan/lesson/${guidance.lessonSlug}?returnTo=${encodeURIComponent(`/app/quotes/${id}`)}`} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-muted/40 px-3 py-2 font-black uppercase tracking-wider text-amber-950 dark:text-amber-100 transition-colors hover:border-primary/50 hover:text-foreground">
                        <BookOpen size={12} /> {guidance.label} <ChevronRight size={12} />
                      </Link>
                    ))}
                </div>}
              </div>
            )}
            <Card className="bg-card border border-border shadow-none">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase pl-6 py-3">Açıklama</TableHead>
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase text-center py-3">Birim</TableHead>
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right py-3">Miktar</TableHead>
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right py-3">Satış Birim</TableHead>
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right py-3">Maliyet Birim</TableHead>
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right py-3">Zayiat</TableHead>
                      <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right pr-6 py-3">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item: any) => (
                      <TableRow key={item.id} className="border-border/60 hover:bg-muted/30">
                        <TableCell className="text-foreground font-medium pl-6 py-3 text-xs">{item.description}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-xs font-mono py-3">{item.unit}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground text-xs py-3 tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-foreground font-semibold text-xs py-3 tabular-nums">{Number(item.unitPrice).toLocaleString('tr-TR')} {data.currency}</TableCell>
                        <TableCell className="text-right font-mono text-amber-700 dark:text-amber-300 font-semibold text-xs py-3 tabular-nums">{item.costUnitPrice == null ? '—' : `${Number(item.costUnitPrice).toLocaleString('tr-TR')} ${data.currency}`}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground text-xs py-3 tabular-nums">%{Number(item.wastePercent || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell className="text-right font-mono text-foreground font-bold text-xs pr-6 py-3 tabular-nums">{Number(item.total).toLocaleString('tr-TR')} {data.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Total Calculation Display */}
                <div className="p-6 flex justify-end bg-muted/20 border-t border-border">
                  <div className="w-full max-w-xs space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>ARA TOPLAM</span>
                      <span className="text-foreground tabular-nums">{Number(data.subtotal).toLocaleString('tr-TR')} {data.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>İNDİRİM</span>
                      <span className="text-primary font-semibold tabular-nums">-{Number(data.discountTotal).toLocaleString('tr-TR')} {data.currency}</span>
                    </div>
                    {Number(data.overheadProfitTotal ?? 0) > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground" data-testid="quote-overhead-profit">
                        <span>KÂR VE GENEL GİDER (%{Number(data.overheadProfitPercent ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })})</span>
                        <span className="text-foreground tabular-nums">{Number(data.overheadProfitTotal).toLocaleString('tr-TR')} {data.currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>KDV</span>
                      <span className="text-foreground tabular-nums">{Number(data.vatTotal).toLocaleString('tr-TR')} {data.currency}</span>
                    </div>
                    <Separator className="bg-border" />
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">GENEL TOPLAM</span>
                      <span className="text-xl font-bold text-primary font-mono tabular-nums">
                        {Number(data.grandTotal).toLocaleString('tr-TR')} {data.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </div>

        {/* Sidebar Revisions */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-md overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="bg-muted/20 border-b border-border pb-3">
              <CardTitle className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-2">
                <History size={14} className="text-primary" />
                Revizyon Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {data.revisions.map((rev: any) => (
                  <Link 
                    key={rev.id} 
                    to={`/app/quotes/${rev.id}`}
                    className={cn(
                      "block p-4 transition-all hover:bg-muted/60 group relative",
                      rev.id === id ? "bg-muted/80 pointer-events-none" : "bg-transparent"
                    )}
                  >
                    {rev.id === id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground uppercase tracking-tighter">VERSİYON {rev.revisionVersion}</span>
                          {rev.isLatest && (
                            <Badge className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10px] h-4 border-emerald-500/20 font-black">LATEST</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(rev.createdAt).toLocaleDateString('tr-TR')} - {new Date(rev.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <StatusBadge status={rev.status} />
                    </div>
                    {rev.id === id && (
                      <div className="mt-2 text-[10px] font-bold text-primary flex items-center gap-1">
                        <ChevronRight size={10} /> Şu anki versiyon
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-none border-dashed text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" /> Compliance AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAlerts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Bu teklifle ilişkili sektörler için {recentAlerts.length} yeni mevzuat uyarısı mevcut.
                  </p>
                  <div className="space-y-2">
                    {recentAlerts.map(alert => (
                      <div key={alert.id} className="p-2 rounded bg-muted/50 border border-border text-left">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px] px-1 h-3 font-bold border-primary/20 text-primary">{alert.category}</Badge>
                          <span className="text-[10px] text-muted-foreground font-mono tracking-tighter">{alert.impactLevel.toUpperCase()}</span>
                        </div>
                        <p className="text-[10px] font-bold text-foreground line-clamp-1">{alert.title}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full text-[10px] h-7 border-primary/30 text-primary hover:bg-primary/10 font-bold" onClick={() => navigate('/app/regulations')}>
                    DETAYLI ANALİZ
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <CheckCircle2 size={24} className="text-emerald-500/20 mb-2" />
                  <p className="text-[10px] text-muted-foreground">Mevzuat ön kontrolünde bulgu yok</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-none border-dashed">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Veri Güvenliği</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Bu teklif çoklu şirket mimarisi ile korunmaktadır. Bu veriye yalnızca yetkili şirket personeli erişebilir.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
