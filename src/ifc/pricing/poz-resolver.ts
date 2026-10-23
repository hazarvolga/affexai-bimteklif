import type { ManufacturingProfile } from "./manufacturing-profile";

export interface PozCatalogEntry {
  readonly catalogId: string;
  readonly documentHash: string;
  readonly validityStart: string;
  readonly validityEnd: string;
  readonly itemCode: string;
  readonly itemName: string;
  readonly unit: string;
  readonly price: string;
}

interface OfficialCatalogRow {
  readonly itemCode: string;
  readonly itemName: string;
  readonly unit: string;
  readonly price: string;
}

interface OfficialCatalog {
  readonly id: string;
  readonly documentHash: string;
  readonly validityStart: string;
  readonly validityEnd: string;
  readonly rows: readonly OfficialCatalogRow[];
}

export interface OfficialCsbCatalogApi {
  readonly listOfficialCsbCatalogs: () => readonly { readonly id: string }[];
  readonly getOfficialCsbCatalogById: (catalogId: string) => OfficialCatalog | null;
}

export type PozResolutionFailureReason =
  | "missing_explicit_poz"
  | "poz_not_found"
  | "ambiguous_poz"
  | "unit_mismatch"
  | "semantic_mismatch"
  | "condition_mismatch";

export type PozResolution =
  | {
      readonly status: "matched";
      readonly entry: PozCatalogEntry;
      readonly reason?: never;
    }
  | {
      readonly status: "rejected";
      readonly reason: PozResolutionFailureReason;
      readonly entry?: never;
      readonly candidateCount: number;
      readonly details: readonly string[];
    };

const UNIT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  m2: "m²",
  metrekare: "m²",
  m3: "m³",
  metrekup: "m³",
  metre: "m",
  meter: "m",
  mtul: "m",
  tulmetre: "m",
  ad: "adet",
  adet: "adet",
  ton: "ton",
  kg: "kg",
});

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[²]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeUnit(value: string): string {
  const normalized = normalizeText(value).replace(/\s+/g, "");
  return UNIT_ALIASES[normalized] ?? normalized;
}

function reject(
  reason: PozResolutionFailureReason,
  candidateCount: number,
  details: readonly string[],
): PozResolution {
  return Object.freeze({
    status: "rejected" as const,
    reason,
    candidateCount,
    details: Object.freeze([...details]),
  });
}

/**
 * Resolves a classified manufacturing profile against an already-authorized
 * catalog view. Authorization and tenant policy are intentionally outside this
 * pure function; a mismatch always rejects instead of guessing another poz.
 */
export function resolvePoz(
  profile: ManufacturingProfile,
  catalogEntries: readonly PozCatalogEntry[],
): PozResolution {
  const proposedPozCode = profile.proposedPozCode?.trim();
  if (!proposedPozCode) {
    return reject("missing_explicit_poz", 0, ["Manufacturing profile does not carry an explicit poz code"]);
  }

  const exactCandidates = catalogEntries.filter((entry) => entry.itemCode.trim() === proposedPozCode);
  if (exactCandidates.length === 0) {
    return reject("poz_not_found", 0, [`Poz ${proposedPozCode} was not found in the supplied catalog view`]);
  }
  if (exactCandidates.length !== 1) {
    return reject("ambiguous_poz", exactCandidates.length, [
      `Poz ${proposedPozCode} occurs ${exactCandidates.length} times in the supplied catalog view`,
    ]);
  }

  const [candidate] = exactCandidates;
  const profileUnit = normalizeUnit(profile.quantityUnit);
  const catalogUnit = normalizeUnit(candidate.unit);
  if (!profileUnit || profileUnit !== catalogUnit) {
    return reject("unit_mismatch", 1, [
      `Quantity unit ${profile.quantityUnit} is incompatible with catalog unit ${candidate.unit}`,
    ]);
  }

  const catalogMeaning = normalizeText(candidate.itemName);
  const missingSemanticTerms = profile.semantic.requiredAll.filter(
    (term) => !catalogMeaning.includes(normalizeText(term)),
  );
  const forbiddenSemanticTerms = (profile.semantic.forbiddenAny ?? []).filter((term) =>
    catalogMeaning.includes(normalizeText(term)),
  );
  if (missingSemanticTerms.length > 0 || forbiddenSemanticTerms.length > 0) {
    return reject("semantic_mismatch", 1, [
      ...missingSemanticTerms.map((term) => `Required semantic term is missing: ${term}`),
      ...forbiddenSemanticTerms.map((term) => `Forbidden semantic term is present: ${term}`),
    ]);
  }

  const missingConditions = (profile.conditions?.requiredAll ?? []).filter(
    (term) => !catalogMeaning.includes(normalizeText(term)),
  );
  if (missingConditions.length > 0) {
    return reject(
      "condition_mismatch",
      1,
      missingConditions.map((term) => `Required manufacturing condition is missing: ${term}`),
    );
  }

  return Object.freeze({ status: "matched" as const, entry: candidate });
}

/**
 * Adapts the repository's existing official ÇŞB catalog API to the immutable
 * resolver input. No authorization decision is made here.
 */
export function loadOfficialCsbPozCatalog(
  catalogApi: OfficialCsbCatalogApi,
  catalogIds?: readonly string[],
): readonly PozCatalogEntry[] {
  const selectedCatalogIds = catalogIds ?? catalogApi.listOfficialCsbCatalogs().map((catalog) => catalog.id);
  const entries = selectedCatalogIds.flatMap((catalogId) => {
    const catalog = catalogApi.getOfficialCsbCatalogById(catalogId);
    if (!catalog) return [];
    return catalog.rows.map((row) =>
      Object.freeze({
        catalogId: catalog.id,
        documentHash: catalog.documentHash,
        validityStart: catalog.validityStart,
        validityEnd: catalog.validityEnd,
        itemCode: row.itemCode,
        itemName: row.itemName,
        unit: row.unit,
        price: row.price,
      }),
    );
  });
  return Object.freeze(entries);
}
