/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Play, FileText, CheckCircle2, Zap, Layers, BadgeCheck } from 'lucide-react';
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
        title="SmartCheck Kalite & Metraj Denetimi"
        description="Teklif ve metraj satırlarınızı kaynak, birim ve mevzuat bütünlüğü açısından insan onayıyla denetleyin."
      />

      <SmartCheckImportWorkspace />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
        {/* Main Banner / Action */}
        <div className="col-span-12 lg:col-span-8 rounded-sm border border-border bg-card p-6 sm:p-8 bg-hairline-grid relative">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="stamp-badge border-primary/40 text-primary bg-primary/10">
                <BadgeCheck size={12} className="shrink-0" />
                BIMMetraj SmartCheck v1.0
              </span>
              <span className="text-xs font-mono text-muted-foreground">buildingSMART & ÇŞB</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Kanıta Dayalı Metraj & Teklif Kontrolü
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Pilot akışta teklif satırlarını, ÇŞB poz kodlarını, birimleri ve kaynak bilgisini inceleyin. Demo bulguları mühendislik onayı değildir; gerçek dosya aktarımı kullanıcı incelemesiyle tamamlanır.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={handleStartDemoCheck}
                className="bg-primary hover:bg-primary/90 text-white font-mono text-xs h-9 px-5 gap-1.5 shadow-xs"
              >
                <Play size={13} fill="currentColor" />
                {demoState.checkRunStatus === 'completed' ? 'Demo Denetimi Yeniden Başlat' : 'Demo Denetimi Başlat'}
              </Button>
              <Link to="/app/quotes">
                <Button variant="outline" size="sm" className="font-mono text-xs h-9 px-4 gap-1.5">
                  <FileText size={13} /> Teklifleri Listele
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border border-border bg-card shadow-xs rounded-sm">
            <CardHeader className="border-b border-border/80 pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Denetim Durumu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-border/60 pb-2.5">
                <span className="text-muted-foreground">Son Denetim</span>
                <span className="text-foreground">
                  {demoState.checkRunStatus === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-muted-foreground">Toplam Bulgu</span>
                <span className="text-primary font-semibold tabular-nums">
                  {demoState.checkRunStatus === 'completed' ? `${demoState.findings.length} adet` : '0 adet'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Grid */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">SmartCheck Doğrulama İlkeleri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-sm space-y-2">
            <div className="w-7 h-7 bg-primary/10 rounded-xs flex items-center justify-center text-primary">
              <Zap size={15} />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">Hızlı & Güvenli Tespit</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Miktar sapmalarını ve poz eşleşme eksikliklerini teklif müşteriye gönderilmeden önce yakalayın.
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-sm space-y-2">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-xs flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={15} />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">İnsan Onayı Şartı</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hiçbir kural otomatik olarak teklife zorlanmaz; her adım mühendisin ve teknik ofisin onayına sunulur.
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-sm space-y-2">
            <div className="w-7 h-7 bg-sky-500/10 rounded-xs flex items-center justify-center text-sky-400">
              <Layers size={15} />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">Şeffaf Kaynak İzi</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              IFC eleman GUID'si, QTO miktar seti ve mevzuat maddesi teklif raporunda kaynaklı olarak gösterilir.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
