export interface CatalogAuditRow {
  itemCode: string;
  itemName: string;
  unit: string;
  price: string;
}

export interface AuditableCatalog {
  id: string;
  totalMatchedInPdf: number;
  rows: CatalogAuditRow[];
  title?: string;
  fileName?: string;
  documentHash?: string;
  licenseReference?: string;
  validityStart?: string;
  validityEnd?: string;
}

export type AuditableCatalogMap = Record<string, AuditableCatalog>;

export interface CatalogSourceArtifact {
  catalogId: string;
  title: string;
  localPath: string;
  sha256: string;
  rowCount: number;
  validityStart: string;
  validityEnd: string;
  licenseReference: string;
  accessOrLicense?: string;
}

export interface CommercialAuthorizationRecord {
  status: string;
  recordId: string | null;
  evidenceArtifact?: { path: string; sha256: string } | null;
  scope: string | null;
  authorizedAt: string | null;
}

export interface CommercialAuthorizationEvaluation {
  verified: boolean;
  reasons: string[];
}

export type CatalogKind =
  | 'direct_unit_price'
  | 'direct_market_rate'
  | 'approximate_cost_class'
  | 'index_mapping';

export interface CatalogBookAudit {
  catalogId: string;
  kind: CatalogKind;
  rowCount: number;
  sourceMatchedRowCount: number;
  structurallyUsableCount: number;
  observedUnitCounts: Record<string, number>;
}

export interface CatalogAuditResult {
  catalogCount: number;
  totalRowCount: number;
  uniqueCodeCount: number;
  directPriceRowCount: number;
  approximateCostClassRowCount: number;
  indexMappingRowCount: number;
  structurallyUsableCount: number;
  structurallySelectableDirectPriceCount: number;
  duplicateCodeCount: number;
  conflictingCodeCount: number;
  missingFieldRowCount: number;
  nonPositivePriceRowCount: number;
  invalidPriceRowCount: number;
  invalidCodeFormatRowCount: number;
  nonCanonicalUnitRowCount: number;
  allowedNormalizedUnits: string[];
  books: CatalogBookAudit[];
}

export interface CatalogReparseComparison {
  embeddedRowCount: number;
  reparsedRowCount: number;
  exactMatchCount: number;
  conflictingMatchCount: number;
  missingFromReparseCount: number;
  extraInReparseCount: number;
  exactCoveragePercent: number;
}

export const CSB_2026_CATALOG_KINDS = {
  csb_2026_mart_insaat_bf: 'direct_unit_price',
  csb_2026_mart_insaat_rayic: 'direct_market_rate',
  csb_2026_mart_mekanik_bf: 'direct_unit_price',
  csb_2026_mart_elektrik_bf: 'direct_unit_price',
  csb_2026_yapi_yaklasik_maliyet: 'approximate_cost_class',
  csb_2026_tuik_endeks_eslestirme: 'index_mapping',
} as const satisfies Record<string, CatalogKind>;

export const CSB_2026_EXPECTED_ROW_COUNTS = {
  csb_2026_mart_insaat_bf: 1_861,
  csb_2026_mart_insaat_rayic: 5_360,
  csb_2026_mart_mekanik_bf: 5_678,
  csb_2026_mart_elektrik_bf: 5_910,
  csb_2026_yapi_yaklasik_maliyet: 18,
  csb_2026_tuik_endeks_eslestirme: 21,
} as const satisfies Record<keyof typeof CSB_2026_CATALOG_KINDS, number>;

export const CSB_2026_EXPECTED_TOTAL_ROWS = Object.values(CSB_2026_EXPECTED_ROW_COUNTS).reduce(
  (sum, count) => sum + count,
  0
);

const ALLOWED_NORMALIZED_UNITS = [
  '100 m²',
  '1000 adet',
  'adet',
  'endeks',
  'kg',
  'lt',
  'm',
  'm²',
  'm³',
  'saat',
  'takım',
  'ton',
] as const;

const ALLOWED_NORMALIZED_UNIT_SET = new Set<string>(ALLOWED_NORMALIZED_UNITS);

function classifyCatalog(catalogId: string): CatalogKind {
  const kind = (CSB_2026_CATALOG_KINDS as Record<string, CatalogKind>)[catalogId];
  if (!kind) throw new Error(`Unknown ÇŞİDB 2026 catalog id: ${catalogId}`);
  return kind;
}

function isDirectPrice(kind: CatalogKind): boolean {
  return kind === 'direct_unit_price' || kind === 'direct_market_rate';
}

function isExpectedCode(code: string, kind: CatalogKind): boolean {
  if (kind === 'approximate_cost_class') return /^YBM-\d{4}-[IVX]+-[A-Z]$/.test(code);
  if (kind === 'index_mapping') return /^TUIK-[A-Z0-9.]+(?:-[A-Z0-9.]+)*$/.test(code);
  return /^\d{2}\.\d{3}\.\d{4}$/.test(code);
}

function hasMissingField(row: CatalogAuditRow): boolean {
  return [row.itemCode, row.itemName, row.unit, row.price].some(
    (value) => typeof value !== 'string' || value.trim().length === 0
  );
}

function priceState(price: string): 'valid' | 'missing' | 'invalid' | 'nonpositive' {
  if (typeof price !== 'string' || price.trim() === '') return 'missing';
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(price.trim())) return 'invalid';
  return Number(price) > 0 ? 'valid' : 'nonpositive';
}

function rowVariant(row: CatalogAuditRow): string {
  return JSON.stringify([row.itemName, row.unit, row.price]);
}

function groupByCode(rows: CatalogAuditRow[]): Map<string, CatalogAuditRow[]> {
  const groups = new Map<string, CatalogAuditRow[]>();
  for (const row of rows) {
    groups.set(row.itemCode, [...(groups.get(row.itemCode) ?? []), row]);
  }
  return groups;
}

function countUnits(rows: CatalogAuditRow[]): Record<string, number> {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row.unit))]
      .sort((left, right) => left.localeCompare(right, 'tr'))
      .map((unit) => [unit, rows.filter((row) => row.unit === unit).length])
  );
}

function isStructurallyUsable(
  row: CatalogAuditRow,
  kind: CatalogKind,
  duplicateCodes: Set<string>
): boolean {
  return (
    !hasMissingField(row) &&
    priceState(row.price) === 'valid' &&
    ALLOWED_NORMALIZED_UNIT_SET.has(row.unit) &&
    isExpectedCode(row.itemCode, kind) &&
    !duplicateCodes.has(row.itemCode)
  );
}

export function auditCsbCatalogs(
  catalogs: AuditableCatalogMap
): CatalogAuditResult {
  const entries = Object.entries(catalogs);
  for (const [catalogId, catalog] of entries) {
    classifyCatalog(catalogId);
    if (catalog.id !== catalogId) throw new Error(`Catalog map key/id mismatch: ${catalogId} != ${catalog.id}`);
  }
  const rowsWithKind = entries.flatMap(([catalogId, catalog]) => {
    const kind = classifyCatalog(catalogId);
    return catalog.rows.map((row) => ({ row, kind }));
  });
  const allRows = rowsWithKind.map(({ row }) => row);
  const grouped = groupByCode(allRows);
  const duplicateCodes = new Set([...grouped].filter(([, rows]) => rows.length > 1).map(([code]) => code));
  const conflictingCodes = new Set(
    [...grouped]
      .filter(([, rows]) => new Set(rows.map(rowVariant)).size > 1)
      .map(([code]) => code)
  );
  const usableRows = rowsWithKind.filter(({ row, kind }) => isStructurallyUsable(row, kind, duplicateCodes));
  const selectableRows = usableRows.filter(({ kind }) => isDirectPrice(kind));
  const books = entries.map(([catalogId, catalog]) => {
    const kind = classifyCatalog(catalogId);
    return {
      catalogId,
      kind,
      rowCount: catalog.rows.length,
      sourceMatchedRowCount: catalog.totalMatchedInPdf,
      structurallyUsableCount: catalog.rows.filter((row) => isStructurallyUsable(row, kind, duplicateCodes)).length,
      observedUnitCounts: countUnits(catalog.rows),
    };
  });

  return {
    catalogCount: entries.length,
    totalRowCount: allRows.length,
    uniqueCodeCount: grouped.size,
    directPriceRowCount: rowsWithKind.filter(({ kind }) => isDirectPrice(kind)).length,
    approximateCostClassRowCount: rowsWithKind.filter(({ kind }) => kind === 'approximate_cost_class').length,
    indexMappingRowCount: rowsWithKind.filter(({ kind }) => kind === 'index_mapping').length,
    structurallyUsableCount: usableRows.length,
    structurallySelectableDirectPriceCount: selectableRows.length,
    duplicateCodeCount: duplicateCodes.size,
    conflictingCodeCount: conflictingCodes.size,
    missingFieldRowCount: allRows.filter(hasMissingField).length,
    nonPositivePriceRowCount: allRows.filter((row) => priceState(row.price) === 'nonpositive').length,
    invalidPriceRowCount: allRows.filter((row) => priceState(row.price) === 'invalid').length,
    invalidCodeFormatRowCount: rowsWithKind.filter(
      ({ row, kind }) => row.itemCode.trim() !== '' && !isExpectedCode(row.itemCode, kind)
    ).length,
    nonCanonicalUnitRowCount: allRows.filter(
      (row) => row.unit.trim() !== '' && !ALLOWED_NORMALIZED_UNIT_SET.has(row.unit)
    ).length,
    allowedNormalizedUnits: [...ALLOWED_NORMALIZED_UNITS],
    books,
  };
}

export function compareCatalogReparse(
  embeddedRows: CatalogAuditRow[],
  reparsedRows: CatalogAuditRow[]
): CatalogReparseComparison {
  const embedded = countRowVariants(embeddedRows);
  const reparsed = countRowVariants(reparsedRows);
  const exactMatchCount = [...embedded].reduce(
    (sum, [key, count]) => sum + Math.min(count, reparsed.get(key) ?? 0),
    0
  );
  const embeddedByCode = countRemainingByCode(embedded, reparsed);
  const reparsedByCode = countRemainingByCode(reparsed, embedded);
  const conflictingMatchCount = [...embeddedByCode].reduce(
    (sum, [code, count]) => sum + Math.min(count, reparsedByCode.get(code) ?? 0),
    0
  );
  const missingFromReparseCount = embeddedRows.length - exactMatchCount - conflictingMatchCount;
  const extraInReparseCount = reparsedRows.length - exactMatchCount - conflictingMatchCount;

  return {
    embeddedRowCount: embeddedRows.length,
    reparsedRowCount: reparsedRows.length,
    exactMatchCount,
    conflictingMatchCount,
    missingFromReparseCount,
    extraInReparseCount,
    exactCoveragePercent:
      embeddedRows.length === 0 ? 100 : Math.round((exactMatchCount / embeddedRows.length) * 10_000) / 100,
  };
}

export function assertCsb2026EvidenceParity(
  catalogs: AuditableCatalogMap,
  artifacts: CatalogSourceArtifact[]
): void {
  const expectedIds = Object.keys(CSB_2026_CATALOG_KINDS).sort();
  const catalogIds = Object.keys(catalogs).sort();
  const artifactIds = artifacts.map((artifact) => artifact.catalogId).sort();
  if (JSON.stringify(catalogIds) !== JSON.stringify(expectedIds)) {
    throw new Error('Embedded ÇŞİDB 2026 catalog set does not match the six-book contract.');
  }
  if (JSON.stringify(artifactIds) !== JSON.stringify(expectedIds)) {
    throw new Error('Source artifact set must contain each ÇŞİDB 2026 catalog exactly once.');
  }
  for (const artifact of artifacts) {
    assertArtifactParity(catalogs[artifact.catalogId], artifact);
    const expectedCount = (CSB_2026_EXPECTED_ROW_COUNTS as Record<string, number>)[artifact.catalogId];
    if (artifact.rowCount !== expectedCount) {
      throw new Error(`Sealed baseline rowCount mismatch for ${artifact.catalogId}`);
    }
  }
}

export function evaluateCommercialAuthorization(
  record: CommercialAuthorizationRecord | undefined,
  actualEvidenceSha256?: string
): CommercialAuthorizationEvaluation {
  const expectedEvidenceSha256 = record?.evidenceArtifact?.sha256;
  const reasons = [
    ...(!record || record.status !== 'authorized' ? ['status is not authorized'] : []),
    ...(!record?.recordId?.trim() ? ['recordId is missing'] : []),
    ...(!record?.evidenceArtifact?.path?.trim() ? ['evidenceArtifact.path is missing'] : []),
    ...(!expectedEvidenceSha256?.match(/^[a-f0-9]{64}$/)
      ? ['evidenceArtifact.sha256 is missing or invalid']
      : []),
    ...(expectedEvidenceSha256 && actualEvidenceSha256 !== expectedEvidenceSha256
      ? ['evidenceArtifact file hash is missing or mismatched']
      : []),
    ...(!record?.scope?.trim() ? ['scope is missing'] : []),
    ...(!record?.authorizedAt || !isIsoDateTime(record.authorizedAt) ? ['authorizedAt is missing or invalid'] : []),
  ];
  return { verified: reasons.length === 0, reasons };
}

export function assertSha256Match(catalogId: string, expected: string, actual: string): void {
  if (!/^[a-f0-9]{64}$/.test(expected) || actual !== expected) {
    throw new Error(`PDF hash mismatch for ${catalogId}`);
  }
}

function isIsoDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function assertArtifactParity(catalog: AuditableCatalog, artifact: CatalogSourceArtifact): void {
  const comparisons: Array<[string, unknown, unknown]> = [
    ['id', catalog.id, artifact.catalogId],
    ['title', catalog.title, artifact.title],
    ['fileName', catalog.fileName, artifact.localPath.split('/').at(-1)],
    ['documentHash', catalog.documentHash, artifact.sha256],
    ['rowCount', catalog.rows.length, artifact.rowCount],
    ['totalMatchedInPdf', catalog.totalMatchedInPdf, artifact.rowCount],
    ['validityStart', catalog.validityStart, artifact.validityStart],
    ['validityEnd', catalog.validityEnd, artifact.validityEnd],
    ['licenseReference', catalog.licenseReference, artifact.licenseReference],
  ];
  const mismatch = comparisons.find(([, embedded, source]) => embedded !== source);
  if (mismatch) throw new Error(`Catalog/source ${mismatch[0]} mismatch for ${artifact.catalogId}`);
}

function variantKey(row: CatalogAuditRow): string {
  return `${row.itemCode}\u0000${rowVariant(row)}`;
}

function countRowVariants(rows: CatalogAuditRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(variantKey(row), (counts.get(variantKey(row)) ?? 0) + 1);
  return counts;
}

function countRemainingByCode(
  primary: Map<string, number>,
  comparison: Map<string, number>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key, count] of primary) {
    const remaining = count - Math.min(count, comparison.get(key) ?? 0);
    if (remaining === 0) continue;
    const code = key.slice(0, key.indexOf('\u0000'));
    counts.set(code, (counts.get(code) ?? 0) + remaining);
  }
  return counts;
}
