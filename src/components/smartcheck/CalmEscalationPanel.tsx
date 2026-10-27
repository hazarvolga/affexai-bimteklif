/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";
import { CSB_2026_TUIK_SUB_INDICES, type TuikSubIndexCode } from "@/lib/price-escalation";
import { formatTrCurrency, formatTrNumber } from "./calm-format";
import type { TuikEscalation } from "./useTuikEscalation";

interface CalmEscalationPanelProps extends TuikEscalation {
  pricingComplete: boolean;
  costPendingLabel: string;
}

/** 4735 sayılı Kanun fiyat farkı ve ÇŞB 2026 – TÜİK 21 alt endeks motoru (kamu ihalesi araçları, M-14.5). */
export function CalmEscalationPanel({
  pricingComplete, costPendingLabel, selectedTuikIndex, setSelectedTuikIndex, tuikBaseIndexInput, setTuikBaseIndexInput,
  tuikCurrentIndexInput, setTuikCurrentIndexInput, tuikIndexedAppliedNote, escalationPreview, handleApplyTuikIndexToPrices,
}: CalmEscalationPanelProps) {
  return (
    <>
      {/* 4735 SAYILI KANUN FİYAT FARKI & ÇŞB 2026 – TÜİK 21 ALT ENDEKS MOTORU (FAZ 2.5) */}
      <div className="mt-4 border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
            4735 FİYAT FARKI (F = A_n × B × (P_n − 1)) · ÇŞB-TÜİK 21 ALT ENDEKS
          </span>
          <span className="stamp-badge bg-card text-foreground">
            B = 0,90 · 21 Resmi Alt Endeks
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
          <label className="block sm:col-span-1">
            <span className="text-[10px] text-muted-foreground block mb-1">
              ÇŞB 2026 – TÜİK Alt Endeksi (21 Grup)
            </span>
            <select
              aria-label="TÜİK Alt Endeks Seçimi"
              value={selectedTuikIndex}
              onChange={(e) => setSelectedTuikIndex(e.target.value as TuikSubIndexCode)}
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            >
              {CSB_2026_TUIK_SUB_INDICES.map((idx) => (
                <option key={idx.code} value={idx.code}>
                  {idx.tuikSectorCode} — {idx.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">
              Temel Endeks (E_0 — Baz Ayı)
            </span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Temel Endeks (E_0 — Baz Ayı)"
              value={tuikBaseIndexInput}
              onChange={(e) => setTuikBaseIndexInput(e.target.value)}
              placeholder="Örn: 240.00"
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
            />
          </label>

          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">
              Güncel Endeks (E_n — Uygulama Ayı)
            </span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Güncel Endeks (E_n — Uygulama Ayı)"
              value={tuikCurrentIndexInput}
              onChange={(e) => setTuikCurrentIndexInput(e.target.value)}
              placeholder="Örn: 276.00"
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
            />
          </label>
        </div>

        {escalationPreview ? (
          <div className="mt-3 space-y-2 text-xs font-mono">
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border bg-card p-2">
                <div className="text-[10px] text-muted-foreground">P_n Katsayısı</div>
                <div className="mt-0.5 font-bold text-foreground tabular-nums">
                  {formatTrNumber(escalationPreview.pnFactor, 4)}
                </div>
              </div>
              <div className="border border-border bg-card p-2">
                <div className="text-[10px] text-muted-foreground">Fiyat Farkı (F)</div>
                <div className="mt-0.5 font-bold text-primary tabular-nums">
                  {formatTrCurrency(escalationPreview.priceDifferenceTl)}
                </div>
              </div>
              <div className="border border-border bg-card p-2">
                <div className="text-[10px] text-muted-foreground">Güncel Toplam (A_n + F)</div>
                <div className="mt-0.5 font-bold text-foreground tabular-nums">
                  {formatTrCurrency(escalationPreview.adjustedTotalTl)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">
                {escalationPreview.formulaSummary}
              </span>
              <button
                type="button"
                onClick={handleApplyTuikIndexToPrices}
                className="border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Birim Fiyatları E_n/E_0 İle Güncelle (Tahmini)
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 border border-border bg-card p-2.5 text-[11px] font-mono text-muted-foreground">
            {pricingComplete
              ? "4735 Sayılı Kanun Fiyat Farkı (F = A_n × 0,90 × (P_n − 1)) ve dönem dışı birim fiyat güncellemesi için TÜİK Temel Endeks (E_0) ve Güncel Endeks (E_n) değerlerini giriniz (sabit enflasyon oranı varsayılmaz)."
              : `Fiyat farkı, tüm kalemler fiyatlandıktan sonra hesaplanır (${costPendingLabel}).`}
          </div>
        )}

        {tuikIndexedAppliedNote && (
          <div className="mt-2 border border-primary/40 bg-primary/10 p-2 text-[10px] font-mono text-foreground">
            {tuikIndexedAppliedNote}
          </div>
        )}
      </div>
    </>
  );
}
