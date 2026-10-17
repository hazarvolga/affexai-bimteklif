/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FileSpreadsheet,
  Box,
  Layers,
  ShieldCheck,
  Scale,
  TrendingUp,
  ArrowRight,
  Sparkles,
  FileText,
  CheckCircle2,
  HardHat,
  Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ContractorWorkflowHubProps {
  compact?: boolean;
}

export const ContractorWorkflowHub: React.FC<ContractorWorkflowHubProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="mb-6 rounded-sm border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="stamp-badge border-primary/40 text-primary bg-primary/10 text-[10px]">
              <Sparkles size={11} className="shrink-0" />
              MÜTEAHHİTLİK SÜREÇ MASASI
            </span>
            <span className="text-xs font-semibold text-foreground">Hızlı İşlem Başlat</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            Projenizin evresine göre çalışma masası seçin
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Evre 1: Ön Fizibilite */}
          <Link
            to="/app/smartcheck#pre-bim-feasibility"
            className="group p-3 rounded-xs border border-border bg-background/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-xs bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <Building2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold text-primary uppercase">EVRE 01 · ARSA & İHALE</span>
                <ArrowRight size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs font-medium text-foreground truncate mt-0.5">Ön Fizibilite & Excel Teklif</p>
              <p className="text-[11px] text-muted-foreground truncate">Arsa TAKS/KAKS, kat karşılığı & ÇŞB cetveli</p>
            </div>
          </Link>

          {/* Evre 2: openBIM 5D */}
          <Link
            to="/app/smartcheck"
            className="group p-3 rounded-xs border border-border bg-background/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-xs bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <Box size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold text-primary uppercase">EVRE 02 · openBIM 5D</span>
                <ArrowRight size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs font-medium text-foreground truncate mt-0.5">3D IFC Model Tabanlı Metraj</p>
              <p className="text-[11px] text-muted-foreground truncate">Otomatik minha düşümü, beton/demir icmali</p>
            </div>
          </Link>

          {/* Evre 3: Taşeron Hakediş */}
          <Link
            to="/app/smartcheck"
            className="group p-3 rounded-xs border border-border bg-background/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-start gap-3"
          >
            <div className="p-2 rounded-xs bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold text-primary uppercase">EVRE 03 · SAHA DENETİMİ</span>
                <ArrowRight size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs font-medium text-foreground truncate mt-0.5">Taşeron Hakediş Kalkanı</p>
              <p className="text-[11px] text-muted-foreground truncate">325 kg/m³ şap çimento tavanı & kesinti</p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Full Hero Onboarding View (Rendered when no quotes or explicitly invoked)
  return (
    <div className="mb-8 space-y-6" data-testid="contractor-workflow-hub">
      {/* Intro Banner */}
      <div className="rounded-sm border border-border bg-card p-6 relative overflow-hidden shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="stamp-badge border-primary/40 text-primary bg-primary/10">
                <Compass size={12} className="shrink-0" />
                MÜTEAHHİTLİK SÜREÇ MASASI
              </span>
              <span className="font-mono text-xs text-muted-foreground">Adım Adım Yönlendirme</span>
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
              Hangi Aşamada İşlem Yapmak İstiyorsunuz?
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              BIMMetraj, Türk müteahhitlik ve teknik ofis iş süreçlerine tam uyumludur. 
              Elinizdeki belgenin veya projenin durumuna göre aşağıdaki 3 ana evreden birini seçerek başlayabilirsiniz:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link to="/app/quotes/new">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
                <FileText size={14} />
                Manuel Teklif
              </Button>
            </Link>
            <Link to="/app/smartcheck">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground gap-1.5 text-xs font-semibold shadow-xs">
                <Box size={14} />
                SmartCheck Dosya Yükle
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Main Workflow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* KART 1: ARSA & ÖN FİZİBİLİTE */}
        <Card className="border border-border bg-card shadow-xs rounded-sm hover:border-primary/50 transition-all flex flex-col justify-between group">
          <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
                  EVRE 01 · PROJE ÖNCESİ
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">Arsa / Teklif</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-sm bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Arsa & Ön Fizibilite Masası
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    "Henüz projem çizilmedi; arsam veya ihale cetvelim var"
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Arsa & Emsal:</strong> TAKS/KAKS, emsal harici yasal %30 tavan denetimi.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Kat Karşılığı:</strong> Daire paylaşımı, kademeli tapu devri, %1 KDV marjı.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Excel'den İhale:</strong> İdare metraj cetvelini ÇŞB 2026 pozlarıyla eşleştirme.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link to="/app/smartcheck#pre-bim-feasibility" className="w-full">
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-foreground text-xs font-semibold gap-1.5 shadow-xs">
                  <span>Arsa Fizibilitesini Aç</span>
                  <ArrowRight size={13} />
                </Button>
              </Link>
              <Link to="/app/quotes/new" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-medium gap-1.5">
                  <FileSpreadsheet size={13} />
                  <span>Excel / Cetvelden Teklif Al</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* KART 2: openBIM 5D METRAJ */}
        <Card className="border border-border bg-card shadow-xs rounded-sm hover:border-primary/50 transition-all flex flex-col justify-between group">
          <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
                  EVRE 02 · MODEL ANALİZİ
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">3D IFC / openBIM</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-sm bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Box size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    3D openBIM (IFC) Metraj Masası
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    "Revit, Allplan veya Archicad 3D modelim hazır"
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>5D openBIM Metraj:</strong> Betonarme, kalıp, demir ve duvar hacim icmali.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Geometrik Minha:</strong> Kapı, pencere ve düğüm noktalarında hatasız boşluk düşümü.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Eksik Poz Denetimi:</strong> Çizilmiş ama pozu tanımlanmamış kaçak kalemleri bulma.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link to="/app/smartcheck" className="w-full">
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-foreground text-xs font-semibold gap-1.5 shadow-xs">
                  <span>3D IFC Dosyası Yükle</span>
                  <ArrowRight size={13} />
                </Button>
              </Link>
              <Link to="/app/ifc-parser" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-medium gap-1.5">
                  <Layers size={13} />
                  <span>Hızlı IFC Ayrıştırıcı</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* KART 3: TAŞERON HAKEDİŞ KALKANI */}
        <Card className="border border-border bg-card shadow-xs rounded-sm hover:border-primary/50 transition-all flex flex-col justify-between group">
          <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
                  EVRE 03 · SAHA DENETİMİ
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">Şantiye Hakediş</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-sm bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Taşeron Hakediş Kalkanı
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    "Sahada imalat yapılıyor; taşeron metrajını denetleyeceğim"
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Melih Dinekli Standardı:</strong> 325 kg/m³ çimento ve %10 fire şap tavanı.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Net Mahal Minha:</strong> 2 cm sıva düşümü, süpürgelik tavanı, +0,40 m² söve dönüşü.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span><strong>Hakediş Kesinti Raporu:</strong> Şişirilmiş beyanları tespit edip tutanak çıkarma.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link to="/app/smartcheck" className="w-full">
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-foreground text-xs font-semibold gap-1.5 shadow-xs">
                  <span>Hakediş Denetim Masasını Aç</span>
                  <ArrowRight size={13} />
                </Button>
              </Link>
              <Link to="/app/regulations" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-medium gap-1.5">
                  <HardHat size={13} />
                  <span>Şantiye Standartları</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Legal & Public Procurement Strip */}
      <div className="rounded-sm border border-border bg-card/60 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground">Kamu İhale & Mevzuat Araçları:</span>
            <span className="hidden md:inline text-xs text-muted-foreground">KİK ve 4735 hesaplayıcılarına doğrudan erişin:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/hesaplayicilar/kik-asiri-dusuk-teklif"
              className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
            >
              <span>KİK Sınır Değer (Aşırı Düşük) →</span>
            </Link>
            <span className="text-border">|</span>
            <Link
              to="/hesaplayicilar/fiyat-farki-4735"
              className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
            >
              <span>4735 Fiyat Farkı →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
