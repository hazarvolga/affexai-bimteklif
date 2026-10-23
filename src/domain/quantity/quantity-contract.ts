export type QuantityUnit = "m2" | "m3" | "m" | "kg" | "ton" | "adet";
export type QuantityUnitInput = QuantityUnit | "mtül" | string;

export interface VerifiedDimensionEvidence {
  value: number;
  verificationStatus: "verified" | "unverified";
  sourceReference: string;
}

export interface QuantityConversionEvidence {
  thicknessM?: VerifiedDimensionEvidence;
  heightM?: VerifiedDimensionEvidence;
  perimeterM?: VerifiedDimensionEvidence;
}

export interface QuantityConversionRequest {
  value: number;
  fromUnit: QuantityUnitInput;
  toUnit: QuantityUnitInput;
  evidence?: QuantityConversionEvidence;
}

export interface ReadyQuantityConversion {
  status: "ready";
  value: number;
  unit: QuantityUnit;
  formula: string;
  evidence: string[];
  missingInputs?: never;
  reason?: never;
}

export interface RequiredQuantityConversionInput {
  status: "requires_input";
  value?: undefined;
  unit: QuantityUnit | null;
  missingInputs: string[];
  reason: string;
  formula?: never;
  evidence?: never;
}

export type QuantityConversionResult = ReadyQuantityConversion | RequiredQuantityConversionInput;

export interface QuantityValue {
  value: number;
  unit: QuantityUnitInput;
}

export interface QuantityDeduction extends QuantityValue {
  sourceReference?: string;
}

export interface PaymentQuantityInput {
  quantity: QuantityValue;
  verificationStatus: "verified" | "unverified";
  sourceReference: string;
}

export interface QuantityLedgerInput {
  gross: QuantityValue;
  deductions: QuantityDeduction[];
  wastePercent: number;
  offerQuantity?: QuantityValue;
  payment?: PaymentQuantityInput;
}

export interface EvaluatedPaymentQuantity {
  status: "evaluated";
  quantity: number;
  reason: null;
  sourceReference: string;
}

export interface NotEvaluatedPaymentQuantity {
  status: "not_evaluated";
  quantity: null;
  reason: string;
  sourceReference?: never;
}

export type PaymentQuantity = EvaluatedPaymentQuantity | NotEvaluatedPaymentQuantity;

export interface ReadyQuantityLedger {
  status: "ready";
  unit: QuantityUnit;
  grossQuantity: number;
  deductionQuantity: number;
  netQuantity: number;
  wastePercent: number;
  wasteQuantity: number;
  costQuantity: number;
  offerQuantity: number;
  payment: PaymentQuantity;
  evidence: string[];
  missingInputs?: never;
  reason?: never;
}

export interface RequiredQuantityLedgerInput {
  status: "requires_input";
  unit: QuantityUnit | null;
  missingInputs: string[];
  reason: string;
  grossQuantity?: never;
  deductionQuantity?: never;
  netQuantity?: never;
  wastePercent?: never;
  wasteQuantity?: never;
  costQuantity?: never;
  offerQuantity?: never;
  payment?: never;
  evidence?: never;
}

export type QuantityLedger = ReadyQuantityLedger | RequiredQuantityLedgerInput;

const UNIT_ALIASES: Readonly<Record<string, QuantityUnit>> = {
  m2: "m2",
  "m²": "m2",
  m3: "m3",
  "m³": "m3",
  m: "m",
  mt: "m",
  mtul: "m",
  "mtül": "m",
  kg: "kg",
  ton: "ton",
  adet: "adet",
};

const roundQuantity = (value: number): number => Number(value.toFixed(12));

const isNonNegativeFinite = (value: number): boolean => Number.isFinite(value) && value >= 0;

const isVerifiedDimension = (evidence: VerifiedDimensionEvidence | undefined): evidence is VerifiedDimensionEvidence => (
  evidence?.verificationStatus === "verified"
  && Number.isFinite(evidence.value)
  && evidence.value > 0
  && evidence.sourceReference.trim().length > 0
);

export function normalizeQuantityUnit(unit: QuantityUnitInput): QuantityUnit | null {
  if (typeof unit !== "string") return null;
  return UNIT_ALIASES[unit.trim().toLocaleLowerCase("tr-TR")] ?? null;
}

function requiresConversionInput(
  unit: QuantityUnit | null,
  missingInputs: string[],
  reason: string,
): RequiredQuantityConversionInput {
  return { status: "requires_input", unit, missingInputs, reason };
}

function readyConversion(
  value: number,
  unit: QuantityUnit,
  formula: string,
  evidence: string[] = [],
): ReadyQuantityConversion {
  return { status: "ready", value: roundQuantity(value), unit, formula, evidence };
}

/**
 * Converts only dimensionally equivalent quantities. Cross-dimension conversions
 * remain blocked until their dimensional basis is both positive and verified.
 */
export function convertQuantity(request: QuantityConversionRequest): QuantityConversionResult {
  const fromUnit = normalizeQuantityUnit(request.fromUnit);
  const toUnit = normalizeQuantityUnit(request.toUnit);
  if (!fromUnit || !toUnit) {
    return requiresConversionInput(toUnit, ["valid_unit"], "source and target units must use the quantity contract");
  }
  if (!isNonNegativeFinite(request.value)) {
    return requiresConversionInput(toUnit, ["non_negative_finite_value"], "quantity must be a non-negative finite number");
  }
  if (fromUnit === toUnit) {
    return readyConversion(request.value, toUnit, `${request.value} ${fromUnit}`);
  }
  if (fromUnit === "kg" && toUnit === "ton") {
    return readyConversion(request.value / 1_000, toUnit, `${request.value} kg / 1000`);
  }
  if (fromUnit === "ton" && toUnit === "kg") {
    return readyConversion(request.value * 1_000, toUnit, `${request.value} ton * 1000`);
  }

  const thickness = request.evidence?.thicknessM;
  if ((fromUnit === "m2" && toUnit === "m3") || (fromUnit === "m3" && toUnit === "m2")) {
    if (!isVerifiedDimension(thickness)) {
      return requiresConversionInput(toUnit, ["verified_thickness_m"], "m2-m3 conversion requires verified thickness evidence");
    }
    const value = fromUnit === "m2" ? request.value * thickness.value : request.value / thickness.value;
    const operator = fromUnit === "m2" ? "*" : "/";
    return readyConversion(value, toUnit, `${request.value} ${fromUnit} ${operator} ${thickness.value} m`, [thickness.sourceReference]);
  }

  const height = request.evidence?.heightM;
  const perimeter = request.evidence?.perimeterM;
  if (fromUnit === "m2" && toUnit === "m") {
    if (isVerifiedDimension(perimeter)) {
      return readyConversion(perimeter.value, toUnit, `verified perimeter ${perimeter.value} m`, [perimeter.sourceReference]);
    }
    if (isVerifiedDimension(height)) {
      return readyConversion(request.value / height.value, toUnit, `${request.value} m2 / ${height.value} m`, [height.sourceReference]);
    }
    return requiresConversionInput(toUnit, ["verified_height_m_or_perimeter_m"], "m2-m conversion requires verified height or perimeter evidence");
  }
  if (fromUnit === "m" && toUnit === "m2") {
    if (!isVerifiedDimension(height)) {
      return requiresConversionInput(toUnit, ["verified_height_m"], "m-m2 conversion requires verified height evidence");
    }
    return readyConversion(request.value * height.value, toUnit, `${request.value} m * ${height.value} m`, [height.sourceReference]);
  }

  return requiresConversionInput(toUnit, ["supported_conversion_basis"], `conversion from ${fromUnit} to ${toUnit} is not supported`);
}

function requiresLedgerInput(
  unit: QuantityUnit | null,
  missingInputs: string[],
  reason: string,
): RequiredQuantityLedgerInput {
  return { status: "requires_input", unit, missingInputs, reason };
}

/**
 * Produces an auditable ledger without substituting net, cost, offer or payment
 * quantities for one another. Payment remains not_evaluated without verified evidence.
 */
export function buildQuantityLedger(input: QuantityLedgerInput): QuantityLedger {
  const unit = normalizeQuantityUnit(input.gross.unit);
  if (!unit || !isNonNegativeFinite(input.gross.value)) {
    return requiresLedgerInput(unit, ["valid_gross_quantity"], "gross quantity and unit must be valid");
  }

  const deductionUnits = input.deductions.map((deduction) => normalizeQuantityUnit(deduction.unit));
  if (deductionUnits.some((deductionUnit) => deductionUnit !== unit)) {
    return requiresLedgerInput(unit, ["deductions_in_gross_unit"], "all deductions must use the gross quantity unit");
  }
  if (input.deductions.some((deduction) => !isNonNegativeFinite(deduction.value))) {
    return requiresLedgerInput(unit, ["valid_deductions"], "deductions must be non-negative finite numbers");
  }

  const deductionQuantity = roundQuantity(input.deductions.reduce((sum, deduction) => sum + deduction.value, 0));
  if (deductionQuantity > input.gross.value) {
    return requiresLedgerInput(unit, ["deductions_not_exceeding_gross"], "deductions cannot exceed gross quantity");
  }
  if (!isNonNegativeFinite(input.wastePercent)) {
    return requiresLedgerInput(unit, ["valid_waste_percent"], "waste percent must be a non-negative finite number");
  }

  if (!input.offerQuantity) {
    return requiresLedgerInput(unit, ["offer_quantity"], "offer quantity must be supplied explicitly");
  }
  const offerUnit = normalizeQuantityUnit(input.offerQuantity.unit);
  if (offerUnit !== unit || !isNonNegativeFinite(input.offerQuantity.value)) {
    return requiresLedgerInput(unit, ["valid_offer_quantity_in_ledger_unit"], "offer quantity must be valid and use the ledger unit");
  }

  const netQuantity = roundQuantity(input.gross.value - deductionQuantity);
  const wasteQuantity = roundQuantity(netQuantity * input.wastePercent / 100);
  const costQuantity = roundQuantity(netQuantity + wasteQuantity);
  const evidence = input.deductions
    .map((deduction) => deduction.sourceReference?.trim())
    .filter((reference): reference is string => Boolean(reference));

  let payment: PaymentQuantity = {
    status: "not_evaluated",
    quantity: null,
    reason: "verified payment quantity was not supplied",
  };
  if (input.payment?.verificationStatus === "verified") {
    const paymentUnit = normalizeQuantityUnit(input.payment.quantity.unit);
    if (paymentUnit !== unit || !isNonNegativeFinite(input.payment.quantity.value) || input.payment.sourceReference.trim().length === 0) {
      return requiresLedgerInput(unit, ["valid_verified_payment_quantity"], "verified payment quantity must use the ledger unit and reference its evidence");
    }
    payment = {
      status: "evaluated",
      quantity: input.payment.quantity.value,
      reason: null,
      sourceReference: input.payment.sourceReference,
    };
  }

  return {
    status: "ready",
    unit,
    grossQuantity: roundQuantity(input.gross.value),
    deductionQuantity,
    netQuantity,
    wastePercent: input.wastePercent,
    wasteQuantity,
    costQuantity,
    offerQuantity: roundQuantity(input.offerQuantity.value),
    payment,
    evidence,
  };
}
