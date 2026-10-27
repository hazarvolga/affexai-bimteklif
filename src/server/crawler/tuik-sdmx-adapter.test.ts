import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTuikSdmxDataUrl,
  getTuikSdmxIntegrationMetadata,
  parseTuikSdmxCsv,
  parseTuikSdmxJson,
  TUIK_SDMX_SERIES_CATALOG,
  validateTuikPortalHost,
} from './tuik-sdmx-adapter';
import { canApproveCrawlerPrice } from './provenance';
import { isPublicAddress } from './safe-fetch';
import { parseHtmlPrices } from './price-parser-worker';
import { getOfficialCatalogCoverageReport } from './csb-pdf-parser';

test('TUIK SDMX 2.1 catalog exposes 25 series (4 IME + 1 TUFE + 20 YI-UFE NACE Rev.2)', () => {
  const meta = getTuikSdmxIntegrationMetadata();
  assert.equal(meta.standard, 'SDMX 2.1 (ISO 17369)');
  assert.equal(TUIK_SDMX_SERIES_CATALOG.length, 25);
  assert.equal(meta.totalMappedSeries, 25);

  const url = buildTuikSdmxDataUrl({
    dataflowId: 'DF_YI_UFE',
    startPeriod: '2026-01',
    endPeriod: '2026-06',
    format: 'sdmx-json',
  });
  assert.match(url, /^https:\/\/nsiws\.tuik\.gov\.tr\/rest\/data\/TUIK,DF_YI_UFE,1\.0\/all\?/);
  assert.doesNotThrow(() => validateTuikPortalHost(url));
  assert.throws(() => validateTuikPortalHost('https://evil.example.com/sdmx'), /TUIK_SDMX_HOST_BLOCKED/);
});

test('parseTuikSdmxJson parses SDMX-JSON 1.0/2.0 observations and selects latest period per NACE Rev.2 series', () => {
  const sampleSdmxJson = JSON.stringify({
    dataSets: [
      {
        series: {
          '0:0': {
            observations: {
              '0': [3980.1],
              '1': [4112.45],
            },
          },
          '0:1': {
            observations: {
              '0': [5120.0],
              '1': [5289.8],
            },
          },
        },
      },
    ],
    structure: {
      dimensions: {
        series: [
          {
            id: 'FREQ',
            values: [{ id: 'M', name: 'Aylık' }],
          },
          {
            id: 'NACE_REV2',
            values: [
              { id: '23.51', name: 'Çimento İmalatı' },
              { id: '24.10', name: 'Ana Demir-Çelik' },
            ],
          },
        ],
        observation: [
          {
            id: 'TIME_PERIOD',
            values: [{ id: '2026-01' }, { id: '2026-02' }],
          },
        ],
      },
    },
  });

  const result = parseTuikSdmxJson(sampleSdmxJson);
  assert.equal(result.format, 'sdmx-json');
  assert.match(result.documentHash, /^[a-f0-9]{64}$/);
  assert.equal(result.rows.length, 2);

  const cement = result.rows.find((r) => r.itemCode === 'TUIK-23.5-CIMENTO-KIREC');
  assert.ok(cement);
  assert.equal(cement.price, '4112.45');
  assert.equal(cement.unit, 'endeks');
  assert.match(cement.itemName, /2026-02/);

  const steel = result.rows.find((r) => r.itemCode === 'TUIK-24.1-DEMIR-CELIK');
  assert.ok(steel);
  assert.equal(steel.price, '5289.80');
});

test('parseTuikSdmxCsv parses SDMX-CSV 2.0 exports with NACE Rev.2 and IME codes', () => {
  const sampleCsv = [
    'DATAFLOW,NACE_REV2,TIME_PERIOD,OBS_VALUE',
    'TUIK:DF_IME(1.0),IME_GENEL,2026-01,1450.25',
    'TUIK:DF_IME(1.0),IME_GENEL,2026-02,1485.60',
    'TUIK:DF_YI_UFE(1.0),23.63,2026-02,"4.320,75"',
  ].join('\n');

  const result = parseTuikSdmxCsv(sampleCsv);
  assert.equal(result.format, 'sdmx-csv');
  assert.equal(result.rows.length, 2);
  const ime = result.rows.find((r) => r.itemCode === 'TUIK-IME-GENEL');
  assert.ok(ime);
  assert.equal(ime.price, '1485.60');

  const concrete = result.rows.find((r) => r.itemCode === 'TUIK-23.6-HAZIR-BETON');
  assert.ok(concrete);
  assert.equal(concrete.price, '4320.75');
});

test('canApproveCrawlerPrice accepts row 1 of sealed catalogs and TUIK SDMX provenance', () => {
  const hash = 'a'.repeat(64);
  for (const kind of ['licensed-csv-v1', 'licensed-pdf-v1', 'official-csb-catalog-v1', 'tuik-sdmx-v1'] as const) {
    const notes = `[${kind}] ` + JSON.stringify({
      kind,
      documentHash: hash,
      licenseReference: 'T.C. Resmi Yayin / TUIK SDMX 2026',
      licenseConfirmedBy: 'admin-uuid',
      row: 1,
    });
    assert.equal(canApproveCrawlerPrice({ notes, sourceUrl: 'https://veriportali.tuik.gov.tr', crawledPrice: '3619.75' }), true, kind);
  }
});

test('isPublicAddress allows global unicast 2001::/16 while blocking 2001:db8::/32 and Teredo 2001:0::/32', () => {
  assert.equal(isPublicAddress('2001:4860:4860::8888'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  assert.equal(isPublicAddress('2001:db8::1'), false);
  assert.equal(isPublicAddress('2001:0000:4136:e378:8000:63bf:3fff:fdd2'), false);
});

test('parseHtmlPrices extracts numeric prices under a currency/price <th> column header', async () => {
  const html = `
    <table>
      <tr><th>Malzeme Cinsi</th><th>Birim</th><th>Birim Fiyat (TL)</th></tr>
      <tr><td>C 30/37 Hazır Beton</td><td>m³</td><td>3.748,06</td></tr>
      <tr><td>Ø12 Nervürlü Çelik</td><td>Ton</td><td>47.285,23</td></tr>
    </table>
  `;
  const items = await parseHtmlPrices(html, 'https://example.com/fiyatlar');
  assert.equal(items.length, 2);
  assert.equal(items[0].crawledPrice, 3748.06);
  assert.equal(items[1].crawledPrice, 47285.23);
});

test('getOfficialCatalogCoverageReport provides both UI schema fields and backend summary fields', () => {
  const report = getOfficialCatalogCoverageReport();
  assert.equal(report.totalBooks, 6);
  assert.equal(report.fullCoverageBooks, 6);
  assert.equal(report.totalIngestedRows, 18848);
  for (const book of report.books) {
    assert.ok(book.ingestedRowCount > 0);
    assert.equal(book.ingestedRowCount, book.rowCount);
    assert.equal(book.totalRowsInBook, book.totalMatchedInPdf);
    assert.match(book.sha256, /^[a-f0-9]{64}$/);
    assert.equal(book.status, 'full');
  }
});
