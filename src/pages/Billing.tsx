import React, { useState, useEffect } from "react";
import {
  CreditCard,
  AlertCircle,
  Lock,
  RefreshCw
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";

interface UsageStat {
  feature: string;
  current: number;
  limit: number;
  cost: number;
}

interface BillingData {
  plan: string;
  usage: UsageStat[];
  totalMonthlyCost: number;
  period: {
    start: string;
    end: string;
  };
}

export function Billing() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetchWithAuth("/api/billing/usage-stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch billing data");
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <PageHeader title="Faturalandırma & Kullanım" description="Sistem kaynak kullanımınızı takip edin." icon={CreditCard} />
        <Card className="bg-[#0c0c0e] border-zinc-800">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="text-red-500" size={32} />
            <div>
              <p className="text-sm font-black text-white uppercase tracking-widest">Faturalandırma verileri yüklenemedi</p>
              <p className="text-xs text-zinc-500 mt-1">Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.</p>
            </div>
            <Button onClick={fetchData} variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-6">
              <RefreshCw size={14} /> Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const chartData = data.usage.map(u => ({
    name: u.feature.replace("_", " ").toUpperCase(),
    current: u.current,
    limit: u.limit,
    percentage: Math.min(100, (u.current / u.limit) * 100)
  }));

  const pieData = data.usage.map(u => ({
    name: u.feature,
    value: u.cost
  }));

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6"];

  return (
    <PageContainer>
      <PageHeader 
        title="Faturalandırma & Kullanım" 
        description="Sistem kaynak kullanımınızı takip edin ve maliyetlerinizi kontrol altında tutun."
        icon={CreditCard}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Usage Overview Card */}
        <Card className="lg:col-span-2 bg-[#0c0c0e] border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Kullanım Özeti</CardTitle>
                <CardDescription>Mevcut faturalandırma dönemi: {new Date(data.period.start).toLocaleDateString()}</CardDescription>
              </div>
              <Badge className="bg-orange-600 font-bold uppercase tracking-tighter shadow-lg shadow-orange-950/20 px-3">
                {data.plan.toUpperCase()} PLAN
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.usage.map((stat) => (
                <div key={stat.feature} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{stat.feature.replace("_", " ")}</span>
                    </div>
                    <span className="text-xs font-black text-white">
                      {stat.current} / {stat.limit === 999999 ? "∞" : stat.limit}
                    </span>
                  </div>
                  <Progress value={(stat.current / stat.limit) * 100} className="h-2 bg-zinc-900" />
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                    Tahmini Maliyet: {stat.cost.toFixed(2)} $
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis Card */}
        <Card className="bg-[#0c0c0e] border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Maliyet Analizi</CardTitle>
            <CardDescription>AI ve Altyapı harcamaları</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0c0c0e", border: "1px solid #27272a", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Toplam Aylık Maliyet Etkisi</p>
               <p className="text-2xl font-black text-white tracking-tighter">{data.totalMonthlyCost.toFixed(2)} $</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="mb-6 text-lg font-black uppercase tracking-widest text-white">Ticari durum</h3>
      <Card className="mb-10 border-orange-500/20 bg-orange-500/[0.04]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white"><Lock className="text-orange-400" size={20} />Ödeme altyapısı henüz bağlı değil</CardTitle>
          <CardDescription className="max-w-3xl leading-relaxed">Bu çalışma alanındaki abonelik kaydı pilot geliştirme içindir. Gerçek kart çekimi, otomatik abonelik veya online checkout yapılmıyor. İlk ticari pilotlar için kapsam ve fiyat manuel olarak netleştirilecek.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-3">
            <div className="border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Mevcut çalışma planı</p><p className="mt-2 font-semibold text-white">{data.plan.toUpperCase()}</p></div>
            <div className="border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Pilot fiyatı</p><p className="mt-2 font-semibold text-white">Görüşmede belirlenir</p></div>
            <div className="border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Ödeme durumu</p><p className="mt-2 font-semibold text-amber-300">Otomatik değil</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Alerts / Logs */}
      <Card className="bg-[#0c0c0e] border-zinc-800 mb-20">
        <CardHeader>
          <CardTitle className="text-white">Son Kullanım Uyarıları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Quota Yaklaşıyor</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">AI kullanımınız %80'e ulaştı. Kesintisiz hizmet için planınızı yükseltmeyi düşünebilirsiniz.</p>
              </div>
            </div>
            <Button variant="outline" className="border-zinc-800 text-zinc-400 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800">
              YÜKSELT
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
