/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useState } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, FileUp } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { toast } from 'sonner';
import { useSmartCheckDemo } from '@/smartcheck/SmartCheckDemoContext';
import { demoAcademyContent, type DemoFinding } from '@/smartcheck/demoData';
import { DEMO_WALKTHROUGH } from '@/smartcheck/demo-walkthrough';
import { DemoFindingDetail } from '@/components/smartcheck/DemoFindingDetail';
import { DemoStatusBadge } from '@/components/smartcheck/DemoStatusBadge';

type DemoField = 'quantityUnit' | 'reinforcementCoverMm' | 'wallPriority';
const FIELD_BY_FINDING: Record<string, DemoField> = {
  'finding-a': 'quantityUnit',
  'finding-b': 'reinforcementCoverMm',
  'finding-c': 'wallPriority',
};
const RECHECK_DELAY_MS = 600;

const STEPS = ['Problem', 'Kaynak satırı', 'Bulgu', 'Öneri', 'Teklife etkisi'];

function FindingListItem({ finding, isSelected, onSelect }: { finding: DemoFinding; isSelected: boolean; onSelect: () => void }) {
  const walkthrough = DEMO_WALKTHROUGH[finding.id];
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      data-demo-finding={finding.id}
      className={`w-full rounded-sm border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isSelected ? 'border-primary bg-muted/40' : 'border-border bg-card hover:bg-muted/20'
      }`}
    >
      <span className="mb-1.5 flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-xs font-semibold text-foreground">{finding.title}</span>
        <DemoStatusBadge status={finding.status} />
      </span>
      {walkthrough && (
        <span className="block text-xs text-muted-foreground">{walkthrough.problem}</span>
      )}
    </button>
  );
}

/** Closing step: how a visitor moves from the sample to their own file (M-10.3, M-10.6). */
function TryYourOwnFile({ isStandalone }: { isStandalone: boolean }) {
  return (
    <section data-testid="demo-try-own-file" className="mt-8 flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Kendi dosyanızla deneyin</h2>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Bu sayfadaki bulgular örnektir. Gerçek kullanımda bulgular sizin IFC modelinizden veya Excel metrajınızdan çıkar ve hiçbir değer siz onaylamadan değişmez.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {isStandalone ? (
          <>
            <Link to="/register" className={buttonVariants({ size: 'sm', className: 'gap-1.5 font-mono text-xs' })}><FileUp size={13} /> Ücretsiz hesap açın</Link>
            <Link to="/" className={buttonVariants({ size: 'sm', variant: 'outline', className: 'font-mono text-xs' })}>Ana sayfaya dönün</Link>
          </>
        ) : (
          <Link to="/app/smartcheck" className={buttonVariants({ size: 'sm', className: 'gap-1.5 font-mono text-xs' })}><FileUp size={13} /> Dosyanızı yükleyin</Link>
        )}
      </div>
    </section>
  );
}

export function SmartCheckDemo() {
  const location = useLocation();
  const isStandalone = !location.pathname.startsWith('/app');
  const { state: demoState, dispatch } = useSmartCheckDemo();
  const [selectedFindingId, setSelectedFindingId] = useState<string>('finding-a');
  const [isRechecking, setIsRechecking] = useState(false);

  const selectedFinding = demoState.findings.find(f => f.id === selectedFindingId);
  const selectedWalkthrough = selectedFinding ? DEMO_WALKTHROUGH[selectedFinding.id] : undefined;
  const matchingLesson = selectedFinding ? demoAcademyContent.find(c => c.skillCode === selectedFinding.skillCode) : null;
  const resolvedCount = demoState.findings.filter(f => f.status === 'resolved').length;

  const handleApplyFix = (finding: DemoFinding) => {
    const field = FIELD_BY_FINDING[finding.id];
    if (!field) return;
    dispatch({ type: 'APPLY_DEMO_FIX', payload: { field, value: finding.expectedValue } });
    toast.success('Düzeltme uygulandı.', { description: 'Sonucu görmek için kontrolü yeniden çalıştırın.' });
  };

  const handleRecheck = () => {
    setIsRechecking(true);
    setTimeout(() => {
      dispatch({ type: 'RUN_RECHECK' });
      setIsRechecking(false);
      toast.success('Kontrol yeniden çalıştırıldı.');
    }, RECHECK_DELAY_MS);
  };

  const content = (
    <PageContainer>
      <Link
        to={isStandalone ? '/' : '/app/smartcheck'}
        data-testid="demo-back-link"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} /> {isStandalone ? 'Ana sayfa' : 'SmartCheck'}
      </Link>

      <PageHeader
        title="SmartCheck örneği: teklif öncesi kontrol"
        description="Örnek bir projede üç bulguyu adım adım inceleyin. Veriler örnektir; resmî poz, mevzuat veya proje verisi değildir."
        actions={<ThemeToggle />}
      />

      <section data-testid="demo-intro" className="mb-6 border border-border bg-card p-4">
        <h2 className="text-xs font-semibold text-foreground">Bu örnekte ne var?</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bir teklif ve iki model dosyasında üç sorun bulundu. Soldan bir bulgu seçin; sağda sırasıyla şunları görürsünüz:
        </p>
        <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-foreground">
          {STEPS.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
        </ol>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="col-span-12 space-y-3 lg:col-span-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bulgular · {resolvedCount}/{demoState.findings.length} çözüldü
          </h2>
          <ul className="space-y-2.5" aria-label="Örnek bulgular">
            {demoState.findings.map(finding => (
              <li key={finding.id}>
                <FindingListItem finding={finding} isSelected={selectedFindingId === finding.id} onSelect={() => setSelectedFindingId(finding.id)} />
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-12 lg:col-span-7">
          {selectedFinding && selectedWalkthrough ? (
            <DemoFindingDetail
              finding={selectedFinding}
              walkthrough={selectedWalkthrough}
              isRechecking={isRechecking}
              onApplyFix={() => handleApplyFix(selectedFinding)}
              onRecheck={handleRecheck}
            >
              {ACADEMY_ENABLED && matchingLesson && (
                <div className="flex flex-col items-start justify-between gap-3 border border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                      <BookOpen size={12} /> İlgili Akademi dersi
                    </span>
                    <p className="text-xs font-semibold text-foreground">{matchingLesson.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{matchingLesson.estimatedMinutes} dk</p>
                  </div>
                  <Link to="/app/academy" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-8 shrink-0 gap-1 font-mono text-xs' })}>
                    Dersi inceleyin <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </DemoFindingDetail>
          ) : (
            <div className="border border-border bg-card p-12 text-center font-mono text-xs text-muted-foreground">
              İncelemek için soldan bir bulgu seçin.
            </div>
          )}
        </div>
      </div>

      <TryYourOwnFile isStandalone={isStandalone} />
    </PageContainer>
  );

  return isStandalone ? (
    <main id="main-content" tabIndex={-1}>
      {content}
    </main>
  ) : (
    content
  );
}

export default SmartCheckDemo;
