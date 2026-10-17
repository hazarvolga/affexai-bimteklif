import React, { useMemo, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, ArrowRight, Layers, Building2, Calculator, SlidersHorizontal, Upload } from "lucide-react";
import type { CalmIcmalItem, CalmIfcDataset } from "@/ifc/calm-icmal";
import type { ApartmentUnitScheduleItem } from "@/ifc/types";

export interface CalmIfcWorkspaceProps {
  dataset: CalmIfcDataset;
  onTransferToQuote?: (items: Array<{ id: string; title: string; pozCode: string; unit: string; quantity: number; unitPrice: number }>) => void;
  onToggleTechnicalView?: () => void;
  showTechnicalToggle?: boolean;
  technicalViewOpen?: boolean;
  onResetOrNewFile?: () => void;
}

type CalmStep = "icmal" | "daireler" | "maliyet";

function formatTrNumber(val: number, decimals = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(val) ? val : 0);
}

function formatTrCurrency(val: number): string {
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number.isFinite(val) ? val : 0)) + " ₺"
  );
}

export const CalmIfcWorkspace: React.FC<CalmIfcWorkspaceProps> = ({
  dataset,
  onTransferToQuote,
  onToggleTechnicalView,
  showTechnicalToggle = false,
  technicalViewOpen = false,
  onResetOrNewFile,
}) => {
  const allItems = useMemo(() => dataset.groups.flatMap((g) => g.items), [dataset.groups]);

  const [activeStep, setActiveStep] = useState<CalmStep>("icmal");
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const fayans = allItems.find((i) => i.id === "duvar-fayans");
    return fayans?.id || allItems[0]?.id || "";
  });
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    () => dataset.apartments[0]?.unitCode || "D01",
  );
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of allItems) {
      initial[item.id] = item.defaultUnitPriceTry;
    }
    return initial;
  });
  const [overheadPercent, setOverheadPercent] = useState<number>(15);

  const selectedItem: CalmIcmalItem | undefined = useMemo(
    () => allItems.find((it) => it.id === selectedItemId) || allItems[0],
    [allItems, selectedItemId],
  );

  const selectedApartment: ApartmentUnitScheduleItem | undefined = useMemo(
    () => dataset.apartments.find((u) => u.unitCode === selectedUnitCode) || dataset.apartments[0],
    [dataset.apartments, selectedUnitCode],
  );

  const costSummary = useMemo(() => {
    const groupTotals = dataset.groups.map((grp) => {
      const subtotal = grp.items.reduce((sum, it) => {
        const price = unitPrices[it.id] ?? it.defaultUnitPriceTry;
        return sum + it.netQuantity * price;
      }, 0);
      return {
        key: grp.key,
        title: grp.title,
        subtotal,
      };
    });
    const directTotal = groupTotals.reduce((s, g) => s + g.subtotal, 0);
    const overheadAmount = directTotal * (overheadPercent / 100);
    const grandTotal = directTotal + overheadAmount;
    const perApartment = dataset.residentialUnitCount > 0 ? grandTotal / dataset.residentialUnitCount : grandTotal;
    const perGrossM2 = dataset.totalGeneralGrossM2 > 0 ? grandTotal / dataset.totalGeneralGrossM2 : 0;

    return {
      groupTotals,
      directTotal,
      overheadAmount,
      grandTotal,
      perApartment,
      perGrossM2,
    };
  }, [dataset.groups, dataset.residentialUnitCount, dataset.totalGeneralGrossM2, overheadPercent, unitPrices]);

  const handleDownloadCsv = () => {
    const lines: string[] = [];
    lines.push("BOLUM;GRUP_VEYA_DAIRE;POZ_KODU;IMALAT_VEYA_ODA_ADI;BRUT_MIKTAR;MINHA_BOSLUK;NET_MIKTAR;BIRIM;BIRIM_FIYAT_TL;TOPLAM_TUTAR_TL");
    for (const grp of dataset.groups) {
      for (const item of grp.items) {
        const price = unitPrices[item.id] ?? item.defaultUnitPriceTry;
        const total = Math.round(item.netQuantity * price);
        lines.push(
          [
            "1_MALZEME_ICMALI",
            grp.title,
            item.pozCode,
            item.title,
            formatTrNumber(item.grossQuantity),
            formatTrNumber(item.deductedOpeningQuantity),
            formatTrNumber(item.netQuantity),
            item.unit,
            String(price),
            String(total),
          ].join(";"),
        );
      }
    }
    for (const apt of dataset.apartments) {
      lines.push(
        [
          "2_DAIRE_ICMAL",
          apt.storey,
          apt.unitCode,
          apt.unitLabel,
          formatTrNumber(apt.generalGrossM2),
          formatTrNumber(apt.balconyM2),
          formatTrNumber(apt.netSweepableM2),
          "m²",
          "",
          "",
        ].join(";"),
      );
      for (const rm of apt.rooms) {
        lines.push(
          [
            "2_DAIRE_ODA_DETAY",
            apt.unitLabel,
            rm.code,
            `${rm.name} (${rm.floorFinish})`,
            formatTrNumber(rm.netAreaM2),
            "0,00",
            formatTrNumber(rm.netAreaM2),
            "m²",
            "",
            "",
          ].join(";"),
        );
      }
    }
    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset.projectTitle.replace(/[^a-zA-Z0-9_-]+/g, "_")}_Metraj_ve_Daire_Icmali.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTransferClick = () => {
    if (activeStep !== "maliyet") {
      setActiveStep("maliyet");
      return;
    }
    if (onTransferToQuote) {
      onTransferToQuote(
        allItems.map((it) => ({
          id: it.id,
          title: it.title,
          pozCode: it.pozCode,
          unit: it.unit,
          quantity: it.netQuantity,
          unitPrice: unitPrices[it.id] ?? it.defaultUnitPriceTry,
        })),
      );
    } else {
      handleDownloadCsv();
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-900 shadow-sm overflow-hidden">
      {/* SINGLE CALM TOP BAR */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
              BIM → Net İcmal
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Katmanlar & Minha Doğrulandı
            </span>
          </div>
          <h2 className="mt-1 text-base font-bold text-slate-900 truncate">{dataset.projectTitle}</h2>
          <p className="text-xs text-slate-500">{dataset.projectSubtitle}</p>
        </div>

        {/* 3-STEP SEGMENTED SWITCHER */}
        <div
          role="tablist"
          aria-label="Metraj ve Maliyet Adımları"
          className="inline-flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeStep === "icmal"}
            onClick={() => setActiveStep("icmal")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              activeStep === "icmal"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            1. Malzeme İcmal Listesi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeStep === "daireler"}
            onClick={() => setActiveStep("daireler")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              activeStep === "daireler"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            2. Daire Metrekareleri ({dataset.residentialUnitCount} Daire)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeStep === "maliyet"}
            onClick={() => setActiveStep("maliyet")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              activeStep === "maliyet"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            3. Maliyet & Teklif
          </button>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          {onResetOrNewFile && (
            <button
              type="button"
              onClick={onResetOrNewFile}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title="Başka bir IFC, Excel veya PDF dosyası yükle"
            >
              <Upload className="w-3.5 h-3.5 text-orange-600" />
              Yeni Dosya Yükle
            </button>
          )}
          {showTechnicalToggle && onToggleTechnicalView && (
            <button
              type="button"
              onClick={onToggleTechnicalView}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                technicalViewOpen
                  ? "border-blue-300 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Mühendislik / e-PYS EK-9 & Ham IFC STEP Denetim Görünümü"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {technicalViewOpen ? "Denetim Görünümünü Gizle" : "e-PYS & Denetim"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel İndir (.csv)
          </button>
          <button
            type="button"
            onClick={handleTransferClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            {activeStep === "maliyet" ? (
              <>
                <Download className="w-3.5 h-3.5" />
                {onTransferToQuote ? "Teklif Sihirbazına Aktar" : "Teklif İcmalini İndir"}
              </>
            ) : (
              <>
                Fiyatlandır & Teklif Oluştur
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* STEP 1: MALZEME İCMAL LİSTESİ (LEFT PAPER SHEET + RIGHT INSPECTOR CARD) */}
      {activeStep === "icmal" && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: CLEAN PAPER SHEET (3 COLUMNS ONLY) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">İnşaat İmalat İcmal Listesi</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kapı ve pencere boşlukları (minha) düşülmüş, çoklu katmanları ayrıştırılmış net metrajlar
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Detay için satıra tıklayın →
              </span>
            </div>

            {/* Table Column Header */}
            <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-8">İmalat Kalemi</div>
              <div className="col-span-3 text-right">Net Miktar</div>
              <div className="col-span-1 text-right">Birim</div>
            </div>

            <div className="divide-y divide-slate-100">
              {dataset.groups.map((grp) => (
                <React.Fragment key={grp.key}>
                  {/* Group Subheader */}
                  <div className="px-6 py-2 bg-slate-50/90 border-y border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {grp.title}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{grp.unitLabel}</span>
                  </div>

                  {grp.items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`w-full text-left grid grid-cols-12 items-center px-6 py-3.5 transition-colors ${
                          isSelected
                            ? "bg-blue-50/90 border-l-4 border-l-blue-600 pl-5"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="col-span-8 pr-3">
                          <div
                            className={`text-sm ${
                              isSelected ? "font-bold text-blue-950" : "font-semibold text-slate-900"
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.subtitle}</div>
                        </div>
                        <div
                          className={`col-span-3 text-right font-mono text-base font-bold tabular-nums ${
                            isSelected ? "text-blue-700" : "text-slate-900"
                          }`}
                        >
                          {formatTrNumber(item.netQuantity)}
                        </div>
                        <div className="col-span-1 text-right text-xs font-semibold text-slate-500">
                          {item.unit}
                        </div>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* RIGHT: CALM INSPECTOR CARD ("BU RAKAM NEREDEN GELDİ?") */}
          {selectedItem && (
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-6 sticky top-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Seçili Kalem Detayı
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 border border-slate-200">
                  Poz: {selectedItem.pozCode}
                </span>
              </div>

              <h4 className="mt-2 text-lg font-bold text-slate-900">{selectedItem.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{selectedItem.formulaNote}</p>

              {/* FORMULA EQUATION BOX */}
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Bu Rakam Nereden Geldi? (Minha Hesabı)
                </div>
                <div className="grid grid-cols-3 gap-2 items-center text-center">
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                    <div className="text-[11px] text-slate-500">Brüt Miktar</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-slate-800 tabular-nums">
                      {formatTrNumber(selectedItem.grossQuantity)} {selectedItem.unit}
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50/70 p-2.5 border border-red-200/70">
                    <div className="text-[11px] text-red-700">− Boşluk (Minha)</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-red-700 tabular-nums">
                      −{formatTrNumber(selectedItem.deductedOpeningQuantity)} {selectedItem.unit}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50/80 p-2.5 border border-emerald-200">
                    <div className="text-[11px] font-semibold text-emerald-800">= Net Ödenecek</div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-emerald-700 tabular-nums">
                      {formatTrNumber(selectedItem.netQuantity)} {selectedItem.unit}
                    </div>
                  </div>
                </div>
              </div>

              {/* STOREY BREAKDOWN */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
                  <span>Katlara Göre Dağılım</span>
                  <span>Net ({selectedItem.unit})</span>
                </div>
                <div className="mt-2 space-y-2.5">
                  {selectedItem.storeyBreakdown.map((st) => {
                    const ratio =
                      selectedItem.netQuantity > 0
                        ? Math.min(100, Math.round((st.quantity / selectedItem.netQuantity) * 100))
                        : 0;
                    return (
                      <div key={st.storeyLabel} className="text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium">{st.storeyLabel}</span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatTrNumber(st.quantity)} {selectedItem.unit}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.max(4, ratio)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAMPLE GREEN BOOK ROOMS */}
              {selectedItem.sampleRooms.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
                    <span>Örnek Mahal Kırılımı (Yeşil Defter)</span>
                    <span>Net ({selectedItem.unit})</span>
                  </div>
                  <div className="mt-2 divide-y divide-slate-100">
                    {selectedItem.sampleRooms.map((rm, idx) => (
                      <div key={`${rm.roomLabel}-${idx}`} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{rm.roomLabel}</div>
                          <div className="text-[11px] text-slate-500">{rm.detail}</div>
                        </div>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatTrNumber(rm.quantity)} {selectedItem.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: DAİRE METREKARELERİ (16 BAĞIMSIZ BÖLÜM) */}
      {activeStep === "daireler" && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: APARTMENT SCHEDULE SHEET */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bağımsız Bölüm (Daire) Alan İcmali
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arsa sahibi paylaşım tablosu, satış broşürü ve daire bazlı şerefiye kontrolü
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Oda listesi için daireye tıklayın →
              </span>
            </div>

            <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-5">Daire / Bağımsız Bölüm</div>
              <div className="col-span-2 text-right">Net Süpürülebilir</div>
              <div className="col-span-2 text-right">+ Balkonlar</div>
              <div className="col-span-3 text-right">Genel Brüt (+Ortak)</div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {dataset.apartments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Bu IFC modelinde tanımlı bağımsız bölüm / mahal (IfcZone / IfcSpace) bulunamadı. Tüm yapısal ve kaplama metrajlarını <b>1. Malzeme İcmal Listesi</b> sekmesinden inceleyebilirsiniz.
                </div>
              ) : (
                dataset.apartments.map((apt) => {
                  const isSelected = selectedApartment?.unitCode === apt.unitCode;
                  return (
                    <button
                      key={apt.unitCode}
                      type="button"
                      onClick={() => setSelectedUnitCode(apt.unitCode)}
                      className={`w-full text-left grid grid-cols-12 items-center px-6 py-3 transition-colors ${
                        isSelected
                          ? "bg-blue-50/90 border-l-4 border-l-blue-600 pl-5"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="col-span-5 pr-2">
                        <div
                          className={`text-sm ${
                            isSelected ? "font-bold text-blue-950" : "font-semibold text-slate-900"
                          }`}
                        >
                          {apt.unitLabel}
                        </div>
                        <div className="text-xs text-slate-500">
                          {apt.storey} · {apt.roomCount} Mahal
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatTrNumber(apt.netSweepableM2)} m²
                      </div>
                      <div className="col-span-2 text-right font-mono text-xs font-semibold text-slate-600 tabular-nums">
                        {apt.balconyM2 > 0 ? `+${formatTrNumber(apt.balconyM2)} m²` : "—"}
                      </div>
                      <div
                        className={`col-span-3 text-right font-mono text-sm font-bold tabular-nums ${
                          isSelected ? "text-blue-700" : "text-slate-800"
                        }`}
                      >
                        {formatTrNumber(apt.generalGrossM2)} m²
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* FOOTER TOTALS FOR 16 APARTMENTS */}
            <div className="grid grid-cols-12 items-center px-6 py-3.5 bg-slate-900 text-white text-xs font-bold">
              <div className="col-span-5">
                TOPLAM ({dataset.residentialUnitCount} Konut Bağımsız Bölüm)
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums">
                {formatTrNumber(dataset.totalNetSweepableM2)} m²
              </div>
              <div className="col-span-2 text-right font-mono text-emerald-300 tabular-nums">
                +{formatTrNumber(dataset.totalBalconyM2)} m²
              </div>
              <div className="col-span-3 text-right font-mono text-amber-300 tabular-nums">
                {formatTrNumber(dataset.totalGeneralGrossM2)} m²
              </div>
            </div>
          </div>

          {/* RIGHT: SELECTED APARTMENT ROOM SCHEDULE */}
          {selectedApartment && (
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-6 sticky top-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Seçili Bağımsız Bölüm
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 border border-slate-200">
                  IfcZone: {selectedApartment.unitCode}
                </span>
              </div>

              <h4 className="mt-1.5 text-lg font-bold text-slate-900">{selectedApartment.unitLabel}</h4>
              <p className="text-xs text-slate-500">
                {selectedApartment.storey} · {selectedApartment.roomCount} Mahal
              </p>

              {/* APARTMENT AREA SUMMARY BOX */}
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                  <div className="text-[11px] text-slate-500">Net Süpürülebilir</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatTrNumber(selectedApartment.netSweepableM2)} m²
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200/80">
                  <div className="text-[11px] text-slate-500">Daire Brüt (Balkonlu)</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatTrNumber(selectedApartment.unitGrossM2)} m²
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50/80 p-2.5 border border-blue-200">
                  <div className="text-[11px] font-semibold text-blue-800">Genel Brüt</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-blue-700 tabular-nums">
                    {formatTrNumber(selectedApartment.generalGrossM2)} m²
                  </div>
                </div>
              </div>

              {/* ROOM BY ROOM LIST */}
              <div className="mt-5">
                <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
                  <div className="col-span-5">Mahal / Oda</div>
                  <div className="col-span-4">Zemin Kaplaması</div>
                  <div className="col-span-3 text-right">Net Alan</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedApartment.rooms.map((rm) => (
                    <div key={rm.code} className="py-2.5 grid grid-cols-12 items-center text-xs">
                      <div className="col-span-5 pr-2">
                        <div className="font-semibold text-slate-800">{rm.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{rm.code}</div>
                      </div>
                      <div className="col-span-4 text-slate-600 pr-2">{rm.floorFinish}</div>
                      <div className="col-span-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatTrNumber(rm.netAreaM2)} m²
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: MALİYET & TEKLİF (EDITABLE UNIT PRICES + GRAND TOTAL CARD) */}
      {activeStep === "maliyet" && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: PRICING SHEET */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Birim Fiyat ve Maliyet Cetveli</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Taşeron veya piyasa birim fiyatlarını girerek anında yaklaşık maliyet ve teklif oluşturun
                </p>
              </div>
              <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Birim fiyat kutuları düzenlenebilir
              </span>
            </div>

            <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-5">İmalat Kalemi</div>
              <div className="col-span-2 text-right">Net Miktar</div>
              <div className="col-span-2 text-right">Birim Fiyat (₺)</div>
              <div className="col-span-3 text-right">Toplam Tutar</div>
            </div>

            <div className="divide-y divide-slate-100">
              {dataset.groups.map((grp) => (
                <React.Fragment key={grp.key}>
                  <div className="px-6 py-2 bg-slate-50/90 border-y border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {grp.title}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-600">
                      Grup Toplamı:{" "}
                      {formatTrCurrency(
                        grp.items.reduce(
                          (s, it) => s + it.netQuantity * (unitPrices[it.id] ?? it.defaultUnitPriceTry),
                          0,
                        ),
                      )}
                    </span>
                  </div>

                  {grp.items.map((item) => {
                    const price = unitPrices[item.id] ?? item.defaultUnitPriceTry;
                    const lineTotal = item.netQuantity * price;
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 items-center px-6 py-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="col-span-5 pr-3">
                          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="text-[11px] font-mono text-slate-400">Poz: {item.pozCode}</div>
                        </div>
                        <div className="col-span-2 text-right font-mono text-xs font-semibold text-slate-700 tabular-nums">
                          {formatTrNumber(item.netQuantity)} {item.unit}
                        </div>
                        <div className="col-span-2 flex justify-end pl-2">
                          <input
                            type="number"
                            min={0}
                            step={10}
                            aria-label={`${item.title} birim fiyatı`}
                            value={price}
                            onChange={(e) => {
                              const next = parseFloat(e.target.value);
                              setUnitPrices((prev) => ({
                                ...prev,
                                [item.id]: Number.isFinite(next) && next >= 0 ? next : 0,
                              }));
                            }}
                            className="w-24 rounded-md border border-blue-300 bg-blue-50/40 px-2.5 py-1 text-right font-mono text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none tabular-nums"
                          />
                        </div>
                        <div className="col-span-3 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {formatTrCurrency(lineTotal)}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* RIGHT: EXECUTIVE QUOTE SUMMARY CARD */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-6 sticky top-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Teklif Özeti
            </span>
            <h4 className="mt-1 text-lg font-bold text-slate-900">Yaklaşık Maliyet & Teklif İcmali</h4>
            <p className="text-xs text-slate-500">
              {dataset.residentialUnitCount} Daire + Ortak Alanlar · KDV Hariç Net İmalat Maliyeti
            </p>

            <div className="mt-4 divide-y divide-slate-100 border-t border-b border-slate-200">
              {costSummary.groupTotals.map((gt) => (
                <div key={gt.key} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{gt.title}</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {formatTrCurrency(gt.subtotal)}
                  </span>
                </div>
              ))}
              <div className="py-2.5 flex items-center justify-between text-xs bg-slate-50/70 px-2 rounded">
                <span className="font-semibold text-slate-800">İmalat Ara Toplamı</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatTrCurrency(costSummary.directTotal)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">Müteahhitlik Kârı & Genel Gider (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-label="Müteahhitlik Kârı Yüzdesi"
                    value={overheadPercent}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setOverheadPercent(Number.isFinite(v) && v >= 0 ? v : 0);
                    }}
                    className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-900"
                  />
                </div>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  {formatTrCurrency(costSummary.overheadAmount)}
                </span>
              </div>
            </div>

            {/* DARK NAVY GRAND TOTAL CARD */}
            <div className="mt-5 rounded-xl bg-slate-900 text-white p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Genel Toplam (KDV Hariç)
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-400 tabular-nums">
                {formatTrCurrency(costSummary.grandTotal)}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">Daire Başı Ortalama ({dataset.residentialUnitCount} Daire)</div>
                  <div className="mt-0.5 font-mono font-bold text-white tabular-nums">
                    {formatTrCurrency(costSummary.perApartment)} / Daire
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">m² Başı Maliyet ({formatTrNumber(dataset.totalGeneralGrossM2, 0)} m²)</div>
                  <div className="mt-0.5 font-mono font-bold text-white tabular-nums">
                    {formatTrCurrency(costSummary.perGrossM2)} / m²
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={handleTransferClick}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                {onTransferToQuote
                  ? "Fiyatlandırılmış Kalemleri Teklif Sihirbazına Aktar"
                  : "Fiyatlandırılmış İcmal Tablosunu İndir (.csv)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
