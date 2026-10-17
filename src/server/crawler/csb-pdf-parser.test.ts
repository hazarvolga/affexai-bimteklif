import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOfficialCatalogCoverageReport,
  getOfficialCsbCatalogById,
  listOfficialCsbCatalogs,
  parseCsbPdfDocument,
  parseCsbPdfText,
} from './csb-pdf-parser';

test('parseCsbPdfText parses 2026 Mart İnşaat, Mekanik, Elektrik and Yapı Yaklaşık Maliyet Tebliği rows', () => {
  const sampleText = [
    '2026 MART AYI GÜNCEL İNŞAAT BİRİM FİYAT LİSTESİ',
    '15.150.1005 Beton santralinde üretilen C 25/30 hazır beton m³ 3.619,75',
    '15.160.1003 Ø 8 - Ø 12 mm nervürlü beton çelik çubuğu Ton 47.285,23',
    '25.100.1001 25x40 cm vidalı lavabo Ad 1.196,58 400,29',
    '35.100.1101 En ölçüsü en az 400 mm olan galvanizli dikili tip sac pano. Ad 31.756,19 3.468,85',
    'MİMARLIK VE MÜHENDİSLİK HİZMET BEDELLERİNİN HESABINDA KULLANILACAK 2026 YILI YAPI YAKLAŞIK BİRİM MALİYETLERİ HAKKINDA TEBLİĞ',
    'III. SINIF (B) GRUBU YAPILAR………….………………………. 21.050,00 TL/m²',
  ].join('\n');

  const rows = parseCsbPdfText(sampleText);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], {
    itemCode: 'YBM-2026-III-B',
    itemName:
      '2026 Yılı Yapı Yaklaşık Birim Maliyeti — III. Sınıf (B) Grubu Yapılar (KDV Hariç, %15 Genel Gider + %10 Kâr Dahil)',
    unit: 'm²',
    price: '21050.00',
  });
  assert.equal(rows[1].itemCode, '15.150.1005');
  assert.equal(rows[1].unit, 'm³');
  assert.equal(rows[1].price, '3619.75');
  assert.equal(rows[2].itemCode, '15.160.1003');
  assert.equal(rows[2].unit, 'ton');
  assert.equal(rows[2].price, '47285.23');
  assert.equal(rows[3].itemCode, '25.100.1001');
  assert.equal(rows[3].unit, 'adet');
  assert.equal(rows[3].price, '1196.58');
  assert.match(rows[3].itemName, /Montaj Bedeli: 400,29 TL/);
});

test('listOfficialCsbCatalogs exposes verified 2026 ÇŞB PDF catalogs with SHA-256 hashes and period-accurate validity dates', () => {
  const catalogs = listOfficialCsbCatalogs();
  assert.ok(catalogs.length >= 6);
  const insaatBf = getOfficialCsbCatalogById('csb_2026_mart_insaat_bf');
  assert.ok(insaatBf);
  assert.match(insaatBf.documentHash, /^[a-f0-9]{64}$/);
  assert.equal(insaatBf.validityStart, '2026-03-01');
  assert.equal(insaatBf.validityEnd, '2026-03-31');
  assert.equal(insaatBf.rows.length, 1861);
  assert.equal(insaatBf.totalMatchedInPdf, 1861);

  const report = getOfficialCatalogCoverageReport();
  assert.equal(report.bookCount, 6);
  assert.equal(report.fullCoverageBookCount, 6);
  assert.equal(report.overallCoveragePercent, 100);
  assert.equal(report.totalRowsInBooks, 18848);
  const insaatReportItem = report.books.find((b) => b.id === 'csb_2026_mart_insaat_bf');
  assert.ok(insaatReportItem);
  assert.equal(insaatReportItem.coveragePercent, 100);
  assert.equal(insaatReportItem.isFullCoverage, true);

  const ybm = getOfficialCsbCatalogById('csb_2026_yapi_yaklasik_maliyet');
  assert.ok(ybm);
  assert.equal(ybm.validityStart, '2026-01-01');
  assert.equal(ybm.validityEnd, '2026-12-31');
});

test('parseCsbPdfDocument extracts rows from a synthetic uncompressed PDF buffer', () => {
  const fakePdfContent = [
    '%PDF-1.4',
    '1 0 obj << /Length 120 >> stream',
    'BT (15.150.1006 C 30/37 Hazir Beton m³ 3.748,06) Tj ET',
    'endstream endobj',
    '%%EOF',
  ].join('\n');
  const parsed = parseCsbPdfDocument({
    pdfBase64: Buffer.from(fakePdfContent, 'latin1').toString('base64'),
    fileName: 'test-csb-2026.pdf',
    licenseConfirmed: true,
    licenseReference: 'T.C. ÇŞB Yüksek Fen Kurulu 2026 Mart Listesi',
    validityStart: '2026-03-01',
    validityEnd: '2026-12-31',
    autoApprove: true,
  });
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].itemCode, '15.150.1006');
  assert.equal(parsed.rows[0].price, '3748.06');
  assert.match(parsed.documentHash, /^[a-f0-9]{64}$/);
});
