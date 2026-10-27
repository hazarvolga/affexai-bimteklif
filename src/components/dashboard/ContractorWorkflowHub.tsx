/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, Building2, Calculator, Eye, FileSpreadsheet, PencilLine, Scale, ShieldCheck, Sparkles } from 'lucide-react';

interface ContractorWorkflowHubProps {
  compact?: boolean;
}

interface StartOption {
  id: 'excel' | 'ifc' | 'manual' | 'sample';
  title: string;
  description: string;
  to: string;
  icon: typeof FileSpreadsheet;
}

/**
 * "Nereden başlayacaksınız?" — kullanıcıya yaşam evresi değil elindeki kaynak sorulur ve her seçenek
 * doğrudan ilgili akışı açar (marka.md M-11.4, M-12.1, M-15.1). IFC için tek giriş SmartCheck'tir.
 */
export const START_OPTIONS: readonly StartOption[] = [
  {
    id: 'excel',
    title: 'Excel / CSV metrajım var',
    description: 'Metraj cetvelinizi yükleyin; kalemler teklife aktarılır.',
    to: '/app/quotes/new?kaynak=excel',
    icon: FileSpreadsheet,
  },
  {
    id: 'ifc',
    title: 'IFC modelim var',
    description: 'Modelden metraj icmali çıkarın, fiyatlandırıp teklife taşıyın.',
    to: '/app/smartcheck',
    icon: Box,
  },
  {
    id: 'manual',
    title: 'Kalemleri kendim gireceğim',
    description: 'Boş bir teklifle başlayın, kalemleri elle yazın.',
    to: '/app/quotes/new?kaynak=elle',
    icon: PencilLine,
  },
  {
    id: 'sample',
    title: 'Örnek projeyi inceleyeceğim',
    description: 'Kotanızdan düşmeyen örnek bir modelle sonucu görün.',
    to: '/app/smartcheck?ornek=mm-mimari-tablo-9-1',
    icon: Sparkles,
  },
];

interface ToolLink {
  title: string;
  to: string;
  icon: typeof Building2;
  tour?: string;
}

const MORE_TOOLS: readonly ToolLink[] = [
  { title: 'Arsa ön fizibilitesi', to: '/app/arsa-fizibilitesi', icon: Building2 },
  { title: 'Taşeron hakediş kontrolü', to: '/app/smartcheck', icon: ShieldCheck, tour: 'subcontractor-shield' },
  { title: 'KİK sınır değer (aşırı düşük teklif)', to: '/hesaplayicilar/kik-asiri-dusuk-teklif', icon: Calculator, tour: 'public-procurement' },
  { title: '4735 fiyat farkı', to: '/hesaplayicilar/fiyat-farki-4735', icon: Calculator },
  { title: 'Mevzuat değişiklikleri', to: '/app/regulations', icon: Scale },
  { title: 'Tarayıcıda hızlı IFC ön inceleme (yetkili sonuç değildir)', to: '/app/ifc-parser', icon: Eye },
];

export const ContractorWorkflowHub: React.FC<ContractorWorkflowHubProps> = ({ compact = false }) => (
  <section
    aria-labelledby="start-chooser-title"
    data-testid="contractor-workflow-hub"
    data-tour="workflow-hub"
    className={compact ? 'mb-6 rounded-sm border border-border bg-card/60 p-4' : 'mb-8 rounded-sm border border-border bg-card p-6'}
  >
    <h2 id="start-chooser-title" className={compact ? 'text-sm font-semibold text-foreground' : 'text-lg md:text-xl font-semibold text-foreground'}>
      Nereden başlayacaksınız?
    </h2>
    {!compact && (
      <p className="mt-1 text-sm text-muted-foreground">
        Elinizdeki kaynağı seçin; ilgili ekran doğrudan açılır. Sonuçlar ön hesaptır ve yetkili mühendis kontrolü gerektirir.
      </p>
    )}

    <ul className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
      {START_OPTIONS.map(option => {
        const Icon = option.icon;
        return (
          <li key={option.id}>
            <Link
              to={option.to}
              data-start-option={option.id}
              className="group flex h-full items-start gap-3 rounded-xs border border-border bg-background p-4 transition-colors hover:border-primary/60 hover:bg-muted/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="shrink-0 rounded-xs border border-primary/20 bg-primary/10 p-2 text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                  {option.title}
                  <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </span>
                {!compact && <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>

    <nav aria-label="Diğer araçlar" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
      <span className="text-muted-foreground">Diğer araçlar:</span>
      {MORE_TOOLS.map(tool => {
        const Icon = tool.icon;
        return (
          <Link key={tool.title} to={tool.to} data-tour={tool.tour} className="inline-flex items-center gap-1.5 text-foreground hover:text-primary hover:underline">
            <Icon size={13} aria-hidden="true" className="text-muted-foreground" />
            {tool.title}
          </Link>
        );
      })}
    </nav>
  </section>
);
