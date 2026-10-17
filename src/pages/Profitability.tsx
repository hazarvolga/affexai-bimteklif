import { useEffect, useState } from "react";
import { ChartBarIncreasing, DollarSign, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data/StatCard';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/business/StatusBadge';
import { fetchWithAuth } from "@/lib/api";
import { Quote, QuoteStatus } from "@/types";

export function Profitability() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const wonQuotes = quotes.filter((q) => q.status === QuoteStatus.WON);
  const lostQuotes = quotes.filter((q) => q.status === QuoteStatus.LOST);
  const wonVolumeByCurrency = wonQuotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.currency] = (acc[q.currency] ?? 0) + Number(q.grandTotal || 0);
    return acc;
  }, {});
  const lostVolumeByCurrency = lostQuotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.currency] = (acc[q.currency] ?? 0) + Number(q.grandTotal || 0);
    return acc;
  }, {});
  const formatByCurrency = (byCurrency: Record<string, number>) => {
    const entries = Object.entries(byCurrency);
    if (entries.length === 0) return '—';
    return entries.map(([currency, amount]) => `${amount.toLocaleString('tr-TR')} ${currency}`).join(' · ');
  };

  const decidedQuotes = [...wonQuotes, ...lostQuotes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Kârlılık Analizi" description="Kazanılan ve kaybedilen tekliflerin hacim özeti." icon={ChartBarIncreasing} />
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <p className="text-sm font-black text-foreground uppercase tracking-widest">Veriler yüklenemedi</p>
              <p className="text-xs text-muted-foreground mt-1">Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.</p>
            </div>
            <Button onClick={load} variant="outline" className="border-border bg-card text-foreground dark:text-muted-foreground hover:bg-zinc-800 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-6">
              <RefreshCw size={14} /> Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Kârlılık Analizi"
        description="Kazanılan ve kaybedilen tekliflerin hacim özeti. Marj hesabı, maliyet verisi tam girilen tekliflerde teklif detayında görüntülenir."
        icon={ChartBarIncreasing}
      />

      {!loading && quotes.length === 0 ? (
        <Card className="bg-card border-border shadow-none">
          <CardContent className="py-16">
            <EmptyState
              icon={ChartBarIncreasing}
              title="Henüz kârlılık verisi yok"
              description="Bir teklif kazanıldı veya kaybedildi olarak işaretlendiğinde burada görünecek."
              actionText="TEKLİFLERİ GÖR"
              onAction={() => { window.location.href = '/app/quotes'; }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard title="Kazanılan Hacim" value={loading ? '—' : formatByCurrency(wonVolumeByCurrency)} icon={DollarSign} color="emerald" description={`${wonQuotes.length} teklif`} />
            <StatCard title="Kaybedilen Hacim" value={loading ? '—' : formatByCurrency(lostVolumeByCurrency)} icon={TrendingUp} color="zinc" description={`${lostQuotes.length} teklif`} />
            <StatCard
              title="Kazanma Oranı"
              value={loading || wonQuotes.length + lostQuotes.length === 0 ? '—' : `%${Math.round((wonQuotes.length / (wonQuotes.length + lostQuotes.length)) * 100)}`}
              icon={ChartBarIncreasing}
              color="orange"
            />
          </div>

          <SectionWrapper title="Kazanılan / Kaybedilen Teklifler" description="Marj görmek için bir teklife girin — maliyet verisi eksikse teklif detayı bunu açıkça belirtir.">
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-0">
                {decidedQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-12 text-center">Henüz sonuçlanmış (kazanılan/kaybedilen) teklif yok.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {decidedQuotes.map((quote) => (
                      <Link key={quote.id} to={`/app/quotes/${quote.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-zinc-800/20 transition-all">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-foreground uppercase tracking-tight truncate">{quote.projectName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{quote.quoteNumber}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono text-sm text-foreground font-black">{Number(quote.grandTotal).toLocaleString('tr-TR')} <span className="text-[10px] text-muted-foreground">{quote.currency}</span></span>
                          <StatusBadge status={quote.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        </>
      )}
    </PageContainer>
  );
}
