/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";
import { FilePlus2, GitBranchPlus } from "lucide-react";
import type { CalmTransferTarget } from "./calm-transfer-ui";

interface QuotationOption {
  id: string;
  quoteNumber: string;
  projectName: string;
}

interface CalmTransferTargetPickerProps {
  target: CalmTransferTarget;
  quotations: readonly QuotationOption[];
  disabled?: boolean;
  onChange: (target: CalmTransferTarget) => void;
}

const MODES = [
  { mode: "new", title: "Yeni teklif oluştur", description: "İcmal yeni bir teklifin ilk fiyatlı sürümü olur.", icon: FilePlus2 },
  { mode: "revision", title: "Mevcut teklife revizyon ekle", description: "Seçilen teklif korunur, yeni revizyonu açılır.", icon: GitBranchPlus },
] as const;

const fieldClass = "mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground disabled:opacity-60";
const labelClass = "font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

/** İcmal nereye gidecek: yeni teklif mi, mevcut teklifin yeni revizyonu mu (marka.md M-14.3). */
export function CalmTransferTargetPicker({ target, quotations, disabled = false, onChange }: CalmTransferTargetPickerProps) {
  const selectMode = (mode: CalmTransferTarget["mode"]) => {
    if (mode === target.mode) return;
    onChange(mode === "new" ? { mode, clientName: "", projectName: "" } : { mode, quotationId: "" });
  };

  return (
    <fieldset className="mb-3 border border-border bg-card p-3" disabled={disabled} data-testid="calm-transfer-target">
      <legend className={`${labelClass} px-1`}>İcmal nereye aktarılsın?</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Aktarım hedefi">
        {MODES.map(({ mode, title, description, icon: Icon }) => {
          const active = target.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              data-transfer-mode={mode}
              onClick={() => selectMode(mode)}
              className={`flex items-start gap-2 border p-2.5 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
              <span>
                <span className="block text-xs font-semibold text-foreground">{title}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {target.mode === "new" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className={labelClass} htmlFor="calm-new-client">
            Müşteri adı *
            <input
              id="calm-new-client"
              value={target.clientName}
              maxLength={200}
              onChange={(event) => onChange({ ...target, clientName: event.target.value })}
              placeholder="Örn. Yılmaz Yapı A.Ş."
              className={fieldClass}
            />
          </label>
          <label className={labelClass} htmlFor="calm-new-project">
            Proje adı
            <input
              id="calm-new-project"
              value={target.projectName}
              maxLength={255}
              onChange={(event) => onChange({ ...target, projectName: event.target.value })}
              placeholder="Boşsa dosya adından üretilir"
              className={fieldClass}
            />
          </label>
          <p className="text-[10px] leading-relaxed text-muted-foreground sm:col-span-2">
            Aylık teklif kotanızdan bir teklif düşer. Fiyatlar onaylı katalog kayıtlarından gelir; teklif taslak olarak açılır.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <label className={labelClass} htmlFor="calm-target-quotation">
            Teklif
            <select
              id="calm-target-quotation"
              value={target.quotationId}
              onChange={(event) => onChange({ mode: "revision", quotationId: event.target.value })}
              className={fieldClass}
            >
              <option value="">Teklif seçin</option>
              {quotations.map((quotation) => (
                <option key={quotation.id} value={quotation.id}>{quotation.quoteNumber} · {quotation.projectName}</option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Seçilen teklif değişmez; önceki sürüm korunur ve icmal yeni revizyona eklenir. Revizyon kota tüketmez.
          </p>
          {!quotations.length && (
            <p className="mt-1 text-[10px] font-semibold text-amber-500">
              Henüz teklifiniz yok. "Yeni teklif oluştur" seçeneğiyle başlayın.
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
