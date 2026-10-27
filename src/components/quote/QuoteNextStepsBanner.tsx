/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { CheckCircle2, CircleDot, Compass, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface QuoteNextStepsBannerProps {
  sourceLabel: string;
  itemCount: number;
  hasValidClient: boolean;
  clientName?: string;
  hasProjectName: boolean;
  costInputsComplete: boolean;
  saving: boolean;
  onSave: () => void;
  onFocusClientSelect: () => void;
}

export function QuoteNextStepsBanner({
  sourceLabel,
  itemCount,
  hasValidClient,
  clientName,
  hasProjectName,
  costInputsComplete,
  saving,
  onSave,
  onFocusClientSelect,
}: QuoteNextStepsBannerProps) {
  const step1Done = hasValidClient && hasProjectName;
  const step2Done = itemCount > 0;

  return (
    <div
      data-testid="quote-next-steps-banner"
      className="mb-4 border border-border border-l-2 border-l-emerald-500 bg-card p-4 shadow-none space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Şimdi Ne Yapmalıyım? · {sourceLabel} Sonrası 3 Adım
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[10px] uppercase border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
        >
          {step1Done && step2Done ? 'Kayda Hazır (3/3)' : 'Adım Adım Tamamlayın'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Adım 1 */}
        <div className="border border-border bg-background/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              {step1Done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <CircleDot className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              )}
              1. Müşteri & Proje Adı
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {step1Done ? 'Tamam' : 'Bekliyor'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {step1Done
              ? `Müşteri (${clientName || 'Seçildi'}) ve proje başlığı tanımlandı.`
              : 'Sağ panelden teklifin verileceği müşteriyi seçin (yoksa + Hızlı Müşteri Ekle ile oluşturun) ve proje başlığını kontrol edin.'}
          </p>
          {!hasValidClient && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFocusClientSelect}
              className="h-7 px-2.5 text-[10px] font-mono uppercase tracking-wider mt-1"
            >
              Müşteri Seç / Oluştur →
            </Button>
          )}
        </div>

        {/* Adım 2 */}
        <div className="border border-border bg-background/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              2. Birim Fiyat & Maliyet
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {itemCount} Kalem
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {costInputsComplete
              ? 'Miktar, satış fiyatı ve birim maliyetler hazır; sağ altta net kâr marjınız hesaplandı.'
              : 'Tablodaki miktar ve birim satış fiyatlarını kontrol edin. Kâr marjını görmek için birim maliyet sütununu veya Onaylı Fiyat Kataloğu önerilerini kullanın.'}
          </p>
        </div>

        {/* Adım 3 */}
        <div className="border border-border bg-background/60 p-3 space-y-1.5 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
                3. Kaydet & PDF / Hakediş
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">Son Adım</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Taslağı kaydettiğinizde açılan teklif detay ekranından kurumsal PDF çıktısı alabilir, revizyon ve Hakediş akışına geçebilirsiniz.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={onSave}
            className="h-7 px-3 text-[10px] font-mono uppercase tracking-wider gap-1.5 w-fit mt-1"
          >
            <Save size={12} /> {saving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
          </Button>
        </div>
      </div>
    </div>
  );
}
