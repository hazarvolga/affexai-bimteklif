import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, MoreHorizontal, Search, Copy, FileText, FilePlus, AlertTriangle, RefreshCw, Box } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { QuoteStatus, Quote } from '@/types';
import { cn } from '@/lib/utils';
import { fetchWithAuth } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/business/StatusBadge';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_TRACKED_STATUSES: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.NEGOTIATION];

function getExpiryFlag(quote: Quote): 'expired' | 'soon' | null {
  if (!EXPIRY_TRACKED_STATUSES.includes(quote.status)) return null;
  const diff = new Date(quote.expiryDate).getTime() - Date.now();
  if (diff < 0) return 'expired';
  if (diff <= 7 * DAY_MS) return 'soon';
  return null;
}

export function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchWithAuth('/api/quotations')
      .then((res) => {
        if (!res.ok) throw new Error('İstek başarısız');
        return res.json();
      })
      .then((data) => {
        setQuotes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const duplicateQuote = async (quote: Quote) => {
    setDuplicatingId(quote.id);
    try {
      const detailRes = await fetchWithAuth(`/api/quotations/${quote.id}`);
      if (!detailRes.ok) throw new Error();
      const detail = await detailRes.json();
      const payload = {
        clientId: detail.clientId,
        projectName: `${detail.projectName} (Kopya)`,
        quoteNumber: `TKF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * DAY_MS).toISOString(),
        currency: detail.currency,
        notes: detail.notes,
        projectDurationMonths: detail.projectDurationMonths,
        escalationVolatilityPercent: detail.escalationVolatilityPercent,
        procurementProfile: detail.procurementProfile,
        carbonRiskPremiumPercent: detail.carbonRiskPremiumPercent,
        informationDeliveryLevel: detail.informationDeliveryLevel,
        informationDeliveryCostPercent: detail.informationDeliveryCostPercent,
        status: QuoteStatus.DRAFT,
        subtotal: detail.subtotal,
        discountTotal: detail.discountTotal,
        vatTotal: detail.vatTotal,
        grandTotal: detail.grandTotal,
        items: (detail.items ?? []).map((item: any) => ({
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costUnitPrice: item.costUnitPrice,
          wastePercent: item.wastePercent,
          costCategory: item.costCategory,
          discountPercent: item.discountPercent,
          vatPercent: item.vatPercent,
        })),
      };
      const createRes = await fetchWithAuth('/api/quotations', { method: 'POST', body: JSON.stringify(payload) });
      if (!createRes.ok) throw new Error();
      const created = await createRes.json();
      toast.success('Teklif kopyalandı.');
      navigate(`/app/quotes/${created.id}`);
    } catch {
      toast.error('Teklif kopyalanamadı.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    const term = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!term) return true;
    return quote.quoteNumber.toLocaleLowerCase('tr-TR').includes(term) || quote.projectName.toLocaleLowerCase('tr-TR').includes(term);
  });

  return (
    <PageContainer>
      <PageHeader
        title="Teklifler & Projeler"
        description="BIM modellerinizden veya manuel olarak tekliflerinizi yönetin."
        icon={FileText}
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/app/quotes/new">
              <Button variant="outline" size="sm" className="gap-1.5 font-medium">
                <Plus size={15} /> Manuel Teklif
              </Button>
            </Link>
            <Link to="/app/dosyadan-teklif-demo">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground gap-1.5 font-semibold shadow-xs">
                <Box size={15} /> 3D IFC ile Teklif Hazırla
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="border border-border bg-card shadow-xs rounded-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-3.5 border-b border-border flex items-center justify-between gap-4 bg-muted/20">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Teklif no veya proje adına göre ara..."
                className="pl-9 h-9 bg-card text-xs font-sans"
              />
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Toplam: <strong className="text-foreground tabular-nums">{filteredQuotes.length}</strong> teklif
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border">
                  <TableHead className="py-3 pl-5">TEKLİF NO</TableHead>
                  <TableHead className="py-3">PROJE ADI</TableHead>
                  <TableHead className="py-3 text-center">TARİH</TableHead>
                  <TableHead className="py-3 text-right">TUTAR</TableHead>
                  <TableHead className="py-3 text-center">DURUM</TableHead>
                  <TableHead className="py-3 text-right pr-5">İŞLEM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-mono text-muted-foreground">Veriler Yükleniyor...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="text-destructive" size={24} />
                        <div>
                          <p className="text-xs font-semibold text-foreground">Teklifler yüklenemedi</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.</p>
                        </div>
                        <Button onClick={load} variant="outline" size="sm" className="gap-1.5 mt-2">
                          <RefreshCw size={13} /> Tekrar Dene
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center py-20 px-6">
                      <EmptyState
                        icon={FilePlus}
                        title="Henüz Teklif Yok"
                        description="İlk teklifinizi oluşturarak satış sürecini başlatın."
                        actionText="YENİ TEKLİF OLUŞTUR"
                        onAction={() => navigate('/app/quotes/new')}
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center py-16 text-xs text-muted-foreground font-mono">
                      "{searchTerm}" için sonuç bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => {
                    const expiryFlag = getExpiryFlag(quote);
                    return (
                      <TableRow
                        key={quote.id}
                        className="border-border/60 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/app/quotes/${quote.id}`)}
                      >
                        <TableCell className="py-3 pl-5 font-mono text-xs font-semibold text-primary">
                          {quote.quoteNumber}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-foreground">
                          {quote.projectName}
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground text-xs text-center font-mono tabular-nums">
                          {new Date(quote.date).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="py-3 font-semibold text-foreground text-right font-mono text-xs tabular-nums">
                          {Number(quote.grandTotal).toLocaleString('tr-TR')} <span className="text-[11px] text-muted-foreground ml-0.5">{quote.currency}</span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <StatusBadge status={quote.status} />
                            {expiryFlag && (
                              <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded-xs border",
                                expiryFlag === 'expired' ? "text-destructive border-destructive/30 bg-destructive/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                              )}>
                                {expiryFlag === 'expired' ? 'Süresi Doldu' : 'Süre Doluyor'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" aria-label="Teklif işlemleri menüsü" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal size={15} />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="w-40 p-1 border-border bg-card">
                              <DropdownMenuItem 
                                onClick={() => navigate(`/app/quotes/${quote.id}`)}
                                className="text-xs font-mono cursor-pointer py-1.5"
                              >
                                Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={duplicatingId === quote.id}
                                onClick={() => duplicateQuote(quote)}
                                className="text-xs font-mono cursor-pointer py-1.5 gap-2"
                              >
                                <Copy size={13} /> {duplicatingId === quote.id ? 'Kopyalanıyor…' : 'Kopyala'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
