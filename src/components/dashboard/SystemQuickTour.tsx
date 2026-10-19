/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useState, useEffect } from 'react';
import { Compass, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'bimmetraj_quick_tour_status';

/**
 * Floating prompt banner that appears on first visit if the user hasn't completed or dismissed the tour yet.
 */
export const TourWelcomeBanner: React.FC<{
  onStartTour: () => void;
}> = ({ onStartTour }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const status = localStorage.getItem(STORAGE_KEY);
      if (!status) {
        // Show after a slight delay so it's not jarring on initial page load
        const timer = setTimeout(() => {
          setVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  const handleStart = () => {
    setVisible(false);
    onStartTour();
  };

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Sistem Hızlı Turu Daveti"
      className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xs border border-primary/50 bg-card p-4 shadow-xl font-sans animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xs bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
            <Compass size={18} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold text-primary uppercase">
                BIMMETRAJ HIZLI TUR
              </span>
            </div>
            <h4 className="text-xs font-semibold text-foreground">
              Sistemi Sayfa Sayfa Keşfedin
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Panelden IFC ön analizine, tekliflerden ayarlara kadar tüm sayfaları adım adım gezin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Kapat"
          className="text-muted-foreground hover:text-foreground p-1 rounded-xs"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-xs font-mono h-7 px-2.5 text-muted-foreground"
        >
          Daha Sonra
        </Button>
        <Button
          size="sm"
          onClick={handleStart}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-7 px-3 gap-1 shadow-xs"
        >
          <span>Turu Başlat</span>
          <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
};
