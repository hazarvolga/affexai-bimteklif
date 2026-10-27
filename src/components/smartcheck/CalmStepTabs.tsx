/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";

export type CalmStep = "icmal" | "daireler" | "maliyet";

interface CalmStepTab {
  step: CalmStep;
  index: string;
  title: string;
  meta: string;
  metaClassName: string;
}

interface CalmStepTabsProps {
  activeStep: CalmStep;
  onSelect: (step: CalmStep) => void;
  tabs: readonly CalmStepTab[];
}

/** Üç adımlı mimari pafta indeks çubuğu: icmal, daire metrekareleri, maliyet ve teklif. */
export function CalmStepTabs({ activeStep, onSelect, tabs }: CalmStepTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Metraj ve Maliyet Adımları"
      className="grid grid-cols-1 sm:grid-cols-3 border-b border-border bg-background divide-y sm:divide-y-0 sm:divide-x divide-border"
    >
      {tabs.map((tab) => (
        <button
          key={tab.step}
          type="button"
          role="tab"
          aria-selected={activeStep === tab.step}
          onClick={() => onSelect(tab.step)}
          className={`flex items-center justify-between px-6 py-4 text-left transition-colors ${
            activeStep === tab.step
              ? "bg-primary/10 border-b-2 border-b-primary"
              : "hover:bg-card/70"
          }`}
        >
          <div>
            <span className="section-index block">{tab.index}</span>
            <span className="mt-0.5 block text-sm font-semibold text-foreground">{tab.title}</span>
          </div>
          <span className={tab.metaClassName}>{tab.meta}</span>
        </button>
      ))}
    </div>
  );
}
