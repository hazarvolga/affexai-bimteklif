import assert from 'node:assert/strict';
import test from 'node:test';
import officialCatalogs from '../../server/crawler/data/csb-2026-official-catalogs.json';
import {
  assertCsb2026EvidenceParity,
  assertSha256Match,
  auditCsbCatalogs,
  compareCatalogReparse,
  evaluateCommercialAuthorization,
  type AuditableCatalogMap,
  type CatalogSourceArtifact,
} from './catalog-audit';

const catalogMap = officialCatalogs as AuditableCatalogMap;

function sourceArtifacts(): CatalogSourceArtifact[] {
  return Object.values(catalogMap).map((catalog) => ({
    catalogId: catalog.id,
    title: catalog.title!,
    localPath: `docs/fiyatlandirma-kaynaklari/${catalog.fileName}`,
    sha256: catalog.documentHash!,
    rowCount: catalog.rows.length,
    validityStart: catalog.validityStart!,
    validityEnd: catalog.validityEnd!,
    licenseReference: catalog.licenseReference!,
  }));
}

test('audits the sealed 2026 catalog without conflating prices, cost classes and indexes', () => {
  const audit = auditCsbCatalogs(catalogMap);

  assert.equal(audit.catalogCount, 6);
  assert.equal(audit.totalRowCount, 18_848);
  assert.equal(audit.uniqueCodeCount, 18_848);
  assert.equal(audit.directPriceRowCount, 18_809);
  assert.equal(audit.approximateCostClassRowCount, 18);
  assert.equal(audit.indexMappingRowCount, 21);
  assert.equal(audit.structurallyUsableCount, 18_848);
  assert.equal(audit.structurallySelectableDirectPriceCount, 18_809);
  assert.equal(audit.duplicateCodeCount, 0);
  assert.equal(audit.conflictingCodeCount, 0);
  assert.equal(audit.missingFieldRowCount, 0);
  assert.equal(audit.nonPositivePriceRowCount, 0);
  assert.equal(audit.invalidPriceRowCount, 0);
  assert.equal(audit.invalidCodeFormatRowCount, 0);
  assert.equal(audit.nonCanonicalUnitRowCount, 0);
  assert.deepEqual(audit.allowedNormalizedUnits, [
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
  ]);
});

test('excludes malformed and conflicting rows from usable and selectable counts', () => {
  const catalogs: AuditableCatalogMap = {
    csb_2026_mart_insaat_bf: {
      id: 'csb_2026_mart_insaat_bf',
      totalMatchedInPdf: 6,
      rows: [
        { itemCode: '15.100.1001', itemName: 'A', unit: 'm³', price: '10.00' },
        { itemCode: '15.100.1001', itemName: 'B', unit: 'm³', price: '11.00' },
        { itemCode: 'BAD', itemName: 'C', unit: 'm3', price: '12.00' },
        { itemCode: '15.100.1003', itemName: '', unit: 'kg', price: '13.00' },
        { itemCode: '15.100.1004', itemName: 'D', unit: 'kg', price: '0' },
        { itemCode: '15.100.1005', itemName: 'E', unit: 'kg', price: 'not-a-price' },
      ],
    },
  };

  const audit = auditCsbCatalogs(catalogs);

  assert.equal(audit.duplicateCodeCount, 1);
  assert.equal(audit.conflictingCodeCount, 1);
  assert.equal(audit.invalidCodeFormatRowCount, 1);
  assert.equal(audit.nonCanonicalUnitRowCount, 1);
  assert.equal(audit.missingFieldRowCount, 1);
  assert.equal(audit.nonPositivePriceRowCount, 1);
  assert.equal(audit.invalidPriceRowCount, 1);
  assert.equal(audit.structurallyUsableCount, 0);
  assert.equal(audit.structurallySelectableDirectPriceCount, 0);
});

test('fails closed for unknown catalog ids and map key/id mismatches', () => {
  const row = { itemCode: '10.100.1001', itemName: 'A', unit: 'adet', price: '1.00' };
  assert.throws(
    () => auditCsbCatalogs({ totally_unknown: { id: 'totally_unknown', totalMatchedInPdf: 1, rows: [row] } }),
    /Unknown ÇŞİDB 2026 catalog id/
  );
  assert.throws(
    () =>
      auditCsbCatalogs({
        csb_2026_mart_insaat_rayic: { id: 'wrong-id', totalMatchedInPdf: 1, rows: [row] },
      }),
    /key\/id mismatch/
  );
});

test('reparse comparison preserves identical and conflicting duplicate multiplicity', () => {
  const first = { itemCode: '15.100.1001', itemName: 'A', unit: 'm³', price: '10.00' };
  const second = { ...first, itemName: 'B' };

  assert.deepEqual(compareCatalogReparse([first, first], [first, first]), {
    embeddedRowCount: 2,
    reparsedRowCount: 2,
    exactMatchCount: 2,
    conflictingMatchCount: 0,
    missingFromReparseCount: 0,
    extraInReparseCount: 0,
    exactCoveragePercent: 100,
  });
  assert.deepEqual(compareCatalogReparse([first, first], [first, second]), {
    embeddedRowCount: 2,
    reparsedRowCount: 2,
    exactMatchCount: 1,
    conflictingMatchCount: 1,
    missingFromReparseCount: 0,
    extraInReparseCount: 0,
    exactCoveragePercent: 50,
  });
});

test('requires exact six-book source evidence and matching metadata', () => {
  const artifacts = sourceArtifacts();
  assert.doesNotThrow(() => assertCsb2026EvidenceParity(catalogMap, artifacts));
  assert.throws(
    () => assertCsb2026EvidenceParity(catalogMap, artifacts.slice(1)),
    /each ÇŞİDB 2026 catalog exactly once/
  );
  assert.throws(
    () => assertCsb2026EvidenceParity(catalogMap, [...artifacts, artifacts[0]]),
    /each ÇŞİDB 2026 catalog exactly once/
  );
  assert.throws(
    () =>
      assertCsb2026EvidenceParity(catalogMap, [
        { ...artifacts[0], rowCount: artifacts[0].rowCount - 1 },
        ...artifacts.slice(1),
      ]),
    /rowCount mismatch/
  );
});

test('fails closed on source PDF hash mismatch', () => {
  const expected = 'a'.repeat(64);
  assert.doesNotThrow(() => assertSha256Match('catalog', expected, expected));
  assert.throws(() => assertSha256Match('catalog', expected, 'b'.repeat(64)), /PDF hash mismatch/);
  assert.throws(() => assertSha256Match('catalog', 'invalid', 'invalid'), /PDF hash mismatch/);
});

test('commercial authorization requires status, record, evidence hash, scope and dated proof', () => {
  assert.deepEqual(evaluateCommercialAuthorization(undefined), {
    verified: false,
    reasons: [
      'status is not authorized',
      'recordId is missing',
      'evidenceArtifact.path is missing',
      'evidenceArtifact.sha256 is missing or invalid',
      'scope is missing',
      'authorizedAt is missing or invalid',
    ],
  });
  assert.equal(
    evaluateCommercialAuthorization(
      {
        status: 'authorized',
        recordId: 'AUTH-2026-1',
        evidenceArtifact: { path: 'docs/evidence/authorization.pdf', sha256: 'c'.repeat(64) },
        scope: 'BIMMetraj commercial catalog use',
        authorizedAt: '2026-10-23T09:30:00Z',
      },
      'c'.repeat(64)
    ).verified,
    true
  );
  assert.equal(
    evaluateCommercialAuthorization({
      status: 'authorized',
      recordId: null,
      evidenceArtifact: { path: '../outside.pdf', sha256: 'short' },
      scope: null,
      authorizedAt: '2026-10-23',
    }).verified,
    false
  );
});

test('sealed per-book row counts cannot drift with matching source metadata', () => {
  const artifacts = sourceArtifacts();
  const firstId = artifacts[0].catalogId;
  const driftedCatalogs: AuditableCatalogMap = {
    ...catalogMap,
    [firstId]: {
      ...catalogMap[firstId],
      totalMatchedInPdf: catalogMap[firstId].totalMatchedInPdf - 1,
      rows: catalogMap[firstId].rows.slice(1),
    },
  };
  const driftedArtifacts = [
    { ...artifacts[0], rowCount: artifacts[0].rowCount - 1 },
    ...artifacts.slice(1),
  ];
  assert.throws(
    () => assertCsb2026EvidenceParity(driftedCatalogs, driftedArtifacts),
    /Sealed baseline rowCount mismatch/
  );
});

test('reparse comparison reports exact coverage and missing embedded rows separately', () => {
  const embedded = [
    { itemCode: '15.100.1001', itemName: 'A', unit: 'm³', price: '10.00' },
    { itemCode: '15.100.1002', itemName: 'B', unit: 'kg', price: '20.00' },
  ];
  const result = compareCatalogReparse(embedded, [embedded[0]]);

  assert.deepEqual(result, {
    embeddedRowCount: 2,
    reparsedRowCount: 1,
    exactMatchCount: 1,
    conflictingMatchCount: 0,
    missingFromReparseCount: 1,
    extraInReparseCount: 0,
    exactCoveragePercent: 50,
  });
});
