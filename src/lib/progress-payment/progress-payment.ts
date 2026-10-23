/**
 * Pure progress-payment calculation domain.
 *
 * Authoritative values cross the boundary as decimal strings and are evaluated
 * with bigint fixed-point arithmetic. Quantity scale is 4; money scale is 2.
 * This module intentionally consumes only an already-approved price escalation
 * snapshot. It neither imports nor re-evaluates the price-escalation engine.
 */

export type PeriodStatus = 'draft' | 'approved' | 'locked';
export type VariationKind = 'addition' | 'omission';
export type AdjustmentKind = 'deduction' | 'advance_payment' | 'advance_recovery';

export interface ExpertDecision {
  status: 'pending' | 'approved' | 'rejected';
  reference: string;
  reviewer: string;
  decidedAt: string;
  evidenceSha256: string;
}

export interface ContractItemInput {
  id: string;
  description: string;
  unit: string;
  /** Decimal string, scale <= 4. */
  contractedQuantity: string;
  /** Decimal string, scale <= 2. */
  unitPrice: string;
}

export interface VariationInput {
  id: string;
  /** Immutable, 1-based contract change order. */
  sequence: number;
  itemId: string;
  kind: VariationKind;
  /** Positive decimal string, scale <= 4. */
  quantity: string;
  /** Optional expert-approved unit price; differing price allocation is fail-closed. */
  unitPrice?: string;
  decision: ExpertDecision;
}

export interface ProgressLineInput {
  itemId: string;
  /** Non-negative decimal string, scale <= 4. */
  currentQuantity: string;
}

export interface PeriodAdjustmentInput {
  id: string;
  kind: AdjustmentKind;
  /** Positive decimal string, scale <= 2. */
  amount: string;
  evidenceReference: string;
}

export interface ApprovedPriceEscalationSnapshotInput {
  snapshotId: string;
  status: 'calculated_review_required' | 'approved' | 'rejected';
  /** Signed decimal string, scale <= 2. */
  amount: string;
  approvedBy: string;
  approvedAt: string;
  sourceSha256: string;
}

export interface ProgressPeriodInput {
  id: string;
  sequence: number;
  status: PeriodStatus;
  lockEvidence?: {
    revision: number;
    lockedBy: string;
    lockedAt: string;
    evidenceSha256: string;
  };
  lines: ProgressLineInput[];
  adjustments: PeriodAdjustmentInput[];
  priceEscalationSnapshot?: ApprovedPriceEscalationSnapshotInput;
}

export interface ProgressPaymentCalculationInput {
  contractId: string;
  items: ContractItemInput[];
  variations: VariationInput[];
  periods: ProgressPeriodInput[];
  finalAccountRequested: boolean;
}

export interface CalculatedProgressLine {
  itemId: string;
  previousQuantity: string;
  currentQuantity: string;
  cumulativeQuantity: string;
  previousAmount: string;
  currentAmount: string;
  cumulativeAmount: string;
}

export interface CalculatedProgressPeriod {
  id: string;
  sequence: number;
  status: PeriodStatus;
  /** Draft periods are isolated previews and never change authoritative totals. */
  authority: 'preview' | 'authoritative';
  lines: CalculatedProgressLine[];
  grossWorkAmount: string;
  priceEscalation: string;
  deductions: string;
  advancePaid: string;
  advanceRecovered: string;
  netPayable: string;
}

export interface FinalAccountResult {
  status: 'open' | 'closed';
  baselineContractValue: string;
  approvedAdditions: string;
  approvedOmissions: string;
  revisedContractValue: string;
  measuredWorkValue: string;
  priceEscalation: string;
  deductions: string;
  advancePaid: string;
  advanceRecovered: string;
  outstandingAdvance: string;
  finalNetPayable: string;
}

export type ProgressPaymentCalculationResult =
  | {
      status: 'calculated';
      contractId: string;
      periods: CalculatedProgressPeriod[];
      finalAccount: FinalAccountResult;
    }
  | {
      status: 'manual_review';
      contractId: string;
      reasons: string[];
    };

const QUANTITY_SCALE = 10_000n;
const MAX_INT64 = 9_223_372_036_854_775_807n;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^[a-f0-9]{64}$/i;

class DomainReviewError extends Error {}

function review(message: string): never {
  throw new DomainReviewError(message);
}

function assertInt64(value: bigint, label: string): bigint {
  if (value > MAX_INT64 || value < -MAX_INT64) {
    review(`${label} int64 parasal/sayısal sınırını aşıyor; taşma riski nedeniyle uzman incelemesi gerekir.`);
  }
  return value;
}

function parseFixed(value: string, scale: number, label: string, allowNegative = false): bigint {
  if (typeof value !== 'string') review(`${label} decimal string olmalıdır.`);
  const pattern = allowNegative
    ? new RegExp(`^-?\\d+(?:\\.\\d{1,${scale}})?$`)
    : new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`);
  if (!pattern.test(value)) review(`${label} en fazla ${scale} ondalıklı geçerli bir sayı olmalıdır.`);

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const scaled = BigInt(whole) * (10n ** BigInt(scale))
    + BigInt(fraction.padEnd(scale, '0') || '0');
  return assertInt64(negative ? -scaled : scaled, label);
}

function formatFixed(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(scale);
  const whole = absolute / divisor;
  const fraction = (absolute % divisor).toString().padStart(scale, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** Round half away from zero while reducing an integer by a positive divisor. */
function divideRounded(value: bigint, divisor: bigint): bigint {
  return (value + divisor / 2n) / divisor;
}

function quantityTimesUnitPrice(quantityQ4: bigint, unitPriceCents: bigint, label: string): bigint {
  return assertInt64(divideRounded(quantityQ4 * unitPriceCents, QUANTITY_SCALE), label);
}

function addChecked(left: bigint, right: bigint, label: string): bigint {
  return assertInt64(left + right, label);
}

function nonBlank(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateApprovedDecision(variation: VariationInput): void {
  const decision = variation.decision;
  if (!isRecord(decision)
    || decision.status !== 'approved'
    || !nonBlank(decision.reference)
    || !nonBlank(decision.reviewer)
    || !validIsoDate(decision.decidedAt)
    || !SHA256.test(decision.evidenceSha256)) {
    review(`${variation.id} varyasyonu için eksiksiz uzman onayı ve doğrulanabilir karar kanıtı bulunmuyor.`);
  }
}

function validatePriceEscalationSnapshot(snapshot: ApprovedPriceEscalationSnapshotInput): bigint {
  if (snapshot.status !== 'approved'
    || !nonBlank(snapshot.snapshotId)
    || !nonBlank(snapshot.approvedBy)
    || !validIsoDate(snapshot.approvedAt)
    || !SHA256.test(snapshot.sourceSha256)) {
    review(`${snapshot.snapshotId || 'Fiyat farkı'} için onaylı ve kanıtlı fiyat farkı snapshot kaydı bulunmuyor.`);
  }
  return parseFixed(snapshot.amount, 2, `${snapshot.snapshotId} fiyat farkı`, true);
}

interface ItemState {
  input: ContractItemInput;
  baseQuantity: bigint;
  revisedQuantity: bigint;
  unitPriceCents: bigint;
  cumulativeQuantity: bigint;
}

function uniqueNonBlankId(id: string, seen: Set<string>, label: string): void {
  if (!nonBlank(id)) review(`${label} kimliği boş olamaz.`);
  if (seen.has(id)) review(`${label} kimliği yineleniyor: ${id}.`);
  seen.add(id);
}

export function calculateProgressPayment(input: ProgressPaymentCalculationInput): ProgressPaymentCalculationResult {
  const contractId = input && typeof input === 'object' && typeof input.contractId === 'string'
    ? input.contractId
    : '';
  try {
    if (!input || typeof input !== 'object') review('Hakediş hesap girdisi nesne olmalıdır.');
    if (!nonBlank(input.contractId)) review('Sözleşme kimliği zorunludur.');
    if (!Array.isArray(input.items) || !Array.isArray(input.variations) || !Array.isArray(input.periods)) {
      review('Sözleşme kalemleri, varyasyonlar ve dönemler dizi olarak sağlanmalıdır.');
    }
    if (typeof input.finalAccountRequested !== 'boolean') {
      review('Final hesap talebi boolean olmalıdır.');
    }
    if (input.items.length === 0) review('En az bir sözleşme kalemi zorunludur.');

    const itemIds = new Set<string>();
    const itemStates = new Map<string, ItemState>();
    let baselineContractValue = 0n;
    for (const item of input.items) {
      if (!isRecord(item)) review('Sözleşme kalemi nesne olmalıdır.');
      uniqueNonBlankId(item.id, itemIds, 'Sözleşme kalemi');
      if (!nonBlank(item.description) || !nonBlank(item.unit)) review(`${item.id} açıklama ve birim bilgisi eksik.`);
      const baseQuantity = parseFixed(item.contractedQuantity, 4, `${item.id} sözleşme miktarı`);
      const unitPriceCents = parseFixed(item.unitPrice, 2, `${item.id} birim fiyatı`);
      if (baseQuantity <= 0n || unitPriceCents < 0n) review(`${item.id} miktarı pozitif, birim fiyatı negatif olmayan değer olmalıdır.`);
      baselineContractValue = addChecked(
        baselineContractValue,
        quantityTimesUnitPrice(baseQuantity, unitPriceCents, `${item.id} başlangıç tutarı`),
        'Başlangıç sözleşme bedeli',
      );
      itemStates.set(item.id, { input: item, baseQuantity, revisedQuantity: baseQuantity, unitPriceCents, cumulativeQuantity: 0n });
    }

    const variationIds = new Set<string>();
    let approvedAdditions = 0n;
    let approvedOmissions = 0n;
    for (let variationIndex = 0; variationIndex < input.variations.length; variationIndex += 1) {
      const variation = input.variations[variationIndex];
      if (!isRecord(variation)) review('Varyasyon girdisi nesne olmalıdır.');
      uniqueNonBlankId(variation.id, variationIds, 'Varyasyon');
      if (!Number.isSafeInteger(variation.sequence) || variation.sequence !== variationIndex + 1) {
        review(`Varyasyon sıra numaraları 1'den başlayan artan ve ardışık düzende olmalıdır.`);
      }
      if (variation.kind !== 'addition' && variation.kind !== 'omission') {
        review(`${variation.id} varyasyon türü addition veya omission olmalıdır.`);
      }
      validateApprovedDecision(variation);
      const item = itemStates.get(variation.itemId);
      if (!item) review(`${variation.id} varyasyonu bilinmeyen ${variation.itemId} kalemine bağlı.`);
      const quantity = parseFixed(variation.quantity, 4, `${variation.id} varyasyon miktarı`);
      if (quantity <= 0n) review(`${variation.id} varyasyon miktarı pozitif olmalıdır.`);
      const variationPrice = variation.unitPrice === undefined
        ? item.unitPriceCents
        : parseFixed(variation.unitPrice, 2, `${variation.id} onaylı birim fiyatı`);
      if (variationPrice !== item.unitPriceCents) {
        review(`${variation.id} farklı birim fiyat içeriyor; baz/varyasyon miktar tahsisi için kapsam dışı uzman kararı gerekir.`);
      }
      const value = quantityTimesUnitPrice(quantity, variationPrice, `${variation.id} varyasyon tutarı`);
      if (variation.kind === 'addition') {
        item.revisedQuantity = addChecked(item.revisedQuantity, quantity, `${variation.id} revize miktarı`);
        approvedAdditions = addChecked(approvedAdditions, value, 'Onaylı artışlar');
      } else {
        if (quantity > item.revisedQuantity) review(`${variation.id} eksilişi mevcut sözleşme miktarını aşıyor.`);
        item.revisedQuantity -= quantity;
        approvedOmissions = addChecked(approvedOmissions, value, 'Onaylı eksilişler');
      }
    }

    const periodIds = new Set<string>();
    const adjustmentIds = new Set<string>();
    const snapshotIds = new Set<string>();
    const periods: CalculatedProgressPeriod[] = [];
    let measuredWorkValue = 0n;
    let totalEscalation = 0n;
    let totalDeductions = 0n;
    let totalAdvancePaid = 0n;
    let totalAdvanceRecovered = 0n;

    for (let periodIndex = 0; periodIndex < input.periods.length; periodIndex += 1) {
      const period = input.periods[periodIndex];
      if (!isRecord(period)) review('Hakediş dönemi nesne olmalıdır.');
      uniqueNonBlankId(period.id, periodIds, 'Hakediş dönemi');
      if (period.status !== 'draft' && period.status !== 'approved' && period.status !== 'locked') {
        review(`${period.id} dönem durumu draft, approved veya locked olmalıdır.`);
      }
      if (period.status === 'locked') {
        const lock = period.lockEvidence;
        if (!isRecord(lock)
          || !Number.isSafeInteger(lock.revision)
          || Number(lock.revision) < 1
          || !nonBlank(lock.lockedBy)
          || !validIsoDate(lock.lockedAt)
          || !SHA256.test(lock.evidenceSha256)) {
          review(`${period.id} kilit durumu için revizyon ve doğrulanabilir kilit kanıtı zorunludur.`);
        }
      }
      if (!Array.isArray(period.lines) || !Array.isArray(period.adjustments)) {
        review(`${period.id} kalemleri ve düzeltmeleri dizi olmalıdır.`);
      }
      if (!Number.isSafeInteger(period.sequence) || period.sequence !== periodIndex + 1) {
        review(`Hakediş dönem sıra numaraları 1'den başlayan artan ve ardışık düzende olmalıdır.`);
      }
      const isAuthoritative = period.status !== 'draft';

      const lineItemIds = new Set<string>();
      const calculatedLines: CalculatedProgressLine[] = [];
      let grossWorkAmount = 0n;
      for (const line of period.lines) {
        if (!isRecord(line)) review(`${period.id} dönem kalemi nesne olmalıdır.`);
        uniqueNonBlankId(line.itemId, lineItemIds, `${period.id} dönem kalemi`);
        const item = itemStates.get(line.itemId);
        if (!item) review(`${period.id} dönemi bilinmeyen ${line.itemId} kalemini içeriyor.`);
        const currentQuantity = parseFixed(line.currentQuantity, 4, `${period.id}/${line.itemId} bu dönem miktarı`);
        const cumulativeQuantity = addChecked(item.cumulativeQuantity, currentQuantity, `${line.itemId} kümülatif miktarı`);
        if (cumulativeQuantity > item.revisedQuantity) {
          review(`${period.id}/${line.itemId} kümülatif miktarı onaylı revize sözleşme kapsamını aşıyor.`);
        }
        const previousAmount = quantityTimesUnitPrice(item.cumulativeQuantity, item.unitPriceCents, `${line.itemId} önceki tutarı`);
        const cumulativeAmount = quantityTimesUnitPrice(cumulativeQuantity, item.unitPriceCents, `${line.itemId} kümülatif tutarı`);
        // Hakediş kuruşu kümülatif değer üzerinden kesinleşir. Her dönemi bağımsız
        // yuvarlamak, tekrar eden alt-kuruş miktarlarda toplam fazla ödeme yaratır.
        const currentAmount = assertInt64(cumulativeAmount - previousAmount, `${line.itemId} bu dönem tutarı`);
        grossWorkAmount = addChecked(grossWorkAmount, currentAmount, `${period.id} imalat tutarı`);
        calculatedLines.push({
          itemId: line.itemId,
          previousQuantity: formatFixed(item.cumulativeQuantity, 4),
          currentQuantity: formatFixed(currentQuantity, 4),
          cumulativeQuantity: formatFixed(cumulativeQuantity, 4),
          previousAmount: formatFixed(previousAmount, 2),
          currentAmount: formatFixed(currentAmount, 2),
          cumulativeAmount: formatFixed(cumulativeAmount, 2),
        });
        if (isAuthoritative) item.cumulativeQuantity = cumulativeQuantity;
      }

      let deductions = 0n;
      let advancePaid = 0n;
      let advanceRecovered = 0n;
      for (const adjustment of period.adjustments) {
        if (!isRecord(adjustment)) review(`${period.id} düzeltmesi nesne olmalıdır.`);
        uniqueNonBlankId(adjustment.id, adjustmentIds, 'Hakediş düzeltmesi');
        if (adjustment.kind !== 'deduction'
          && adjustment.kind !== 'advance_payment'
          && adjustment.kind !== 'advance_recovery') {
          review(`${adjustment.id} düzeltme türü deduction, advance_payment veya advance_recovery olmalıdır.`);
        }
        if (!nonBlank(adjustment.evidenceReference)) review(`${adjustment.id} için dayanak/kanıt referansı zorunludur.`);
        const amount = parseFixed(adjustment.amount, 2, `${adjustment.id} tutarı`);
        if (amount <= 0n) review(`${adjustment.id} tutarı pozitif olmalıdır.`);
        if (adjustment.kind === 'deduction') deductions = addChecked(deductions, amount, `${period.id} kesintileri`);
        if (adjustment.kind === 'advance_payment') advancePaid = addChecked(advancePaid, amount, `${period.id} avansı`);
        if (adjustment.kind === 'advance_recovery') advanceRecovered = addChecked(advanceRecovered, amount, `${period.id} avans mahsubu`);
      }

      let priceEscalation = 0n;
      if (period.priceEscalationSnapshot) {
        uniqueNonBlankId(period.priceEscalationSnapshot.snapshotId, snapshotIds, 'Fiyat farkı snapshot');
        priceEscalation = validatePriceEscalationSnapshot(period.priceEscalationSnapshot);
      }

      const prospectiveAdvancePaid = addChecked(totalAdvancePaid, advancePaid, 'Toplam avans');
      const prospectiveAdvanceRecovered = addChecked(totalAdvanceRecovered, advanceRecovered, 'Toplam avans mahsubu');
      if (prospectiveAdvanceRecovered > prospectiveAdvancePaid) {
        review(`${period.id} avans mahsubu, bu döneme kadar kanıtlanan avans ödemesini aşıyor.`);
      }
      if (isAuthoritative) {
        measuredWorkValue = addChecked(measuredWorkValue, grossWorkAmount, 'Kümülatif ölçülen imalat');
        totalEscalation = addChecked(totalEscalation, priceEscalation, 'Toplam fiyat farkı');
        totalDeductions = addChecked(totalDeductions, deductions, 'Toplam kesinti');
        totalAdvancePaid = prospectiveAdvancePaid;
        totalAdvanceRecovered = prospectiveAdvanceRecovered;
      }
      let netPayable = addChecked(grossWorkAmount, priceEscalation, `${period.id} net ödeme`);
      netPayable = addChecked(netPayable, advancePaid, `${period.id} net ödeme`);
      netPayable = addChecked(netPayable, -deductions, `${period.id} net ödeme`);
      netPayable = addChecked(netPayable, -advanceRecovered, `${period.id} net ödeme`);

      periods.push({
        id: period.id,
        sequence: period.sequence,
        status: period.status,
        authority: isAuthoritative ? 'authoritative' : 'preview',
        lines: calculatedLines,
        grossWorkAmount: formatFixed(grossWorkAmount, 2),
        priceEscalation: formatFixed(priceEscalation, 2),
        deductions: formatFixed(deductions, 2),
        advancePaid: formatFixed(advancePaid, 2),
        advanceRecovered: formatFixed(advanceRecovered, 2),
        netPayable: formatFixed(netPayable, 2),
      });
    }

    const revisedContractValue = addChecked(
      addChecked(baselineContractValue, approvedAdditions, 'Revize sözleşme bedeli'),
      -approvedOmissions,
      'Revize sözleşme bedeli',
    );
    const outstandingAdvance = addChecked(totalAdvancePaid, -totalAdvanceRecovered, 'Açık avans bakiyesi');

    if (input.finalAccountRequested) {
      if (input.periods.some((period) => period.status !== 'locked')) {
        review('Final hesap yalnız tüm hakediş dönemleri onaylanıp kilitli olduğunda kapatılabilir.');
      }
      for (const item of itemStates.values()) {
        if (item.cumulativeQuantity !== item.revisedQuantity) {
          review(`${item.input.id} kesin miktarı revize sözleşme miktarıyla eşleşmediği için final hesap kapatılamaz.`);
        }
      }
      if (outstandingAdvance !== 0n) review('Final hesapta avans bakiyesi tamamen mahsup edilmelidir.');
    }

    let finalNetPayable = addChecked(measuredWorkValue, totalEscalation, 'Final net ödeme');
    finalNetPayable = addChecked(finalNetPayable, -totalDeductions, 'Final net ödeme');
    finalNetPayable = addChecked(finalNetPayable, totalAdvancePaid, 'Final net ödeme');
    finalNetPayable = addChecked(finalNetPayable, -totalAdvanceRecovered, 'Final net ödeme');

    return {
      status: 'calculated',
      contractId,
      periods,
      finalAccount: {
        status: input.finalAccountRequested ? 'closed' : 'open',
        baselineContractValue: formatFixed(baselineContractValue, 2),
        approvedAdditions: formatFixed(approvedAdditions, 2),
        approvedOmissions: formatFixed(approvedOmissions, 2),
        revisedContractValue: formatFixed(revisedContractValue, 2),
        measuredWorkValue: formatFixed(measuredWorkValue, 2),
        priceEscalation: formatFixed(totalEscalation, 2),
        deductions: formatFixed(totalDeductions, 2),
        advancePaid: formatFixed(totalAdvancePaid, 2),
        advanceRecovered: formatFixed(totalAdvanceRecovered, 2),
        outstandingAdvance: formatFixed(outstandingAdvance, 2),
        finalNetPayable: formatFixed(finalNetPayable, 2),
      },
    };
  } catch (error) {
    if (error instanceof DomainReviewError) {
      return { status: 'manual_review', contractId, reasons: [error.message] };
    }
    throw error;
  }
}
