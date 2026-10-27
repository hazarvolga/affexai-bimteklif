/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useMemo } from "react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { evaluateKikAbnormallyLowBid, type KikWorkCategory } from "@/lib/kik-adt";
import { formatTrCurrency, formatTrNumber } from "./calm-format";

interface CalmKikPanelProps {
  allItems: readonly CalmIcmalItem[];
  unitPrices: Record<string, number>;
  pricedGrandTotal: number;
  pricingComplete: boolean;
  costPendingLabel: string;
  kikWorkCategory: KikWorkCategory;
  setKikWorkCategory: (value: KikWorkCategory) => void;
  tenderYmInput: string;
  setTenderYmInput: (value: string) => void;
  tenderBidsInput: string;
  setTenderBidsInput: (value: string) => void;
}

/** 4734 KİK m.38 aşırı düşük teklif sınır değeri ve %80 Pareto analizi (kamu ihalesi araçları, M-14.5). */
export function CalmKikPanel({
  allItems, unitPrices, pricedGrandTotal, pricingComplete, costPendingLabel,
  kikWorkCategory, setKikWorkCategory, tenderYmInput, setTenderYmInput, tenderBidsInput, setTenderBidsInput,
}: CalmKikPanelProps) {
  const kikAdtAnalysis = useMemo(() => {
    const parsedYm = Number(tenderYmInput.replace(/\./g, "").replace(",", ".").trim());
    const validYm = Number.isFinite(parsedYm) && parsedYm > 0 ? parsedYm : null;
    const ourBid = Math.max(0, Math.round(pricedGrandTotal));
    const parsedCompetitorBids = tenderBidsInput
      .split(/[;\n]+|(?:\s+)/)
      .flatMap((token) => token.split(","))
      .map((raw) => Number(raw.replace(/\./g, "").trim()))
      .filter((v) => Number.isFinite(v) && v > 0);
    const sessionBids =
      validYm && parsedCompetitorBids.length > 0 && pricingComplete ? [ourBid, ...parsedCompetitorBids] : [];

    return evaluateKikAbnormallyLowBid({
      estimatedCostTry: validYm,
      validBidsTry: sessionBids,
      ourBidTry: ourBid,
      workCategory: kikWorkCategory,
      lineItems: allItems.map((it) => ({
        id: it.id,
        code: it.pozCode,
        description: it.title,
        totalAmount: Math.round(it.netQuantity * (unitPrices[it.id] ?? 0)),
      })),
    });
  }, [allItems, pricedGrandTotal, kikWorkCategory, pricingComplete, tenderBidsInput, tenderYmInput, unitPrices]);

  return (
    <>
      {/* 4734 KİK m.38 AŞIRI DÜŞÜK TEKLİF (SINIR DEĞER & %80 PARETO) ANALİZİ */}
      <div className="mt-5 border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
            4734 KİK m.38 · SINIR DEĞER &amp; %80 PARETO ANALİZİ
          </span>
          <div className="inline-flex border border-border bg-card text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setKikWorkCategory("ust_yapi")}
              className={`px-2 py-0.5 ${
                kikWorkCategory === "ust_yapi"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Üstyapı (N=1,00)
            </button>
            <button
              type="button"
              onClick={() => setKikWorkCategory("alt_yapi")}
              className={`px-2 py-0.5 ${
                kikWorkCategory === "alt_yapi"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Diğer Yapım / Altyapı (N=1,20)
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">
              İdare Yaklaşık Maliyeti (YM - TL)
            </span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="İdare Yaklaşık Maliyeti (YM - TL)"
              value={tenderYmInput}
              onChange={(e) => setTenderYmInput(e.target.value)}
              placeholder="Örn: 125000000"
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">
              Rakip Teklifler (TL, noktalı virgül ile)
            </span>
            <input
              type="text"
              aria-label="Rakip Teklifler (TL, noktalı virgül ile)"
              value={tenderBidsInput}
              onChange={(e) => setTenderBidsInput(e.target.value)}
              placeholder="Örn: 98000000; 102500000; 106000000"
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
            />
          </label>
        </div>

        {kikAdtAnalysis.hasTenderSessionInputs ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="border border-border bg-card p-2">
              <div className="text-[10px] text-muted-foreground">
                Sınır Değer (SD = K × Tort2 / (C × N))
              </div>
              <div className="mt-0.5 font-bold text-foreground tabular-nums">
                {formatTrCurrency(kikAdtAnalysis.boundaryValueTry)}
              </div>
            </div>
            <div className="border border-border bg-card p-2">
              <div className="text-[10px] text-muted-foreground">KİK m.38 Durumu</div>
              <div
                className={`mt-0.5 font-bold tabular-nums ${
                  kikAdtAnalysis.isAbnormallyLow ? "text-primary" : "text-foreground"
                }`}
              >
                {kikAdtAnalysis.isAbnormallyLow
                  ? `Aşırı Düşük (${formatTrNumber(kikAdtAnalysis.marginToBoundaryPercent, 1)}%)`
                  : `Sınır Değer Üstü (+${formatTrNumber(kikAdtAnalysis.marginToBoundaryPercent, 1)}%)`}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 border border-border bg-card p-2.5 text-[11px] font-mono text-muted-foreground">
            {pricingComplete
              ? "Sınır değer (SD) hesabı için ihale açılış tutanağındaki İdare Yaklaşık Maliyeti (YM) ve geçerli teklifleri giriniz (varsayılan uydurma değer kullanılmaz)."
              : `Teklif tutarınız tüm kalemler fiyatlandıktan sonra sınır değerle karşılaştırılır (${costPendingLabel}).`}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
          <span>
            Tebliğ m.45.1.2 resmî %80 listesi:{" "}
            <strong className="text-foreground">
              {kikAdtAnalysis.officialExplanationListStatus === "evaluated"
                ? `${kikAdtAnalysis.explanationRequiredItems.length} kalem`
                : "Değerlendirilmedi"}
            </strong>
          </span>
          <span className="stamp-badge bg-card text-muted-foreground">
            EKAP Tutanak İçe Aktarımı: Yol Haritasında · 2026 Q4 (Faz 3)
          </span>
        </div>
        {kikAdtAnalysis.officialExplanationListStatus === "not_evaluated" && (
          <div className="mt-2 border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-300">
            {kikAdtAnalysis.officialExplanationListReason} Teklif satırlarından üretilen {kikAdtAnalysis.advisoryOfferExplanationRequiredItems.length} kalem yalnız danışma karşılaştırmasıdır.
          </div>
        )}
      </div>
    </>
  );
}
