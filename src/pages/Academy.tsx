/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Award, ChevronRight, Layers, FileText, ClipboardCheck, Users as UsersIcon, PenSquare, ClipboardList } from 'lucide-react';
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
      {accountType === 'workspace' && <div className="mb-6 flex justify-end"><Link to="/app/academy/activation" className="text-sm text-muted-foreground hover:text-orange-400">Aktivasyon raporunu aç</Link></div>}

      {/* Hero Banner */}
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 mb-10 relative overflow-hidden group">
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl -mr-20 -mb-20 transition-all duration-500 group-hover:bg-orange-600/10"></div>
        <div className="max-w-3xl space-y-6 relative z-10">
          <Badge className="bg-orange-500/10 text-orange-500 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            Ekosistem Öğrenme Motoru
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-foreground uppercase">
            Standartlarla Uyumlu <br/>
            <span className="text-orange-500">Mikro Öğrenme Portalı</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-xl">
            SmartCheck denetimleri sırasında tespit edilen modelleme ve metraj uyumsuzluklarını, interaktif simülatörler ve eğitim içerikleri ile bu alanda çözebilirsiniz.
          </p>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {[
          { label: 'Sertifikalarım', path: '/app/academy/certificates', icon: Award },
          { label: 'Sertifika Sınavı', path: '/app/academy/exam', icon: ClipboardCheck },
          { label: 'Akademi Profili', path: '/app/academy/profile', icon: UsersIcon },
          { label: 'CAD Detay Viewer', path: '/app/academy/cad-viewer', icon: PenSquare },
          { label: 'BIM Standartları', path: '/app/bim-standards', icon: ClipboardList },
          { label: 'BIM Sözlüğü', path: '/app/bim-glossary', icon: BookOpen },
        ].map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl hover:border-orange-500/30 hover:bg-card transition-all text-center"
          >
            <link.icon size={18} className="text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground dark:text-muted-foreground leading-tight">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Teklif ve Metraj Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <FileText size={14} className="text-orange-500" /> Teklif ve Metraj
          </h3>
          <Card className="bg-card border-border hover:border-orange-500/30 transition-all shadow-none group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <Badge className="bg-background text-muted-foreground border border-border text-[10px] font-mono px-2 py-0.5 rounded-md">
                    {proposalContent.contentType.toUpperCase()}
                  </Badge>
                  <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    DEMO
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground mt-4 group-hover:text-orange-500 transition-colors">
                  {proposalContent.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider font-bold mt-1">
                  SKILL: {proposalContent.skillCode}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed font-sans pt-0">
                Teklif pozlarının ve metraj cetvellerinin birim eşleşme prensipleri ve BIMPLAN standart uyumu.
              </CardContent>
            </div>
            <div className="p-6 pt-0">
              <Link to={`/app/academy/content/${proposalContent.slug}`}>
                <Button className="w-full bg-card border border-border hover:bg-orange-600 text-foreground dark:text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest h-10 rounded-xl gap-2 transition-all">
                  Eğitimi Başlat <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* ALLPLAN Akademisi Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Layers size={14} className="text-orange-500" /> ALLPLAN Akademisi
          </h3>
          <Card className="bg-card border-border hover:border-orange-500/30 transition-all shadow-none group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    KAYITLI KULLANICI ALANI
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground mt-4 group-hover:text-orange-500 transition-colors">
                  Modelleme & Donatı Eğitimleri
                </CardTitle>
                <CardDescription className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-1">
                  ALLPLAN CAD & Donatı Sandbox Çekirdeği
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed font-sans pt-0">
                Kaynak doğrulamalı Allplan Pro Track dersleri ile donatı detaylandırma ve katman birleşim priority simülatörlerini aynı öğrenme alanında buluşturur.
              </CardContent>
            </div>
            <div className="p-6 pt-0">
              <Link to="/app/academy/allplan">
                <Button className="w-full bg-card border border-border hover:bg-orange-600 text-foreground dark:text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest h-10 rounded-xl gap-2 transition-all">
                  ALLPLAN Akademisine Git <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* openBIM & Yazılım Metraj Karşılaştırma (Brutal Truth) Section */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <GraduationCap size={14} className="text-emerald-400" /> BIM Yazılımları Metraj Karşılaştırması &amp; Brutal Truth
          </h3>
          <Card className="bg-emerald-950/10 border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-none group relative overflow-hidden p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-card rounded-2xl border border-border">
                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold mb-2">AUTODESK REVIT</Badge>
                <h4 className="text-xs font-bold text-foreground mb-1">Revit 2025 IFC Metraj Sapmaları</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mimari ekosistemde dünya lideri. Donatı detaylandırmasında paspayı ve metraj çakışmalarında ±%10-%15 arası manuel müdahale gerektirir.
                </p>
              </div>
              <div className="p-4 bg-card rounded-2xl border border-border">
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold mb-2">NEMETSCHEK ALLPLAN</Badge>
                <h4 className="text-xs font-bold text-foreground mb-1">Allplan 2026 Donatı Hassasiyeti</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  %100 matematiksel donatı ve metraj cetveli hassasiyetinde dünyada 1 numaradır. Statik betonarme projelerinde 0 sapma sağlar.
                </p>
              </div>
              <div className="p-4 bg-card rounded-2xl border border-border">
                <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold mb-2">GRAPHISOFT ARCHICAD</Badge>
                <h4 className="text-xs font-bold text-foreground mb-1">Archicad 28 Mimari &amp; IFC Çıktısı</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hızlı mimari konsept ve sezgisel 3D çizimde harikadır; donatı tonaj metrajında statik IFC dönüştürücü köprüsü gerektirir.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-emerald-900/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-foreground dark:text-muted-foreground font-medium">
                BIMPlan Academy tüm yazılımlara eşit mesafede dürüst mühendislik verilerini sunar.
              </p>
              <Link to="/app/ifc-parser">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest h-10 px-6 gap-2 shrink-0">
                  openBIM IFC Engine ile Test Et <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
