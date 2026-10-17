import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, ArrowRight, SlidersHorizontal, Upload } from "lucide-react";
import type { CalmIcmalItem, CalmIfcDataset } from "@/ifc/calm-icmal";
import type { ApartmentUnitScheduleItem } from "@/ifc/types";
import { evaluateKikAbnormallyLowBid, type KikWorkCategory } from "@/lib/kik-adt";
import { parseContainerIdentity } from "@/smartcheck/rules/iso19650";

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

  const [kikWorkCategory, setKikWorkCategory] = useState<KikWorkCategory>("ust_yapi");
  const [tenderYmInput, setTenderYmInput] = useState<string>("");
  const [tenderBidsInput, setTenderBidsInput] = useState<string>("");

  const isoContainerIdentity = useMemo(
    () => parseContainerIdentity(dataset.projectTitle),
    [dataset.projectTitle],
  );

  const kikAdtAnalysis = useMemo(() => {
    const parsedYm = Number(tenderYmInput.replace(/\./g, "").replace(",", ".").trim());
    const validYm = Number.isFinite(parsedYm) && parsedYm > 0 ? parsedYm : null;
    const ourBid = Math.max(0, Math.round(costSummary.grandTotal));
    const parsedCompetitorBids = tenderBidsInput
      .split(/[;\n]+|(?:\s+)/)
      .flatMap((token) => token.split(","))
      .map((raw) => Number(raw.replace(/\./g, "").trim()))
      .filter((v) => Number.isFinite(v) && v > 0);
    const sessionBids =
      validYm && parsedCompetitorBids.length > 0 ? [ourBid, ...parsedCompetitorBids] : [];

    return evaluateKikAbnormallyLowBid({
      estimatedCostTry: validYm,
      validBidsTry: sessionBids,
      ourBidTry: ourBid,
      workCategory: kikWorkCategory,
      lineItems: allItems.map((it) => ({
        id: it.id,
        code: it.pozCode,
        description: it.title,
        totalAmount: Math.round(it.netQuantity * (unitPrices[it.id] ?? it.defaultUnitPriceTry)),
      })),
    });
  }, [allItems, costSummary.grandTotal, kikWorkCategory, tenderBidsInput, tenderYmInput, unitPrices]);

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
    <div className="border border-border bg-background text-foreground">
      {/* ÜST PAFTA ANTET ŞERİDİ */}
      <div className="border-b border-border bg-card px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">
            <span className="status-dot" />
            <span>PAFTA 01 / BIM → NET METRAJ İCMALİ · KATMANLAR VE MİNHA DOĞRULANDI</span>
          </div>
          <h2 className="mt-1.5 font-display-serif text-2xl sm:text-3xl text-foreground truncate">
            {dataset.projectTitle}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {dataset.projectSubtitle}
          </p>
        </div>

        {/* AKSİYON BUTONLARI */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onResetOrNewFile && (
            <button
              type="button"
              onClick={onResetOrNewFile}
              className="pafta-button-secondary !min-h-9 !py-2 !px-3"
              title="Başka bir IFC, Excel veya PDF dosyası yükle"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>Yeni Dosya Yükle</span>
            </button>
          )}
          {showTechnicalToggle && onToggleTechnicalView && (
            <button
              type="button"
              onClick={onToggleTechnicalView}
              className={`pafta-button-secondary !min-h-9 !py-2 !px-3 ${
                technicalViewOpen ? "!border-primary !bg-primary/10 !text-primary" : ""
              }`}
              title="Mühendislik / e-PYS EK-9 & Ham IFC STEP Denetim Görünümü"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{technicalViewOpen ? "Denetim Görünümünü Gizle" : "e-PYS & Denetim"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="pafta-button-secondary !min-h-9 !py-2 !px-3"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>Excel İndir (.csv)</span>
          </button>
          <button
            type="button"
            onClick={handleTransferClick}
            className="pafta-button !min-h-9 !py-2 !px-4"
          >
            {activeStep === "maliyet" ? (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{onTransferToQuote ? "Teklif Sihirbazına Aktar" : "Teklif İcmalini İndir"}</span>
              </>
            ) : (
              <>
                <span>Fiyatlandır &amp; Teklif Oluştur</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3 ADIMLI MİMARİ PAFTA İNDEKS ÇUBUĞU */}
      <div
        role="tablist"
        aria-label="Metraj ve Maliyet Adımları"
        className="grid grid-cols-1 sm:grid-cols-3 border-b border-border bg-background divide-y sm:divide-y-0 sm:divide-x divide-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeStep === "icmal"}
          onClick={() => setActiveStep("icmal")}
          className={`flex items-center justify-between px-6 py-4 text-left transition-colors ${
            activeStep === "icmal"
              ? "bg-primary/10 border-b-2 border-b-primary"
              : "hover:bg-card/70"
          }`}
        >
          <div>
            <span className="section-index block">01 / TAŞERON &amp; SATINALMA</span>
            <span className="mt-0.5 block text-sm font-semibold text-foreground">
              1. Malzeme İcmal Listesi
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {allItems.length} Kalem
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeStep === "daireler"}
          onClick={() => setActiveStep("daireler")}
          className={`flex items-center justify-between px-6 py-4 text-left transition-colors ${
            activeStep === "daireler"
              ? "bg-primary/10 border-b-2 border-b-primary"
              : "hover:bg-card/70"
          }`}
        >
          <div>
            <span className="section-index block">02 / ARSA SAHİBİ &amp; ŞEREFİYE</span>
            <span className="mt-0.5 block text-sm font-semibold text-foreground">
              2. Daire Metrekareleri ({dataset.residentialUnitCount} Daire)
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {formatTrNumber(dataset.totalGeneralGrossM2, 0)} m²
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeStep === "maliyet"}
          onClick={() => setActiveStep("maliyet")}
          className={`flex items-center justify-between px-6 py-4 text-left transition-colors ${
            activeStep === "maliyet"
              ? "bg-primary/10 border-b-2 border-b-primary"
              : "hover:bg-card/70"
          }`}
        >
          <div>
            <span className="section-index block">03 / YAKLAŞIK MALİYET</span>
            <span className="mt-0.5 block text-sm font-semibold text-foreground">
              3. Maliyet &amp; Teklif
            </span>
          </div>
          <span className="font-mono text-[10px] text-primary font-semibold tabular-nums">
            {formatTrCurrency(costSummary.grandTotal)}
          </span>
        </button>
      </div>

      {/* ADIM 01: MALZEME İCMAL LİSTESİ (SOL PAFTA CETVELİ + SAĞ HESAP KANITI KARTI) */}
      {activeStep === "icmal" && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SOL: KAĞIT İCMAL CETVELİ */}
          <div className="lg:col-span-7 border border-border bg-background">
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-2">
              <div>
                <span className="section-index">01 / İMALAT CETVELİ</span>
                <h3 className="font-display-serif text-2xl text-foreground mt-0.5">
                  İnşaat İmalat İcmal Listesi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kapı ve pencere boşlukları (minha) düşülmüş, çoklu katmanları ayrıştırılmış net metrajlar
                </p>
              </div>
              <span className="stamp-badge bg-background text-muted-foreground">
                Detay için satıra tıklayın →
              </span>
            </div>

            {/* Tablo Sütun Başlığı */}
            <div className="grid grid-cols-12 px-6 py-2.5 bg-card border-b border-foreground/70 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-8">İmalat Kalemi</div>
              <div className="col-span-3 text-right">Net Miktar</div>
              <div className="col-span-1 text-right">Birim</div>
            </div>

            <div className="divide-y divide-border">
              {dataset.groups.map((grp, grpIdx) => (
                <React.Fragment key={grp.key}>
                  {/* Grup Alt Başlığı */}
                  <div className="px-6 py-2 bg-card/70 border-y border-border flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                      0{grpIdx + 1} / {grp.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{grp.unitLabel}</span>
                  </div>

                  {grp.items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`w-full text-left grid grid-cols-12 items-center px-6 py-3.5 transition-colors border-l-[3px] ${
                          isSelected
                            ? "border-l-primary bg-primary/10 pl-[21px]"
                            : "border-l-transparent hover:bg-card/50"
                        }`}
                      >
                        <div className="col-span-8 pr-3">
                          <div
                            className={`text-sm ${
                              isSelected ? "font-bold text-primary" : "font-semibold text-foreground"
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>
                        </div>
                        <div
                          className={`col-span-3 text-right font-mono text-base font-semibold tabular-nums ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {formatTrNumber(item.netQuantity)}
                        </div>
                        <div className="col-span-1 text-right font-mono text-xs text-muted-foreground">
                          {item.unit}
                        </div>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* SAĞ: MİNHA VE HESAP KANITI PAFTA KUTUSU ("BU RAKAM NEREDEN GELDİ?") */}
          {selectedItem && (
            <div className="lg:col-span-5 border border-border bg-card p-6 sticky top-20 relative">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                <span className="section-index">HESAP KANITI · MİNHA DETAYI</span>
                <span className="stamp-badge bg-background text-foreground">
                  POZ: {selectedItem.pozCode}
                </span>
              </div>

              <h4 className="mt-3 font-display-serif text-3xl text-foreground">
                {selectedItem.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{selectedItem.formulaNote}</p>

              {/* MİNHA FORMÜL KUTUSU */}
              <div className="mt-5 border border-border bg-background p-4">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Bu Rakam Nereden Geldi? (Brüt − Boşluk = Net)
                </div>
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
              </div>

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

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                <span>ÇŞB GENEL TEKNİK ŞARTNAMESİ</span>
                <span>ÖLÇEK: BİREBİR IFC4</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADIM 02: DAİRE METREKARELERİ (BAĞIMSIZ BÖLÜM CETVELİ) */}
      {activeStep === "daireler" && (
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
                        {formatTrNumber(apt.generalGrossM2)} m²
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
                {formatTrNumber(dataset.totalGeneralGrossM2)} m²
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
                    {formatTrNumber(selectedApartment.unitGrossM2)} m²
                  </div>
                </div>
                <div className="bg-primary/10 p-2.5 border border-primary/40">
                  <div className="font-mono text-[10px] uppercase font-semibold text-primary">Genel Brüt</div>
                  <div className="mt-1 font-mono text-sm font-bold text-primary tabular-nums">
                    {formatTrNumber(selectedApartment.generalGrossM2)} m²
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
            </div>
          )}
        </div>
      )}

      {/* ADIM 03: MALİYET & TEKLİF (DÜZENLENEBİLİR BİRİM FİYATLAR + YAKLAŞIK MALİYET KARTI) */}
      {activeStep === "maliyet" && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SOL: BİRİM FİYAT CETVELİ */}
          <div className="lg:col-span-7 border border-border bg-background">
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-2">
              <div>
                <span className="section-index">03 / BİRİM FİYAT CETVELİ</span>
                <h3 className="font-display-serif text-2xl text-foreground mt-0.5">
                  Birim Fiyat ve Maliyet Cetveli
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Taşeron veya piyasa birim fiyatlarını girerek anında yaklaşık maliyet ve teklif oluşturun
                </p>
              </div>
              <span className="stamp-badge bg-primary/10 text-primary border-primary/40">
                Birim fiyat kutuları düzenlenebilir
              </span>
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
                        className="grid grid-cols-12 items-center px-6 py-3 hover:bg-card/50 transition-colors"
                      >
                        <div className="col-span-5 pr-3">
                          <div className="text-sm font-semibold text-foreground">{item.title}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">Poz: {item.pozCode}</div>
                        </div>
                        <div className="col-span-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
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
                            className="w-24 border border-primary/50 bg-primary/5 px-2.5 py-1 text-right font-mono text-sm font-semibold text-foreground focus:border-primary focus:bg-background focus:outline-none tabular-nums"
                          />
                        </div>
                        <div className="col-span-3 text-right font-mono text-sm font-semibold text-foreground tabular-nums">
                          {formatTrCurrency(lineTotal)}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* SAĞ: YAKLAŞIK MALİYET VE TEKLİF ÖZETİ PAFTA KARTI */}
          <div className="lg:col-span-5 border border-border bg-card p-6 sticky top-20">
            <div className="pb-3 border-b border-border flex items-center justify-between">
              <span className="section-index">03 / TEKLİF İCMAL ÖZETİ</span>
              <span className="stamp-badge bg-background text-foreground">KDV HARİÇ</span>
            </div>
            <h4 className="mt-3 font-display-serif text-3xl text-foreground">
              Yaklaşık Maliyet &amp; Teklif İcmali
            </h4>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {dataset.residentialUnitCount} Daire + Ortak Alanlar · Net İmalat Maliyeti
            </p>

            <div className="mt-4 divide-y divide-border border-t border-b border-border">
              {costSummary.groupTotals.map((gt) => (
                <div key={gt.key} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{gt.title}</span>
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {formatTrCurrency(gt.subtotal)}
                  </span>
                </div>
              ))}
              <div className="py-2.5 flex items-center justify-between text-xs bg-background px-2.5">
                <span className="font-semibold text-foreground">İmalat Ara Toplamı</span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {formatTrCurrency(costSummary.directTotal)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Müteahhitlik Kârı &amp; Genel Gider (%)</span>
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
                    className="w-14 border border-border bg-background px-1.5 py-0.5 text-right font-mono text-xs font-bold text-foreground"
                  />
                </div>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {formatTrCurrency(costSummary.overheadAmount)}
                </span>
              </div>
            </div>

            {/* GENEL TOPLAM PAFTA BLOĞU */}
            <div className="mt-5 border border-foreground bg-foreground text-background p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-75">
                Genel Toplam (KDV Hariç)
              </div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold tabular-nums">
                {formatTrCurrency(costSummary.grandTotal)}
              </div>
              <div className="mt-3 pt-3 border-t border-background/20 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-mono text-[10px] uppercase opacity-75">
                    Daire Başı ({dataset.residentialUnitCount} Daire)
                  </div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums">
                    {formatTrCurrency(costSummary.perApartment)} / Daire
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase opacity-75">
                    m² Başı ({formatTrNumber(dataset.totalGeneralGrossM2, 0)} m²)
                  </div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums">
                    {formatTrCurrency(costSummary.perGrossM2)} / m²
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleTransferClick}
                className="pafta-button w-full !justify-center"
              >
                <Download className="w-4 h-4" />
                <span>
                  {onTransferToQuote
                    ? "Fiyatlandırılmış Kalemleri Teklif Sihirbazına Aktar"
                    : "Fiyatlandırılmış İcmal Tablosunu İndir (.csv)"}
                </span>
              </button>
            </div>

            {/* 4734 KİK m.38 AŞIRI DÜŞÜK TEKLİF (SINIR DEĞER & %80 PARETO) ANALİZİ */}
            <div className="mt-5 border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                  4734 KİK m.38 · SINIR DEĞER &amp; %80 PARETO ANALİZİ
                </span>
                <div className="inline-flex border border-border bg-card text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setKikWorkCategory("ust_yapi")}
                    className={`px-2 py-0.5 ${
                      kikWorkCategory === "ust_yapi"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    Üstyapı (N=1,00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKikWorkCategory("alt_yapi")}
                    className={`px-2 py-0.5 ${
                      kikWorkCategory === "alt_yapi"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    Diğer Yapım / Altyapı (N=1,20)
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    İdare Yaklaşık Maliyeti (YM - TL)
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tenderYmInput}
                    onChange={(e) => setTenderYmInput(e.target.value)}
                    placeholder="Örn: 125000000"
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    Rakip Teklifler (TL, noktalı virgül ile)
                  </span>
                  <input
                    type="text"
                    value={tenderBidsInput}
                    onChange={(e) => setTenderBidsInput(e.target.value)}
                    placeholder="Örn: 98000000; 102500000; 106000000"
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
                  />
                </label>
              </div>

              {kikAdtAnalysis.hasTenderSessionInputs ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">
                      Sınır Değer (SD = K × Tort2 / (C × N))
                    </div>
                    <div className="mt-0.5 font-bold text-foreground tabular-nums">
                      {formatTrCurrency(kikAdtAnalysis.boundaryValueTry)}
                    </div>
                  </div>
                  <div className="border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">KİK m.38 Durumu</div>
                    <div
                      className={`mt-0.5 font-bold tabular-nums ${
                        kikAdtAnalysis.isAbnormallyLow ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {kikAdtAnalysis.isAbnormallyLow
                        ? `Aşırı Düşük (${formatTrNumber(kikAdtAnalysis.marginToBoundaryPercent, 1)}%)`
                        : `Sınır Değer Üstü (+${formatTrNumber(kikAdtAnalysis.marginToBoundaryPercent, 1)}%)`}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 border border-border bg-card p-2.5 text-[11px] font-mono text-muted-foreground">
                  Sınır değer (SD) hesabı için ihale açılış tutanağındaki İdare Yaklaşık Maliyeti (YM) ve geçerli teklifleri giriniz (varsayılan uydurma değer kullanılmaz).
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>
                  Tebliğ m.45.1.2 Sıralı İş Kalemi (%80):{" "}
                  <strong className="text-foreground">
                    {kikAdtAnalysis.explanationRequiredItems.length} / {allItems.length} Kalem
                  </strong>
                </span>
                <span>
                  Dosya Adı Şablonu:{" "}
                  <strong className="text-foreground">{isoContainerIdentity.namingStandard}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
