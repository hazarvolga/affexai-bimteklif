/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useMemo, useState } from "react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { computeContractPriceEscalation4735, indexOutOfPeriodUnitPrice, type TuikSubIndexCode } from "@/lib/price-escalation";

interface TuikEscalationInput {
  allItems: readonly CalmIcmalItem[];
  unitPrices: Record<string, number>;
  pricingComplete: boolean;
  pricedGrandTotal: number;
  /** Indexed prices replace the resolved ones; their catalogue evidence no longer applies. */
  onApplyIndexedPrices: (nextPrices: Record<string, number>) => void;
}

/** Faz 2.5: 4735 fiyat farkı ve ÇŞB 2026 – TÜİK 21 alt endeks simülatörü (sıfır uydurma girdi). */
export function useTuikEscalation({ allItems, unitPrices, pricingComplete, pricedGrandTotal, onApplyIndexedPrices }: TuikEscalationInput) {
  const [selectedTuikIndex, setSelectedTuikIndex] = useState<TuikSubIndexCode>("TUIK-23.6-HAZIR-BETON");
  const [tuikBaseIndexInput, setTuikBaseIndexInput] = useState<string>("");
  const [tuikCurrentIndexInput, setTuikCurrentIndexInput] = useState<string>("");
  const [tuikIndexedAppliedNote, setTuikIndexedAppliedNote] = useState<string | null>(null);

  const escalationPreview = useMemo(() => {
    if (!pricingComplete) return null;
    const e0 = parseFloat(tuikBaseIndexInput.replace(",", "."));
    const en = parseFloat(tuikCurrentIndexInput.replace(",", "."));
    if (!Number.isFinite(e0) || e0 <= 0 || !Number.isFinite(en) || en <= 0) {
      return null;
    }
    try {
      return computeContractPriceEscalation4735({
        progressPaymentAmountTl: pricedGrandTotal,
        bFactor: 0.9,
        components: [
          {
            indexCode: selectedTuikIndex,
            weight: 1.0,
            baseIndex: e0,
            currentIndex: en,
          },
        ],
      });
    } catch {
      return null;
    }
  }, [pricedGrandTotal, pricingComplete, selectedTuikIndex, tuikBaseIndexInput, tuikCurrentIndexInput]);

  const handleApplyTuikIndexToPrices = () => {
    const e0 = parseFloat(tuikBaseIndexInput.replace(",", "."));
    const en = parseFloat(tuikCurrentIndexInput.replace(",", "."));
    if (!Number.isFinite(e0) || e0 <= 0 || !Number.isFinite(en) || en <= 0) return;

    const evaluationDate = new Date().toISOString().slice(0, 10);
    const nextPrices: Record<string, number> = {};
    let lastWarning: string | null = null;

    for (const item of allItems) {
      const currentPrice = unitPrices[item.id];
      if (currentPrice === undefined) continue;
      const indexed = indexOutOfPeriodUnitPrice({
        itemCode: item.pozCode,
        itemName: item.title,
        baseUnitPriceTl: currentPrice,
        catalogValidityEnd: "2026-03-31",
        evaluationDate,
        indexCode: selectedTuikIndex,
        baseIndex: e0,
        currentIndex: en,
      });
      nextPrices[item.id] = indexed.indexedUnitPriceTl;
      lastWarning = indexed.warningLabel;
    }
    onApplyIndexedPrices(nextPrices);
    setTuikIndexedAppliedNote(
      lastWarning ??
        `TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat (${selectedTuikIndex} · E_n/E_0 = ${(en / e0).toFixed(4)})`,
    );
  };

  return {
    selectedTuikIndex, setSelectedTuikIndex,
    tuikBaseIndexInput, setTuikBaseIndexInput,
    tuikCurrentIndexInput, setTuikCurrentIndexInput,
    tuikIndexedAppliedNote, escalationPreview, handleApplyTuikIndexToPrices,
  };
}

export type TuikEscalation = ReturnType<typeof useTuikEscalation>;
