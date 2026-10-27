/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from 'react';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEVERITY_LABEL } from '@/i18n/ui-terms';
import type { DemoFinding } from '@/smartcheck/demoData';
import type { DemoWalkthrough } from '@/smartcheck/demo-walkthrough';
import { DemoStatusBadge } from './DemoStatusBadge';

interface DemoFindingDetailProps {
  finding: DemoFinding;
  walkthrough: DemoWalkthrough;
  isRechecking: boolean;
  onApplyFix: () => void;
  onRecheck: () => void;
  children?: React.ReactNode;
}

const RULE_TYPE_LABEL: Record<DemoFinding['ruleType'], string> = {
  demo_dictionary_mapping: 'Poz–birim eşleştirmesi',
  demo_engineering_rule: 'Mühendislik kuralı (örnek)',
  demo_office_rule: 'Ofis modelleme kuralı (örnek)',
};

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section data-demo-step={index} className="border-l-2 border-border pl-4">
      <h3 className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {index}. {title}
      </h3>
      <div className="text-xs leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

/** One finding told in the order a contractor reviews it: problem, source row, finding, fix, offer impact (M-10.2). */
export function DemoFindingDetail({ finding, walkthrough, isRechecking, onApplyFix, onRecheck, children }: DemoFindingDetailProps) {
  return (
    <Card className="space-y-5 rounded-sm border border-border bg-card p-5 shadow-xs" data-testid="demo-finding-detail">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-bold text-foreground">{finding.title}</h2>
        <DemoStatusBadge status={finding.status} />
      </div>

      <Step index={1} title="Problem">
        <p>{walkthrough.problem}</p>
      </Step>

      <Step index={2} title="Kaynak satırı">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 font-mono sm:grid-cols-[minmax(0,10rem)_1fr]">
          {walkthrough.sourceRow.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </Step>

      <Step index={3} title="Bulgu">
        <p className="font-mono">
          {finding.status === 'open'
            ? <>Mevcut: <strong>{walkthrough.currentLabel}</strong> · Beklenen: <strong>{walkthrough.expectedLabel}</strong></>
            : <>Düzeltilmiş: <strong>{walkthrough.expectedLabel}</strong> · Önceki: <strong>{walkthrough.currentLabel}</strong></>}
        </p>
        <p className="mt-1 text-muted-foreground">
          {SEVERITY_LABEL[finding.severity]} · {RULE_TYPE_LABEL[finding.ruleType]} · Örnek veri, resmî poz veya mevzuat verisi değildir.
        </p>
      </Step>

      <Step index={4} title="Öneri">
        <p>{walkthrough.fix}</p>
        {finding.status === 'open' && (
          <Button onClick={onApplyFix} data-testid="demo-apply-fix" className="mt-3 h-9 w-full gap-1.5 font-mono text-xs">
            <SlidersHorizontal size={13} /> {walkthrough.fixAction}
          </Button>
        )}
        {finding.status === 'in_progress' && (
          <div className="mt-3 space-y-2 border border-primary/30 bg-primary/5 p-3">
            <p>Düzeltme uygulandı. Sonucu görmek için kontrolü yeniden çalıştırın.</p>
            <Button onClick={onRecheck} disabled={isRechecking} data-testid="demo-recheck" className="h-9 w-full gap-1.5 font-mono text-xs">
              <RefreshCw size={13} className={isRechecking ? 'animate-spin' : ''} />
              {isRechecking ? 'Kontrol ediliyor…' : 'Kontrolü yeniden çalıştır'}
            </Button>
          </div>
        )}
        {finding.status === 'resolved' && <p className="mt-2 text-muted-foreground">Yeniden kontrol edildi; bulgu kapandı.</p>}
      </Step>

      <Step index={5} title="Teklife etkisi">
        <p>{walkthrough.quoteImpact}</p>
      </Step>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-mono">Teknik ayrıntılar</summary>
        <p className="mt-2 font-mono">Kural: {finding.ruleId} · Modül: {finding.skillCode} · Kaynak: {finding.sourceName}</p>
        <p className="mt-2 whitespace-pre-line">{finding.evidence}</p>
      </details>

      {children}
    </Card>
  );
}
