import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, ArrowRight, SlidersHorizontal, Upload } from "lucide-react";
import type { CalmIcmalItem, CalmIfcDataset } from "@/ifc/calm-icmal";
import type { ApartmentUnitScheduleItem } from "@/ifc/types";
import { parseThresholdInput, summarizeOpeningsMinha } from "@/ifc/openings-minha";
import { parseRatioInput, resolveApartmentGross, sumResidentialGross, type GrossRatios } from "@/ifc/apartment-gross";
import { ApartmentSubcontractorShieldCard } from "@/components/smartcheck/ApartmentSubcontractorShieldCard";
import { AuthoringAdvisoryBanner } from "@/components/smartcheck/AuthoringAdvisoryBanner";
import { IfcCoverageCard } from "@/components/smartcheck/IfcCoverageCard";
import { CalculationTraceSection } from "@/components/smartcheck/CalculationTraceSection";
import { ResultSummaryPanel } from "@/components/smartcheck/ResultSummaryPanel";
import { buildResultSummary } from "@/ifc/result-summary";
import { openingsAvailability } from "@/ifc/calculation-trace";
import { ExpertLineVerification } from "@/components/smartcheck/ExpertLineVerification";
import { ExpertVerificationBar } from "@/components/smartcheck/ExpertVerificationBar";
import { VERIFICATION_STATUS_LABEL } from "@/ifc/expert-verification";
import { useExpertVerification } from "@/hooks/useExpertVerification";
import { evaluateKikAbnormallyLowBid, type KikWorkCategory } from "@/lib/kik-adt";
import { isPriced, summarizeCost } from "@/ifc/pricing/cost-summary";
import {
  evaluateIso19650Compliance,
  parseContainerIdentity,
  type CdeState,
  type EirDeliveryMilestone,
  type SuitabilityCode,
} from "@/smartcheck/rules/iso19650";
import { CdeWorkflowPanel } from "@/components/smartcheck/CdeWorkflowPanel";
import type { MinhaRuleProfile } from "@/smartcheck/rules/minha";
import {
  CSB_2026_TUIK_SUB_INDICES,
  computeContractPriceEscalation4735,
  indexOutOfPeriodUnitPrice,
  type TuikSubIndexCode,
} from "@/lib/price-escalation";
import { fetchWithAuth } from "@/lib/api";
import { serializeCsv, type TabularCell } from "@/lib/tabular-data";
import { roundMoney } from "@/lib/calculations";
import { toast } from "sonner";
import { IfcReviewViewer } from "@/components/smartcheck/viewer/IfcReviewViewer";
import { calmTransferTargetHint, isCalmTransferTargetReady, type CalmTransferTarget, type CalmTransferUiItem } from "./calm-transfer-ui";
import { CalmTransferTargetPicker } from "./CalmTransferTargetPicker";
import { MissingPriceActions } from "./MissingPriceActions";
import { matchableCandidate, publicPozCode, type PriceSuggestionCandidate, type PriceSuggestionResult } from "./missing-price";
import { Link } from "react-router-dom";

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

type CalmStep = "icmal" | "daireler" | "maliyet";

/** Profit and overhead entered in the icmal: 0–100 with two decimals, as stored on the quotation (release 0029). */
function clampOverheadPercent(raw: string): number {
  const value = parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(Math.min(value, 100) * 100) / 100;
}
const DEFAULT_TRANSFER_TARGET: CalmTransferTarget = { mode: "new", clientName: "", projectName: "" };
type ResolvedPriceEvidence = { snapshotId: string; sourceId: string; sourceName: string; sourceDocumentHash: string; currency: "TRY"; amount: number; capturedAt: string | null };


function formatTrNumber(val: number, decimals = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(val) ? val : 0);
}

function formatGross(val: number | null, decimals = 2): string {
  return val === null || !Number.isFinite(val) ? "—" : formatTrNumber(val, decimals);
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
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [priceEvidence, setPriceEvidence] = useState<Record<string, ResolvedPriceEvidence>>({});
  const [priceResolutionStatus, setPriceResolutionStatus] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
  const [matchCandidates, setMatchCandidates] = useState<Record<string, PriceSuggestionCandidate>>({});
  const [priceRefreshKey, setPriceRefreshKey] = useState(0);
  // Prices the user bound by hand survive a re-resolution, but only while the same snapshot is still offered.
  const boundSnapshotByItem = useRef<Record<string, string>>({});
  const [overheadPercent, setOverheadPercent] = useState<number>(15);

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
    pozMatchedElementCount: dataset.consistencyReport?.pozMatchedElementCount ?? null,
    icmalItemCount: costSummary.itemCount,
    pricedItemCount: costSummary.pricedItemCount,
    openings: openingsAvailability(dataset.openings),
    hasQuotation: quotations.length > 0,
  }), [costSummary.itemCount, costSummary.pricedItemCount, dataset.consistencyReport, dataset.openings, quotations.length]);
  const costPendingLabel = costSummary.status === "empty" ? "Kalem yok" : `${costSummary.missingItemCount} kalem fiyat bekliyor`;
  const groupTotalLabel = (group: { pricedSubtotal: number; itemCount: number; missingItemCount: number }) => {
    if (group.missingItemCount === 0) return formatTrCurrency(group.pricedSubtotal);
    const pending = `${group.missingItemCount} kalem fiyat bekliyor`;
    return group.missingItemCount === group.itemCount ? pending : `${formatTrCurrency(group.pricedSubtotal)} · ${pending}`;
  };

  const storageKey = useMemo(
    () => `bimmetraj:calm-session:v1:${dataset.projectTitle}`,
    [dataset.projectTitle],
  );

  const [kikWorkCategory, setKikWorkCategory] = useState<KikWorkCategory>("ust_yapi");
  const [tenderYmInput, setTenderYmInput] = useState<string>("");
  const [tenderBidsInput, setTenderBidsInput] = useState<string>("");

  const [cdeStateInput, setCdeStateInput] = useState<CdeState | "">("");
  const [suitabilityInput, setSuitabilityInput] = useState<SuitabilityCode | "">("");
  const [revisionInput, setRevisionInput] = useState<string>("");
  const [deliveryStageInput, setDeliveryStageInput] = useState<"COORDINATION" | "TENDER_OR_PERMIT">("COORDINATION");
  const [eirMilestoneInput, setEirMilestoneInput] = useState<EirDeliveryMilestone>("IMPLEMENTATION");

  const [minhaProfile, setMinhaProfile] = useState<MinhaRuleProfile>("CSB_2026");
  const [customMinhaThresholdInput, setCustomMinhaThresholdInput] = useState<string>("");
  // Sözleşmesel minha: eşik, modeldeki her kapı/pencerenin tekil alanına uygulanır.
  const openingsMinha = useMemo(
    () => summarizeOpeningsMinha(dataset.openings, minhaProfile, parseThresholdInput(customMinhaThresholdInput)),
    [dataset.openings, minhaProfile, customMinhaThresholdInput],
  );

  // Karar #1: BYOL hemen + ÇŞB 2026 resmi referans paralel
  const [priceLicenseMode, setPriceLicenseMode] = useState<"BYOL_TENANT_CATALOG" | "CSB_2026_REFERENCE">(
    "BYOL_TENANT_CATALOG",
  );
  // ÇŞB unit prices already include 25% contractor profit and overhead, so switching to them starts from 0%.
  useEffect(() => {
    if (priceLicenseMode === "CSB_2026_REFERENCE") setOverheadPercent(0);
  }, [priceLicenseMode]);

  useEffect(() => {
    const controller = new AbortController();
    const resolvePrices = async () => {
      setPriceResolutionStatus("loading");
      setUnitPrices({});
      setPriceEvidence({});
      try {
        const response = await fetchWithAuth("/api/pricing/snapshot-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode: priceLicenseMode,
            rows: allItems.map((item) => ({ rowId: item.id, positionCode: publicPozCode(item.pozCode) || null, description: item.title, unit: item.unit })),
          }),
        });
        if (!response.ok) throw new Error("price resolver unavailable");
        const body = await response.json() as { suggestions?: PriceSuggestionResult[] };
        const nextPrices: Record<string, number> = {};
        const nextEvidence: Record<string, ResolvedPriceEvidence> = {};
        const nextCandidates: Record<string, PriceSuggestionCandidate> = {};
        const itemById = new Map(allItems.map((item) => [item.id, item]));
        for (const suggestion of body.suggestions ?? []) {
          const item = itemById.get(suggestion.rowId);
          const candidate = item ? matchableCandidate(item, suggestion) : null;
          if (candidate && boundSnapshotByItem.current[suggestion.rowId] === candidate.snapshot.id) {
            const boundAmount = Number(candidate.snapshot.amount);
            nextPrices[suggestion.rowId] = boundAmount;
            nextEvidence[suggestion.rowId] = { snapshotId: candidate.snapshot.id, sourceId: candidate.source.id, sourceName: candidate.source.name, sourceDocumentHash: candidate.snapshot.sourceDocumentHash, currency: "TRY", amount: boundAmount, capturedAt: candidate.snapshot.capturedAt ?? null };
            continue;
          }
          if (candidate) nextCandidates[suggestion.rowId] = candidate;
          const match = suggestion.decision === "safe_candidate" ? suggestion.bestSuggestion : null;
          const amount = Number(match?.snapshot.amount);
          if (!match || match.snapshot.currency !== "TRY" || !Number.isFinite(amount) || amount < 0) continue;
          nextPrices[suggestion.rowId] = amount;
          nextEvidence[suggestion.rowId] = { snapshotId: match.snapshot.id, sourceId: match.source.id, sourceName: match.source.name, sourceDocumentHash: match.snapshot.sourceDocumentHash, currency: "TRY", amount, capturedAt: match.snapshot.capturedAt ?? null };
        }
        setUnitPrices(nextPrices);
        setPriceEvidence(nextEvidence);
        setMatchCandidates(nextCandidates);
        setPriceResolutionStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setUnitPrices({});
        setPriceEvidence({});
        setPriceResolutionStatus("blocked");
      }
    };
    void resolvePrices();
    return () => controller.abort();
  }, [allItems, priceLicenseMode, priceRefreshKey]);

  /** The user looked at a same-poz, same-unit catalogue price and binds it; transfer re-checks poz, unit and amount. */
  const bindMatchCandidate = (itemId: string, candidate: PriceSuggestionCandidate) => {
    boundSnapshotByItem.current = { ...boundSnapshotByItem.current, [itemId]: candidate.snapshot.id };
    const amount = Number(candidate.snapshot.amount);
    setUnitPrices((current) => ({ ...current, [itemId]: amount }));
    setPriceEvidence((current) => ({
      ...current,
      [itemId]: { snapshotId: candidate.snapshot.id, sourceId: candidate.source.id, sourceName: candidate.source.name, sourceDocumentHash: candidate.snapshot.sourceDocumentHash, currency: "TRY", amount, capturedAt: candidate.snapshot.capturedAt ?? null },
    }));
    setMatchCandidates(({ [itemId]: _bound, ...rest }) => rest);
  };

  const reviewItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setExpertMode(true);
    setActiveStep("icmal");
  };
  // Faz 2.5: 4735 Fiyat Farkı & ÇŞB 2026 – TÜİK 21 Alt Endeks Simülatörü (sıfır uydurma girdi)
  const [selectedTuikIndex, setSelectedTuikIndex] = useState<TuikSubIndexCode>("TUIK-23.6-HAZIR-BETON");
  const [tuikBaseIndexInput, setTuikBaseIndexInput] = useState<string>("");
  const [tuikCurrentIndexInput, setTuikCurrentIndexInput] = useState<string>("");
  const [tuikIndexedAppliedNote, setTuikIndexedAppliedNote] = useState<string | null>(null);

  const escalationPreview = useMemo(() => {
    if (!pricingComplete) return null;
    const e0 = parseFloat(tuikBaseIndexInput.replace(",", "."));
    const en = parseFloat(tuikCurrentIndexInput.replace(",", "."));
    if (!Number.isFinite(e0) || e0 <= 0 || !Number.isFinite(en) || en <= 0) {
      return null;
    }
    try {
      return computeContractPriceEscalation4735({
        progressPaymentAmountTl: costSummary.pricedGrandTotal,
        bFactor: 0.9,
        components: [
          {
            indexCode: selectedTuikIndex,
            weight: 1.0,
            baseIndex: e0,
            currentIndex: en,
          },
        ],
      });
    } catch {
      return null;
    }
  }, [costSummary.pricedGrandTotal, pricingComplete, selectedTuikIndex, tuikBaseIndexInput, tuikCurrentIndexInput]);

  const handleApplyTuikIndexToPrices = () => {
    const e0 = parseFloat(tuikBaseIndexInput.replace(",", "."));
    const en = parseFloat(tuikCurrentIndexInput.replace(",", "."));
    if (!Number.isFinite(e0) || e0 <= 0 || !Number.isFinite(en) || en <= 0) return;

    const evaluationDate = new Date().toISOString().slice(0, 10);
    const nextPrices: Record<string, number> = {};
    let lastWarning: string | null = null;

    for (const item of allItems) {
      const currentPrice = unitPrices[item.id];
      if (currentPrice === undefined) continue;
      const indexed = indexOutOfPeriodUnitPrice({
        itemCode: item.pozCode,
        itemName: item.title,
        baseUnitPriceTl: currentPrice,
        catalogValidityEnd: "2026-03-31",
        evaluationDate,
        indexCode: selectedTuikIndex,
        baseIndex: e0,
        currentIndex: en,
      });
      nextPrices[item.id] = indexed.indexedUnitPriceTl;
      lastWarning = indexed.warningLabel;
    }
    setUnitPrices(nextPrices);
    setPriceEvidence({});
    setPriceResolutionStatus("blocked");
    setTuikIndexedAppliedNote(
      lastWarning ??
        `TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat (${selectedTuikIndex} · E_n/E_0 = ${(en / e0).toFixed(4)})`,
    );
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        kikWorkCategory: KikWorkCategory;
        tenderYmInput: string;
        tenderBidsInput: string;
        cdeStateInput: CdeState | "";
        suitabilityInput: SuitabilityCode | "";
        revisionInput: string;
        deliveryStageInput: "COORDINATION" | "TENDER_OR_PERMIT";
        eirMilestoneInput: EirDeliveryMilestone;
        minhaProfile: MinhaRuleProfile;
        customMinhaThresholdInput: string;
      }>;
      if (parsed.kikWorkCategory) setKikWorkCategory(parsed.kikWorkCategory);
      if (typeof parsed.tenderYmInput === "string") setTenderYmInput(parsed.tenderYmInput);
      if (typeof parsed.tenderBidsInput === "string") setTenderBidsInput(parsed.tenderBidsInput);
      if (typeof parsed.cdeStateInput === "string") setCdeStateInput(parsed.cdeStateInput);
      if (typeof parsed.suitabilityInput === "string") setSuitabilityInput(parsed.suitabilityInput);
      if (typeof parsed.revisionInput === "string") setRevisionInput(parsed.revisionInput);
      if (parsed.deliveryStageInput) setDeliveryStageInput(parsed.deliveryStageInput);
      if (parsed.eirMilestoneInput) setEirMilestoneInput(parsed.eirMilestoneInput);
      if (parsed.minhaProfile) setMinhaProfile(parsed.minhaProfile);
      if (typeof parsed.customMinhaThresholdInput === "string") {
        setCustomMinhaThresholdInput(parsed.customMinhaThresholdInput);
      }
    } catch {
      // ignore localStorage read errors
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          kikWorkCategory,
          tenderYmInput,
          tenderBidsInput,
          cdeStateInput,
          suitabilityInput,
          revisionInput,
          deliveryStageInput,
          eirMilestoneInput,
          minhaProfile,
          customMinhaThresholdInput,
        }),
      );
    } catch {
      // ignore localStorage write errors
    }
  }, [
    cdeStateInput,
    customMinhaThresholdInput,
    deliveryStageInput,
    eirMilestoneInput,
    kikWorkCategory,
    minhaProfile,
    revisionInput,
    storageKey,
    suitabilityInput,
    tenderBidsInput,
    tenderYmInput,
  ]);

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

  const isoContainerIdentity = useMemo(
    () => parseContainerIdentity(dataset.projectTitle),
    [dataset.projectTitle],
  );

  const iso19650Evaluation = useMemo(
    () =>
      evaluateIso19650Compliance({
        fileName: dataset.projectTitle,
        cdeState: cdeStateInput || null,
        suitabilityCode: suitabilityInput || null,
        revisionCode: revisionInput.trim() || null,
        targetDeliveryStage: deliveryStageInput,
        eirMilestone: eirMilestoneInput,
        elements: allItems.map((it) => ({
          id: it.id,
          guid: it.id && !/^row-\d+$/i.test(it.id) ? it.id : null,
          type: it.groupKey === "structural" ? "IfcBuildingElement" : "IfcCovering",
          name: it.title,
          storey: it.storeyBreakdown?.[0]?.storeyLabel || null,
          material: it.subtitle || null,
          pozNo: it.pozCode || null,
          hasAdmissibleQuantity: it.netQuantity > 0,
        })),
      }),
    [
      allItems,
      cdeStateInput,
      dataset.projectTitle,
      deliveryStageInput,
      eirMilestoneInput,
      revisionInput,
      suitabilityInput,
    ],
  );

  const kikAdtAnalysis = useMemo(() => {
    const parsedYm = Number(tenderYmInput.replace(/\./g, "").replace(",", ".").trim());
    const validYm = Number.isFinite(parsedYm) && parsedYm > 0 ? parsedYm : null;
    const ourBid = Math.max(0, Math.round(costSummary.pricedGrandTotal));
    const parsedCompetitorBids = tenderBidsInput
      .split(/[;\n]+|(?:\s+)/)
      .flatMap((token) => token.split(","))
      .map((raw) => Number(raw.replace(/\./g, "").trim()))
      .filter((v) => Number.isFinite(v) && v > 0);
    const sessionBids =
      validYm && parsedCompetitorBids.length > 0 && pricingComplete ? [ourBid, ...parsedCompetitorBids] : [];

    return evaluateKikAbnormallyLowBid({
      estimatedCostTry: validYm,
      validBidsTry: sessionBids,
      ourBidTry: ourBid,
      workCategory: kikWorkCategory,
      lineItems: allItems.map((it) => ({
        id: it.id,
        code: it.pozCode,
        description: it.title,
        totalAmount: Math.round(it.netQuantity * (unitPrices[it.id] ?? 0)),
      })),
    });
  }, [allItems, costSummary.pricedGrandTotal, kikWorkCategory, pricingComplete, tenderBidsInput, tenderYmInput, unitPrices]);

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
              2. Daire Metrekareleri ({dataset.residentialUnitCount > 0 ? `${dataset.residentialUnitCount} Daire` : "daire bilgisi yok"})
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {formatGross(grossTotals.totalGeneralGrossM2, 0)} m²
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
            {pricingComplete ? formatTrCurrency(costSummary.pricedGrandTotal) : costPendingLabel}
          </span>
        </button>
      </div>

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
                    ? "Modeldeki kapı/pencere boşlukları kalem bazında gösterilir."
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
                      <option value="CSB_2026">ÇŞB 2026 (0,50 m²)</option>
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
                    <div className="flex justify-between"><span>Eşik (tekil boşluk alanı)</span><span className="font-mono tabular-nums">{formatTrNumber(openingsMinha.thresholdM2 ?? 0)} m²</span></div>
                    <div className="flex justify-between"><span>Düşülecek ({openingsMinha.deductedCount} adet)</span><span className="font-mono font-semibold tabular-nums">−{formatTrNumber(openingsMinha.deductedAreaM2)} m²</span></div>
                    <div className="flex justify-between"><span>Düşülmeyecek ({openingsMinha.notDeductedCount} adet)</span><span className="font-mono tabular-nums">{formatTrNumber(openingsMinha.notDeductedAreaM2)} m²</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>{openingsMinha.doorCount} kapı · {openingsMinha.windowCount} pencere</span><span>{openingsMinha.unmeasuredCount > 0 ? `${openingsMinha.unmeasuredCount} boşluğun ölçüsü okunamadı` : "tüm ölçüler okundu"}</span></div>
                    <p className="pt-1 text-[11px] text-muted-foreground">
                      {openingsMinha.applicationNote}
                    </p>
                  </div>
                )}
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

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
      )}

      {/* ADIM 03: MALİYET & TEKLİF (DÜZENLENEBİLİR BİRİM FİYATLAR + YAKLAŞIK MALİYET KARTI) */}
      {activeStep === "maliyet" && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SOL: BİRİM FİYAT CETVELİ */}
          <div className="lg:col-span-7 border border-border bg-background">
            <div className="px-6 py-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="section-index">03 / BİRİM FİYAT CETVELİ &amp; LİSANS MODU</span>
                <h3 className="font-display-serif text-2xl text-foreground mt-0.5">
                  Birim Fiyat ve Maliyet Cetveli
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Yalnız firmanıza ait, incelenmiş ve geçerlilik süresi dolmamış fiyatlar kullanılır. Fiyatı bulunmayan kalem tutara katılmaz ve teklife hazır sayılmaz.
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Fiyatlandırılan kalem: {priceResolutionStatus === "loading" ? "yükleniyor" : priceResolutionStatus === "blocked" ? "fiyat kaynağına erişilemedi" : `${costSummary.pricedItemCount}/${costSummary.itemCount}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Fiyat Kaynağı ve Lisans Modu"
                  value={priceLicenseMode}
                  onChange={(e) =>
                    setPriceLicenseMode(
                      e.target.value as "BYOL_TENANT_CATALOG" | "CSB_2026_REFERENCE",
                    )
                  }
                  className="border border-border bg-background px-2.5 py-1 text-[10px] font-mono text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="BYOL_TENANT_CATALOG">
                    Firma fiyat kataloğunuz
                  </option>
                  <option value="CSB_2026_REFERENCE">
                    ÇŞB 2026 birim fiyatları (kullanım izniniz varsa)
                  </option>
                </select>
                <span className="stamp-badge bg-primary/10 text-primary border-primary/40">
                  {tuikIndexedAppliedNote
                    ? "TÜİK endeksiyle güncellenmiş tahmini fiyat"
                    : "Fiyatlar kataloğunuzdan gelir"}
                </span>
                {costSummary.missingItemCount > 0 && (
                  <Link to="/app/fiyat-katalogu?kaynak=smartcheck" className="text-[11px] font-semibold text-primary underline">
                    Kataloğa fiyat ekle
                  </Link>
                )}
              </div>
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
                      {groupTotalLabel(costSummary.groupTotals[grpIdx])}
                    </span>
                  </div>

                  {grp.items.map((item) => {
                    const priced = isPriced(unitPrices, item.id);
                    const price = priced ? unitPrices[item.id] : null;
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 items-center px-6 py-3 hover:bg-card/50 transition-colors"
                      >
                        <div className="col-span-5 pr-3">
                          <div className="text-sm font-semibold text-foreground">{item.title}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">Poz: {publicPozCode(item.pozCode) || "Çözülmedi"}</div>
                          {priceEvidence[item.id] ? (
                            <div className="font-mono text-[10px] text-muted-foreground">
                              Kaynak: {priceEvidence[item.id].sourceName} · fiyat kaydı {priceEvidence[item.id].snapshotId.slice(0, 8)}
                            </div>
                          ) : priceResolutionStatus === "ready" ? (
                            <MissingPriceActions
                              item={item}
                              candidate={matchCandidates[item.id] ?? null}
                              onPriceAdded={() => setPriceRefreshKey((key) => key + 1)}
                              onUseCandidate={(candidate) => bindMatchCandidate(item.id, candidate)}
                              onReviewItem={() => reviewItem(item.id)}
                            />
                          ) : (
                            <div className="font-mono text-[10px] text-muted-foreground">Fiyat bulunamadı</div>
                          )}
                        </div>
                        <div className="col-span-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {formatTrNumber(item.netQuantity)} {item.unit}
                        </div>
                        <div className="col-span-2 text-right font-mono text-sm font-semibold tabular-nums" aria-label={`${item.title} birim fiyatı`}>
                          {price === null
                            ? <span className="text-amber-600 dark:text-amber-400">Eksik</span>
                            : <span className="text-foreground">{formatTrCurrency(price)}</span>}
                        </div>
                        <div className="col-span-3 text-right font-mono text-sm font-semibold tabular-nums">
                          {price === null
                            ? <span className="text-muted-foreground">Hesaplanmadı</span>
                            : <span className="text-foreground">{formatTrCurrency(item.netQuantity * price)}</span>}
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
                    aria-label="İdare Yaklaşık Maliyeti (YM - TL)"
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
                    aria-label="Rakip Teklifler (TL, noktalı virgül ile)"
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
                  {pricingComplete
                    ? "Sınır değer (SD) hesabı için ihale açılış tutanağındaki İdare Yaklaşık Maliyeti (YM) ve geçerli teklifleri giriniz (varsayılan uydurma değer kullanılmaz)."
                    : `Teklif tutarınız tüm kalemler fiyatlandıktan sonra sınır değerle karşılaştırılır (${costPendingLabel}).`}
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
                <span>
                  Tebliğ m.45.1.2 resmî %80 listesi:{" "}
                  <strong className="text-foreground">
                    {kikAdtAnalysis.officialExplanationListStatus === "evaluated"
                      ? `${kikAdtAnalysis.explanationRequiredItems.length} kalem`
                      : "Değerlendirilmedi"}
                  </strong>
                </span>
                <span className="stamp-badge bg-card text-muted-foreground">
                  EKAP Tutanak İçe Aktarımı: Yol Haritasında · 2026 Q4 (Faz 3)
                </span>
              </div>
              {kikAdtAnalysis.officialExplanationListStatus === "not_evaluated" && (
                <div className="mt-2 border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                  {kikAdtAnalysis.officialExplanationListReason} Teklif satırlarından üretilen {kikAdtAnalysis.advisoryOfferExplanationRequiredItems.length} kalem yalnız danışma karşılaştırmasıdır.
                </div>
              )}
            </div>

            {/* TS EN ISO 19650-1/2 & RG 33331 EK-2 CDE / LOIN BİLGİ YÖNETİMİ KARTI */}
            <div className="mt-4 border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                  ISO 19650 / EN 17412 · LİSANSLI METİN İNCELEMESİ GEREKİR
                </span>
                <span className="stamp-badge bg-card text-foreground">
                  LOIN ({iso19650Evaluation.loinMilestone?.targetLod ?? "LOD 350"}): %
                  {formatTrNumber(
                    iso19650Evaluation.loinMilestone?.overallCompletenessPercent ??
                      iso19650Evaluation.loin.alphanumericCompletenessRatio * 100,
                    1,
                  )}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">CDE Durumu</span>
                  <select
                    aria-label="ISO 19650 CDE Durumu"
                    value={cdeStateInput}
                    onChange={(e) => setCdeStateInput(e.target.value as CdeState | "")}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Seçilmedi</option>
                    <option value="WIP">WIP (Çalışma)</option>
                    <option value="SHARED">SHARED (Paylaşılan)</option>
                    <option value="PUBLISHED">PUBLISHED (Yayımlanan)</option>
                    <option value="ARCHIVED">ARCHIVED (Arşiv)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">Uygunluk Kodu</span>
                  <select
                    aria-label="ISO 19650 Uygunluk Kodu"
                    value={suitabilityInput}
                    onChange={(e) => setSuitabilityInput(e.target.value as SuitabilityCode | "")}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Seçilmedi</option>
                    <option value="S0">S0 (WIP)</option>
                    <option value="S1">S1 (Koordinasyon)</option>
                    <option value="S2">S2 (Bilgi İçin)</option>
                    <option value="S3">S3 (İnceleme/Yorum)</option>
                    <option value="S4">S4 (Aşama Onayı)</option>
                    <option value="S5">S5 (Yetkilendirilmiş)</option>
                    <option value="S6">S6 (PIM Yetkilendirme)</option>
                    <option value="S7">S7 (AIM Yetkilendirme)</option>
                    <option value="A1">A1 (İhale/İmalata Uygun)</option>
                    <option value="A2">A2 (İmalata Uygun)</option>
                    <option value="A3">A3 (İnşaata Uygun)</option>
                    <option value="A4">A4 (As-Built Teslim)</option>
                    <option value="A5">A5 (Varlık Yönetimi)</option>
                    <option value="A6">A6 (Arşiv Onayı)</option>
                    <option value="A7">A7 (Sözleşmesel Onay)</option>
                    <option value="B">B (Arşiv)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">Revizyon Kodu</span>
                  <input
                    type="text"
                    aria-label="ISO 19650 Revizyon Kodu"
                    value={revisionInput}
                    onChange={(e) => setRevisionInput(e.target.value)}
                    placeholder="Örn: P01.01 veya C01/001"
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">Teslim Aşaması</span>
                  <select
                    aria-label="ISO 19650 Teslim Aşaması"
                    value={deliveryStageInput}
                    onChange={(e) => setDeliveryStageInput(e.target.value as "COORDINATION" | "TENDER_OR_PERMIT")}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="COORDINATION">Tasarım Koordinasyonu</option>
                    <option value="TENDER_OR_PERMIT">İhale / e-PYS Ruhsat</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">EIR / LOIN Şablonu</span>
                  <select
                    aria-label="EIR LOIN Teslim Şablonu"
                    value={eirMilestoneInput}
                    onChange={(e) => setEirMilestoneInput(e.target.value as EirDeliveryMilestone)}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="CONCEPT">Avan Proje (LOD 200)</option>
                    <option value="DEFINITIVE">Kesin Proje (LOD 300)</option>
                    <option value="IMPLEMENTATION">Uygulama / Ruhsat (LOD 350)</option>
                    <option value="AS_BUILT">İş Sonu / As-Built (LOD 400)</option>
                  </select>
                </label>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Dosya Adı Şablonu:{" "}
                  <strong className="text-foreground">{isoContainerIdentity.namingStandard}</strong>
                </span>
                <span className="stamp-badge bg-card text-muted-foreground">Karar geçmişi: sunucuda kayıtlı</span>
              </div>

              <div className="mt-2.5 border border-border bg-card p-2.5 text-[11px] font-mono text-muted-foreground space-y-1.5">
                {iso19650Evaluation.cdeEvaluationStatus === "not_evaluated" ? (
                  <div>
                    CDE Değerlendirilmedi — Doküman CDE durumu, uygunluk ve revizyon kodu girildiğinde TS EN ISO 19650-2 geçiş kuralları denetlenir.
                  </div>
                ) : iso19650Evaluation.errors.length === 0 ? (
                  <div className="text-foreground font-semibold">
                    CDE Durumu Geçerli ({iso19650Evaluation.cdeState} · {iso19650Evaluation.suitabilityCode ?? "—"} · {iso19650Evaluation.revisionCode ?? "—"})
                  </div>
                ) : (
                  <div className="text-primary font-semibold">
                    {iso19650Evaluation.errors[0]}
                  </div>
                )}
              </div>
              <CdeWorkflowPanel
                documentId={documentId}
                targetState={cdeStateInput}
                suitabilityCode={suitabilityInput}
                revisionCode={revisionInput}
              />
            </div>

            {/* 4735 SAYILI KANUN FİYAT FARKI & ÇŞB 2026 – TÜİK 21 ALT ENDEKS MOTORU (FAZ 2.5) */}
            <div className="mt-4 border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                  4735 FİYAT FARKI (F = A_n × B × (P_n − 1)) · ÇŞB-TÜİK 21 ALT ENDEKS
                </span>
                <span className="stamp-badge bg-card text-foreground">
                  B = 0,90 · 21 Resmi Alt Endeks
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <label className="block sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    ÇŞB 2026 – TÜİK Alt Endeksi (21 Grup)
                  </span>
                  <select
                    aria-label="TÜİK Alt Endeks Seçimi"
                    value={selectedTuikIndex}
                    onChange={(e) => setSelectedTuikIndex(e.target.value as TuikSubIndexCode)}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  >
                    {CSB_2026_TUIK_SUB_INDICES.map((idx) => (
                      <option key={idx.code} value={idx.code}>
                        {idx.tuikSectorCode} — {idx.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    Temel Endeks (E_0 — Baz Ayı)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Temel Endeks (E_0 — Baz Ayı)"
                    value={tuikBaseIndexInput}
                    onChange={(e) => setTuikBaseIndexInput(e.target.value)}
                    placeholder="Örn: 240.00"
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    Güncel Endeks (E_n — Uygulama Ayı)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Güncel Endeks (E_n — Uygulama Ayı)"
                    value={tuikCurrentIndexInput}
                    onChange={(e) => setTuikCurrentIndexInput(e.target.value)}
                    placeholder="Örn: 276.00"
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none tabular-nums"
                  />
                </label>
              </div>

              {escalationPreview ? (
                <div className="mt-3 space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-border bg-card p-2">
                      <div className="text-[10px] text-muted-foreground">P_n Katsayısı</div>
                      <div className="mt-0.5 font-bold text-foreground tabular-nums">
                        {formatTrNumber(escalationPreview.pnFactor, 4)}
                      </div>
                    </div>
                    <div className="border border-border bg-card p-2">
                      <div className="text-[10px] text-muted-foreground">Fiyat Farkı (F)</div>
                      <div className="mt-0.5 font-bold text-primary tabular-nums">
                        {formatTrCurrency(escalationPreview.priceDifferenceTl)}
                      </div>
                    </div>
                    <div className="border border-border bg-card p-2">
                      <div className="text-[10px] text-muted-foreground">Güncel Toplam (A_n + F)</div>
                      <div className="mt-0.5 font-bold text-foreground tabular-nums">
                        {formatTrCurrency(escalationPreview.adjustedTotalTl)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {escalationPreview.formulaSummary}
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyTuikIndexToPrices}
                      className="border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      Birim Fiyatları E_n/E_0 İle Güncelle (Tahmini)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 border border-border bg-card p-2.5 text-[11px] font-mono text-muted-foreground">
                  {pricingComplete
                    ? "4735 Sayılı Kanun Fiyat Farkı (F = A_n × 0,90 × (P_n − 1)) ve dönem dışı birim fiyat güncellemesi için TÜİK Temel Endeks (E_0) ve Güncel Endeks (E_n) değerlerini giriniz (sabit enflasyon oranı varsayılmaz)."
                    : `Fiyat farkı, tüm kalemler fiyatlandıktan sonra hesaplanır (${costPendingLabel}).`}
                </div>
              )}

              {tuikIndexedAppliedNote && (
                <div className="mt-2 border border-primary/40 bg-primary/10 p-2 text-[10px] font-mono text-foreground">
                  {tuikIndexedAppliedNote}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
