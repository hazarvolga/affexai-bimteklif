import React, { useState, useEffect } from "react";
import { 
  ChartBarIncreasing, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  Target,
  FileDown,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data/StatCard';
import { SectionWrapper } from '@/components/layout/SectionWrapper';

const profitData = [
  { name: 'Ocak', profit: 45000, margin: 22 },
  { name: 'Şubat', profit: 52000, margin: 24 },
  { name: 'Mart', profit: 48000, margin: 21 },
  { name: 'Nisan', profit: 61000, margin: 26 },
  { name: 'Mayıs', profit: 55000, margin: 23 },
  { name: 'Haziran', profit: 67000, margin: 28 },
];

export function Profitability() {
  return (
    <PageContainer>
      <PageHeader 
        title="Kârlılık Analizi" 
        description="Gerçek zamanlı kâr marjı, finansal performans takibi ve sektörel karşılaştırmalar."
        icon={ChartBarIncreasing}
        actions={
          <>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-widest px-4 h-10 gap-2">
              <FileDown size={16} /> Dışa Aktar
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-widest px-6 h-10 gap-2">
              <RefreshCw size={16} /> Yeni Analiz
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Net Kâr (YTD)" 
          value="₺328.000" 
          trend="14.2%" 
          isPositive={true} 
          icon={DollarSign} 
          color="emerald"
        />
        <StatCard 
          title="Ort. Kâr Marjı" 
          value="%24.8" 
          trend="2.1%" 
          isPositive={true} 
          icon={TrendingUp} 
          color="orange"
        />
        <StatCard 
          title="Kaybedilen Hacim" 
          value="₺124.500" 
          trend="5.4%" 
          isPositive={false} 
          icon={ArrowDownRight} 
          color="zinc"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <SectionWrapper title="Aylık Kâr Gelişimi" description="Aylık bazda net kâr rakamlarının değişimi.">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#71717a', fontWeight: 900}} 
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
                    cursor={{ fill: '#27272a', opacity: 0.1 }}
                  />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                    {profitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === profitData.length - 1 ? '#ea580c' : '#18181b'} stroke={index === profitData.length - 1 ? '#ea580c' : '#27272a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </SectionWrapper>

        <SectionWrapper title="Marj Karşılaştırması (%)" description="Karlılık oranlarının aylık gelişim trendi.">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#71717a', fontWeight: 900}} 
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
                  />
                  <Line 
                    type="monotone" 
                    dataKey="margin" 
                    stroke="#ea580c" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#ea580c', strokeWidth: 3, stroke: '#09090b' }}
                    activeDot={{ r: 8, fill: '#ea580c', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </SectionWrapper>
      </div>
    </PageContainer>
  );
}
