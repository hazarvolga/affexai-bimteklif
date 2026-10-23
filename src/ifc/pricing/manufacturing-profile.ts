/**
 * A price-free description of an IFC manufacturing result.
 *
 * Classification may propose a poz, but price selection belongs to the
 * catalog resolver. Keeping prices out of this contract prevents a material
 * classifier from silently becoming a commercial price source.
 */
export interface ManufacturingProfile {
  readonly profileId: string;
  readonly title: string;
  readonly proposedPozCode: string | null;
  readonly quantityUnit: string;
  readonly semantic: {
    readonly requiredAll: readonly string[];
    readonly forbiddenAny?: readonly string[];
  };
  readonly conditions?: {
    readonly requiredAll: readonly string[];
  };
}

const PRICE_KEY_PATTERN = /(?:^|_)(?:default)?(?:unit)?price(?:try)?(?:$|_)/i;

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function terms(values: readonly string[] | undefined, field: string, required: boolean): readonly string[] {
  if (!Array.isArray(values)) {
    if (!required) return Object.freeze([]);
    throw new TypeError(`${field} must contain semantic evidence`);
  }

  const normalized = values.map((value) => nonEmpty(value, field));
  if (required && normalized.length === 0) {
    throw new TypeError(`${field} must contain semantic evidence`);
  }
  return Object.freeze([...new Set(normalized)]);
}

export function defineManufacturingProfile(input: ManufacturingProfile): ManufacturingProfile {
  if (!input || typeof input !== "object") {
    throw new TypeError("manufacturing profile is required");
  }

  const priceField = Object.keys(input).find((key) => PRICE_KEY_PATTERN.test(key));
  if (priceField) {
    throw new TypeError(`manufacturing profile cannot contain price field: ${priceField}`);
  }

  const proposedPozCode =
    input.proposedPozCode === null ? null : nonEmpty(input.proposedPozCode, "proposedPozCode");
  const semantic = Object.freeze({
    requiredAll: terms(input.semantic?.requiredAll, "semantic.requiredAll", true),
    forbiddenAny: terms(input.semantic?.forbiddenAny, "semantic.forbiddenAny", false),
  });
  const conditions = input.conditions
    ? Object.freeze({
        requiredAll: terms(input.conditions.requiredAll, "conditions.requiredAll", true),
      })
    : undefined;

  return Object.freeze({
    profileId: nonEmpty(input.profileId, "profileId"),
    title: nonEmpty(input.title, "title"),
    proposedPozCode,
    quantityUnit: nonEmpty(input.quantityUnit, "quantityUnit"),
    semantic,
    conditions,
  });
}
