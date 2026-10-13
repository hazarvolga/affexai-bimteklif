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
): Partial<QuoteItem> {
  // Prices are left empty on purpose: the browser parser has no approved price source.
  return {
    id,
    description,
    unit: "m3",
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

  if (positiveNumber(transferSummary.totalRebarTon) > 0) {
    skipped.push({
      code: "REBAR_REQUIRES_MODEL_EVIDENCE",
      label: "Donati tonaji",
      reason: "Rebar is not transferred from the legacy IFC estimate path without IfcReinforcingBar, QTO, approved property, or reviewer evidence.",
    });
  }

  if (positiveNumber(transferSummary.totalFormworkM2) > 0) {
    skipped.push({
      code: "FORMWORK_REQUIRES_MODEL_EVIDENCE",
      label: "Kalip alani",
      reason: "Formwork is not transferred from the legacy IFC estimate path until opening, contact-surface, and net/gross rules are implemented.",
    });
  }

  return {
    items,
    skipped,
    warnings: [REVIEW_WARNING, PRICE_WARNING],
  };
}
