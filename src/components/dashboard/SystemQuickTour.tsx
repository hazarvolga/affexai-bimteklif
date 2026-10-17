/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TourStep {
  targetSelector: string;
  badge: string;
  title: string;
  description: string;
  tip?: string;
  preferredPlacement?: 'top' | 'bottom' | 'center';
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="workflow-hub"]',
    badge: 'EVRE BAZLI ÇALIŞMA',
    title: 'Müteahhitlik Süreç Masası (3 Evre)',
    description:
      'BIMMetraj, Türk müteahhitlik ve teknik ofis iş süreçlerine tam uyumlu olarak 3 ana evrede çalışır: Evre 01 ile Arsa Ön Fizibilite & Excel yaklaşık maliyet cetveli, Evre 02 ile 3D openBIM (IFC) model metrajı, Evre 03 ile Taşeron Hakediş Kalkanı.',
    tip: 'Elinizdeki belgenin (Arsa, Excel veya 3D IFC) durumuna göre doğrudan ilgili evreden başlayabilirsiniz.',
    preferredPlacement: 'bottom',
  },
  {
    targetSelector: '[data-tour="smartcheck-action"]',
    badge: 'HIZLI İŞLEM',
    title: 'SmartCheck & IFC Dosya Yükleme',
    description:
      '3D IFC modellerinizi veya Excel/CSV metraj cetvellerinizi tek tıkla yükleyerek otomatik geometri denetimi, minha boşluk düşümü ve poz eşleme sürecini başlatın.',
    tip: 'Sürükle-bırak desteği ile birden çok IFC dosyasını saniyeler içinde tarayabilirsiniz.',
    preferredPlacement: 'bottom',
  },
  {
    targetSelector: '[data-tour="subcontractor-shield"]',
    badge: 'ŞANTİYE KORUMASI',
    title: 'Taşeron Hakediş Kalkanı',
    description:
      'Sahada imalat yapıldığında taşeron metrajlarını denetleyin. Melih Dinekli standardı olan 325 kg/m³ çimento ve %10 fire tavanı, net mahal sıva/söve kuralları ile fazla hakediş taleplerini anında saptayın ve kesinti tutanağı çıkarın.',
    tip: 'Hakediş kesinti raporunu PDF veya Excel olarak doğrudan taşerona sunabilirsiniz.',
    preferredPlacement: 'top',
  },
  {
    targetSelector: '[data-tour="public-procurement"]',
    badge: 'RESMÎ MEVZUAT',
    title: 'Kamu İhale & Fiyat Farkı Araçları',
    description:
      'Kamu ihaleleri için KİK Aşırı Düşük Teklif Sınır Değeri ve 4735 sayılı Kanun kapsamındaki resmî TÜİK endeksli güncel fiyat farkı hesaplayıcılarına doğrudan bu şeritten erişebilirsiniz.',
    tip: 'Hesaplamalar mevzuat.gov.tr ve KİK resmî tebliğ algoritmalarına birebir uygundur.',
    preferredPlacement: 'top',
  },
  {
    targetSelector: '[data-tour="blueprint-header"]',
    badge: 'PAFTA ANTETİ',
    title: 'Teknik Ofis Pafta Anteti',
    description:
      'Aktif firma unvanınız, geçerli para biriminiz ve kanıtlı metraj katalog durumu burada özetlenir. Sistem üzerindeki tüm metraj ve teklif işlemleri resmî mühendislik paftası antetiyle kayıt altına alınır.',
    tip: 'Buradaki ayarlar tüm PDF çıktılarında ve hakediş tutanaklarında resmi antet olarak basılır.',
    preferredPlacement: 'bottom',
  },
];

const STORAGE_KEY = 'bimmetraj_quick_tour_status';

interface SystemQuickTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const SystemQuickTour: React.FC<SystemQuickTourProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Measure and track target element
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Scroll into view & update position on step change
  useEffect(() => {
    if (!isOpen) return;

    const element = document.querySelector(currentStep?.targetSelector || '');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Small timeout to allow smooth scrolling to finish before recalculating rect
      const timer = setTimeout(() => {
        updateTargetPosition();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      updateTargetPosition();
    }
  }, [isOpen, currentStepIndex, currentStep, updateTargetPosition]);

  // Recalculate on scroll & resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [isOpen, updateTargetPosition]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'completed');
    } catch {
      // localStorage may fail in private mode
    }
    onClose();
    if (onComplete) onComplete();
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // Ignore
    }
    onClose();
  };

  if (!isOpen || !currentStep) return null;

  // Calculate tooltip placement styles
  const getTooltipStyle = (): React.CSSProperties => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (isMobile) {
      // On mobile, stick to bottom of screen for ergonomic touch access
      return {
        position: 'fixed',
        left: '12px',
        right: '12px',
        bottom: '16px',
        zIndex: 60,
        maxWidth: 'calc(100vw - 24px)',
      };
    }

    if (!targetRect) {
      // Center fallback
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
        width: '460px',
      };
    }

    const padding = 16;
    const tooltipWidth = 460;
    const estimatedHeight = 240;

    // Horizontal centering relative to target, clamped to screen edges
    const targetCenterX = targetRect.left + targetRect.width / 2;
    let left = targetCenterX - tooltipWidth / 2;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    // Vertical placement
    let top = targetRect.bottom + padding;
    if (
      currentStep.preferredPlacement === 'top' ||
      top + estimatedHeight > window.innerHeight - padding
    ) {
      const topPlacement = targetRect.top - estimatedHeight - padding;
      if (topPlacement >= padding) {
        top = topPlacement;
      }
    }

    return {
      position: 'fixed',
      top: `${Math.max(padding, top)}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 60,
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="BIMMetraj Hızlı Sistem Turu"
      className="fixed inset-0 z-50 overflow-hidden font-sans"
    >
      {/* Click-catcher transparent backdrop to dismiss on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Target spotlight cutout frame */}
      {targetRect ? (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out border-2 border-primary rounded-xs z-50"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            /* Box-shadow outwards dims the rest of the page gently (42% opacity, no blur) while leaving the target 100% crisp and readable */
            boxShadow: '0 0 0 9999px rgba(10, 12, 14, 0.42), 0 0 20px rgba(234, 88, 12, 0.25)',
          }}
        >
          {/* Engineering Crosshairs (+) at corners */}
          <span className="absolute -top-2.5 -left-2.5 font-mono text-xs text-primary font-bold select-none">+</span>
          <span className="absolute -top-2.5 -right-2.5 font-mono text-xs text-primary font-bold select-none">+</span>
          <span className="absolute -bottom-2.5 -left-2.5 font-mono text-xs text-primary font-bold select-none">+</span>
          <span className="absolute -bottom-2.5 -right-2.5 font-mono text-xs text-primary font-bold select-none">+</span>
        </div>
      ) : (
        /* Subtle translucent fallback if target is not found */
        <div
          className="fixed inset-0 bg-black/40 transition-opacity z-50 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Tooltip Card (Pafta Design System) */}
      <div
        ref={tooltipRef}
        style={getTooltipStyle()}
        className={cn(
          'rounded-xs border border-primary/60 bg-card p-5 shadow-2xl relative',
          'transition-all duration-300 ease-out',
          'border-l-4 border-l-primary'
        )}
      >
        {/* Pafta Antet Crosshairs */}
        <span className="absolute top-1.5 left-2 font-mono text-[10px] text-muted-foreground select-none">+</span>
        <span className="absolute top-1.5 right-2 font-mono text-[10px] text-muted-foreground select-none">+</span>

        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-border/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
              {String(currentStepIndex + 1).padStart(2, '0')} / {String(TOUR_STEPS.length).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {currentStep.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Turu Kapat (ESC)"
            className="p-1 rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm md:text-base font-semibold text-foreground tracking-tight flex items-center gap-1.5">
            <Sparkles size={15} className="text-primary shrink-0" />
            <span>{currentStep.title}</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>

          {currentStep.tip && (
            <div className="mt-2.5 p-2.5 rounded-xs bg-primary/5 border border-primary/20 flex items-start gap-2">
              <span className="font-mono text-[10px] font-bold text-primary shrink-0 mt-0.5">İPUCU:</span>
              <span className="text-[11px] text-foreground/90 leading-normal">{currentStep.tip}</span>
            </div>
          )}
        </div>

        {/* Footer with Step dots and Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/80">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Adım ${idx + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === currentStepIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                )}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="text-xs font-mono h-7 px-2.5 gap-1 disabled:opacity-30"
            >
              <ArrowLeft size={13} />
              <span>Geri</span>
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium h-7 px-3 gap-1 shadow-xs"
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Tamamla' : 'İleri'}</span>
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <Check size={13} />
              ) : (
                <ArrowRight size={13} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
              Sistemi 1 Dakikada Keşfedin
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Müteahhitlik süreç masası, 3D openBIM metrajı ve taşeron hakediş kalkanını adım adım inceleyin.
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
