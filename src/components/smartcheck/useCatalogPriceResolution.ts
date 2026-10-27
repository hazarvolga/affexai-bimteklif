/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useEffect, useRef, useState } from "react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { fetchWithAuth } from "@/lib/api";
import { matchableCandidate, publicPozCode, type PriceSuggestionCandidate, type PriceSuggestionResult } from "./missing-price";

export type ResolvedPriceEvidence = { snapshotId: string; sourceId: string; sourceName: string; sourceDocumentHash: string; currency: "TRY"; amount: number; capturedAt: string | null };
export type PriceLicenseMode = "BYOL_TENANT_CATALOG" | "CSB_2026_REFERENCE";

/**
 * Resolves a unit price for every icmal line from the company catalogue (or the ÇŞB reference) and keeps the
 * snapshot evidence the transfer re-checks. Missing-price candidates the user binds by hand survive a refresh.
 */
export function useCatalogPriceResolution(allItems: readonly CalmIcmalItem[], priceLicenseMode: PriceLicenseMode) {
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [priceEvidence, setPriceEvidence] = useState<Record<string, ResolvedPriceEvidence>>({});
  const [priceResolutionStatus, setPriceResolutionStatus] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
  const [matchCandidates, setMatchCandidates] = useState<Record<string, PriceSuggestionCandidate>>({});
  const [priceRefreshKey, setPriceRefreshKey] = useState(0);
  // Prices the user bound by hand survive a re-resolution, but only while the same snapshot is still offered.
  const boundSnapshotByItem = useRef<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const resolvePrices = async () => {
      setPriceResolutionStatus("loading");
      setUnitPrices({});
      setPriceEvidence({});
      try {
        const response = await fetchWithAuth("/api/pricing/snapshot-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode: priceLicenseMode,
            rows: allItems.map((item) => ({ rowId: item.id, positionCode: publicPozCode(item.pozCode) || null, description: item.title, unit: item.unit })),
          }),
        });
        if (!response.ok) throw new Error("price resolver unavailable");
        const body = await response.json() as { suggestions?: PriceSuggestionResult[] };
        const nextPrices: Record<string, number> = {};
        const nextEvidence: Record<string, ResolvedPriceEvidence> = {};
        const nextCandidates: Record<string, PriceSuggestionCandidate> = {};
        const itemById = new Map(allItems.map((item) => [item.id, item]));
        for (const suggestion of body.suggestions ?? []) {
          const item = itemById.get(suggestion.rowId);
          const candidate = item ? matchableCandidate(item, suggestion) : null;
          if (candidate && boundSnapshotByItem.current[suggestion.rowId] === candidate.snapshot.id) {
            const boundAmount = Number(candidate.snapshot.amount);
            nextPrices[suggestion.rowId] = boundAmount;
            nextEvidence[suggestion.rowId] = { snapshotId: candidate.snapshot.id, sourceId: candidate.source.id, sourceName: candidate.source.name, sourceDocumentHash: candidate.snapshot.sourceDocumentHash, currency: "TRY", amount: boundAmount, capturedAt: candidate.snapshot.capturedAt ?? null };
            continue;
          }
          if (candidate) nextCandidates[suggestion.rowId] = candidate;
          const match = suggestion.decision === "safe_candidate" ? suggestion.bestSuggestion : null;
          const amount = Number(match?.snapshot.amount);
          if (!match || match.snapshot.currency !== "TRY" || !Number.isFinite(amount) || amount < 0) continue;
          nextPrices[suggestion.rowId] = amount;
          nextEvidence[suggestion.rowId] = { snapshotId: match.snapshot.id, sourceId: match.source.id, sourceName: match.source.name, sourceDocumentHash: match.snapshot.sourceDocumentHash, currency: "TRY", amount, capturedAt: match.snapshot.capturedAt ?? null };
        }
        setUnitPrices(nextPrices);
        setPriceEvidence(nextEvidence);
        setMatchCandidates(nextCandidates);
        setPriceResolutionStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setUnitPrices({});
        setPriceEvidence({});
        setPriceResolutionStatus("blocked");
      }
    };
    void resolvePrices();
    return () => controller.abort();
  }, [allItems, priceLicenseMode, priceRefreshKey]);

  /** The user looked at a same-poz, same-unit catalogue price and binds it; transfer re-checks poz, unit and amount. */
  const bindMatchCandidate = (itemId: string, candidate: PriceSuggestionCandidate) => {
    boundSnapshotByItem.current = { ...boundSnapshotByItem.current, [itemId]: candidate.snapshot.id };
    const amount = Number(candidate.snapshot.amount);
    setUnitPrices((current) => ({ ...current, [itemId]: amount }));
    setPriceEvidence((current) => ({
      ...current,
      [itemId]: { snapshotId: candidate.snapshot.id, sourceId: candidate.source.id, sourceName: candidate.source.name, sourceDocumentHash: candidate.snapshot.sourceDocumentHash, currency: "TRY", amount, capturedAt: candidate.snapshot.capturedAt ?? null },
    }));
    setMatchCandidates(({ [itemId]: _bound, ...rest }) => rest);
  };

  return {
    unitPrices, setUnitPrices, priceEvidence, setPriceEvidence, priceResolutionStatus, setPriceResolutionStatus,
    matchCandidates, setPriceRefreshKey, bindMatchCandidate,
  };
}
