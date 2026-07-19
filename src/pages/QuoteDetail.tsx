import React, { useState, useEffect } from 'react';
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
  FileSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [finLoading, setFinLoading] = useState(false);
  const [audit, setAudit] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchRecentAlerts();
    fetchFinancials();
    fetchAudit();
  }, [id]);

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
    if (!window.confirm("Bu tekliften yeni bir versiyon (V" + (data.revisionVersion + 1) + ") oluşturmak istediğinize emin misiniz?")) return;
    
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
        <p className="text-zinc-500 font-medium">Teklif detayları hazırlanıyor...</p>
      </div>
    );
  }

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  disabled={actionLoading} 
                  variant="outline" 
                  className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 gap-2 h-10 px-4 font-bold"
                >
                  <Download size={18} className="text-orange-500" />
                  PDF Dosyası
                  <ChevronDown size={14} className="text-zinc-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-300 w-56">
                <DropdownMenuLabel className="text-xs text-zinc-500">Şablon Seçiniz</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={() => handleDownloadPdf('default_construction')} className="gap-2 focus:bg-zinc-800 cursor-pointer py-2.5">
                  <Layout size={16} className="text-orange-500" />
                  Modern İnşaat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPdf('luxury_villa')} className="gap-2 focus:bg-zinc-800 cursor-pointer py-2.5">
                  <ShieldCheck size={16} className="text-blue-500" />
                  Lüks Villa Projesi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPdf('modern_minimal')} className="gap-2 focus:bg-zinc-800 cursor-pointer py-2.5">
                  <Layers size={16} className="text-zinc-400" />
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
            <Button onClick={handleCreateRevision} disabled={actionLoading} variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 gap-2 h-10 px-4 font-bold">
              <History size={18} />
              Yeni Revizyon Oluştur
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-2 rounded-lg bg-zinc-800 text-orange-500">
                    <Calendar size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Düzenleme Tarihi</p>
                    <p className="text-sm font-medium text-zinc-200 mt-0.5">{new Date(data.date).toLocaleDateString('tr-TR')}</p>
                 </div>
               </CardContent>
             </Card>
             <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-2 rounded-lg bg-zinc-800 text-blue-500">
                    <Clock size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Geçerlilik Tarihi</p>
                    <p className="text-sm font-medium text-zinc-200 mt-0.5">{new Date(data.expiryDate).toLocaleDateString('tr-TR')}</p>
                 </div>
               </CardContent>
             </Card>
             <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-2 rounded-lg bg-zinc-800 text-emerald-500">
                    <Banknote size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Durum</p>
                    <div className="mt-1">
                      <StatusBadge status={data.status} />
                    </div>
                 </div>
               </CardContent>
             </Card>
          </div>

          {/* Financial Intelligence Panel */}
          <SectionWrapper title="Finansal Zeka Paneli" description="AI tarafından oluşturulan kârlılık ve risk analiz raporu.">
            <Card className="bg-zinc-900/30 border-orange-500/20 shadow-xl shadow-orange-950/20 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <CardHeader className="border-b border-zinc-800/10 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-100 flex items-center gap-2">
                    <TrendingUp className="text-orange-500" size={20} />
                    Kârlılık ve Risk Analizi
                  </CardTitle>
                  <Button 
                    onClick={recalculateFinancials} 
                    disabled={finLoading}
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-bold text-zinc-500 hover:text-white h-7 gap-1"
                  >
                    <RefreshCw size={12} className={cn(finLoading && "animate-spin")} /> YENİLE
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
              {finLoading && !financials ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Finans verileri işleniyor...</span>
                </div>
              ) : financials?.financials ? (
                <div className="divide-y divide-zinc-800">
                  {((financials.financials.costStatus || financials.financials.costDataStatus) !== 'complete') && (
                    <div className="m-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest">Maliyet verisi eksik</p>
                        <p className="mt-1 text-xs text-amber-200/70">Maliyet birim fiyatları tamamlanmadan kâr ve marj gösterilmez. Aşağıdaki rakamlar karar vermek için güvenilir değildir.</p>
                      </div>
                    </div>
                  )}
                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-800">
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Toplam Maliyet</p>
                      <p className="text-xl font-black text-white">{Number(financials.financials.totalCost).toLocaleString()} <span className="text-xs text-zinc-600 font-medium">{data.currency}</span></p>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Brüt Kâr</p>
                      <p className="text-xl font-black text-emerald-500">{(financials.financials.costStatus || financials.financials.costDataStatus) === 'complete' ? Number(financials.financials.profit).toLocaleString() : '—'} <span className="text-xs text-emerald-900 font-medium">{data.currency}</span></p>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Kâr Marjı</p>
                      <div className="flex items-end gap-2">
                        <p className="text-xl font-black text-white">{(financials.financials.costStatus || financials.financials.costDataStatus) === 'complete' ? `%${financials.financials.margin}` : '—'}</p>
                        {(financials.financials.costStatus || financials.financials.costDataStatus) === 'complete' && <ProfitabilityBadge margin={Number(financials.financials.margin)} />}
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Risk Skoru</p>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-tighter",
                            financials.financials.riskLevel === 'HIGH' ? 'text-red-500' :
                            financials.financials.riskLevel === 'MEDIUM' ? 'text-amber-500' :
                            financials.financials.riskLevel === 'UNKNOWN' ? 'text-amber-500' : 'text-emerald-500'
                          )}>
                            {financials.financials.riskLevel === 'UNKNOWN' ? 'VERİ BEKLENİYOR' : financials.financials.riskLevel}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{financials.financials.riskScore}/100</span>
                        </div>
                        <Progress value={financials.financials.riskScore} className="h-1 bg-zinc-800" />
                      </div>
                    </div>
                  </div>

                  {/* Insights & Logic */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-5 border-b lg:border-b-0 lg:border-r border-zinc-800">
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Zap size={10} /> AI Finansal Öngörü
                      </p>
                      <p className="text-xs text-zinc-400 leading-relaxed italic">
                        "{financials.financials.insights || "Analiz ediliyor..."}"
                      </p>
                    </div>
                    <div className="p-5 bg-zinc-950/30">
                       <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Maliyet Bazlı Fiyat Aralıkları</p>
                       <div className="space-y-2.5">
                          {(financials.financials.costStatus || financials.financials.costDataStatus) !== 'complete' ? <p className="text-xs text-zinc-600">Maliyet verisi tamamlandığında gösterilecek.</p> : null}
                          {[
                            { label: 'Minimum Güvenli', val: (financials.financials.totalCost * 1.1).toFixed(0), color: 'text-zinc-400' },
                            { label: 'Rekabetçi Piyasa', val: (financials.financials.totalCost * 1.2).toFixed(0), color: 'text-blue-400' },
                            { label: 'Optimum Kârlılık', val: (financials.financials.totalCost * 1.3).toFixed(0), color: 'text-emerald-400' }
                          ].filter(() => (financials.financials.costStatus || financials.financials.costDataStatus) === 'complete').map((range, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                               <span className="text-zinc-500">{range.label}</span>
                               <span className={cn("font-bold", range.color)}>{Number(range.val).toLocaleString()} {data.currency}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">
                   <p className="text-xs">Bu teklif için henüz finansal analiz oluşturulmamış.</p>
                   <Button variant="link" className="text-orange-500 text-xs" onClick={recalculateFinancials}>Analizi Başlat</Button>
                </div>
              )}
            </CardContent>
          </Card>

          </SectionWrapper>

          <SectionWrapper title="Teklif Kalemleri" description="Detaylı ürün ve hizmet dökümü.">
            {audit?.status === 'needs_review' && (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
                <p className="font-black uppercase tracking-widest">SmartCheck: inceleme gerekli</p>
                <p className="mt-1 text-amber-200/70">Bu kontrol kaynak izlenebilirliğini gösterir; mühendislik veya mevzuat uygunluğu kararı değildir. {audit.issues.length} uyarı bulundu.</p>
              </div>
            )}
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-6">Açıklama</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Birim</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Miktar</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Satış Birim</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Maliyet Birim</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Zayiat</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right pr-6">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item: any) => (
                      <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-800/20">
                        <TableCell className="text-zinc-200 font-medium pl-6">{item.description}</TableCell>
                        <TableCell className="text-center text-zinc-500 text-xs">{item.unit}</TableCell>
                        <TableCell className="text-right font-mono text-zinc-400">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-zinc-400 font-semibold">{Number(item.unitPrice).toLocaleString('tr-TR')} {data.currency}</TableCell>
                        <TableCell className="text-right font-mono text-amber-300 font-semibold">{item.costUnitPrice == null ? '—' : `${Number(item.costUnitPrice).toLocaleString('tr-TR')} ${data.currency}`}</TableCell>
                        <TableCell className="text-right font-mono text-zinc-500">%{Number(item.wastePercent || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell className="text-right font-mono text-white font-bold pr-6">{Number(item.total).toLocaleString('tr-TR')} {data.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Total Calculation Display */}
                <div className="p-8 flex justify-end bg-zinc-900/5 border-t border-zinc-800">
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between items-center text-xs text-zinc-500 font-medium tracking-tight">
                      <span>ARA TOPLAM</span>
                      <span className="font-mono text-zinc-300">{Number(data.subtotal).toLocaleString('tr-TR')} {data.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-500 font-medium tracking-tight">
                      <span>İNDİRİM</span>
                      <span className="font-mono text-orange-500">-{Number(data.discountTotal).toLocaleString('tr-TR')} {data.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-500 font-medium tracking-tight">
                      <span>KDV</span>
                      <span className="font-mono text-zinc-300">{Number(data.vatTotal).toLocaleString('tr-TR')} {data.currency}</span>
                    </div>
                    <Separator className="bg-zinc-800" />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">GENEL TOPLAM</span>
                      <span className="text-2xl font-bold text-orange-500 font-mono">
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
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-xl overflow-hidden border-l-4 border-l-orange-600">
            <CardHeader className="bg-zinc-900/10 border-b border-zinc-800/10 pb-3">
              <CardTitle className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                <History size={14} className="text-orange-500" />
                Revizyon Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                {data.revisions.map((rev: any) => (
                  <Link 
                    key={rev.id} 
                    to={`/app/quotes/${rev.id}`}
                    className={cn(
                      "block p-4 transition-all hover:bg-zinc-800 group relative",
                      rev.id === id ? "bg-zinc-800/80 pointer-events-none" : "bg-transparent"
                    )}
                  >
                    {rev.id === id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-zinc-100 uppercase tracking-tighter">VERSİYON {rev.revisionVersion}</span>
                          {rev.isLatest && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 text-[8px] h-4 border-emerald-500/20 font-black">LATEST</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{new Date(rev.createdAt).toLocaleDateString('tr-TR')} - {new Date(rev.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <StatusBadge status={rev.status} />
                    </div>
                    {rev.id === id && (
                      <div className="mt-2 text-[10px] font-bold text-orange-500/80 flex items-center gap-1">
                        <ChevronRight size={10} /> Şu anki versiyon
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none border-dashed text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" /> Compliance AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAlerts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[9px] text-zinc-400 leading-tight">
                    Bu teklifle ilişkili sektörler için {recentAlerts.length} yeni mevzuat uyarısı mevcut.
                  </p>
                  <div className="space-y-2">
                    {recentAlerts.map(alert => (
                      <div key={alert.id} className="p-2 rounded bg-zinc-800/50 border border-zinc-700/50 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[7px] px-1 h-3 font-bold border-orange-500/20 text-orange-500">{alert.category}</Badge>
                          <span className="text-[8px] text-zinc-500 font-mono tracking-tighter">{alert.impactLevel.toUpperCase()}</span>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-200 line-clamp-1">{alert.title}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full text-[10px] h-7 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-bold" onClick={() => navigate('/app/regulations')}>
                    DETAYLI ANALİZ
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <CheckCircle2 size={24} className="text-emerald-500/20 mb-2" />
                  <p className="text-[10px] text-zinc-500">Mevzuat Uyumluluk Tamam</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none border-dashed">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-zinc-400">Veri Güvenliği</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-zinc-500 leading-relaxed">
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
