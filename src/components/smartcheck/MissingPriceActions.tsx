/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { VAT_RATE_OPTIONS } from "@/lib/price-catalog-review";
import { buildItemPricePayload, missingPriceAction, parseTurkishAmount, type MissingPriceItem, type PriceSuggestionCandidate } from "./missing-price";

interface MissingPriceActionsProps {
  item: MissingPriceItem;
  /** A same-poz, same-unit catalogue price the user may bind consciously. */
  candidate: PriceSuggestionCandidate | null;
  onPriceAdded: () => void;
  onUseCandidate: (candidate: PriceSuggestionCandidate) => void;
  onReviewItem: () => void;
}

const linkButton = "text-[11px] font-semibold text-primary underline disabled:opacity-50";
const field = "border border-border bg-background px-2 py-1 text-xs text-foreground";

/** Fiyatı eksik kalemde doğrudan eylemler (marka.md M-17.4): fiyat ekle, mevcut fiyatı eşleştir, incelemeye al. */
export function MissingPriceActions({ item, candidate, onPriceAdded, onUseCandidate, onReviewItem }: MissingPriceActionsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [owned, setOwned] = useState(false);
  const [saving, setSaving] = useState(false);

  if (missingPriceAction(item) === "review_poz") {
    return (
      <div className="mt-1 text-[11px] text-muted-foreground" data-missing-price-action="review_poz">
        Poz numarası belirlenemedi; fiyat bağlanamaz.{" "}
        <button type="button" className={linkButton} onClick={onReviewItem}>Uzman incelemesine al</button>
      </div>
    );
  }

  const parsedAmount = parseTurkishAmount(amount);
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0 && Boolean(vatRate) && owned && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const response = await fetchWithAuth("/api/pricing/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildItemPricePayload(item, parsedAmount, vatRate)),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        toast.error(body.error ?? "Firma fiyatı kaydedilemedi.");
        return;
      }
      toast.success(`${item.title} için firma fiyatı kataloğa eklendi.`);
      setFormOpen(false);
      setAmount("");
      onPriceAdded();
    } catch {
      toast.error("Firma fiyatı kaydedilirken bağlantı hatası oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 space-y-1.5" data-missing-price-action="add_price">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <button type="button" className={linkButton} onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen}>
          Firma fiyatı ekle
        </button>
        {candidate && (
          <button
            type="button"
            className={linkButton}
            onClick={() => onUseCandidate(candidate)}
            title={`${candidate.snapshot.description ?? ""} · ${candidate.source.name}`}
          >
            Katalogdaki fiyatı eşleştir ({Number(candidate.snapshot.amount).toLocaleString("tr-TR")} ₺)
          </button>
        )}
      </div>
      {candidate && (
        <p className="text-[10px] text-muted-foreground">
          Katalogda aynı poz ve birimle "{candidate.snapshot.description}" kayıtlı; açıklama farklı olduğu için otomatik bağlanmadı.
        </p>
      )}
      {formOpen && (
        <div className="flex flex-wrap items-end gap-2 border border-border bg-card p-2" data-testid={`missing-price-form-${item.id}`}>
          <label className="text-[10px] text-muted-foreground">
            Birim fiyat (₺/{item.unit}, KDV hariç)
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Örn. 3.450,00" className={`${field} mt-0.5 block w-32`} />
          </label>
          <label className="text-[10px] text-muted-foreground">
            KDV oranı
            <select value={vatRate} onChange={(event) => setVatRate(event.target.value)} className={`${field} mt-0.5 block`}>
              <option value="">Seçin</option>
              {VAT_RATE_OPTIONS.map((rate) => <option key={rate} value={rate}>%{rate}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1 text-[10px] text-foreground">
            <input type="checkbox" checked={owned} onChange={(event) => setOwned(event.target.checked)} />
            Firmamızın fiyatıdır
          </label>
          <button type="button" className="pafta-button !min-h-7 !px-3 !py-1 text-xs disabled:opacity-50" disabled={!canSave} onClick={() => void save()}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Kaydet
          </button>
        </div>
      )}
    </div>
  );
}
