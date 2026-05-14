import { 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ShieldAlert,
  ChartArea,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data/StatCard';
import { SectionWrapper } from '@/components/layout/SectionWrapper';

const data = [
  { name: 'Oca', value: 400 },
  { name: 'Şub', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Nis', value: 800 },
  { name: 'May', value: 500 },
  { name: 'Haz', value: 900 },
];

export function Dashboard() {
  return (
    <PageContainer>
      <PageHeader 
        title="Panel" 
        description="Satış performansınız, AI önerileriniz ve finansal özetiniz."
        actions={
          <>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-widest px-4 h-10">
              Rapor İndir
            </Button>
            <Link to="/app/quotes/new">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20 font-bold text-xs uppercase tracking-widest px-6 h-10">
                Yeni Teklif +
              </Button>
            </Link>
          </>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Aktif Teklifler" value="24" trend="12%" isPositive icon={FileText} color="blue" />
        <StatCard title="Bekleyen Hacim" value="₺4.2M" trend="5%" isPositive icon={TrendingUp} color="orange" />
        <StatCard title="Kazanma Oranı" value="%68" trend="0%" icon={CheckCircle2} color="emerald" />
        <StatCard title="Net Kar Öngörüsü" value="₺842K" trend="22%" isPositive icon={ChartArea} color="emerald" description="Yapay zeka tahmini" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Main Chart */}
        <Card className="lg:col-span-8 bg-zinc-900/30 border-zinc-800 overflow-hidden shadow-none">
          <CardHeader className="border-b border-zinc-800/50 mb-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Satış Pipeline Değeri</CardTitle>
            <Link to="/app/crm" className="text-[10px] text-orange-500 font-black hover:underline uppercase tracking-widest">DETAYLI CRM {"->"}</Link>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#71717a', fontWeight: 900}} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#71717a', fontWeight: 900}} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#09090b', 
                      borderRadius: '12px', 
                      border: '1px solid #27272a',
                      color: '#f4f4f5',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: '#ea580c', fontWeight: 700 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ea580c" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestions Widget */}
        <Card className="lg:col-span-4 bg-zinc-900/50 border-zinc-800 shadow-none border-t-2 border-t-orange-600">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/50 mb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="text-orange-500" size={16} />
              AI Önerileri
            </CardTitle>
            <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0 text-[10px] font-black">6 YENİ</Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 group hover:border-orange-500/30 transition-all">
              <p className="text-[10px] uppercase font-black text-zinc-500 mb-1 tracking-widest">Müşteri Fırsatı</p>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">"Acme Corp" teklifi uzun süredir bekliyor. %15 indirim ile kapatma şansınız yüksek.</p>
              <Button variant="link" className="text-orange-500 h-auto p-0 text-[10px] font-black mt-3 uppercase tracking-widest group-hover:gap-2 transition-all">HAREKETE GEÇ {"->"}</Button>
            </div>
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 group hover:border-orange-500/30 transition-all">
              <p className="text-[10px] uppercase font-black text-zinc-500 mb-1 tracking-widest">Mevzuat Uyarısı</p>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">Tekstil sektöründe KDV düzenlemesi değişti. Tekliflerini güncelleyin.</p>
              <Button variant="link" className="text-orange-500 h-auto p-0 text-[10px] font-black mt-3 uppercase tracking-widest group-hover:gap-2 transition-all">DÜZENLEMELERİ GÖR {"->"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <SectionWrapper title="Kârlılık Özeti" description="Bu ayki hedefler ve gerçekleşme oranı.">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none h-full">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-tight">Bu Ayki Hedef</span>
                  <span className="text-sm font-black text-white font-mono">₺1.200.000</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-emerald-500 w-[72%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Gerçekleşen</span>
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">%72 TAMAMLANDI</span>
                </div>
              </div>
              <Separator className="my-6 bg-zinc-800" />
              <Link to="/app/profitability">
                <Button variant="ghost" className="w-full text-[10px] font-black text-zinc-400 hover:text-white hover:bg-zinc-800 uppercase tracking-widest">
                  TÜM RAPORLARI GÖR {"->"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </SectionWrapper>

        <SectionWrapper title="Son Etkinlikler" description="Sistemdeki en son güncellemeler.">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none h-full">
            <CardContent className="pt-6">
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-orange-500/10"></div>
                      {i < 3 && <div className="absolute top-2.5 left-1 w-0.5 h-10 bg-zinc-800"></div>}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-200 font-medium group-hover:text-white transition-colors">Yeni teklif oluşturuldu: #TK-00{i*42}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">12 Dakika Önce</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </SectionWrapper>

        <SectionWrapper title="Kritik Mevzuat" description="İşinizi etkileyecek yasal değişiklikler.">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none h-full">
            <CardContent className="pt-6">
               <div className="space-y-4">
                 <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl group hover:bg-red-500/10 transition-all">
                   <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2">YENİ KDV DÜZENLEMESİ</h4>
                   <p className="text-xs text-zinc-400 leading-relaxed font-medium">Hizmet ihracatında vergi muafiyeti güncellendi. Yaklaşan tüm teklifleri etkileyecektir.</p>
                 </div>
                 <Link to="/app/regulations">
                  <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black h-10 uppercase tracking-widest">
                    KRİTİK GÜNCELLEMELERİ İNCELE
                  </Button>
                 </Link>
               </div>
            </CardContent>
          </Card>
        </SectionWrapper>
      </div>
    </PageContainer>
  );
}
