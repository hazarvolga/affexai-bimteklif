/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, Loader2, Plus } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PriceCatalogWizard } from "@/components/pricing/PriceCatalogWizard";

interface CatalogSnapshot {
  id: string;
  positionCode: string | null;
  description: string;
  unit: string;
  amount: string;
  currency: string;
  vatStatus: string;
  vatPercent: string | null;
  validUntil: string | null;
  stale: boolean;
}

const LIST_LIMIT = 500;

/** Where the user came from, so the wizard can send them back to the work that needed the prices. */
const RETURN_TARGETS: Record<string, { to: string; label: string }> = {
  smartcheck: { to: "/app/smartcheck", label: "SmartCheck'e dön" },
  teklif: { to: "/app/quotes/new", label: "Teklife dön" },
};

function formatVat(snapshot: CatalogSnapshot) {
  if (snapshot.vatStatus === "excluded" && snapshot.vatPercent !== null) return `Hariç · %${Number(snapshot.vatPercent)}`;
  if (snapshot.vatStatus === "included") return "Dahil";
  return "Belirtilmemiş";
}

export function PriceCatalog() {
  const [searchParams] = useSearchParams();
  const returnTarget = RETURN_TARGETS[searchParams.get("kaynak") ?? ""];
  const [snapshots, setSnapshots] = useState<CatalogSnapshot[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [lastImported, setLastImported] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`/api/pricing/snapshots?status=approved&limit=${LIST_LIMIT}`);
      if (!response.ok) throw new Error("catalogue unavailable");
      const body: unknown = await response.json();
      if (!Array.isArray(body)) throw new Error("unexpected catalogue response");
      setSnapshots(body as CatalogSnapshot[]);
      setLoadError(false);
    } catch {
      setSnapshots([]);
      setLoadError(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const isEmpty = snapshots !== null && snapshots.length === 0 && !loadError;
  const showWizard = isEmpty || wizardOpen;

  return (
    <PageContainer>
      <PageHeader
        title="Fiyat Kataloğu"
        description="Firmanızın onaylı birim fiyatları. Teklif ve IFC icmali yalnız buradaki fiyatları kullanır; tedarikçi teklifleri ayrı incelenir."
        icon={BookOpenCheck}
      />

      {lastImported !== null && (
        <div className="mb-4 flex flex-wrap items-center gap-3 border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-foreground" data-testid="price-catalog-imported">
          <span>{lastImported} fiyat onaylandı ve kataloğa eklendi.</span>
          {returnTarget && (
            <Link to={returnTarget.to} className="inline-flex items-center gap-1 font-semibold text-primary underline">
              <ArrowLeft className="h-3.5 w-3.5" /> {returnTarget.label}
            </Link>
          )}
        </div>
      )}

      {snapshots === null ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Katalog yükleniyor…</p>
      ) : (
        <div className="space-y-6">
          {loadError && <p className="text-sm text-destructive">Katalog yüklenemedi. Sayfayı yenileyin.</p>}
          {showWizard ? (
            <PriceCatalogWizard
              onImported={(count) => {
                setLastImported(count);
                setWizardOpen(false);
                void refresh();
              }}
            />
          ) : (
            <button type="button" className="pafta-button !min-h-9" onClick={() => setWizardOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Yeni fiyat listesi ekle
            </button>
          )}

          {snapshots.length > 0 && (
            <section aria-labelledby="price-catalog-list-title" className="border border-border bg-card" data-testid="price-catalog-list">
              <div className="border-b border-border px-4 py-3">
                <h2 id="price-catalog-list-title" className="text-sm font-semibold text-foreground">Onaylı fiyatlar ({snapshots.length}{snapshots.length >= LIST_LIMIT ? "+" : ""})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="px-4 py-2">Poz No</th><th>Açıklama</th><th>Birim</th><th className="text-right">Birim fiyat</th><th className="px-4">KDV</th><th>Geçerlilik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="border-b border-border/60">
                        <td className="px-4 py-1.5 font-mono text-muted-foreground">{snapshot.positionCode ?? "—"}</td>
                        <td className="text-foreground">{snapshot.description}</td>
                        <td className="text-muted-foreground">{snapshot.unit}</td>
                        <td className="text-right font-mono tabular-nums text-foreground">
                          {Number(snapshot.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {snapshot.currency}
                        </td>
                        <td className="px-4 text-muted-foreground">{formatVat(snapshot)}</td>
                        <td className={snapshot.stale ? "font-semibold text-amber-600" : "text-muted-foreground"}>
                          {snapshot.validUntil ? new Date(snapshot.validUntil).toLocaleDateString("tr-TR") : "Süresiz"}{snapshot.stale ? " · süresi dışında" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

export default PriceCatalog;
