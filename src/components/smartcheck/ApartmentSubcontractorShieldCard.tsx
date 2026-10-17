import React, { useMemo, useState } from "react";
import type { ApartmentUnitScheduleItem } from "@/ifc/types";
import {
  computeApartmentSubcontractorShield,
  type ClaimCheck,
} from "@/ifc/apartment-subcontractor-shield";

function fmt(val: number | null, decimals = 2): string {
  if (val === null || !Number.isFinite(val)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

function parseOptional(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

const inputClass =
  "w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground text-right tabular-nums focus:border-primary focus:outline-none";

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {props.label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={props.value}
        placeholder={props.placeholder ?? "girin"}
        onChange={(e) => props.onChange(e.target.value)}
        className={inputClass}
        aria-label={props.label}
      />
    </label>
  );
}

function ClaimBadge({ check }: { check: ClaimCheck }) {
  if (check.status === "not_declared") {
    return <span className="font-mono text-[10px] text-muted-foreground">beyan girilmedi</span>;
  }
  if (check.status === "exceeds_ceiling") {
    return (
      <span className="stamp-badge bg-destructive/10 text-destructive border-destructive/40">
        TAVAN AŞILDI · +{fmt(check.excessM2)} m²
      </span>
    );
  }
  return (
    <span className="stamp-badge bg-primary/10 text-primary border-primary/40">TAVAN İÇİNDE</span>
  );
}

export const ApartmentSubcontractorShieldCard: React.FC<{
  apartment: ApartmentUnitScheduleItem;
}> = ({ apartment }) => {
  // Sıfır varsayılan: kalınlık, dozaj, fire ve beyanlar kullanıcıdan gelir.
  const [screedCm, setScreedCm] = useState("");
  const [plasterCm, setPlasterCm] = useState("");
  const [wallArea, setWallArea] = useState("");
  const [openingArea, setOpeningArea] = useState("");
  const [cementKg, setCementKg] = useState("");
  const [waste, setWaste] = useState("");
  const [tolerance, setTolerance] = useState("");
  const [claimScreed, setClaimScreed] = useState("");
  const [claimPlaster, setClaimPlaster] = useState("");
  const [claimFloor, setClaimFloor] = useState("");

  const result = useMemo(
    () =>
      computeApartmentSubcontractorShield({
        apartment,
        screedThicknessCm: parseOptional(screedCm),
        plasterThicknessCm: parseOptional(plasterCm),
        wallPlasterAreaM2: parseOptional(wallArea),
        wallOpeningDeductionM2: parseOptional(openingArea),
        cementKgPerM3: parseOptional(cementKg),
        wastePercent: parseOptional(waste),
        tolerancePercent: parseOptional(tolerance),
        claims: {
          screedM2: parseOptional(claimScreed),
          plasterM2: parseOptional(claimPlaster),
          floorFinishM2: parseOptional(claimFloor),
        },
      }),
    [
      apartment,
      screedCm,
      plasterCm,
      wallArea,
      openingArea,
      cementKg,
      waste,
      tolerance,
      claimScreed,
      claimPlaster,
      claimFloor,
    ],
  );

  return (
    <div className="mt-6 border border-border bg-background p-4" data-testid="subcontractor-shield">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
        <span className="section-index">TAŞERON HAKEDİŞ KALKANI</span>
        <span className="stamp-badge bg-background text-foreground">{apartment.unitLabel}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Bu dairenin IFC mahal cetvelinden hakediş tavanı. Kalınlık, dozaj, fire ve taşeron beyanı
        sizin girdinizdir; girmediğiniz değer için hesap yapılmaz.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Şap kalınlığı (cm)" value={screedCm} onChange={setScreedCm} placeholder="örn. 3 / 5" />
        <Field label="Sıva kalınlığı (cm)" value={plasterCm} onChange={setPlasterCm} placeholder="örn. 2 / 3 / 5" />
        <Field label="Brüt duvar sıva alanı (m²)" value={wallArea} onChange={setWallArea} />
        <Field label="Boşluk düşümü (m²)" value={openingArea} onChange={setOpeningArea} />
        <Field label="Çimento dozajı (kg/m³)" value={cementKg} onChange={setCementKg} />
        <Field label="Fire (%)" value={waste} onChange={setWaste} placeholder="boş = 0" />
      </div>

      <div className="mt-4 divide-y divide-border border border-border bg-card text-xs">
        <div className="grid grid-cols-12 px-3 py-2 items-center">
          <div className="col-span-6 font-semibold">Şap tavanı</div>
          <div className="col-span-3 text-right font-mono tabular-nums">{fmt(result.screedAreaM2)} m²</div>
          <div className="col-span-3 text-right font-mono tabular-nums">{fmt(result.screedVolumeWithWasteM3, 3)} m³</div>
        </div>
        <div className="grid grid-cols-12 px-3 py-2 items-center">
          <div className="col-span-6 font-semibold">Sıva tavanı (net)</div>
          <div className="col-span-3 text-right font-mono tabular-nums">{fmt(result.plasterNetAreaM2)} m²</div>
          <div className="col-span-3 text-right font-mono tabular-nums">{fmt(result.plasterVolumeWithWasteM3, 3)} m³</div>
        </div>
        <div className="grid grid-cols-12 px-3 py-2 items-center">
          <div className="col-span-6 font-semibold">Çimento (şap + sıva)</div>
          <div className="col-span-6 text-right font-mono tabular-nums">
            {result.screedCementKg === null && result.plasterCementKg === null
              ? "—"
              : `${fmt((result.screedCementKg ?? 0) + (result.plasterCementKg ?? 0), 0)} kg`}
          </div>
        </div>
      </div>

      {result.floorFinishLines.length > 0 && (
        <div className="mt-3 text-xs">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
            Zemin kaplaması tavanı (türe göre)
          </div>
          <div className="divide-y divide-border">
            {result.floorFinishLines.map((l) => (
              <div key={l.floorFinish} className="py-1.5 flex items-center justify-between">
                <span>
                  {l.floorFinish} <span className="text-muted-foreground">· {l.roomCount} mahal</span>
                </span>
                <span className="font-mono tabular-nums">{fmt(l.areaM2)} m²</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Taşeron beyanı kontrolü
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Beyan: şap (m²)" value={claimScreed} onChange={setClaimScreed} />
          <Field label="Beyan: sıva (m²)" value={claimPlaster} onChange={setClaimPlaster} />
          <Field label="Beyan: zemin kaplaması (m²)" value={claimFloor} onChange={setClaimFloor} />
          <Field label="Kabul toleransı (%)" value={tolerance} onChange={setTolerance} placeholder="boş = 0" />
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between"><span>Şap</span><ClaimBadge check={result.claimChecks.screed} /></div>
          <div className="flex items-center justify-between"><span>Sıva</span><ClaimBadge check={result.claimChecks.plaster} /></div>
          <div className="flex items-center justify-between"><span>Zemin kaplaması</span><ClaimBadge check={result.claimChecks.floorFinish} /></div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
