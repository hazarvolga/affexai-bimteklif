export type TenantPriceCatalogRow = {
  positionCode?: string;
  description: string;
  unit: string;
  amount: number;
  currency?: string;
  validUntil?: string;
  externalReference?: string;
};

export type TenantPriceCatalogImportInput = {
  sourceName: string;
  fileName?: string;
  documentId?: string | null;
  region?: string;
  validUntil?: string;
  rows: TenantPriceCatalogRow[];
  ownershipConfirmed: boolean;
  /**
   * VAT rate of prices entered VAT-exclusive (e.g. "20"). With `approveOnImport` the owner's review in the import
   * wizard approves the rows, so they can price a quotation right away (Faz 1, M-17.3).
   */
  vatPercentExcluded?: string;
  approveOnImport?: boolean;
};

export const TENANT_COMPANY_ACTUAL_DECLARATION = {
  kind: "tenant_company_actual",
  version: 1,
  accepted: true,
} as const;

export function isTenantCompanyActualDeclaration(value: unknown): value is typeof TENANT_COMPANY_ACTUAL_DECLARATION {
  if (!value || typeof value !== "object") return false;
  const declaration = value as Record<string, unknown>;
  return Object.keys(declaration).length === 3
    && declaration.kind === TENANT_COMPANY_ACTUAL_DECLARATION.kind
    && declaration.version === TENANT_COMPANY_ACTUAL_DECLARATION.version
    && declaration.accepted === true;
}

/**
 * Builds the generic tenant CSV import contract. Supplier quotes use the
 * separate supplier submission/review flow and must never be represented by
 * this self-authorized payload.
 */
export function buildTenantPriceCatalogImportPayload(input: TenantPriceCatalogImportInput) {
  if (!input.ownershipConfirmed) throw new Error("TENANT_PRICE_OWNERSHIP_CONFIRMATION_REQUIRED");
  if (input.approveOnImport && !input.vatPercentExcluded) throw new Error("CATALOG_IMPORT_VAT_REQUIRED");
  const rows = input.rows.map((row) => ({
    ...row,
    validUntil: row.validUntil || input.validUntil || undefined,
  }));

  return {
    sourceName: input.sourceName,
    sourceType: "company_actual" as const,
    sourceDocumentIdentifier: input.fileName || undefined,
    sourceDocumentPayload: {
      kind: "smartcheck_price_catalog_csv",
      fileName: input.fileName || null,
      rows: input.rows,
    },
    licenseStatus: "not_applicable" as const,
    ownershipDeclaration: TENANT_COMPANY_ACTUAL_DECLARATION,
    ...(input.vatPercentExcluded ? { vatStatus: "excluded" as const, vatPercent: input.vatPercentExcluded } : {}),
    ...(input.approveOnImport ? { reviewDecision: "approved" as const } : {}),
    region: input.region || undefined,
    validUntil: input.validUntil || undefined,
    rows,
    metadataJson: {
      source: "smartcheck_price_catalog_csv",
      documentId: input.documentId ?? null,
      fileName: input.fileName || null,
      ownership: "tenant_company_actual",
    },
  };
}
