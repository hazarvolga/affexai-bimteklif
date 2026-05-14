import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Zap, 
  FileText, 
  Target, 
  BrainCircuit, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowUpRight
} from "lucide-react";
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
import { toast } from "sonner";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/billing/usage-stats", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (!res.ok) throw new Error("Failed to fetch billing data");
        const json = await res.json();
        setData(json);
      } catch (error) {
        toast.error("Billing bilgileri yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </PageContainer>
    );
  }

  const plans = [
    { name: "Starter", price: "0", features: ["20 AI İstek", "20 PDF", "Temel CRM"], id: "starter" },
    { name: "Pro", price: "499", features: ["200 AI İstek", "Sınırsız PDF", "Gelişmiş CRM"], id: "pro", popular: true },
    { name: "Elite", price: "1299", features: ["1000 AI İstek", "Öncelikli Destek", "Tam Otomasyon"], id: "elite" },
  ];

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

      <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6">Planınızı Yükseltin</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((p) => (
          <Card key={p.id} className={cn(
            "bg-[#0c0c0e] border-zinc-800 relative transition-all duration-300 hover:scale-[1.02]",
            p.popular && "border-orange-600/50 shadow-2xl shadow-orange-900/10"
          )}>
            {p.popular && (
              <div className="absolute top-0 right-0 -tranzinc-y-1/2 bg-orange-600 text-[8px] font-black text-white px-3 py-1 rounded-full tracking-widest">
                EN ÇOK TERCİH EDİLEN
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                {p.name}
                <span className="text-2xl font-black">₺{p.price}</span>
              </CardTitle>
              <CardDescription>aylık</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button 
                className={cn(
                  "w-full font-black text-[10px] uppercase tracking-widest h-11 rounded-xl",
                  p.id === data.plan ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-white text-black hover:bg-orange-600 hover:text-white"
                )}
                disabled={p.id === data.plan}
              >
                {p.id === data.plan ? "MEVCUT PLAN" : "ABONE OL"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
