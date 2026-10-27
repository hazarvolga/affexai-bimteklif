/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Info, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** Platform reference price pool shown on the new-quotation screen (not the company catalogue). */
export type BenchmarkData = {
    sourcesSummary: Array<{ name: string; code: string; lastSyncAt: string; versionTag: string; validityRange: string; status: string }>;
    disclaimer: string;
    items: Array<{
      id: string;
      itemCode: string;
      itemName: string;
      unit: string;
      currentPrice: string | null;
      crawledPrice: string;
      diffPercent: string | null;
      sourceName: string;
      notes: string;
      crawledAt: string;
    }>;
  };

export type BenchmarkItem = BenchmarkData['items'][number];

interface BenchmarkPanelProps {
  data: BenchmarkData;
  onApply: (item: BenchmarkItem) => void;
}

export function BenchmarkPanel({ data, onApply }: BenchmarkPanelProps) {
  const [showDrawer, setShowDrawer] = useState(false);
  return (
          <div className="mb-4 border border-border bg-card p-4 shadow-none">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-primary shrink-0" />
                <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Piyasa Rayiçleri & Fiyat Geçerlilik Bildirimi
                </span>
                <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
                  Bilgilendirme
                </Badge>
              </div>
              <Button
                type="button"
                onClick={() => setShowDrawer(!showDrawer)}
                variant="outline"
                className="border-border bg-background hover:bg-muted text-foreground text-xs font-mono h-7 gap-1.5 shadow-none"
              >
                <Sparkles size={12} className="text-primary" />
                {showDrawer ? 'Rayiç Havuzunu Gizle' : `Onaylı Rayiçleri Gör (${data.items.length} Kalem)`}
                {showDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3 text-xs">
              {data.sourcesSummary.slice(0, 3).map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2.5 border border-border">
                  <Calendar size={13} className="text-muted-foreground shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-foreground block truncate text-xs">{s.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">Geçerlilik: {s.validityRange}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed bg-muted/10 p-3 border border-border font-sans">
              <strong className="text-foreground">⚠️ Kullanıcı Sorumluluğu & Manuel Teyit:</strong> {data.disclaimer}
            </p>

            {/* BENCHMARK QUICK PICKER DRAWER */}
            {showDrawer && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs font-mono font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Zap size={13} className="text-primary" /> Taranmış Güncel Rayiçlerden Teklife Ekle:
                </p>
                <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto pr-1">
                  {data.items.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center justify-between p-2.5 bg-muted/20 border border-border hover:border-primary/50 transition-all text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] bg-background border border-border text-foreground px-1.5 py-0.5 font-bold">
                            {bm.itemCode}
                          </span>
                          <span className="font-bold text-foreground truncate text-xs">{bm.itemName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
                          <span>Canlı: <strong className="text-foreground">₺{Number(bm.crawledPrice).toLocaleString('tr-TR')}</strong> /{bm.unit}</span>
                          {bm.diffPercent && Number(bm.diffPercent) !== 0 && (
                            <span className={Number(bm.diffPercent) > 0 ? 'text-primary font-bold' : 'text-foreground font-bold'}>
                              {Number(bm.diffPercent) > 0 ? `+${bm.diffPercent}%` : `${bm.diffPercent}%`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onApply(bm)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs h-7 px-3 shrink-0 shadow-none"
                      >
                        + Ekle
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
  );
}
