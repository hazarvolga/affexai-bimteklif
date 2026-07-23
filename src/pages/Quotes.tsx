import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, FileDown, MoreHorizontal, Search, Filter, Copy, FileText, FilePlus } from 'lucide-react';
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

export function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/quotations')
      .then(res => res.json())
      .then((data) => {
        setQuotes(Array.isArray(data) ? data : []);
        setLoading(false)
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <PageContainer>
      <PageHeader 
        title="Teklifler" 
        description="Tüm inşaat ve proje tekliflerinizi buradan yönetin. AI destekli maliyet analizi ve kârlılık takibi ile."
        icon={FileText}
        actions={
          <>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-4">
              <FileDown size={16} /> Dışa Aktar
            </Button>
            <Button nativeButton={false} render={<Link to="/app/quotes/new" />} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-6">
              <Plus size={16} /> Yeni Teklif
            </Button>
          </>
        }
      />

      <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <Input 
                placeholder="Tekliflerde ara..." 
                className="pl-10 h-10 bg-zinc-950/50 border-zinc-800 focus:border-orange-500/50 transition-all text-sm font-medium" 
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-400 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-4">
                <Filter size={16} /> Filtrele
              </Button>
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
                ) : quotes.length === 0 ? (
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-24 px-8">
                      <EmptyState 
                        icon={FilePlus}
                        title="Henüz Teklif Yok"
                        description="İlk teklifinizi oluşturarak satış sürecini başlatın. AI asistanımız size yardımcı olabilir."
                        actionText="YENİ TEKLİF OLUŞTUR"
                        onAction={() => navigate('/app/quotes/new')}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote, idx) => (
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
                        <StatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><MoreHorizontal size={18} /></Button>} />
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300 w-48 p-1">
                            <DropdownMenuItem render={<Link to={`/app/quotes/${quote.id}`} className="w-full flex items-center gap-2" />} className="text-[10px] font-black uppercase tracking-widest focus:bg-orange-600 focus:text-white cursor-pointer py-2">Görüntüle</DropdownMenuItem>
                            <DropdownMenuItem render={<Link to={`/app/quotes/${quote.id}`} className="w-full flex items-center gap-2" />} className="text-[10px] font-black uppercase tracking-widest text-orange-500 focus:bg-zinc-800 focus:text-orange-500 cursor-pointer py-2">Revizyon Yap</DropdownMenuItem>
                            <div className="h-px bg-zinc-800 my-1" />
                            <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest focus:bg-zinc-800 cursor-pointer py-2 gap-2">
                              <Copy size={12} /> Kopyala
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer py-2">
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
