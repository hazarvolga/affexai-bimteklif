/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  RefreshCw,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSmartCheckDemo } from '@/smartcheck/SmartCheckDemoContext';
import {
  demoAcademyContent,
  DemoFinding
} from '@/smartcheck/demoData';

export function SmartCheckDemo() {
  const { state: demoState, dispatch } = useSmartCheckDemo();
  const [selectedFindingId, setSelectedFindingId] = useState<string>('finding-a');
  const [isRechecking, setIsRechecking] = useState(false);

  const selectedFinding = demoState.findings.find(f => f.id === selectedFindingId);

  // Eşleşen Akademi dersini bul
  const matchingLesson = selectedFinding
    ? demoAcademyContent.find(c => c.skillCode === selectedFinding.skillCode)
    : null;

  // Hızlı Düzeltme Aksiyonu (Fix Card Action)
  const handleQuickFix = (id: string, expectedVal: any) => {
    let field: 'quantityUnit' | 'reinforcementCoverMm' | 'wallPriority' = 'quantityUnit';

    if (id === 'finding-b') {
      field = 'reinforcementCoverMm';
    } else if (id === 'finding-c') {
      field = 'wallPriority';
    }

    dispatch({ type: 'APPLY_DEMO_FIX', payload: { field, value: expectedVal } });

    toast.success('Parametre düzeltildi. Çözümün onaylanması için yeniden kontrol (Re-check) başlatın.', {
      description: `Yeni Değer: ${expectedVal}`,
    });
  };

  // Yeniden Kontrol (Re-check)
  const handleRecheck = () => {
    setIsRechecking(true);
    setTimeout(() => {
      dispatch({ type: 'RUN_RECHECK' });
      setIsRechecking(false);

      const freshState = JSON.parse(localStorage.getItem('teklifpro.smartcheck.demo.v1') || '{}').state || demoState;
      const resolvedCount = freshState.findings.filter((f: any) => f.status === 'resolved').length;
      if (resolvedCount === freshState.findings.length) {
        toast.success('Harika! Tüm bulgular başarıyla doğrulandı ve çözüldü.', {
          description: 'Kalite kontrol aşaması başarıyla tamamlandı.',
        });
      } else {
        toast.info('Kalite kontrolü tamamlandı.', {
          description: `Çözülen: ${resolvedCount} / 3 bulgu.`,
        });
      }
    }, 1000);
  };

  return (
    <PageContainer>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/app/smartcheck" className="text-muted-foreground hover:text-foreground font-mono text-xs flex items-center gap-1">
          <ArrowLeft size={12} /> SmartCheck Genel Bakış
        </Link>
        <span className="text-muted-foreground/60 font-mono text-xs">/</span>
        <span className="text-foreground font-mono text-xs font-semibold">Aktif Denetim Raporu</span>
      </div>

      <PageHeader
        title="SmartCheck Model & Kalite Denetimi"
        description="Mühendislik, mevzuat ve metraj tolerans kurallarının doğruluğunu bu ekrandan izleyin."
      />

      {/* Recheck Action Banner */}
      <div className="rounded-sm border border-border bg-card p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xs flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Shield size={17} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Yeniden Kontrolü Tetikleyin</h4>
            <p className="text-xs text-muted-foreground font-sans mt-0.5">Düzeltme aksiyonlarından sonra kural motorunu yeniden çalıştırmak için butona basın.</p>
          </div>
        </div>
        <Button
          onClick={handleRecheck}
          disabled={isRechecking}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white font-mono text-xs h-9 px-4 gap-1.5 shadow-xs shrink-0"
        >
          <RefreshCw size={13} className={isRechecking ? 'animate-spin' : ''} />
          {isRechecking ? 'Kontrol Ediliyor...' : 'Yeniden Kontrol Et (Re-check)'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Findings List */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">Bulgular ({demoState.findings.length})</h3>
            <span className="text-[11px] font-mono text-primary">buildingSMART & ÇŞB Kuralları</span>
          </div>

          <div className="space-y-2.5">
            {demoState.findings.map(finding => {
              const isSelected = selectedFindingId === finding.id;
              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFindingId(finding.id)}
                  className={`p-3.5 border rounded-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-muted/40 border-primary'
                      : 'bg-card border-border hover:border-border/80 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-foreground line-clamp-1">
                      {finding.title}
                    </span>
                    {finding.status === 'resolved' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0.5 text-[11px] font-mono">Çözüldü</Badge>
                    ) : finding.status === 'in_progress' ? (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5 py-0.5 text-[11px] font-mono">Düzeltildi</Badge>
                    ) : (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30 px-1.5 py-0.5 text-[11px] font-mono">Açık</Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                    <span>
                      Mevcut: <strong className="text-foreground">{finding.currentValue} {finding.id !== 'finding-a' && typeof finding.currentValue === 'number' && 'mm'}</strong>
                    </span>
                    <span>
                      Beklenen: <strong className="text-foreground">{finding.expectedValue} {finding.id !== 'finding-a' && typeof finding.expectedValue === 'number' && 'mm'}</strong>
                    </span>
                  </div>

                  {/* Simulated / Dictionary Badge */}
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground/80">
                      {finding.sourceType === 'simulated_model_finding' ? 'IFC Model Verisi' : 'Sözlük Eşleşmesi'}
                    </span>
                    <span className="text-primary font-semibold uppercase tracking-wider">
                      {finding.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Finding Details */}
        <div className="col-span-12 lg:col-span-7">
          {selectedFinding ? (
            <Card className="border border-border bg-card shadow-xs rounded-sm p-5 space-y-5">
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground">{selectedFinding.title}</h2>
                      {selectedFinding.sourceType === 'simulated_model_finding' && (
                        <span className="stamp-badge border-primary/30 text-primary bg-primary/10 text-[10px]">
                          Model Bulgusu
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      KURAL: {selectedFinding.ruleId} | MODÜL: {selectedFinding.skillCode}
                    </p>
                  </div>
                  {selectedFinding.status === 'resolved' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-xs font-mono">Çözüldü</Badge>
                  ) : selectedFinding.status === 'in_progress' ? (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-2 py-0.5 text-xs font-mono">Düzeltildi</Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/30 px-2 py-0.5 text-xs font-mono">Açık Hata</Badge>
                  )}
                </div>
              </div>

              {/* Data & Rule Source Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-muted/20 border border-border rounded-xs">
                  <span className="text-[11px] text-muted-foreground block uppercase">Kaynak</span>
                  <span className="text-foreground font-semibold block mt-0.5 truncate">
                    {selectedFinding.sourceName}
                  </span>
                </div>
                <div className="p-3 bg-muted/20 border border-border rounded-xs">
                  <span className="text-[11px] text-muted-foreground block uppercase">Yetki / Durum</span>
                  <span className="text-foreground font-semibold block mt-0.5 truncate">
                    {selectedFinding.authorityStatus === 'unverified_demo_data' ? 'Doğrulanmamış Demo' : 'Mühendislik Kuralı'}
                  </span>
                </div>
                <div className="p-3 bg-muted/20 border border-border rounded-xs">
                  <span className="text-[11px] text-muted-foreground block uppercase">Kural Tipi</span>
                  <span className="text-primary font-semibold block mt-0.5 truncate">
                    {selectedFinding.ruleType}
                  </span>
                </div>
              </div>

              {/* Finding Description & Impact */}
              <div className="space-y-3 font-sans text-xs">
                <div className="p-3.5 rounded-xs border border-border bg-muted/20">
                  <h4 className="font-semibold text-foreground mb-1 font-mono uppercase text-xs">Mühendislik Kanıtı & Tespit:</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedFinding.evidence}
                  </p>
                </div>
              </div>

              {/* Action Box: Quick Fix */}
              {selectedFinding.status !== 'resolved' && (
                <div className="p-4 rounded-xs border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <SlidersHorizontal size={14} className="text-primary" />
                      Düzeltme Aksiyonu
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">İnsan Onaylı Düzeltme</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Modeldeki parametreyi standartlara uygun değere getirmek için hızlı düzeltmeyi uygulayın.
                  </p>
                  <Button
                    onClick={() => handleQuickFix(selectedFinding.id, selectedFinding.expectedValue)}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-mono text-xs h-9 gap-1.5 shadow-xs"
                  >
                    <span>Önerilen Değeri Uygula: <strong>{String(selectedFinding.expectedValue)}</strong></span>
                  </Button>
                </div>
              )}

              {/* Matching Academy Lesson Checkpoint */}
              {matchingLesson && (
                <div className="p-4 rounded-xs border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                      <BookOpen size={12} />
                      İlgili Academy Dersi ({matchingLesson.level})
                    </span>
                    <p className="text-xs font-semibold text-foreground">{matchingLesson.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{matchingLesson.domain} · {matchingLesson.estimatedMinutes} dk</p>
                  </div>
                  <Link to={`/app/academy`} className="shrink-0">
                    <Button variant="outline" size="sm" className="text-xs font-mono h-8 gap-1">
                      Dersi İncele <ChevronRight size={13} />
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          ) : (
            <Card className="border border-border bg-card p-12 text-center text-muted-foreground font-mono text-xs">
              İncelemek için sol taraftan bir bulgu seçin.
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
