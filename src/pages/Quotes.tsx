import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, MoreHorizontal, Search, Copy, FileText, FilePlus, AlertTriangle, RefreshCw } from 'lucide-react';
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
        title="Teklifler"
        description="Tüm inşaat ve proje tekliflerinizi buradan yönetin."
        icon={FileText}
        actions={
          <Button nativeButton={false} render={<Link to="/app/quotes/new" />} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-orange-900/20 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-6">
            <Plus size={16} /> Yeni Teklif
          </Button>
        }
      />

      <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Teklif numarası veya proje adına göre ara..."
                className="pl-10 h-10 bg-zinc-950/50 border-zinc-800 focus:border-orange-500/50 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/30">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest pl-6">TEKLİF NO</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest">PROJE ADI</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center">TARİH</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right">TUTAR</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center">DURUM</TableHead>
                  <TableHead className="py-4 text-right text-zinc-500 font-black text-[10px] uppercase tracking-widest pr-6">İŞLEM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-zinc-800 bg-zinc-900/10">
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Veriler Yükleniyor...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <AlertTriangle className="text-red-500" size={28} />
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest">Teklifler yüklenemedi</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.</p>
                        </div>
                        <Button onClick={load} variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-300 gap-2 font-black text-[10px] uppercase tracking-widest h-9 px-4">
                          <RefreshCw size={14} /> Tekrar Dene
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-24 px-8">
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
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-16 text-xs text-zinc-600">
                      "{searchTerm}" için sonuç bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote, idx) => {
                    const expiryFlag = getExpiryFlag(quote);
                    return (
                    <TableRow
                      key={quote.id}
                      className={cn(
                        "border-zinc-800 hover:bg-zinc-800/20 transition-all cursor-pointer group",
                        idx % 2 === 0 ? "bg-transparent" : "bg-zinc-900/10"
                      )}
                      onClick={() => navigate(`/app/quotes/${quote.id}`)}
                    >
                      <TableCell className="py-4 font-mono text-xs font-black text-orange-500 pl-6 group-hover:scale-105 transition-transform origin-left">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell className="py-4 font-black text-xs text-white uppercase tracking-tight">
                        {quote.projectName}
                      </TableCell>
                      <TableCell className="py-4 text-zinc-500 text-[10px] text-center font-black uppercase tracking-widest">
                        {new Date(quote.date).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="py-4 font-black text-white text-right font-mono text-sm">
                        {Number(quote.grandTotal).toLocaleString('tr-TR')} <span className="text-[10px] text-zinc-600 ml-1">{quote.currency}</span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <StatusBadge status={quote.status} />
                          {expiryFlag && (
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                              expiryFlag === 'expired' ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                            )}>
                              {expiryFlag === 'expired' ? 'Süresi Doldu' : 'Süre Doluyor'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><MoreHorizontal size={18} /></Button>} />
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300 w-48 p-1">
                            <DropdownMenuItem render={<Link to={`/app/quotes/${quote.id}`} className="w-full flex items-center gap-2" />} className="text-[10px] font-black uppercase tracking-widest focus:bg-orange-600 focus:text-white cursor-pointer py-2">Görüntüle</DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={duplicatingId === quote.id}
                              onClick={() => duplicateQuote(quote)}
                              className="text-[10px] font-black uppercase tracking-widest focus:bg-zinc-800 cursor-pointer py-2 gap-2"
                            >
                              <Copy size={12} /> {duplicatingId === quote.id ? 'Kopyalanıyor…' : 'Kopyala'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );})
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
