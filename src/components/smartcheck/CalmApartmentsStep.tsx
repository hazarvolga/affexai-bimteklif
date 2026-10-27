/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";
import type { CalmIfcDataset } from "@/ifc/calm-icmal";
import type { ApartmentUnitScheduleItem } from "@/ifc/types";
import { resolveApartmentGross, type GrossRatios, type sumResidentialGross } from "@/ifc/apartment-gross";
import { ApartmentSubcontractorShieldCard } from "./ApartmentSubcontractorShieldCard";
import { formatGross, formatTrNumber } from "./calm-format";

interface CalmApartmentsStepProps {
  dataset: CalmIfcDataset;
  grossRatios: GrossRatios;
  grossTotals: ReturnType<typeof sumResidentialGross>;
  selectedApartment: ApartmentUnitScheduleItem | undefined;
  setSelectedUnitCode: (unitCode: string) => void;
  unitRatioInput: string;
  setUnitRatioInput: (value: string) => void;
  generalRatioInput: string;
  setGeneralRatioInput: (value: string) => void;
}

/** Adım 02: daire metrekareleri (bağımsız bölüm cetveli) ve seçili dairenin mahal listesi. */
export function CalmApartmentsStep({ dataset, grossRatios, grossTotals, selectedApartment, setSelectedUnitCode, unitRatioInput, setUnitRatioInput, generalRatioInput, setGeneralRatioInput }: CalmApartmentsStepProps) {
  return (
    <>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SOL: DAİRE TABLOSU */}
        <div className="lg:col-span-7 border border-border bg-background">
          <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-2">
            <div>
              <span className="section-index">02 / BAĞIMSIZ BÖLÜM CETVELİ</span>
              <h3 className="font-display-serif text-2xl text-foreground mt-0.5">
                Bağımsız Bölüm (Daire) Alan İcmali
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arsa sahibi paylaşım tablosu, satış broşürü ve daire bazlı şerefiye kontrolü
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3" data-testid="gross-ratio-inputs">
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Daire brüt / net katsayısı</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Daire brüt net katsayısı"
                    value={unitRatioInput}
                    placeholder="örn. 1,15"
                    onChange={(e) => setUnitRatioInput(e.target.value)}
                    className="w-24 border border-border bg-card px-2 py-1 text-xs font-mono text-right tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Genel brüt / net katsayısı</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Genel brüt net katsayısı"
                    value={generalRatioInput}
                    placeholder="örn. 1,30"
                    onChange={(e) => setGeneralRatioInput(e.target.value)}
                    className="w-24 border border-border bg-card px-2 py-1 text-xs font-mono text-right tabular-nums"
                  />
                </label>
                <span className="text-[10px] text-muted-foreground max-w-xs">
                  IFC mahal cetvelinde brüt alan (duvar kalınlığı, ortak alan payı) yoktur. Katsayıyı proje mimarınızdan alıp girin; girmezseniz brüt hesaplanmaz.
                </span>
              </div>
            </div>
            <span className="stamp-badge bg-background text-muted-foreground">
              Oda listesi için daireye tıklayın →
            </span>
          </div>

          <div className="grid grid-cols-12 px-6 py-2.5 bg-card border-b border-foreground/70 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Daire / Bağımsız Bölüm</div>
            <div className="col-span-2 text-right">Net Süpürülebilir</div>
            <div className="col-span-2 text-right">+ Balkonlar</div>
            <div className="col-span-3 text-right">Genel Brüt (+Ortak)</div>
          </div>

          <div className="divide-y divide-border max-h-[620px] overflow-y-auto">
            {dataset.apartments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Bu dosyada daire/mahal cetveli oluşturmak için yeterli bilgi bulunamadı (modelde bağımsız bölüm veya mahal tanımı yok). Bu, dairenin olmadığı anlamına gelmez. Yapısal ve kaplama metrajları <b>1. Malzeme İcmal Listesi</b> sekmesindedir.
              </div>
            ) : (
              dataset.apartments.map((apt) => {
                const isSelected = selectedApartment?.unitCode === apt.unitCode;
                return (
                  <button
                    key={apt.unitCode}
                    type="button"
                    onClick={() => setSelectedUnitCode(apt.unitCode)}
                    className={`w-full text-left grid grid-cols-12 items-center px-6 py-3 transition-colors border-l-[3px] ${
                      isSelected
                        ? "border-l-primary bg-primary/10 pl-[21px]"
                        : "border-l-transparent hover:bg-card/50"
                    }`}
                  >
                    <div className="col-span-5 pr-2">
                      <div
                        className={`text-sm ${
                          isSelected ? "font-bold text-primary" : "font-semibold text-foreground"
                        }`}
                      >
                        {apt.unitLabel}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {apt.storey} · {apt.roomCount} Mahal
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-mono text-sm font-semibold text-foreground tabular-nums">
                      {formatTrNumber(apt.netSweepableM2)} m²
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {apt.balconyM2 > 0 ? `+${formatTrNumber(apt.balconyM2)} m²` : "—"}
                    </div>
                    <div
                      className={`col-span-3 text-right font-mono text-sm font-semibold tabular-nums ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {formatGross(resolveApartmentGross(apt, grossRatios).generalGrossM2)} m²
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ALT TOPLAM ŞERİDİ */}
          <div className="grid grid-cols-12 items-center px-6 py-3.5 bg-foreground text-background text-xs font-semibold">
            <div className="col-span-5 font-mono uppercase tracking-wider text-[11px]">
              TOPLAM ({dataset.residentialUnitCount} Konut Bağımsız Bölüm)
            </div>
            <div className="col-span-2 text-right font-mono tabular-nums">
              {formatTrNumber(dataset.totalNetSweepableM2)} m²
            </div>
            <div className="col-span-2 text-right font-mono opacity-85 tabular-nums">
              +{formatTrNumber(dataset.totalBalconyM2)} m²
            </div>
            <div className="col-span-3 text-right font-mono font-bold tabular-nums">
              {formatGross(grossTotals.totalGeneralGrossM2)} m²
            </div>
          </div>
        </div>

        {/* SAĞ: SEÇİLİ DAİRE MAHAL LİSTESİ */}
        {selectedApartment && (
          <div className="lg:col-span-5 border border-border bg-card p-6 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="section-index">MAHAL CETVELİ · ODA DETAYI</span>
              <span className="stamp-badge bg-background text-foreground">
                IfcZone: {selectedApartment.unitCode}
              </span>
            </div>

            <h4 className="mt-3 font-display-serif text-3xl text-foreground">
              {selectedApartment.unitLabel}
            </h4>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {selectedApartment.storey} · {selectedApartment.roomCount} Mahal
            </p>

            {/* DAİRE ALAN ÖZET KUTUSU */}
            <div className="mt-4 border border-border bg-background p-3.5 grid grid-cols-3 gap-2 text-center">
              <div className="bg-card p-2.5 border border-border">
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Net Süpürülebilir</div>
                <div className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                  {formatTrNumber(selectedApartment.netSweepableM2)} m²
                </div>
              </div>
              <div className="bg-card p-2.5 border border-border">
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Daire Brüt</div>
                <div className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                  {formatGross(resolveApartmentGross(selectedApartment, grossRatios).unitGrossM2)} m²
                </div>
              </div>
              <div className="bg-primary/10 p-2.5 border border-primary/40">
                <div className="font-mono text-[10px] uppercase font-semibold text-primary">Genel Brüt</div>
                <div className="mt-1 font-mono text-sm font-bold text-primary tabular-nums">
                  {formatGross(resolveApartmentGross(selectedApartment, grossRatios).generalGrossM2)} m²
                </div>
              </div>
            </div>

            {/* ODA ODA LİSTE */}
            <div className="mt-5">
              <div className="grid grid-cols-12 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-5">Mahal / Oda</div>
                <div className="col-span-4">Zemin Kaplaması</div>
                <div className="col-span-3 text-right">Net Alan</div>
              </div>
              <div className="divide-y divide-border">
                {selectedApartment.rooms.map((rm) => (
                  <div key={rm.code} className="py-2.5 grid grid-cols-12 items-center text-xs">
                    <div className="col-span-5 pr-2">
                      <div className="font-semibold text-foreground">{rm.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{rm.code}</div>
                    </div>
                    <div className="col-span-4 text-muted-foreground pr-2">{rm.floorFinish}</div>
                    <div className="col-span-3 text-right font-mono font-semibold text-foreground tabular-nums">
                      {formatTrNumber(rm.netAreaM2)} m²
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ApartmentSubcontractorShieldCard
              key={selectedApartment.unitCode}
              apartment={selectedApartment}
            />
          </div>
        )}
      </div>
    </>
  );
}
