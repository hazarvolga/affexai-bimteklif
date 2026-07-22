/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Award, ChevronRight, Layers, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { demoAcademyContent } from '@/smartcheck/demoData';
import { useAuth } from '@/hooks/useAuth';

export function Academy() {
  const { accountType } = useAuth();
  const proposalContent = demoAcademyContent.find(c => c.area === 'teklif_metraj')!;
  const allplanContents = demoAcademyContent.filter(c => c.area === 'allplan');

  return (
    <PageContainer>
      <PageHeader
        title="Akademi"
        description="Mühendislik standartlarını, donatı tasarım kurallarını ve metraj uyum yetkinliklerinizi geliştirin."
      />
      {accountType === 'workspace' && <div className="mb-6 flex justify-end"><Link to="/app/academy/activation" className="text-sm text-zinc-400 hover:text-orange-400">Aktivasyon raporunu aç</Link></div>}

      {/* Hero Banner */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 sm:p-12 mb-10 relative overflow-hidden group">
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl -mr-20 -mb-20 transition-all duration-500 group-hover:bg-orange-600/10"></div>
        <div className="max-w-3xl space-y-6 relative z-10">
          <Badge className="bg-orange-500/10 text-orange-500 border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest">
            Ekosistem Öğrenme Motoru
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white uppercase">
            Standartlarla Uyumlu <br/>
            <span className="text-orange-500">Mikro Öğrenme Portalı</span>
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans max-w-xl">
            SmartCheck denetimleri sırasında tespit edilen modelleme ve metraj uyumsuzluklarını, interaktif simülatörler ve eğitim içerikleri ile bu alanda çözebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Teklif ve Metraj Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <FileText size={14} className="text-orange-500" /> Teklif ve Metraj
          </h3>
          <Card className="bg-zinc-900/30 border-zinc-800 hover:border-orange-500/30 transition-all shadow-none group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <Badge className="bg-zinc-950 text-zinc-400 border border-zinc-800 text-[8px] font-mono px-2 py-0.5 rounded-md">
                    {proposalContent.contentType.toUpperCase()}
                  </Badge>
                  <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                    DEMO
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-100 mt-4 group-hover:text-orange-500 transition-colors">
                  {proposalContent.title}
                </CardTitle>
                <CardDescription className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold mt-1">
                  SKILL: {proposalContent.skillCode}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed font-sans pt-0">
                Teklif pozlarının ve metraj cetvellerinin birim eşleşme prensipleri ve BIMPLAN standart uyumu.
              </CardContent>
            </div>
            <div className="p-6 pt-0">
              <Link to={`/app/academy/content/${proposalContent.slug}`}>
                <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-widest h-10 rounded-xl gap-2 transition-all">
                  Eğitimi Başlat <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* ALLPLAN Akademisi Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Layers size={14} className="text-orange-500" /> ALLPLAN Akademisi
          </h3>
          <Card className="bg-zinc-900/30 border-zinc-800 hover:border-orange-500/30 transition-all shadow-none group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                    KAYITLI KULLANICI ALANI
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-100 mt-4 group-hover:text-orange-500 transition-colors">
                  Modelleme & Donatı Eğitimleri
                </CardTitle>
                <CardDescription className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-1">
                  ALLPLAN CAD & Donatı Sandbox Çekirdeği
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed font-sans pt-0">
                Kaynak doğrulamalı Allplan Pro Track dersleri ile donatı detaylandırma ve katman birleşim priority simülatörlerini aynı öğrenme alanında buluşturur.
              </CardContent>
            </div>
            <div className="p-6 pt-0">
              <Link to="/app/academy/allplan">
                <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-widest h-10 rounded-xl gap-2 transition-all">
                  ALLPLAN Akademisine Git <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
