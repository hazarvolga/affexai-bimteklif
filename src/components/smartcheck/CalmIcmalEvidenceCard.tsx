/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from "react";
import type { CalmIcmalItem, CalmIfcDataset } from "@/ifc/calm-icmal";
import { appliesOpeningDeduction, type summarizeOpeningsMinha } from "@/ifc/openings-minha";
import { openingsAvailability } from "@/ifc/calculation-trace";
import type { useExpertVerification } from "@/hooks/useExpertVerification";
import type { MinhaRuleProfile } from "@/smartcheck/rules/minha";
import { CalculationTraceSection } from "./CalculationTraceSection";
import { ExpertLineVerification } from "./ExpertLineVerification";
import { formatTrNumber } from "./calm-format";
import { publicPozCode } from "./missing-price";

interface CalmIcmalEvidenceCardProps {
  dataset: CalmIfcDataset;
  selectedItem: CalmIcmalItem | undefined;
  expertMode: boolean;
  verification: ReturnType<typeof useExpertVerification>;
  openingsMinha: ReturnType<typeof summarizeOpeningsMinha>;
  minhaProfile: MinhaRuleProfile;
  setMinhaProfile: (value: MinhaRuleProfile) => void;
  customMinhaThresholdInput: string;
  setCustomMinhaThresholdInput: (value: string) => void;
}

/** "Bu rakam nereden geldi?": minha formula, contractual minha profile, openings, storeys and room breakdown of one icmal line. */
export function CalmIcmalEvidenceCard({ dataset, selectedItem, expertMode, verification, openingsMinha, minhaProfile, setMinhaProfile, customMinhaThresholdInput, setCustomMinhaThresholdInput }: CalmIcmalEvidenceCardProps) {
  return (
    <>
      {/* SAĞ: MİNHA VE HESAP KANITI PAFTA KUTUSU ("BU RAKAM NEREDEN GELDİ?") */}
      {selectedItem && (
        <div className="lg:col-span-5 border border-border bg-card p-6 sticky top-20 relative">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
            <span className="section-index">HESAP KANITI · MİNHA DETAYI</span>
            <span className="stamp-badge bg-background text-foreground">
              POZ: {publicPozCode(selectedItem.pozCode) || "Çözülmedi"}
            </span>
          </div>

          <h4 className="mt-3 font-display-serif text-3xl text-foreground">
            {selectedItem.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">{selectedItem.formulaNote}</p>

          {expertMode && (
            <ExpertLineVerification
              item={selectedItem}
              record={verification.records[selectedItem.id]}
              onSave={verification.saveRecord}
            />
          )}
          <CalculationTraceSection item={selectedItem} fileName={dataset.projectTitle} openings={openingsAvailability(dataset.openings)} />

          {/* MİNHA FORMÜL KUTUSU & SÖZLEŞMESEL MİNHA PROFİLİ (KARAR #4) */}
          <div className="mt-5 border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bu Rakam Nereden Geldi? (Brüt − Boşluk = Net)
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <select
                  aria-label="Minha Kural Profili"
                  value={minhaProfile}
                  onChange={(e) => setMinhaProfile(e.target.value as MinhaRuleProfile)}
                  className="border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="CSB_2026">ÇŞB 2026 (sıva/boya: tüm boşluklar)</option>
                  <option value="DIN_18350">DIN 18350 / VOB (2,50 m²)</option>
                  <option value="CUSTOM_CONTRACT">Kullanıcı Tanımlı Eşik (m²)</option>
                </select>
                {minhaProfile === "CUSTOM_CONTRACT" && (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    aria-label="Özel Sözleşme Minha Eşiği m2"
                    value={customMinhaThresholdInput}
                    onChange={(e) => setCustomMinhaThresholdInput(e.target.value)}
                    className="w-16 border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-foreground text-right tabular-nums"
                  />
                )}
              </div>
            </div>
            {!selectedItem.grossAvailable ? (
              <div className="border border-border bg-card p-3 text-xs" data-testid="gross-unavailable">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Net miktar (modelin değeri)</div>
                <div className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">
                  {formatTrNumber(selectedItem.netQuantity)} {selectedItem.unit}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Bu kalem için modelde brüt ve boşluk verisi bulunmuyor; bu yüzden "Brüt − Boşluk" hesabı gösterilmiyor. Hiçbir değer çarpanla üretilmedi.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-3 gap-2 items-center text-center">
              <div className="bg-card p-2.5 border border-border">
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Brüt Miktar</div>
                <div className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                  {formatTrNumber(selectedItem.grossQuantity)} {selectedItem.unit}
                </div>
              </div>
              <div className="bg-primary/10 p-2.5 border border-primary/40">
                <div className="font-mono text-[10px] uppercase text-primary">− Boşluk (Minha)</div>
                <div className="mt-1 font-mono text-sm font-semibold text-primary tabular-nums">
                  −{formatTrNumber(selectedItem.deductedOpeningQuantity)} {selectedItem.unit}
                </div>
              </div>
              <div className="bg-foreground text-background p-2.5 border border-foreground">
                <div className="font-mono text-[10px] uppercase opacity-80">= Net Ödenecek</div>
                <div className="mt-1 font-mono text-sm font-bold tabular-nums">
                  {formatTrNumber(selectedItem.netQuantity)} {selectedItem.unit}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* MODELDEKİ KAPI/PENCERELERE MİNHA UYGULAMASI */}
          {appliesOpeningDeduction(selectedItem.unit) && (
          <div className="mt-4 border border-border bg-background p-4 text-xs" data-testid="openings-minha">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Modeldeki kapı / pencerelere minha ({minhaProfile})
            </div>
            <p className="mb-2 text-[10px] text-muted-foreground">
              {openingsMinha.profile.version} · {openingsMinha.profile.sourceReference} · Etkinlik: {openingsMinha.profile.effective}
            </p>
            {openingsMinha.status === "no_openings" && (
              <p className="text-muted-foreground">
                Bu kayıtta kapı/pencere listesi yok (dosya bu bilgiyi taşımıyor veya kayıt eski). Eşik bu nedenle uygulanamadı.
              </p>
            )}
            {openingsMinha.status === "threshold_required" && (
              <p className="text-muted-foreground">
                Özel şartname için yukarıdaki kutuya eşik (m²) girin; girilmeden hesap yapılmaz.
              </p>
            )}
            {openingsMinha.status === "ok" && (
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Eşik (tekil boşluk alanı)</span><span className="font-mono tabular-nums">{openingsMinha.thresholdM2 ? `${formatTrNumber(openingsMinha.thresholdM2)} m²` : "Yok, tümü düşülür"}</span></div>
                <div className="flex justify-between"><span>Düşülecek ({openingsMinha.deductedCount} adet)</span><span className="font-mono font-semibold tabular-nums">−{formatTrNumber(openingsMinha.deductedAreaM2)} m²</span></div>
                <div className="flex justify-between"><span>Düşülmeyecek ({openingsMinha.notDeductedCount} adet)</span><span className="font-mono tabular-nums">{formatTrNumber(openingsMinha.notDeductedAreaM2)} m²</span></div>
                <div className="flex justify-between text-muted-foreground"><span>{openingsMinha.doorCount} kapı · {openingsMinha.windowCount} pencere</span><span>{openingsMinha.unmeasuredCount > 0 ? `${openingsMinha.unmeasuredCount} boşluğun ölçüsü okunamadı` : "tüm ölçüler okundu"}</span></div>
                <p className="pt-1 text-[11px] text-muted-foreground">
                  {openingsMinha.applicationNote}
                </p>
              </div>
            )}
          </div>
          )}

          {/* KATLARA GÖRE DAĞILIM */}
          <div className="mt-5">
            <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
              <span>Katlara Göre Dağılım</span>
              <span>Net ({selectedItem.unit})</span>
            </div>
            <div className="mt-3 space-y-3">
              {selectedItem.storeyBreakdown.map((st) => {
                const ratio =
                  selectedItem.netQuantity > 0
                    ? Math.min(100, Math.round((st.quantity / selectedItem.netQuantity) * 100))
                    : 0;
                return (
                  <div key={st.storeyLabel} className="text-xs">
                    <div className="flex items-center justify-between text-foreground">
                      <span className="font-medium">{st.storeyLabel}</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatTrNumber(st.quantity)} {selectedItem.unit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-background border border-border overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(4, ratio)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ÖRNEK MAHAL KIRILIMI (YEŞİL DEFTER) */}
          {selectedItem.sampleRooms.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                <span>Örnek Mahal Kırılımı (Yeşil Defter)</span>
                <span>Net ({selectedItem.unit})</span>
              </div>
              <div className="mt-1 divide-y divide-border">
                {selectedItem.sampleRooms.map((rm, idx) => (
                  <div key={`${rm.roomLabel}-${idx}`} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{rm.roomLabel}</div>
                      <div className="text-[11px] text-muted-foreground">{rm.detail}</div>
                    </div>
                    <span className="font-mono font-semibold text-foreground tabular-nums">
                      {formatTrNumber(rm.quantity)} {selectedItem.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 pt-3 border-t border-border flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>KAYNAK: İCMAL KALEMİ POZ ESASI</span>
            <span>MİKTAR: IFC KANITINDAN</span>
          </div>
        </div>
      )}
    </>
  );
}
