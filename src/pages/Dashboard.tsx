import { useEffect, useState } from 'react';
import {
  FileText,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChartArea,
  ClipboardList,
  RefreshCw,
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
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data/StatCard';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Quote, QuoteStatus } from '@/types';

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
  const { company } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <p className="text-sm font-black text-white uppercase tracking-widest">Veriler yüklenemedi</p>
              <p className="text-xs text-zinc-500 mt-1">Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.</p>
            </div>
            <Button onClick={loadQuotes} variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-6">
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
        title="Panel"
        description="Satış performansınız ve finansal özetiniz."
        actions={
          <div className="flex items-center gap-3">
            <Link to="/app/quotes/new">
              <Button variant="outline" className="border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 gap-2 font-bold h-10 px-5">
                Manuel Teklif
              </Button>
            </Link>
            <Link to="/app/dosyadan-teklif-demo">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-orange-900/20 gap-2 font-bold h-10 px-6">
                3D IFC ile Teklif Hazırla
              </Button>
            </Link>
          </div>
        }
      />

      {!loading && quotes.length === 0 ? (
        <Card className="bg-zinc-900/30 border-zinc-800 shadow-none mb-8">
          <CardContent className="py-16">
            <EmptyState
              icon={FileText}
              title="Henüz teklif verisi yok"
              description="İlk teklifinizi oluşturduğunuzda panel gerçek satış performansınızı göstermeye başlar."
              actionText="İLK IFC MODELİNİ YÜKLE"
              onAction={() => { window.location.href = '/app/dosyadan-teklif-demo'; }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Aktif Teklifler" value={loading ? '—' : activeQuotes.length} icon={FileText} color="blue" />
            <StatCard
              title="Bekleyen Hacim"
              value={loading ? '—' : `${pendingVolume.toLocaleString('tr-TR')} ${primaryCurrency}`}
              icon={TrendingUp}
              color="orange"
              description={otherCurrencyCount > 0 ? `${otherCurrencyCount} teklif farklı para biriminde, dahil edilmedi` : undefined}
            />
            <StatCard title="Kazanma Oranı" value={loading ? '—' : winRate === null ? '—' : `%${winRate}`} icon={CheckCircle2} color="emerald" description={winRate === null ? 'Henüz kazanılan/kaybedilen teklif yok' : undefined} />
            <StatCard title="Süresi Yaklaşan Teklifler" value={loading ? '—' : expiringSoonCount} icon={AlertTriangle} color={expiringSoonCount > 0 ? 'orange' : 'zinc'} description="7 gün içinde geçerliliği dolacak" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            {/* Pipeline Chart */}
            <Card className="lg:col-span-8 bg-zinc-900/30 border-zinc-800 overflow-hidden shadow-none">
              <CardHeader className="border-b border-zinc-800/50 mb-6 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Aylık Teklif Hacmi ({primaryCurrency})</CardTitle>
                <Link to="/app/crm" className="text-[10px] text-orange-500 font-black hover:underline uppercase tracking-widest">DETAYLI CRM {'->'}</Link>
              </CardHeader>
              <CardContent>
                {hasPipelineData ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyPipeline}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 900 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 900 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                          itemStyle={{ color: '#ea580c', fontWeight: 700 }}
                          formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ${primaryCurrency}`, 'Hacim']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-center px-8">
                    <p className="text-xs text-zinc-600">Son 6 ayda teklif hacmi bulunmuyor.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-4 bg-zinc-900/50 border-zinc-800 shadow-none border-t-2 border-t-orange-600">
              <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/50 mb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="text-orange-500" size={16} />
                  Son Etkinlikler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {recentQuotes.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-6 text-center">Henüz teklif oluşturulmadı.</p>
                ) : (
                  recentQuotes.map((quote) => (
                    <Link key={quote.id} to={`/app/quotes/${quote.id}`} className="block p-4 bg-zinc-950 rounded-xl border border-zinc-800 group hover:border-orange-500/30 transition-all">
                      <p className="text-[10px] uppercase font-black text-zinc-500 mb-1 tracking-widest font-mono">{quote.quoteNumber}</p>
                      <p className="text-xs text-zinc-200 leading-relaxed font-medium truncate">{quote.projectName}</p>
                      <p className="text-[10px] text-zinc-600 mt-2">{new Date(quote.createdAt).toLocaleDateString('tr-TR')}</p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SectionWrapper title="Kârlılık" description="Marj görünürlüğü için maliyet verisi tamamlanmış tekliflere bakın.">
              <Card className="bg-zinc-900/30 border-zinc-800 shadow-none h-full">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <ChartArea size={20} className="text-orange-500" />
                    <p className="text-xs leading-relaxed">Portföy genelinde kâr marjı, her teklifte maliyet verisi tam girildiğinde hesaplanır.</p>
                  </div>
                  <Separator className="my-6 bg-zinc-800" />
                  <Link to="/app/profitability" className="mt-auto">
                    <Button variant="ghost" className="w-full text-[10px] font-black text-zinc-400 hover:text-white hover:bg-zinc-800 uppercase tracking-widest">
                      KÂRLILIK ANALİZİNİ AÇ {'->'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </SectionWrapper>

            <SectionWrapper title="Süresi Yaklaşan Teklifler" description="7 gün içinde geçerlilik tarihi dolacak teklifler.">
              <Card className="bg-zinc-900/30 border-zinc-800 shadow-none h-full">
                <CardContent className="pt-6">
                  {expiringSoonCount === 0 ? (
                    <p className="text-xs text-zinc-600 py-6 text-center">Yakın vadede süresi dolacak teklif yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {primary
                        .filter((q) => {
                          if (q.status !== QuoteStatus.SENT && q.status !== QuoteStatus.NEGOTIATION) return false;
                          const expiry = new Date(q.expiryDate).getTime();
                          return expiry >= now && expiry - now <= 7 * DAY_MS;
                        })
                        .slice(0, 4)
                        .map((quote) => (
                          <Link key={quote.id} to={`/app/quotes/${quote.id}`} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-orange-500/30 transition-all">
                            <span className="text-xs text-zinc-200 font-medium truncate">{quote.projectName}</span>
                            <span className="text-[10px] text-orange-400 font-mono font-black shrink-0 ml-2">{new Date(quote.expiryDate).toLocaleDateString('tr-TR')}</span>
                          </Link>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SectionWrapper>

            <SectionWrapper title="BIM ile Hızlanın" description="Maliyet hesaplamalarınızı saniyeler içinde tamamlayın.">
              <Card className="bg-zinc-900/30 border-zinc-800 shadow-none h-full">
                <CardContent className="pt-6 flex flex-col h-full">
                  <p className="text-xs text-zinc-400 leading-relaxed">Projelerinizi (Revit, Allplan, Archicad) IFC formatında yükleyin. SmartCheck motorumuz eksik pozları bulsun ve metrajları otomatik çıkarsın.</p>
                  <Link to="/app/dosyadan-teklif-demo" className="mt-auto pt-6">
                    <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black h-10 uppercase tracking-widest">
                      HEMEN YÜKLE
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </SectionWrapper>
          </div>
        </>
      )}
    </PageContainer>
  );
}
