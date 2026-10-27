/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { CalmEscalationPanel } from "./CalmEscalationPanel";
import { CalmIsoCdePanel } from "./CalmIsoCdePanel";
import { CalmKikPanel } from "./CalmKikPanel";
import type { useCalmSessionInputs } from "./useCalmSessionInputs";
import type { TuikEscalation } from "./useTuikEscalation";

interface CalmCostToolsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  publicTender: boolean;
  setPublicTender: (value: boolean) => void;
  projectTitle: string;
  documentId?: string | null;
  allItems: readonly CalmIcmalItem[];
  unitPrices: Record<string, number>;
  pricedGrandTotal: number;
  pricingComplete: boolean;
  costPendingLabel: string;
  session: ReturnType<typeof useCalmSessionInputs>;
  escalation: TuikEscalation;
}

/** Araçlar (M-14.5): kamu ihalesi araçları yalnız işaretlenince; ISO 19650 kartı her zaman bölüm içinde. */
export function CalmCostTools({ open, setOpen, publicTender, setPublicTender, projectTitle, documentId, allItems, unitPrices, pricedGrandTotal, pricingComplete, costPendingLabel, session, escalation }: CalmCostToolsProps) {
  return (
    <>
      {/* ARAÇLAR (M-14.5): kamu ihalesi araçları yalnız işaretlenince; ISO 19650 kartı her zaman bölüm içinde */}
      <details
        className="mt-5 border border-border bg-card"
        data-testid="cost-tools"
        open={open}
        onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
          Araçlar · kamu ihalesi, fiyat farkı, ISO 19650
        </summary>
        <div className="border-t border-border px-4 pb-4">
          <label className="mt-3 flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              data-testid="public-tender-toggle"
              checked={publicTender}
              onChange={(event) => setPublicTender(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Bu iş kamu ihalesi (4734 / 4735 kapsamında)
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                KİK aşırı düşük teklif sınır değeri ve 4735 fiyat farkı yalnız 4734'e tabi kamu ihalelerinde ve sözleşmelerinde uygulanır; özel sektör işlerinde gizli kalır.
              </span>
            </span>
          </label>
          {publicTender && (
            <>
              <CalmKikPanel
                allItems={allItems}
                unitPrices={unitPrices}
                pricedGrandTotal={pricedGrandTotal}
                pricingComplete={pricingComplete}
                costPendingLabel={costPendingLabel}
                {...session}
              />

              <CalmEscalationPanel pricingComplete={pricingComplete} costPendingLabel={costPendingLabel} {...escalation} />
            </>
          )}
          <CalmIsoCdePanel projectTitle={projectTitle} allItems={allItems} documentId={documentId} {...session} />

        </div>
      </details>
    </>
  );
}
