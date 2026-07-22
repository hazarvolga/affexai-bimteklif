/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Play, FileText, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useSmartCheckDemo } from '@/smartcheck/SmartCheckDemoContext';
import { SmartCheckImportWorkspace } from '@/components/smartcheck/SmartCheckImportWorkspace';

export function SmartCheck() {
  const navigate = useNavigate();
  const { state: demoState, dispatch } = useSmartCheckDemo();

  const handleStartDemoCheck = () => {
    dispatch({ type: 'RESET_DEMO' });
    dispatch({ type: 'START_DEMO_CHECK' });
    navigate('/app/smartcheck/checks/demo');
  };

  return (
    <PageContainer>
      <PageHeader
        title="SmartCheck Kalite Kontrolü"
        description="Teklif ve metraj satırlarınızı kaynak, birim ve maliyet bütünlüğü açısından insan onayıyla denetleyin."
      />

      <SmartCheckImportWorkspace />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Main Banner / Action */}
        <div className="col-span-12 lg:col-span-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 sm:p-10 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl -mr-20 -mb-20 transition-all duration-500 group-hover:bg-orange-600/10"></div>
          <div className="max-w-2xl space-y-6 relative z-10">
            <Badge className="bg-orange-500/10 text-orange-500 border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest">
              SmartCheck v1.0.0
            </Badge>
            <h2 className="text-3xl font-black tracking-tight leading-tight text-white uppercase">
              Kanıta Dayalı Metraj & <br/>
              <span className="text-orange-500">Teklif Kontrolü</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans max-w-xl">
              Pilot akışta teklif satırlarını, poz kodlarını, birimleri ve kaynak bilgisini inceleyin. Demo bulguları mühendislik onayı değildir; gerçek dosya aktarımı kullanıcı incelemesiyle tamamlanır.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                onClick={handleStartDemoCheck}
                className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl gap-2 shadow-lg hover:shadow-orange-600/20 transition-all"
              >
                <Play size={14} fill="currentColor" />
                {demoState.checkRunStatus === 'completed' ? 'Demo Denetimi Yeniden Başlat' : 'Demo Denetimi Başlat'}
              </Button>
              <Link to="/app/quotes">
                <Button variant="outline" className="border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 text-[10px] font-black uppercase tracking-widest h-11 px-6 rounded-xl gap-2">
                  <FileText size={14} /> Teklifleri Listele
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Genel İstatistikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                <span className="text-xs text-zinc-500 font-sans">Son Denetim Tarihi</span>
                <span className="text-xs text-zinc-300 font-mono">
                  {demoState.checkRunStatus === 'completed' ? 'Bugün' : 'Bulunmuyor'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                <span className="text-xs text-zinc-500 font-sans">Toplam Bulgular</span>
                <span className="text-xs text-zinc-300 font-mono">
                  {demoState.checkRunStatus === 'completed' ? '3 adet' : '0 adet'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs text-zinc-500 font-sans">Ortalama Çözüm Hızı</span>
                <span className="text-xs text-emerald-500 font-mono font-bold">12 Dk</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">En Sık Karşılaşılan Hatalar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono p-2 bg-zinc-950 rounded-lg">
                <span className="text-zinc-400 flex items-center gap-1.5 uppercase text-[9px] font-bold">
                  <AlertTriangle size={12} className="text-red-500" /> Poz/Birim
                </span>
                <span className="text-zinc-500 text-[10px]">42 Kez</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2 bg-zinc-950 rounded-lg">
                <span className="text-zinc-400 flex items-center gap-1.5 uppercase text-[9px] font-bold">
                  <AlertTriangle size={12} className="text-orange-500" /> Paspayı
                </span>
                <span className="text-zinc-500 text-[10px]">28 Kez</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Neden SmartCheck?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
            <div className="w-8 h-8 bg-orange-600/10 rounded-lg flex items-center justify-center text-orange-500">
              <Zap size={16} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Hızlı & Güvenli Tespit</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              Proje tekliflerindeki birim, poz, miktar ve kaynak tutarsızlıklarını deterministik kontrollerle görünür kılar.
            </p>
          </div>
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
            <div className="w-8 h-8 bg-orange-600/10 rounded-lg flex items-center justify-center text-orange-500">
              <Shield size={16} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Mühendislik Standartları</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              Donatı detaylandırma demo simülasyonunu ve paspayı toleranslarını kontrol etmek üzere interaktif kurallar sunar.
            </p>
          </div>
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
            <div className="w-8 h-8 bg-orange-600/10 rounded-lg flex items-center justify-center text-orange-500">
              <CheckCircle2 size={16} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Akademi Desteği</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              Hata tespit edilen alanlarda doğrudan o hatayı çözmeye yönelik interaktif simülatörler ve dersler atar.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
