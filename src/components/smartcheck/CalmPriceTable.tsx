/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";
import { Link } from "react-router-dom";
import type { CalmIfcDataset } from "@/ifc/calm-icmal";
import { isPriced, type summarizeCost } from "@/ifc/pricing/cost-summary";
import { MissingPriceActions } from "./MissingPriceActions";
import { formatTrCurrency, formatTrNumber } from "./calm-format";
import { publicPozCode, type PriceSuggestionCandidate } from "./missing-price";
import type { PriceLicenseMode, ResolvedPriceEvidence } from "./useCatalogPriceResolution";

interface CalmPriceTableProps {
  dataset: CalmIfcDataset;
  costSummary: ReturnType<typeof summarizeCost>;
  groupTotalLabel: (group: { pricedSubtotal: number; itemCount: number; missingItemCount: number }) => string;
  unitPrices: Record<string, number>;
  priceEvidence: Record<string, ResolvedPriceEvidence>;
  priceResolutionStatus: "idle" | "loading" | "ready" | "blocked";
  matchCandidates: Record<string, PriceSuggestionCandidate>;
  bindMatchCandidate: (itemId: string, candidate: PriceSuggestionCandidate) => void;
  setPriceRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  priceLicenseMode: PriceLicenseMode;
  setPriceLicenseMode: (mode: PriceLicenseMode) => void;
  tuikIndexedAppliedNote: string | null;
  reviewItem: (itemId: string) => void;
}

/** Adım 03 sol pafta: birim fiyat cetveli, fiyat kaynağı seçimi ve fiyatı eksik satırların eylemleri (M-17.4). */
export function CalmPriceTable({ dataset, costSummary, groupTotalLabel, unitPrices, priceEvidence, priceResolutionStatus, matchCandidates, bindMatchCandidate, setPriceRefreshKey, priceLicenseMode, setPriceLicenseMode, tuikIndexedAppliedNote, reviewItem }: CalmPriceTableProps) {
  return (
    <>
      {/* SOL: BİRİM FİYAT CETVELİ */}
      <div className="lg:col-span-7 border border-border bg-background">
        <div className="px-6 py-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="section-index">03 / BİRİM FİYAT CETVELİ &amp; LİSANS MODU</span>
            <h3 className="font-display-serif text-2xl text-foreground mt-0.5">
              Birim Fiyat ve Maliyet Cetveli
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yalnız firmanıza ait, incelenmiş ve geçerlilik süresi dolmamış fiyatlar kullanılır. Fiyatı bulunmayan kalem tutara katılmaz ve teklife hazır sayılmaz.
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Fiyatlandırılan kalem: {priceResolutionStatus === "loading" ? "yükleniyor" : priceResolutionStatus === "blocked" ? "fiyat kaynağına erişilemedi" : `${costSummary.pricedItemCount}/${costSummary.itemCount}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Fiyat Kaynağı ve Lisans Modu"
              value={priceLicenseMode}
              onChange={(e) =>
                setPriceLicenseMode(
                  e.target.value as "BYOL_TENANT_CATALOG" | "CSB_2026_REFERENCE",
                )
              }
              className="border border-border bg-background px-2.5 py-1 text-[10px] font-mono text-foreground focus:border-primary focus:outline-none"
            >
              <option value="BYOL_TENANT_CATALOG">
                Firma fiyat kataloğunuz
              </option>
              <option value="CSB_2026_REFERENCE">
                ÇŞB 2026 birim fiyatları (kullanım izniniz varsa)
              </option>
            </select>
            <span className="stamp-badge bg-primary/10 text-primary border-primary/40">
              {tuikIndexedAppliedNote
                ? "TÜİK endeksiyle güncellenmiş tahmini fiyat"
                : "Fiyatlar kataloğunuzdan gelir"}
            </span>
            {costSummary.missingItemCount > 0 && (
              <Link to="/app/fiyat-katalogu?kaynak=smartcheck" className="text-[11px] font-semibold text-primary underline">
                Kataloğa fiyat ekle
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 px-6 py-2.5 bg-card border-b border-foreground/70 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-5">İmalat Kalemi</div>
          <div className="col-span-2 text-right">Net Miktar</div>
          <div className="col-span-2 text-right">Birim Fiyat (₺)</div>
          <div className="col-span-3 text-right">Toplam Tutar</div>
        </div>

        <div className="divide-y divide-border">
          {dataset.groups.map((grp, grpIdx) => (
            <React.Fragment key={grp.key}>
              <div className="px-6 py-2 bg-card/70 border-y border-border flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                  0{grpIdx + 1} / {grp.title}
                </span>
                <span className="font-mono text-[11px] font-semibold text-foreground tabular-nums">
                  {groupTotalLabel(costSummary.groupTotals[grpIdx])}
                </span>
              </div>

              {grp.items.map((item) => {
                const priced = isPriced(unitPrices, item.id);
                const price = priced ? unitPrices[item.id] : null;
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center px-6 py-3 hover:bg-card/50 transition-colors"
                  >
                    <div className="col-span-5 pr-3">
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">Poz: {publicPozCode(item.pozCode) || "Çözülmedi"}</div>
                      {priceEvidence[item.id] ? (
                        <div className="font-mono text-[10px] text-muted-foreground">
                          Kaynak: {priceEvidence[item.id].sourceName} · fiyat kaydı {priceEvidence[item.id].snapshotId.slice(0, 8)}
                        </div>
                      ) : priceResolutionStatus === "ready" ? (
                        <MissingPriceActions
                          item={item}
                          candidate={matchCandidates[item.id] ?? null}
                          onPriceAdded={() => setPriceRefreshKey((key) => key + 1)}
                          onUseCandidate={(candidate) => bindMatchCandidate(item.id, candidate)}
                          onReviewItem={() => reviewItem(item.id)}
                        />
                      ) : (
                        <div className="font-mono text-[10px] text-muted-foreground">Fiyat bulunamadı</div>
                      )}
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatTrNumber(item.netQuantity)} {item.unit}
                    </div>
                    <div className="col-span-2 text-right font-mono text-sm font-semibold tabular-nums" aria-label={`${item.title} birim fiyatı`}>
                      {price === null
                        ? <span className="text-amber-600 dark:text-amber-400">Eksik</span>
                        : <span className="text-foreground">{formatTrCurrency(price)}</span>}
                    </div>
                    <div className="col-span-3 text-right font-mono text-sm font-semibold tabular-nums">
                      {price === null
                        ? <span className="text-muted-foreground">Hesaplanmadı</span>
                        : <span className="text-foreground">{formatTrCurrency(item.netQuantity * price)}</span>}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
