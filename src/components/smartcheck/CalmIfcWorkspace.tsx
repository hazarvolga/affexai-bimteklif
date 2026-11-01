import React, { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, ArrowRight, SlidersHorizontal, Upload } from "lucide-react";
import type { CalmIcmalItem, CalmIfcDataset } from "@/ifc/calm-icmal";
import type { ApartmentUnitScheduleItem } from "@/ifc/types";
import { parseThresholdInput, summarizeOpeningsMinha } from "@/ifc/openings-minha";
import { parseRatioInput, resolveApartmentGross, sumResidentialGross, type GrossRatios } from "@/ifc/apartment-gross";
import { AuthoringAdvisoryBanner } from "@/components/smartcheck/AuthoringAdvisoryBanner";
import { IfcCoverageCard } from "@/components/smartcheck/IfcCoverageCard";
import { ModelInventoryCard } from "@/components/smartcheck/ModelInventoryCard";
import { OpeningsOverviewCard } from "@/components/smartcheck/OpeningsOverviewCard";
import { ResultSummaryPanel } from "@/components/smartcheck/ResultSummaryPanel";
import { buildResultSummary } from "@/ifc/result-summary";
import { openingsAvailability } from "@/ifc/calculation-trace";
import { ExpertVerificationBar } from "@/components/smartcheck/ExpertVerificationBar";
import { VERIFICATION_STATUS_LABEL } from "@/ifc/expert-verification";
import { useExpertVerification } from "@/hooks/useExpertVerification";
import { summarizeCost } from "@/ifc/pricing/cost-summary";
import { serializeCsv, type TabularCell } from "@/lib/tabular-data";
import { roundMoney } from "@/lib/calculations";
import { toast } from "sonner";
import { IfcReviewViewer } from "@/components/smartcheck/viewer/IfcReviewViewer";
import { calmTransferTargetHint, isCalmTransferTargetReady, type CalmTransferTarget, type CalmTransferUiItem } from "./calm-transfer-ui";
import { CalmTransferTargetPicker } from "./CalmTransferTargetPicker";
import { publicPozCode } from "./missing-price";
import { Link } from "react-router-dom";
import { formatGross, formatTrCurrency, formatTrNumber } from "./calm-format";
import { CalmPriceTable } from "./CalmPriceTable";
import { CalmStepTabs, type CalmStep } from "./CalmStepTabs";
import { CalmCostTools } from "./CalmCostTools";
import { CalmIcmalEvidenceCard } from "./CalmIcmalEvidenceCard";
import { CalmApartmentsStep } from "./CalmApartmentsStep";
import { useCalmSessionInputs } from "./useCalmSessionInputs";
import { useTuikEscalation } from "./useTuikEscalation";
import { useCatalogPriceResolution } from "./useCatalogPriceResolution";

export interface CalmIfcWorkspaceProps {
  dataset: CalmIfcDataset;
  documentId?: string | null;
  quotations?: Array<{ id: string; quoteNumber: string; projectName: string; status: string }>;
  transferTarget?: CalmTransferTarget;
  onTransferTargetChange?: (target: CalmTransferTarget) => void;
  onTransferToQuote?: (items: CalmTransferUiItem[], options: { overheadProfitPercent: number }) => Promise<void> | void;
  /** Why this icmal cannot become a quotation (e.g. a quota-free sample without IFC evidence). */
  transferUnavailableReason?: string;
  transferBusy?: boolean;
  transferredQuotationId?: string | null;
  onToggleTechnicalView?: () => void;
  showTechnicalToggle?: boolean;
  technicalViewOpen?: boolean;
  onResetOrNewFile?: () => void;
}


const PUBLIC_TENDER_KEY = "bimmetraj:calm-public-tender:v1";

function readStoredFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStoredFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Private mode or blocked storage: the choice simply is not remembered.
  }
}

/** Profit and overhead entered in the icmal: 0–100 with two decimals, as stored on the quotation (release 0029). */
function clampOverheadPercent(raw: string): number {
  const value = parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(Math.min(value, 100) * 100) / 100;
}
const DEFAULT_TRANSFER_TARGET: CalmTransferTarget = { mode: "new", clientName: "", projectName: "" };



export const CalmIfcWorkspace: React.FC<CalmIfcWorkspaceProps> = ({
  dataset,
  documentId,
  quotations = [],
  transferTarget = DEFAULT_TRANSFER_TARGET,
  onTransferTargetChange,
  onTransferToQuote,
  transferUnavailableReason,
  transferBusy = false,
  transferredQuotationId,
  onToggleTechnicalView,
  showTechnicalToggle = false,
  technicalViewOpen = false,
  onResetOrNewFile,
}) => {
  const allItems = useMemo(() => dataset.groups.flatMap((g) => g.items), [dataset.groups]);

  // Brüt alan IFC mahal cetvelinde yok: katsayılar kullanıcı girdisidir, varsayılan yoktur.
  const [unitRatioInput, setUnitRatioInput] = useState<string>("");
  const [generalRatioInput, setGeneralRatioInput] = useState<string>("");
  const grossRatios = useMemo<GrossRatios>(
    () => ({ unitRatio: parseRatioInput(unitRatioInput), generalRatio: parseRatioInput(generalRatioInput) }),
    [unitRatioInput, generalRatioInput],
  );
  const grossTotals = useMemo(
    () => sumResidentialGross(dataset.apartments, grossRatios),
    [dataset.apartments, grossRatios],
  );

  const [activeStep, setActiveStep] = useState<CalmStep>("icmal");
  const [expertMode, setExpertMode] = useState(false);
  const verificationKey = useMemo(
    () => [dataset.projectTitle, allItems.length, allItems.reduce((sum, item) => sum + item.netQuantity, 0).toFixed(3)].join("|"),
    [dataset.projectTitle, allItems],
  );
  const verification = useExpertVerification(verificationKey);
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const fayans = allItems.find((i) => i.id === "duvar-fayans");
    return fayans?.id || allItems[0]?.id || "";
  });
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    () => dataset.apartments[0]?.unitCode || "D01",
  );
  // Per-viewer convenience: whether this user prices public tenders; the tools stay one click away either way.
  const [publicTender, setPublicTender] = useState<boolean>(() => readStoredFlag(PUBLIC_TENDER_KEY));
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => { writeStoredFlag(PUBLIC_TENDER_KEY, publicTender); }, [publicTender]);
  const [overheadPercent, setOverheadPercent] = useState<number>(15);

  // Karar #1: BYOL hemen + ÇŞB 2026 resmi referans paralel
  const [priceLicenseMode, setPriceLicenseMode] = useState<"BYOL_TENANT_CATALOG" | "CSB_2026_REFERENCE">(
    "BYOL_TENANT_CATALOG",
  );
  // ÇŞB unit prices already include 25% contractor profit and overhead, so switching to them starts from 0%.
  useEffect(() => {
    if (priceLicenseMode === "CSB_2026_REFERENCE") setOverheadPercent(0);
  }, [priceLicenseMode]);

  const {
    unitPrices, setUnitPrices, priceEvidence, setPriceEvidence, priceResolutionStatus, setPriceResolutionStatus,
    matchCandidates, setPriceRefreshKey, bindMatchCandidate,
  } = useCatalogPriceResolution(allItems, priceLicenseMode);

  const selectedItem: CalmIcmalItem | undefined = useMemo(
    () => allItems.find((it) => it.id === selectedItemId) || allItems[0],
    [allItems, selectedItemId],
  );

  const selectedApartment: ApartmentUnitScheduleItem | undefined = useMemo(
    () => dataset.apartments.find((u) => u.unitCode === selectedUnitCode) || dataset.apartments[0],
    [dataset.apartments, selectedUnitCode],
  );

  // A missing price is unknown, not zero (marka.md M-14.1): totals cover priced items only.
  const costSummary = useMemo(() => summarizeCost({
    groups: dataset.groups,
    unitPrices,
    overheadPercent,
    residentialUnitCount: dataset.residentialUnitCount,
    grossM2: grossTotals.totalGeneralGrossM2,
  }), [dataset.groups, dataset.residentialUnitCount, grossTotals.totalGeneralGrossM2, overheadPercent, unitPrices]);
  const pricingComplete = costSummary.status === "complete";
  const resultSummary = useMemo(() => buildResultSummary({
    totalElementCount: dataset.consistencyReport?.totalElementCount ?? null,
    measuredElementCount: dataset.consistencyReport?.measuredElementCount ?? null,
    evidenceElementCount: dataset.elements?.length ?? null,
    pozMatchedElementCount: dataset.consistencyReport?.pozMatchedElementCount ?? null,
    icmalItemCount: costSummary.itemCount,
    pricedItemCount: costSummary.pricedItemCount,
    openings: openingsAvailability(dataset.openings),
    hasQuotation: quotations.length > 0,
  }), [costSummary.itemCount, costSummary.pricedItemCount, dataset.consistencyReport, dataset.elements, dataset.openings, quotations.length]);
  const costPendingLabel = costSummary.status === "empty" ? "Kalem yok" : `${costSummary.missingItemCount} kalem fiyat bekliyor`;
  const groupTotalLabel = (group: { pricedSubtotal: number; itemCount: number; missingItemCount: number }) => {
    if (group.missingItemCount === 0) return formatTrCurrency(group.pricedSubtotal);
    const pending = `${group.missingItemCount} kalem fiyat bekliyor`;
    return group.missingItemCount === group.itemCount ? pending : `${formatTrCurrency(group.pricedSubtotal)} · ${pending}`;
  };

  const session = useCalmSessionInputs(dataset.projectTitle);
  const { minhaProfile, setMinhaProfile, customMinhaThresholdInput, setCustomMinhaThresholdInput } = session;
  // Sözleşmesel minha: eşik, modeldeki her kapı/pencerenin tekil alanına uygulanır.
  const openingsMinha = useMemo(
    () => summarizeOpeningsMinha(dataset.openings, minhaProfile, parseThresholdInput(customMinhaThresholdInput)),
    [dataset.openings, minhaProfile, customMinhaThresholdInput],
  );




  const escalation = useTuikEscalation({
    allItems, unitPrices, pricingComplete, pricedGrandTotal: costSummary.pricedGrandTotal,
    onApplyIndexedPrices: (nextPrices) => {
      setUnitPrices(nextPrices);
      setPriceEvidence({});
      setPriceResolutionStatus("blocked");
    },
  });
  const { tuikIndexedAppliedNote } = escalation;

  const reviewItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setExpertMode(true);
    setActiveStep("icmal");
  };


  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);

  const selectedGlobalElementInfo = useMemo(() => {
    if (!selectedGlobalId) return null;
    const el = dataset.elements?.find((e) => selectedElementKey
      ? e.sourceIdentity?.elementKey === selectedElementKey
      : e.guid === selectedGlobalId);
    const uncov = dataset.consistencyReport?.uncoveredElements?.find((u) => selectedElementKey
      ? u.sourceIdentity?.elementKey === selectedElementKey
      : u.globalId === selectedGlobalId);
    const finding = dataset.consistencyReport?.findings?.find((f) => selectedElementKey
      ? f.sourceIdentity?.elementKey === selectedElementKey
      : f.globalId === selectedGlobalId);
    return {
      ifcClass: el?.ifcClass || el?.type || uncov?.ifcClass || finding?.ifcClass || "IfcElement",
      name: el?.name || uncov?.name || finding?.elementName || selectedGlobalId,
      storey: el?.storey || uncov?.storey || finding?.storey || "Kat atanmamış",
      matchedPozCode: el?.matchedPozCode || el?.pozNo || null,
      reason: uncov?.reason || finding?.message || el?.uncoveredReason || null,
    };
  }, [dataset.consistencyReport, dataset.elements, selectedElementKey, selectedGlobalId]);

  const displayedGroups = useMemo(() => {
    if (!selectedGlobalId) return dataset.groups;
    const matchedPoz = selectedGlobalElementInfo?.matchedPozCode;
    if (!matchedPoz) return [];
    return dataset.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.pozCode === matchedPoz),
      }))
      .filter((g) => g.items.length > 0);
  }, [dataset.groups, selectedGlobalElementInfo, selectedGlobalId]);

  const handleDownloadCsv = () => {
    const rows: TabularCell[][] = [["BOLUM", "GRUP_VEYA_DAIRE", "POZ_KODU", "IMALAT_VEYA_ODA_ADI", "BRUT_MIKTAR", "MINHA_BOSLUK", "NET_MIKTAR", "BIRIM", "BIRIM_FIYAT_TL", "TOPLAM_TUTAR_TL", "FIYAT_SNAPSHOT_ID", "FIYAT_KAYNAK_ID", "KAYNAK_HASH", "PARA_BIRIMI", "YAKALAMA_TARIHI"]];
    for (const grp of dataset.groups) {
      for (const item of grp.items) {
        const price = unitPrices[item.id];
        // Kuruş, as the quotation rounds each line; whole-lira rounding hid up to 0,50 TL per line.
        const total = price === undefined ? null : roundMoney(item.netQuantity * price);
        rows.push(
          [
            "1_MALZEME_ICMALI",
            grp.title,
            publicPozCode(item.pozCode),
            item.title,
            formatTrNumber(item.grossQuantity),
            formatTrNumber(item.deductedOpeningQuantity),
            formatTrNumber(item.netQuantity),
            item.unit,
            price === undefined ? "" : String(price),
            total === null ? "" : String(total),
            priceEvidence[item.id]?.snapshotId ?? "",
            priceEvidence[item.id]?.sourceId ?? "",
            priceEvidence[item.id]?.sourceDocumentHash ?? "",
            priceEvidence[item.id]?.currency ?? "",
            priceEvidence[item.id]?.capturedAt ?? "",
          ],
        );
      }
    }
    for (const apt of dataset.apartments) {
      rows.push(
        [
          "2_DAIRE_ICMAL",
          apt.storey,
          apt.unitCode,
          apt.unitLabel,
          formatGross(resolveApartmentGross(apt, grossRatios).generalGrossM2).replace("—", ""),
          formatTrNumber(apt.balconyM2),
          formatTrNumber(apt.netSweepableM2),
          "m²",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
      );
      for (const rm of apt.rooms) {
        rows.push(
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
            "",
            "",
            "",
            "",
            "",
          ],
        );
      }
    }
    const csvContent = serializeCsv(rows, { delimiter: ";", bom: true });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset.projectTitle.replace(/[^a-zA-Z0-9_-]+/g, "_")}_Metraj_ve_Daire_Icmali.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Plain .xlsx for the person who opens it in Excel; technical price evidence goes to a separate sheet (C-4). */
  const handleDownloadXlsx = async () => {
    try {
      const [{ buildIcmalXlsx, icmalExportFileName }, { downloadXlsx }] = await Promise.all([
        import("@/lib/icmal-export-xlsx"), import("@/lib/spreadsheet-templates"),
      ]);
      const lines = dataset.groups.flatMap((grp) => grp.items.map((item) => {
        const evidence = priceEvidence[item.id];
        return {
          group: grp.title, pozCode: publicPozCode(item.pozCode), title: item.title,
          grossQuantity: item.grossQuantity, deductedQuantity: item.deductedOpeningQuantity, netQuantity: item.netQuantity, unit: item.unit,
          unitPrice: unitPrices[item.id] ?? null,
          ...(evidence ? { source: { snapshotId: evidence.snapshotId, sourceName: evidence.sourceName, sourceDocumentHash: evidence.sourceDocumentHash, capturedAt: evidence.capturedAt } } : {}),
        };
      }));
      const apartments = dataset.apartments.map((apt) => ({
        storey: apt.storey, unitCode: apt.unitCode, unitLabel: apt.unitLabel,
        grossM2: resolveApartmentGross(apt, grossRatios).generalGrossM2, balconyM2: apt.balconyM2, netM2: apt.netSweepableM2,
        rooms: apt.rooms.map((room) => ({ code: room.code, name: room.name, finish: room.floorFinish, netAreaM2: room.netAreaM2 })),
      }));
      downloadXlsx(await buildIcmalXlsx({ projectTitle: dataset.projectTitle, lines, apartments }), icmalExportFileName(dataset.projectTitle));
    } catch {
      toast.error("Excel dosyası hazırlanamadı. CSV ile indirebilirsiniz.");
    }
  };

  const allPricesResolved = priceResolutionStatus === "ready" && allItems.length > 0 && allItems.every((item) => Boolean(priceEvidence[item.id]));
  const targetReady = isCalmTransferTargetReady(transferTarget);
  const transferBlocked = Boolean(transferUnavailableReason) || !allPricesResolved || !onTransferToQuote || !targetReady || transferBusy || Boolean(transferredQuotationId);
  const transferLabel = transferredQuotationId
    ? transferTarget.mode === "new" ? "Yeni teklif oluşturuldu" : "Yeni revizyon oluşturuldu"
    : transferBusy ? "İcmal aktarılıyor…"
      : transferTarget.mode === "new" ? "İcmalden yeni teklif oluştur" : "İcmali seçili teklife revizyon olarak ekle";

  const handleTransferClick = () => {
    if (activeStep !== "maliyet") {
      setActiveStep("maliyet");
      return;
    }
    if (transferBlocked) return;
    void onTransferToQuote(allItems.map((item) => ({
      lineId: item.id,
      sourceQuantityRowIds: item.sourceQuantityRowIds ?? [],
      priceSnapshotId: priceEvidence[item.id]!.snapshotId,
    })), { overheadProfitPercent: overheadPercent });
  };

  return (
    <div className="border border-border bg-background text-foreground">
      {/* ÜST PAFTA ANTET ŞERİDİ */}
      <div className="border-b border-border bg-card px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">
            <span className="status-dot" />
            <span>PAFTA 01 / BIM → NET METRAJ İCMALİ · KONTROL DURUMU AŞAĞIDAKİ ÖZETTE</span>
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
            onClick={() => void handleDownloadXlsx()}
            data-testid="icmal-xlsx-export"
            className="pafta-button-secondary !min-h-9 !py-2 !px-3"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>Excel İndir (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="text-[11px] font-semibold text-muted-foreground underline hover:text-foreground"
            title="Teknik sütunlarıyla CSV (kaynak kaydı ve hash dahil)"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={handleTransferClick}
            disabled={activeStep === "maliyet" && transferBlocked}
            className="pafta-button !min-h-9 !py-2 !px-4"
          >
            {activeStep === "maliyet" ? (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{transferLabel}</span>
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
      <CalmStepTabs
        activeStep={activeStep}
        onSelect={setActiveStep}
        tabs={[
          { step: "icmal", index: "01 / TAŞERON & SATINALMA", title: "1. Malzeme İcmal Listesi", meta: `${allItems.length} Kalem`, metaClassName: "font-mono text-[10px] text-muted-foreground" },
          {
            step: "daireler", index: "02 / ARSA SAHİBİ & ŞEREFİYE",
            title: `2. Daire Metrekareleri (${dataset.residentialUnitCount > 0 ? `${dataset.residentialUnitCount} Daire` : "daire bilgisi yok"})`,
            meta: `${formatGross(grossTotals.totalGeneralGrossM2, 0)} m²`, metaClassName: "font-mono text-[10px] text-muted-foreground",
          },
          {
            step: "maliyet", index: "03 / YAKLAŞIK MALİYET", title: "3. Maliyet & Teklif",
            meta: pricingComplete ? formatTrCurrency(costSummary.pricedGrandTotal) : costPendingLabel,
            metaClassName: "font-mono text-[10px] text-primary font-semibold tabular-nums",
          },
        ]}
      />

      {/* SONUÇ ÖZETİ: her kontrol kendi durumunu söyler (marka.md M-20.3) */}
      <ResultSummaryPanel summary={resultSummary} onOpenCostStep={() => setActiveStep("maliyet")} />

      {/* KAYNAK YAZILIM UYARISI (PAKET M-2) */}
      <AuthoringAdvisoryBanner advisory={dataset.authoringAdvisory} />

      {/* METRAJ KAPSAMA VE IFC TUTARLILIK KARTI (REV. 36) */}
      <IfcCoverageCard
        report={dataset.consistencyReport}
        elements={dataset.elements}
        selectedElementKey={selectedElementKey}
        onSelectElement={(selection) => {
          setSelectedGlobalId(selection?.globalId ?? null);
          setSelectedElementKey(selection?.elementKey ?? null);
          if (selection) setActiveStep("icmal");
        }}
      />

      {/* MODEL ENVANTERİ: dosyadaki sınıflar ve sayıldı/sayılmadı durumu */}
      <ModelInventoryCard dataset={dataset} />
      <OpeningsOverviewCard openings={dataset.openings} />

      {documentId && dataset.elements?.some((element) => element.sourceIdentity) && (
        <IfcReviewViewer
          documentId={documentId}
          selectedElementKey={selectedElementKey}
          onSelectIdentity={(identity) => {
            setSelectedElementKey(identity?.elementKey ?? null);
            setSelectedGlobalId(identity?.globalId ?? null);
            if (identity) setActiveStep("icmal");
          }}
        />
      )}

      {/* ADIM 01: MALZEME İCMAL LİSTESİ (SOL PAFTA CETVELİ + SAĞ HESAP KANITI KARTI) */}
      {activeStep === "icmal" && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {expertMode && (
            <ExpertVerificationBar
              items={allItems}
              records={verification.records}
              reviewer={verification.reviewer}
              onReviewerChange={verification.setReviewer}
              fileName={dataset.projectTitle}
            />
          )}
          {/* SOL: KAĞIT İCMAL CETVELİ */}
          <div className="lg:col-span-7 border border-border bg-background">
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-2">
              <div>
                <span className="section-index">01 / İMALAT CETVELİ</span>
                <h3 className="font-display-serif text-2xl text-foreground mt-0.5">
                  İnşaat İmalat İcmal Listesi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IFC modelinden okunan net metrajlar.{" "}
                  {openingsAvailability(dataset.openings) === "present"
                    ? "Kapı/pencere listesi modelden okundu; düşüm özeti ayrı gösterilir, kalemlere otomatik uygulanmaz."
                    : openingsAvailability(dataset.openings) === "none_in_model"
                      ? "Modelde kapı/pencere yok; boşluk düşümü gerekmedi."
                      : "Modelde kapı/pencere bilgisi bulunamadı; boşluk düşümü (minha) değerlendirilemedi."}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  aria-pressed={expertMode}
                  onClick={() => setExpertMode((on) => !on)}
                  className={`h-8 border px-3 font-mono text-[11px] font-semibold uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    expertMode ? "border-primary bg-primary text-primary-foreground" : "border-primary text-primary hover:bg-primary/10"
                  }`}
                >
                  {expertMode ? "Uzman doğrulama: açık" : "Uzman doğrulama modu"}
                </button>
                <span className="stamp-badge bg-background text-muted-foreground">
                  Detay için satıra tıklayın →
                </span>
              </div>
            </div>

            {selectedGlobalId && (
              <div
                data-testid="icmal-globalid-filter-banner"
                className="px-6 py-3 border-b border-border bg-primary/10 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-xs text-foreground">
                  <span className="font-mono font-semibold">GlobalId Filtresi Aktif: {selectedGlobalId}</span>
                  {selectedGlobalElementInfo && (
                    <span className="ml-2 text-muted-foreground">
                      ({selectedGlobalElementInfo.ifcClass} · {selectedGlobalElementInfo.name} · Kat: {selectedGlobalElementInfo.storey})
                    </span>
                  )}
                  {selectedGlobalElementInfo?.reason && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{selectedGlobalElementInfo.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedGlobalId(null); setSelectedElementKey(null); }}
                  className="border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-foreground hover:bg-background"
                >
                  Filtreyi Temizle
                </button>
              </div>
            )}

            {/* Tablo Sütun Başlığı */}
            <div className="grid grid-cols-12 px-6 py-2.5 bg-card border-b border-foreground/70 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-8">İmalat Kalemi</div>
              <div className="col-span-3 text-right">Net Miktar</div>
              <div className="col-span-1 text-right">Birim</div>
            </div>

            <div className="divide-y divide-border">
              {displayedGroups.length === 0 && selectedGlobalId && (
                <div className="px-6 py-6 text-xs text-muted-foreground">
                  Seçilen eleman (<span className="font-mono font-semibold text-foreground">{selectedGlobalId}</span>) açıkta kalan / ölçülemeyen veya kapsam dışı eleman olduğu için hiçbir icmal pozuna dahil edilmemiştir. Tüm icmal kalemlerini görmek için <strong>Filtreyi Temizle</strong> düğmesine tıklayın.
                </div>
              )}
              {displayedGroups.map((grp, grpIdx) => (
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
                          {expertMode && (
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                              {verification.records[item.id] ? VERIFICATION_STATUS_LABEL[verification.records[item.id].status] : "İncelenmedi"}
                            </div>
                          )}
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

          <CalmIcmalEvidenceCard dataset={dataset} selectedItem={selectedItem} expertMode={expertMode} verification={verification} openingsMinha={openingsMinha} {...session} />
        </div>
      )}

      {/* ADIM 02: DAİRE METREKARELERİ (BAĞIMSIZ BÖLÜM CETVELİ) */}
      {activeStep === "daireler" && (
        <CalmApartmentsStep dataset={dataset} grossRatios={grossRatios} grossTotals={grossTotals} selectedApartment={selectedApartment} setSelectedUnitCode={setSelectedUnitCode} unitRatioInput={unitRatioInput} setUnitRatioInput={setUnitRatioInput} generalRatioInput={generalRatioInput} setGeneralRatioInput={setGeneralRatioInput} />
      )}

      {/* ADIM 03: MALİYET & TEKLİF (DÜZENLENEBİLİR BİRİM FİYATLAR + YAKLAŞIK MALİYET KARTI) */}
      {activeStep === "maliyet" && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <CalmPriceTable dataset={dataset} costSummary={costSummary} groupTotalLabel={groupTotalLabel} unitPrices={unitPrices} priceEvidence={priceEvidence} priceResolutionStatus={priceResolutionStatus} matchCandidates={matchCandidates} bindMatchCandidate={bindMatchCandidate} setPriceRefreshKey={setPriceRefreshKey} priceLicenseMode={priceLicenseMode} setPriceLicenseMode={setPriceLicenseMode} tuikIndexedAppliedNote={tuikIndexedAppliedNote} reviewItem={reviewItem} />

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
              {dataset.residentialUnitCount > 0 ? `${dataset.residentialUnitCount} Daire + Ortak Alanlar` : "Daire/mahal cetveli için yeterli bilgi bulunamadı"} · Net İmalat Maliyeti
            </p>

            <div className="mt-4 divide-y divide-border border-t border-b border-border">
              {costSummary.groupTotals.map((gt) => (
                <div key={gt.key} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{gt.title}</span>
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {groupTotalLabel(gt)}
                  </span>
                </div>
              ))}
              <div className="py-2.5 flex items-center justify-between text-xs bg-background px-2.5">
                <span className="font-semibold text-foreground">
                  {pricingComplete ? "İmalat Ara Toplamı" : "İmalat Ara Toplamı (yalnız fiyatlanan kalemler)"}
                </span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {costSummary.pricedItemCount > 0 ? formatTrCurrency(costSummary.pricedDirectTotal) : "Hesaplanmadı"}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Müteahhitlik Kârı &amp; Genel Gider (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    aria-label="Müteahhitlik Kârı Yüzdesi"
                    value={overheadPercent}
                    onChange={(e) => setOverheadPercent(clampOverheadPercent(e.target.value))}
                    className="w-14 border border-border bg-background px-1.5 py-0.5 text-right font-mono text-xs font-bold text-foreground"
                  />
                </div>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {costSummary.pricedItemCount > 0 ? formatTrCurrency(costSummary.overheadAmount) : "Hesaplanmadı"}
                </span>
              </div>
              <p className="py-2 text-[10px] leading-relaxed text-muted-foreground" data-testid="overhead-profit-note">
                Teklife "Müteahhitlik kârı ve genel gider" satırı olarak eklenir; KDV bu tutara da uygulanır. Kalem birim fiyatları katalog fiyatıyla aynı kalır.
                {priceLicenseMode === "CSB_2026_REFERENCE" && overheadPercent > 0 && (
                  <span className="mt-1 block font-semibold text-amber-600">
                    ÇŞB birim fiyatlarına %25 yüklenici kârı ve genel gider zaten dahildir; bu yüzde ikinci kez eklenir.
                  </span>
                )}
              </p>
            </div>

            {/* GENEL TOPLAM PAFTA BLOĞU */}
            <div className="mt-5 border border-foreground bg-foreground text-background p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-75">
                {pricingComplete ? "Genel Toplam (KDV Hariç)" : "Genel Toplam Hesaplanmadı"}
              </div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold tabular-nums">
                {pricingComplete ? formatTrCurrency(costSummary.pricedGrandTotal) : costPendingLabel}
              </div>
              {costSummary.status === "partial" && (
                <div className="mt-1 text-xs opacity-80">
                  Fiyatlanan {costSummary.pricedItemCount}/{costSummary.itemCount} kalemin tutarı: {formatTrCurrency(costSummary.pricedGrandTotal)}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-background/20 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-mono text-[10px] uppercase opacity-75">
                    {dataset.residentialUnitCount > 0 ? `Daire Başı (${dataset.residentialUnitCount} Daire)` : "Daire Başı"}
                  </div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums">
                    {costSummary.perApartment !== null
                      ? `${formatTrCurrency(costSummary.perApartment)} / Daire`
                      : dataset.residentialUnitCount > 0 ? "Tüm fiyatlar gelince hesaplanır" : "Daire sayısı belirlenemedi"}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase opacity-75">
                    m² Başı ({formatGross(grossTotals.totalGeneralGrossM2, 0)} m²)
                  </div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums">
                    {costSummary.perGrossM2 !== null
                      ? `${formatTrCurrency(costSummary.perGrossM2)} / m²`
                      : grossTotals.totalGeneralGrossM2 === null || grossTotals.totalGeneralGrossM2 <= 0 ? "Brüt alan katsayısı girilmedi" : "Tüm fiyatlar gelince hesaplanır"}
                  </div>
                </div>
              </div>
            </div>

            {transferUnavailableReason ? (
              <p className="mt-4 border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground" data-testid="calm-transfer-unavailable">
                {transferUnavailableReason}
              </p>
            ) : !onTransferToQuote ? (
              <p className="mt-4 border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground" data-testid="calm-transfer-unavailable">
                Bu ekran tarayıcıda hızlı ön incelemedir; teklife aktarım yapılmaz. Teklif için modeli{" "}
                <Link className="font-semibold text-primary underline" to="/app/smartcheck">SmartCheck</Link>'e yükleyin.
              </p>
            ) : (
            <div className="mt-4">
              <CalmTransferTargetPicker
                target={transferTarget}
                quotations={quotations}
                disabled={transferBusy}
                onChange={(next) => onTransferTargetChange?.(next)}
              />
              {transferredQuotationId && (
                <Link className="mb-3 inline-block text-xs font-bold text-emerald-500 underline" to={`/app/quotes/${transferredQuotationId}`}>
                  {transferTarget.mode === "new" ? "Oluşturulan teklifi aç" : "Oluşturulan revizyonu aç"}
                </Link>
              )}
              <button
                type="button"
                onClick={handleTransferClick}
                disabled={transferBlocked}
                title={!allPricesResolved ? "Aktarım için tüm kalemlerin fiyatı firma kataloğunuzda kayıtlı olmalı." : calmTransferTargetHint(transferTarget) ?? undefined}
                data-testid="calm-transfer-submit"
                className="pafta-button w-full !justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{transferLabel}</span>
              </button>
            </div>
            )}

            <CalmCostTools open={toolsOpen} setOpen={setToolsOpen} publicTender={publicTender} setPublicTender={setPublicTender} projectTitle={dataset.projectTitle} documentId={documentId} allItems={allItems} unitPrices={unitPrices} pricedGrandTotal={costSummary.pricedGrandTotal} pricingComplete={pricingComplete} costPendingLabel={costPendingLabel} session={session} escalation={escalation} />
          </div>
        </div>
      )}
    </div>
  );
};
