import type { QuoteItem } from "@/types";

export interface LegacyIfcTransferSummary {
  beamCount?: number;
  beamVolumeM3?: number;
  columnCount?: number;
  columnVolumeM3?: number;
  slabCount?: number;
  slabVolumeM3?: number;
  wallCount?: number;
  wallVolumeM3?: number;
  coveringCount?: number;
  coveringAreaM2?: number;
  totalRebarTon?: number;
  totalFormworkM2?: number;
  extractionMode?: string;
}

export interface IfcSkippedTransferItem {
  code: "REBAR_REQUIRES_MODEL_EVIDENCE" | "FORMWORK_REQUIRES_MODEL_EVIDENCE";
  label: string;
  reason: string;
}

export interface IfcQuoteTransferResult {
  items: Partial<QuoteItem>[];
  skipped: IfcSkippedTransferItem[];
  warnings: string[];
}

interface BuildIfcEstimateQuoteItemsOptions {
  idFactory?: () => string;
  includeDerivedEstimates?: boolean;
}

const IFC_ESTIMATE_SOURCE_REFERENCE =
  "IFC demo_estimate browser parser; source quantity requires technical review";

const REVIEW_WARNING =
  "IFC browser parser output is a demo_estimate. Quantities are model estimates and must be technically reviewed before quotation approval.";

const PRICE_WARNING =
  "Birim fiyat ve maliyet aktarılmaz: her kaleme onaylı bir kaynaktan birim fiyat girilmelidir.";

function positiveNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function makeEstimateItem(
  id: string,
  description: string,
  quantity: number,
  unit: "m3" | "m2" | "ton" = "m3",
): Partial<QuoteItem> {
  // Prices are left empty on purpose: the browser parser has no approved price source.
  return {
    id,
    description,
    unit,
    quantity,
    unitPrice: 0,
    costCategory: "material",
    quantitySource: "model_estimate",
    priceSource: "manual",
    sourceReference: IFC_ESTIMATE_SOURCE_REFERENCE,
    verificationStatus: "needs_review",
    discountPercent: 0,
    vatPercent: 20,
    total: 0,
  };
}

export function buildIfcEstimateQuoteItems(
  summary: LegacyIfcTransferSummary | null | undefined,
  options: BuildIfcEstimateQuoteItemsOptions = {},
): IfcQuoteTransferResult {
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const transferSummary = summary ?? {};
  const items: Partial<QuoteItem>[] = [];
  const skipped: IfcSkippedTransferItem[] = [];

  const beamVolumeM3 = positiveNumber(transferSummary.beamVolumeM3);
  const columnVolumeM3 = positiveNumber(transferSummary.columnVolumeM3);
  const slabVolumeM3 = positiveNumber(transferSummary.slabVolumeM3);
  const wallVolumeM3 = positiveNumber(transferSummary.wallVolumeM3);
  const coveringAreaM2 = positiveNumber(transferSummary.coveringAreaM2);

  if (beamVolumeM3 > 0) {
    items.push(makeEstimateItem(
      idFactory(),
      `IFC On Analiz: IfcBeam kiris betonarme imalati (${transferSummary.beamCount ?? 0} adet, review gerekli)`,
      beamVolumeM3,
    ));
  }

  if (columnVolumeM3 > 0) {
    items.push(makeEstimateItem(
      idFactory(),
      `IFC On Analiz: IfcColumn kolon betonarme imalati (${transferSummary.columnCount ?? 0} adet, review gerekli)`,
      columnVolumeM3,
    ));
  }

  if (slabVolumeM3 > 0) {
    items.push(makeEstimateItem(
      idFactory(),
      `IFC On Analiz: IfcSlab doseme betonarme imalati (${transferSummary.slabCount ?? 0} adet, review gerekli)`,
      slabVolumeM3,
    ));
  }

  if (wallVolumeM3 > 0) {
    items.push(makeEstimateItem(
      idFactory(),
      `IFC On Analiz: IfcWall perde/duvar imalati (${transferSummary.wallCount ?? 0} adet, review gerekli)`,
      wallVolumeM3,
    ));
  }

  if (coveringAreaM2 > 0) {
    items.push(makeEstimateItem(
      idFactory(),
      `IFC On Analiz: IfcCovering kaplama/ince is imalati (${transferSummary.coveringCount ?? 0} adet, review gerekli)`,
      coveringAreaM2,
      "m2",
    ));
  }

  const totalRebarTon = positiveNumber(transferSummary.totalRebarTon);
  if (totalRebarTon > 0) {
    if (options.includeDerivedEstimates) {
      items.push(makeEstimateItem(
        idFactory(),
        "IFC On Analiz: B420C betonarme donati celigi imalati (tahmini tonaj, review gerekli)",
        totalRebarTon,
        "ton",
      ));
    } else {
      skipped.push({
        code: "REBAR_REQUIRES_MODEL_EVIDENCE",
        label: "Donati tonaji",
        reason: "Rebar is not transferred from the legacy IFC estimate path without IfcReinforcingBar, QTO, approved property, or reviewer evidence.",
      });
    }
  }

  const totalFormworkM2 = positiveNumber(transferSummary.totalFormworkM2);
  if (totalFormworkM2 > 0) {
    if (options.includeDerivedEstimates) {
      items.push(makeEstimateItem(
        idFactory(),
        "IFC On Analiz: Betonarme kalip ve iskele imalati (tahmini alan, review gerekli)",
        totalFormworkM2,
        "m2",
      ));
    } else {
      skipped.push({
        code: "FORMWORK_REQUIRES_MODEL_EVIDENCE",
        label: "Kalip alani",
        reason: "Formwork is not transferred from the legacy IFC estimate path until opening, contact-surface, and net/gross rules are implemented.",
      });
    }
  }

  return {
    items,
    skipped,
    warnings: [REVIEW_WARNING, PRICE_WARNING],
  };
}

export interface IfcTransferredUnitPrices {
  concrete?: number;
  rebar?: number;
  formwork?: number;
  covering?: number;
  beton?: number;
  donati?: number;
  kalip?: number;
  kaplama?: number;
}

export function applyIfcTransferredUnitPrices(
  items: Partial<QuoteItem>[],
  unitPrices: IfcTransferredUnitPrices | null | undefined,
): Partial<QuoteItem>[] {
  if (!unitPrices || typeof unitPrices !== "object") {
    return items;
  }

  const concretePrice = positiveNumber(unitPrices.concrete ?? unitPrices.beton);
  const rebarPrice = positiveNumber(unitPrices.rebar ?? unitPrices.donati);
  const formworkPrice = positiveNumber(unitPrices.formwork ?? unitPrices.kalip);
  const coveringPrice = positiveNumber(unitPrices.covering ?? unitPrices.kaplama);

  return items.map((item) => {
    let unitPrice = positiveNumber(item.unitPrice);
    const desc = (item.description ?? "").toLowerCase();
    const isCovering = desc.includes("ifccovering") || desc.includes("kaplama");

    if (item.unit === "m3" && concretePrice > 0) {
      unitPrice = concretePrice;
    } else if (item.unit === "ton" && rebarPrice > 0) {
      unitPrice = rebarPrice;
    } else if (item.unit === "m2") {
      if (isCovering) {
        if (coveringPrice > 0) unitPrice = coveringPrice;
      } else if (formworkPrice > 0) {
        unitPrice = formworkPrice;
      }
    }

    const quantity = positiveNumber(item.quantity);
    const discountPercent = positiveNumber(item.discountPercent);
    const total = Number((quantity * unitPrice * (1 - discountPercent / 100)).toFixed(2));

    return {
      ...item,
      unitPrice,
      total,
    };
  });
}

