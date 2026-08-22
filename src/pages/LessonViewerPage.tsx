/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/badge';
import { demoAcademyContent } from '@/smartcheck/demoData';
import { useSmartCheckDemo } from '@/smartcheck/SmartCheckDemoContext';
import { ReinforcementEstimator } from '@/components/academy/ReinforcementEstimator';
import { WallIntersectionSimulator } from '@/components/academy/WallIntersectionSimulator';
import { InlineCheckpoint } from '@/components/academy/InlineCheckpoint';
import { AIBIMCompanion } from '@/components/academy/AIBIMCompanion';
import { CADDiagramViewer } from '@/components/academy/CADDiagramViewer';

export function LessonViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const course = demoAcademyContent.find(c => c.slug === slug);
  const { state: demoState, dispatch } = useSmartCheckDemo();

  if (!course) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h2 className="text-lg font-black text-zinc-100 uppercase tracking-widest">Modül Bulunamadı</h2>
          <Link to="/app/academy" className="text-orange-500 hover:underline mt-4 inline-block font-mono text-[10px]">
            Akademiye Dön
          </Link>
        </div>
      </PageContainer>
    );
  }

  // Değerleri state'ten oku
  const isFixed =
    (course.slug === 'quantity-and-unit-mapping' && demoState.values.quantityUnit === 'm³') ||
    (course.slug === 'cover-requirements' && demoState.values.reinforcementCoverMm === 35) ||
    (course.slug === 'wall-layer-priority' && demoState.values.wallPriority === 500);

  const handleSimulatorValueChange = (newVal: any) => {
    let field: 'quantityUnit' | 'reinforcementCoverMm' | 'wallPriority' = 'quantityUnit';

    if (course.slug === 'cover-requirements') {
      field = 'reinforcementCoverMm';
    } else if (course.slug === 'wall-layer-priority') {
      field = 'wallPriority';
    }

    dispatch({ type: 'APPLY_DEMO_FIX', payload: { field, value: newVal } });
  };

  const handleFixUnit = () => {
    dispatch({ type: 'APPLY_DEMO_FIX', payload: { field: 'quantityUnit', value: 'm³' } });
  };

  return (
    <PageContainer>
      {/* Back button */}
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
        <Link to={course.domain === 'product' ? "/app/academy/allplan" : "/app/academy"} className="text-zinc-500 hover:text-zinc-300 font-mono text-[9px] uppercase tracking-widest flex items-center gap-1">
          <ArrowLeft size={10} /> Akademiye Dön
        </Link>
        <Badge className="bg-orange-500/10 text-orange-500 border-none px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
          İnteraktif Laboratuvar
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Instructions and Theory */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="space-y-3">
            <Badge className="bg-zinc-950 text-zinc-500 border border-zinc-800 text-[8px] font-mono px-2 py-0.5 rounded-md uppercase">
              {course.area === 'allplan' ? 'ALLPLAN AKADEMİSİ' : 'TEKLİF VE METRAJ'}
            </Badge>
            <h1 className="text-xl font-black text-zinc-100 uppercase tracking-widest leading-tight">
              {course.title}
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              Beceri Kodu: {course.skillCode}
            </p>
          </div>

          {/* Theoretical info card */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 space-y-4 font-sans text-xs text-zinc-300 leading-relaxed">
            <h3 className="font-black text-zinc-200 uppercase tracking-widest text-[9px] flex items-center gap-1">
              <Info size={12} className="text-orange-500" /> Teorik Altyapı ve Uyarı
            </h3>

            {course.slug === 'quantity-and-unit-mapping' && (
              <>
                <p>
                  BIM modellerinde metraj bilgisi çıkarılırken, eleman tipine ait standart ölçü birimlerinin tanımlanması gerekir. IFC verilerindeki IfcWall (Duvar) elemanlarının metraj hesabı alan (m²) değil, hacimsel (m³) olarak yapılmalıdır.
                </p>
                <div className="p-3 bg-red-950/15 border border-red-500/20 text-red-400 text-[10px] rounded-xl font-mono">
                  ⚠️ <strong>Demo eşleştirme verisi:</strong> Resmî poz veya mevzuat verisi değildir.
                </div>
              </>
            )}

            {course.slug === 'cover-requirements' && (
              <>
                 <p>
                  Bu demoda hedef değer 35 mm olarak seçilmiştir. Gerçek nominal beton örtüsü; maruziyet sınıfı, yapısal sınıf, aderans gereksinimi, uygulama toleransı, ulusal ek ve proje koşullarına göre belirlenmelidir.
                 </p>
                 <div className="p-3 bg-red-950/15 border border-red-500/20 text-red-400 text-[10px] rounded-xl font-mono leading-normal">
                   ⚠️ <strong>Mühendislik Senaryo Uyarısı:</strong> XC3 etiketli demo senaryosu için hedef değer 35 mm olarak atanmıştır. Yetkili teknik kural veya kesin bir standart sonucu değildir.
                 </div>
              </>
            )}

            {course.slug === 'wall-layer-priority' && (
              <>
                <p>
                  ALLPLAN 3D CAD programında katmanlı dış duvar çizilirken, katmanların kesişim noktalarında birbirini doğru kesebilmesi için öncelik (priority) değerleri atanır. Taşıyıcı betonarme çekirdeğin önceliği her zaman en yüksek olmalıdır.
                </p>
                 <div className="p-3 bg-red-950/15 border border-red-500/20 text-red-400 text-[10px] rounded-xl font-mono">
                   ⚠️ <strong>Ofis Modelleme Standardı Uyarısı:</strong> Priority 500, ALLPLAN’ın evrensel standardı değildir. Bu değer yalnız simüle edilmiş demo ofis modelleme kuralıdır (Demo Office Modeling Standard).
                 </div>
              </>
            )}

            {/* Instruction Box */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 mt-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 block">DERS ADIMI</span>

              {course.slug === 'quantity-and-unit-mapping' && (
                <>
                  <p className="text-[11px] text-zinc-400 font-bold">
                    Mevcut Değer: {demoState.values.quantityUnit}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Aşağıdaki "m³ Olarak Güncelle" butonuna basarak metraj poz eşleşme birimini düzeltin.
                  </p>
                  <Button
                    onClick={handleFixUnit}
                    disabled={demoState.values.quantityUnit === 'm³'}
                    className="w-full bg-orange-700 hover:bg-orange-800 text-white font-black uppercase tracking-widest text-[9px] h-8 mt-2 rounded-lg"
                  >
                    {demoState.values.quantityUnit === 'm³' ? 'm³ Olarak Eşitlendi' : 'm³ Olarak Eşitle'}
                  </Button>
                </>
              )}

              {course.slug === 'cover-requirements' && (
                <>
                  <p className="text-[11px] text-zinc-400 font-bold">
                    Mevcut Paspayı: {demoState.values.reinforcementCoverMm} mm
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Sağ taraftaki slider'ı sürükleyerek aktif paspayı payını 35 mm değerine getirin.
                  </p>
                </>
              )}

              {course.slug === 'wall-layer-priority' && (
                <>
                  <p className="text-[11px] text-zinc-400 font-bold">
                    Betonarme Priority: {demoState.values.wallPriority}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Sağ taraftaki kontrol panelinden betonarme katmanını seçin ve Priority değerini slider ile 500 yapın.
                  </p>
                </>
              )}
            </div>

            {/* Completion Banner */}
            {isFixed && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2">
                <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Değer Düzeltildi!</span>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Parametre doğru değere getirildi. Şimdi SmartCheck sayfasına dönerek "Re-check" çalıştırabilir ve hatayı çözebilirsiniz.
                  </p>
                  <Button
                    onClick={() => navigate('/app/smartcheck/checks/demo')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black uppercase tracking-widest h-7 px-3 mt-1.5 rounded-lg"
                  >
                    SmartCheck'e Dön
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Lesson Checkpoint */}
          <div className="mt-6">
            <InlineCheckpoint lessonTitle={course.title} />
          </div>

          {/* AI BIM Companion Chat */}
          <div className="mt-6">
            <AIBIMCompanion lessonTitle={course.title} courseTitle={course.title} />
          </div>
        </div>

        {/* Right Side: Interactive Simulators / Actions */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {course.slug === 'quantity-and-unit-mapping' && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-orange-500" size={18} />
                  <h4 className="font-black text-zinc-100 uppercase tracking-widest text-[10px]">Poz / Birim Eşleştirme Simülasyonu</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                Bu modülde ÇŞİDB / BIM sözlüğü standart birimleri ile teklif pozları arasındaki uyuşmazlığı simüle edebilirsiniz.
              </p>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-zinc-900 rounded-lg">
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">BIM PLAN SÖZLÜĞÜ (STANDART)</span>
                    <span className="text-zinc-200 font-bold block mt-1">Poz: DEMO-15.120.1001</span>
                    <span className="text-emerald-500 font-bold text-sm block mt-1">m³ (Hacim)</span>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">TEKLİF DETAYI (GİRİLEN)</span>
                    <span className="text-zinc-200 font-bold block mt-1">Birim: {demoState.values.quantityUnit}</span>
                    <span className={`font-bold text-sm block mt-1 ${demoState.values.quantityUnit === 'm³' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {demoState.values.quantityUnit === 'm³' ? 'Uyumlu' : 'Uyuşmazlık Mevcut'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {course.slug === 'cover-requirements' && (
            <ReinforcementEstimator
              onValueChange={handleSimulatorValueChange}
              initialCover={demoState.values.reinforcementCoverMm}
            />
          )}

          {course.slug === 'wall-layer-priority' && (
            <WallIntersectionSimulator
              onValueChange={handleSimulatorValueChange}
              initialPriority={demoState.values.wallPriority}
            />
          )}

          {/* Interactive CAD Diagram & Rebar View */}
          <CADDiagramViewer lessonTitle={course.title} />
        </div>
      </div>
    </PageContainer>
  );
}
