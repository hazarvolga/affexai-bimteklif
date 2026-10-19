/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import React from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourStep } from "./tour-types";

const TOOLTIP_WIDTH = 460;
const ESTIMATED_HEIGHT = 260;
const EDGE_PADDING = 16;

export function tooltipStyle(step: TourStep, rect: DOMRect | null): React.CSSProperties {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return { position: "fixed", left: "12px", right: "12px", bottom: "16px", zIndex: 60, maxWidth: "calc(100vw - 24px)" };
  }
  if (!rect || step.preferredPlacement === "center") {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 60, width: `${TOOLTIP_WIDTH}px` };
  }
  const centerX = rect.left + rect.width / 2;
  const left = Math.max(EDGE_PADDING, Math.min(centerX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - EDGE_PADDING));
  let top = rect.bottom + EDGE_PADDING;
  if (step.preferredPlacement === "top" || top + ESTIMATED_HEIGHT > window.innerHeight - EDGE_PADDING) {
    const above = rect.top - ESTIMATED_HEIGHT - EDGE_PADDING;
    if (above >= EDGE_PADDING) top = above;
  }
  return { position: "fixed", top: `${Math.max(EDGE_PADDING, top)}px`, left: `${left}px`, width: `${TOOLTIP_WIDTH}px`, zIndex: 60 };
}

function Spotlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return <div className="fixed inset-0 bg-black/40 z-50 pointer-events-none" aria-hidden="true" />;
  return (
    <div
      className="fixed pointer-events-none transition-all duration-300 ease-out border-2 border-primary rounded-xs z-50"
      style={{
        top: `${Math.max(0, rect.top - 6)}px`,
        left: `${Math.max(0, rect.left - 6)}px`,
        width: `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
        boxShadow: "0 0 0 9999px rgba(10, 12, 14, 0.42)",
      }}
      aria-hidden="true"
    />
  );
}

interface TourCardProps {
  ariaLabel: string;
  step: TourStep;
  index: number;
  total: number;
  rect: DOMRect | null;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDismiss: () => void;
  onJump: (index: number) => void;
}

export function TourCard({ ariaLabel, step, index, total, rect, loading, onPrev, onNext, onDismiss, onJump }: TourCardProps) {
  const isLast = index === total - 1;
  return (
    <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="fixed inset-0 z-40" onClick={onDismiss} aria-hidden="true" />
      <Spotlight rect={loading ? null : rect} />
      <div style={tooltipStyle(step, loading ? null : rect)} className={cn("rounded-xs border border-primary/60 bg-card p-5 shadow-2xl relative", "border-l-4 border-l-primary")}>
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-border/80 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{step.badge}</span>
            <span className="text-[11px] text-muted-foreground">Sayfa: {step.pageLabel}</span>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Turu kapat (ESC)" className="p-1 rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted/40">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-2 mb-4" aria-live="polite">
          <h3 className="text-sm md:text-base font-semibold text-foreground tracking-tight flex items-center gap-1.5">
            <Sparkles size={15} className="text-primary shrink-0" aria-hidden="true" />
            <span>{step.title}</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{loading ? `${step.pageLabel} sayfası açılıyor…` : step.description}</p>
          {step.tip && !loading && (
            <div className="mt-2.5 p-2.5 rounded-xs bg-primary/5 border border-primary/20 flex items-start gap-2">
              <span className="font-mono text-[11px] font-bold text-primary shrink-0">NOT:</span>
              <span className="text-xs text-foreground/90 leading-normal">{step.tip}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/80">
          <div className="flex flex-wrap items-center gap-1.5 max-w-[45%]">
            {Array.from({ length: total }, (_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onJump(idx)}
                aria-label={`Adım ${idx + 1}`}
                aria-current={idx === index ? "step" : undefined}
                className={cn("h-1.5 rounded-full transition-all", idx === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onPrev} disabled={index === 0} className="text-xs font-mono h-7 px-2.5 gap-1 disabled:opacity-30">
              <ArrowLeft size={13} aria-hidden="true" />
              <span>Geri</span>
            </Button>
            <Button size="sm" onClick={onNext} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium h-7 px-3 gap-1">
              <span>{isLast ? "Tamamla" : "İleri"}</span>
              {isLast ? <Check size={13} aria-hidden="true" /> : <ArrowRight size={13} aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
