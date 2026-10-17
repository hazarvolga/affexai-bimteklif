import React, { useMemo, useState } from "react";
import {
  computeFinishLayerShrinkage,
  type AuthoringAdvisory,
} from "@/ifc/authoring-software-diagnostics";

function parseOptional(raw: string): number {
  const n = Number(raw.trim().replace(",", "."));
  return raw.trim() === "" || !Number.isFinite(n) ? NaN : n;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export const AuthoringAdvisoryBanner: React.FC<{ advisory?: AuthoringAdvisory }> = ({ advisory }) => {
  const [open, setOpen] = useState(false);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [layerCm, setLayerCm] = useState("");

  const shrink = useMemo(
    () =>
      computeFinishLayerShrinkage({
        lengthM: parseOptional(length),
        widthM: parseOptional(width),
        wallLayerThicknessCm: parseOptional(layerCm),
      }),
    [length, width, layerCm],
  );

  if (!advisory) {
    return (
      <div className="mx-6 mt-4 border border-border bg-card px-4 py-2 text-[11px] text-muted-foreground" data-testid="authoring-advisory">
        Kaynak yazılım bu kayıt için tespit edilemedi (IFC başlığı okunamadı veya kayıt sunucu kanıtından geldi).
      </div>
    );
  }

  const caution = advisory.tone === "caution";
  return (
    <div
      className={`mx-6 mt-4 border p-4 ${caution ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}
      data-testid="authoring-advisory"
      role="note"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="section-index">KAYNAK YAZILIM · {advisory.family.toUpperCase()}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-wider text-primary underline"
          aria-expanded={open}
        >
          {open ? "Ayrıntıyı gizle" : "Ayrıntıyı göster"}
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{advisory.headline}</p>

      {open && (
        <div className="mt-3 space-y-3">
          <ul className="list-disc pl-4 space-y-1 text-xs text-foreground">
            {advisory.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="text-xs text-foreground">
            <b>Öneri:</b> {advisory.recommendedAction}
          </p>

          <div className="border border-border bg-background p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Katman daralması hesabı (tek oda · kendi ölçünüzle)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Oda boyu (m)", length, setLength],
                ["Oda eni (m)", width, setWidth],
                ["Duvar katmanı (cm)", layerCm, setLayerCm],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="block">
                  <span className="block font-mono text-[10px] text-muted-foreground mb-1">{label as string}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value as string}
                    placeholder="girin"
                    aria-label={label as string}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-right tabular-nums"
                  />
                </label>
              ))}
            </div>
            {shrink && (
              <p className="mt-2 text-xs font-mono tabular-nums text-foreground">
                Net {fmt(shrink.netAreaM2)} m² → modelde {fmt(shrink.modeledFloorAreaM2)} m² (fark{" "}
                {fmt(shrink.differenceM2)} m², %{fmt(shrink.differencePercent)}). Yalnızca bu tek odanın
                aritmetiğidir; proje toplamı için tahmin değildir.
              </p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">{advisory.disclaimer}</p>
        </div>
      )}
    </div>
  );
};
