import { useEffect, useState } from 'react';
import {
  FileText,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChartArea,
  ClipboardList,
  RefreshCw,
  Plus,
  Box,
  Layers,
  BadgeCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data/StatCard';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Quote, QuoteStatus } from '@/types';
import { ContractorWorkflowHub } from '@/components/dashboard/ContractorWorkflowHub';

const MONTH_LABELS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const ACTIVE_STATUSES: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.NEGOTIATION];
const DAY_MS = 24 * 60 * 60 * 1000;

function buildMonthlyPipeline(quotes: Quote[]) {
  const buckets = new Map<string, number>();
  const order: string[] = [];
  const anchor = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, 0);
    order.push(key);
  }
  quotes.forEach((quote) => {
    const d = new Date(quote.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(quote.grandTotal || 0));
  });
  return order.map((key) => ({ name: MONTH_LABELS_TR[Number(key.split('-')[1])], value: Math.round(buckets.get(key) ?? 0) }));
}

export function Dashboard() {
  const { company, user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Redirect super admins to their operational dashboard
  if (user?.isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const loadQuotes = () => {
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
    loadQuotes();
  }, []);

  const primaryCurrency = company?.defaultCurrency ?? 'TRY';
  const primary = quotes.filter((q) => q.currency === primaryCurrency);
  const otherCurrencyCount = quotes.length - primary.length;

  const activeQuotes = primary.filter((q) => ACTIVE_STATUSES.includes(q.status));
  const pendingVolume = activeQuotes.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);

  const wonCount = primary.filter((q) => q.status === QuoteStatus.WON).length;
  const lostCount = primary.filter((q) => q.status === QuoteStatus.LOST).length;
  const decidedCount = wonCount + lostCount;
  const winRate = decidedCount > 0 ? Math.round((wonCount / decidedCount) * 100) : null;

  const now = Date.now();
  const expiringSoonCount = primary.filter((q) => {
    if (q.status !== QuoteStatus.SENT && q.status !== QuoteStatus.NEGOTIATION) return false;
    const expiry = new Date(q.expiryDate).getTime();
    return expiry >= now && expiry - now <= 7 * DAY_MS;
  }).length;

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const monthlyPipeline = buildMonthlyPipeline(primary);
  const hasPipelineData = monthlyPipeline.some((m) => m.value > 0);

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Panel" description="Satış performansınız ve finansal özetiniz." />
        <Card className="border border-border bg-card shadow-xs rounded-sm">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="text-destructive" size={28} />
            <div>
              <p className="text-sm font-semibold text-foreground">Veriler yüklenemedi</p>
              <p className="text-xs text-muted-foreground mt-1">Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.</p>
            </div>
            <Button onClick={loadQuotes} variant="outline" size="sm" className="gap-2 mt-2">
              <RefreshCw size={14} /> Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Engineering Blueprint Title Block (Pafta Anteti) */}
      <div className="mb-6 rounded-sm border border-border bg-card/60 p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase">FİRMA:</span>
            <strong className="text-foreground font-semibold">{company?.name || 'Teknik Ofis'}</strong>
          </div>
          <div className="h-3.5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase">KAYNAK:</span>
            <span className="text-primary font-bold">Kanıtlı Metraj & Fiyat Kataloğu</span>
          </div>
          <div className="h-3.5 w-px bg-border hidden md:block" />
          <div className="hidden md:flex items-center gap-2">
            <span className="text-muted-foreground uppercase">PARA BİRİMİ:</span>
            <span className="text-foreground">{primaryCurrency}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="stamp-badge border-primary/40 text-primary bg-primary/10">
            <BadgeCheck size={12} className="shrink-0" />
            İhale Masası Aktif
          </span>
          <span className="text-muted-foreground tabular-nums">
            {new Date().toLocaleDateString('tr-TR')}
          </span>
        </div>
      </div>

      <PageHeader
        title="İhale & Metraj Masası"
        description="Aktif teklifleriniz, metraj hacminiz ve finansal özetiniz."
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/app/quotes/new">
              <Button variant="outline" size="sm" className="gap-1.5 font-medium">
                <Plus size={15} />
                Manuel Teklif
              </Button>
            </Link>
            <Link to="/app/smartcheck">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground gap-1.5 font-semibold shadow-xs">
                <Box size={15} />
                SmartCheck & IFC Yükle
              </Button>
            </Link>
          </div>
        }
      />

      {!loading && quotes.length === 0 ? (
        <ContractorWorkflowHub compact={false} />
      ) : (
        <>
          <ContractorWorkflowHub compact={true} />
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Aktif Teklifler" value={loading ? '—' : activeQuotes.length} icon={FileText} color="blue" />
            <StatCard
              title="Bekleyen Hacim"
              value={loading ? '—' : `${pendingVolume.toLocaleString('tr-TR')} ${primaryCurrency}`}
              icon={TrendingUp}
              color="orange"
              description={otherCurrencyCount > 0 ? `${otherCurrencyCount} teklif farklı para biriminde` : undefined}
            />
            <StatCard title="Kazanma Oranı" value={loading ? '—' : winRate === null ? '—' : `%${winRate}`} icon={CheckCircle2} color="emerald" description={winRate === null ? 'Henüz kazanılan/kaybedilen teklif yok' : undefined} />
            <StatCard title="Süresi Yaklaşan Teklifler" value={loading ? '—' : expiringSoonCount} icon={AlertTriangle} color={expiringSoonCount > 0 ? 'orange' : 'zinc'} description="7 gün içinde geçerliliği dolacak" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Pipeline Chart */}
            <Card className="lg:col-span-8 border border-border bg-card shadow-xs rounded-sm">
              <CardHeader className="border-b border-border/80 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Aylık Teklif Hacmi ({primaryCurrency})</CardTitle>
                <Link to="/app/crm" className="text-xs text-primary font-mono font-medium hover:underline">CRM Görünümü →</Link>
              </CardHeader>
              <CardContent className="pt-4">
                {hasPipelineData ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyPipeline}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.28 0.016 255 / 0.5)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'oklch(0.72 0.015 255)' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'oklch(0.72 0.015 255)' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'oklch(0.18 0.013 255)', borderRadius: '4px', border: '1px solid oklch(0.28 0.016 255)', color: '#ffffff' }}
                          itemStyle={{ color: '#ea580c', fontWeight: 600 }}
                          formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ${primaryCurrency}`, 'Hacim']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-center px-6">
                    <p className="text-xs text-muted-foreground font-mono">Son 6 ayda kaydedilmiş teklif hacmi bulunmuyor.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-4 border border-border bg-card shadow-xs rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 pb-3">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ClipboardList className="text-primary" size={15} />
                  Son Teklifler
                </CardTitle>
                <Link to="/app/quotes" className="text-xs text-muted-foreground hover:text-foreground font-mono">Tümü →</Link>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-3">
                {recentQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center font-mono">Henüz teklif oluşturulmadı.</p>
                ) : (
                  recentQuotes.map((quote) => (
                    <Link key={quote.id} to={`/app/quotes/${quote.id}`} className="block p-3 rounded-xs border border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-primary">{quote.quoteNumber}</span>
                        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{new Date(quote.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <p className="text-xs text-foreground font-medium truncate">{quote.projectName}</p>
                      <p className="text-xs font-mono font-semibold text-foreground/90 mt-1 tabular-nums">
                        {Number(quote.grandTotal || 0).toLocaleString('tr-TR')} {quote.currency}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SectionWrapper title="Kârlılık ve Marj Analizi" description="Maliyet verisi tamamlanmış tekliflerin kâr oranları.">
              <Card className="border border-border bg-card shadow-xs rounded-sm h-full">
                <CardContent className="p-4 pt-5 flex flex-col h-full justify-between">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <ChartArea size={18} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">Portföy genelinde kâr marjı, her teklifte malzeme ve işçilik maliyet verisi tam girildiğinde hesaplanır.</p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-border">
                    <Link to="/app/profitability">
                      <Button variant="outline" size="sm" className="w-full text-xs font-medium">
                        Kârlılık Analizini Aç →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </SectionWrapper>

            <SectionWrapper title="Süresi Yaklaşan İhaleler" description="7 gün içinde geçerlilik tarihi dolacak teklifler.">
              <Card className="border border-border bg-card shadow-xs rounded-sm h-full">
                <CardContent className="p-4 pt-5">
                  {expiringSoonCount === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center font-mono">Yakın vadede süresi dolacak teklif yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {primary
                        .filter((q) => {
                          if (q.status !== QuoteStatus.SENT && q.status !== QuoteStatus.NEGOTIATION) return false;
                          const expiry = new Date(q.expiryDate).getTime();
                          return expiry >= now && expiry - now <= 7 * DAY_MS;
                        })
                        .slice(0, 4)
                        .map((quote) => (
                          <Link key={quote.id} to={`/app/quotes/${quote.id}`} className="flex items-center justify-between p-2.5 rounded-xs border border-border bg-muted/20 hover:border-primary/40 transition-colors">
                            <span className="text-xs text-foreground font-medium truncate">{quote.projectName}</span>
                            <span className="text-xs text-primary font-mono font-semibold shrink-0 ml-2 tabular-nums">
                              {new Date(quote.expiryDate).toLocaleDateString('tr-TR')}
                            </span>
                          </Link>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SectionWrapper>

            <SectionWrapper title="openBIM 5D Metraj" description="Model hacim ve alanlarını saniyeler içinde cetvele dökün.">
              <Card className="border border-border bg-card shadow-xs rounded-sm h-full">
                <CardContent className="p-4 pt-5 flex flex-col h-full justify-between">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Layers size={18} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Revit, Allplan veya Archicad IFC modelinizi yükleyin. SmartCheck motorumuz eksik pozları tespit etsin ve metrajları otomatik çıkarsın.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-border">
                    <Link to="/app/smartcheck">
                      <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-foreground text-xs font-semibold shadow-xs">
                        SmartCheck & IFC Yükle →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </SectionWrapper>
          </div>
        </>
      )}
    </PageContainer>
  );
}
