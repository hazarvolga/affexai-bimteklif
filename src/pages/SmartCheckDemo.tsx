/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  RefreshCw,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  AlertTriangle
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

      // Recheck sonrasında local storage'dan en güncel state'i okuyalım (dispatch asenkron çalıştığı için storage'dan okumak pratiktir)
      // Veya state güncellendikten sonra useEffect ile de izlenebilir ama recheck tamamlandığında güncel findings'i storage'dan hydrate edip kontrol edebiliriz
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
        <Link to="/app/smartcheck" className="text-zinc-500 hover:text-zinc-300 font-mono text-[9px] uppercase tracking-widest flex items-center gap-1">
          <ArrowLeft size={10} /> SmartCheck Genel Bakış
        </Link>
        <span className="text-zinc-700 font-mono text-[9px]">&gt;</span>
        <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest font-bold">Aktif Denetim Raporu</span>
      </div>

      <PageHeader
        title="Demo Kalite Kontrolü"
        description="Mühendislik ve metraj kurallarının doğruluğunu bu ekrandan izleyin."
      />

      {/* Recheck Action Banner */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-600/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner shrink-0">
            <Shield size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Yeniden Kontrolü Tetikleyin</h4>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">Düzeltme aksiyonlarından sonra doğrulama yapmak için Re-check butonuna basın.</p>
          </div>
        </div>
        <Button
          onClick={handleRecheck}
          disabled={isRechecking}
          className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl gap-2 shadow-lg hover:shadow-orange-600/20 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isRechecking ? 'animate-spin' : ''} /> {isRechecking ? 'Kontrol Ediliyor...' : 'Re-check Çalıştır'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Findings List */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Bulgular ({demoState.findings.length})</h3>

          <div className="space-y-3">
            {demoState.findings.map(finding => {
              const isSelected = selectedFindingId === finding.id;
              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFindingId(finding.id)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-900/60 border-orange-500'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-wide line-clamp-1">
                      {finding.title}
                    </span>
                    {finding.status === 'resolved' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-0.5 text-[8px] font-black uppercase">Çözüldü</Badge>
                    ) : finding.status === 'in_progress' ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-none px-2 py-0.5 text-[8px] font-black uppercase">İyileştirildi</Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500 border-none px-2 py-0.5 text-[8px] font-black uppercase">Açık</Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                    <span className="uppercase tracking-wider">
                      Mevcut: <strong className="text-zinc-300">{finding.currentValue} {finding.id !== 'finding-a' && typeof finding.currentValue === 'number' && 'mm'}</strong>
                    </span>
                    <span>
                      Beklenen: <strong className="text-zinc-300">{finding.expectedValue} {finding.id !== 'finding-a' && typeof finding.expectedValue === 'number' && 'mm'}</strong>
                    </span>
                  </div>

                  {/* Simulated / Dictionary Badge */}
                  <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                    {finding.sourceType === 'simulated_model_finding' ? (
                      <Badge className="bg-zinc-800 text-zinc-400 border-none px-1.5 py-0.5 text-[8px] font-mono">
                        Demo model verisi
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-950 text-zinc-500 border border-zinc-900 px-1.5 py-0.5 text-[8px] font-mono">
                        Sözlük Eşleşmesi
                      </Badge>
                    )}
                    <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                      {finding.severity.toUpperCase()}
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
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none rounded-3xl p-6 space-y-6">
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-zinc-100 uppercase tracking-widest">{selectedFinding.title}</h2>
                      {selectedFinding.sourceType === 'simulated_model_finding' && (
                        <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                          Simüle Edilmiş Bulgu
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold">
                      HATA KODU: {selectedFinding.ruleId} | SKILL: {selectedFinding.skillCode}
                    </p>
                  </div>
                  {selectedFinding.status === 'resolved' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 text-[9px] font-black uppercase">Çözüldü</Badge>
                  ) : selectedFinding.status === 'in_progress' ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border-none px-3 py-1 text-[9px] font-black uppercase">İyileştirildi</Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-500 border-none px-3 py-1 text-[9px] font-black uppercase">Açık Hata</Badge>
                  )}
                </div>
              </div>

              {/* Data & Rule Source Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                {selectedFinding.id === 'finding-a' ? (
                  <>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Kaynak</span>
                      <span className="text-zinc-300 font-bold block mt-1 text-[10px]">
                        Demo eşleştirme sözlüğü
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Doğrulama</span>
                      <span className="text-zinc-300 font-bold block mt-1 text-[10px]">
                        Doğrulanmamış demo verisi
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Uyarı</span>
                      <span className="text-orange-500 font-bold block mt-1 text-[9px] uppercase tracking-tighter">
                        Resmî poz veya mevzuat verisi değildir
                      </span>
                    </div>
                  </>
                ) : selectedFinding.id === 'finding-b' ? (
                  <>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Kaynak</span>
                      <span className="text-zinc-300 font-bold block mt-1 text-[10px]">
                        Simüle edilmiş model verisi
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Kural</span>
                      <span className="text-zinc-300 font-bold block mt-1 text-[10px]">
                        Demo mühendislik senaryosu
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Doğrulama</span>
                      <span className="text-orange-500 font-bold block mt-1 text-[9px] uppercase tracking-tighter">
                        Yetkili teknik kural değildir
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Kaynak</span>
                      <span className="text-zinc-300 font-bold block mt-1 text-[10px]">
                        Simüle edilmiş model verisi
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Kural</span>
                      <span className="text-zinc-300 font-bold block mt-1 text-[10px]">
                        Demo ofis modelleme standardı
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono font-bold">Doğrulama</span>
                      <span className="text-orange-500 font-bold block mt-1 text-[9px] uppercase tracking-tighter">
                        ALLPLAN’ın evrensel standardı değildir
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Expected & Current Values */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex justify-between items-center font-mono">
                <div>
                  <span className="text-[8px] text-zinc-500 block uppercase font-bold">Mevcut Değer</span>
                  <span className={`text-base font-black block mt-1 ${selectedFinding.status === 'resolved' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedFinding.currentValue} {selectedFinding.id !== 'finding-a' && typeof selectedFinding.currentValue === 'number' && 'mm'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-zinc-500 block uppercase font-bold">Beklenen Değer</span>
                  <span className="text-base font-black text-emerald-500 block mt-1">
                    {selectedFinding.expectedValue} {selectedFinding.id !== 'finding-a' && typeof selectedFinding.expectedValue === 'number' && 'mm'}
                  </span>
                </div>
              </div>

              {/* Evidence Text */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Kanıt & Detay</h4>
                <pre className="p-4 bg-zinc-950 border border-zinc-900 text-zinc-400 rounded-2xl text-[10px] leading-relaxed font-mono whitespace-pre-wrap">
                  {selectedFinding.evidence}
                </pre>
              </div>

              {/* Fix Card Section */}
              <div className="border-t border-zinc-800 pt-6 space-y-4">
                <h4 className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Fix Card (Çözüm Kartı)</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quick Fix Card */}
                  <Card className="bg-zinc-950 border-zinc-900 shadow-none flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Hızlı Düzelt</CardTitle>
                      <CardDescription className="text-[9px] text-zinc-500 font-sans">
                        Metraj veya model değerini doğrudan doğru parametreye eşitleyin.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Button
                        onClick={() => handleQuickFix(selectedFinding.id, selectedFinding.expectedValue)}
                        disabled={selectedFinding.status === 'resolved'}
                        className="w-full bg-zinc-900 border border-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-widest h-9 rounded-xl transition-all cursor-pointer"
                      >
                        Değeri Düzelt
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Academy Guidance Card */}
                  {matchingLesson && (
                    <Card className="bg-zinc-950 border-zinc-900 shadow-none flex flex-col justify-between">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Akademi Eğitimi</CardTitle>
                        <CardDescription className="text-[9px] text-zinc-500 font-sans">
                          İlgili standardı simülatörler üzerinde interaktif olarak deneyimleyin.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <Link to={matchingLesson.domain === 'proposal_quantity' ? `/app/academy/content/${matchingLesson.slug}` : `/app/academy/allplan/content/${matchingLesson.slug}`}>
                          <Button
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase tracking-widest h-9 rounded-xl gap-2 transition-all cursor-pointer"
                          >
                            <BookOpen size={12} /> Eğitime Git <ExternalLink size={10} />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
              Detayları görmek için listeden bir bulgu seçin.
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
