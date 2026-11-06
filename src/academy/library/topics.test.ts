import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ACADEMY_LIBRARY_PATHS, ACADEMY_TOPICS, findAcademyTopic } from './topics';

// Lean Academy v1 (Hazar, 2026-11-06): five vendor-neutral topics, one page template, no
// unverified engineering numbers, no labs. Brand-specific tracks come later, one brand at a time.

const PUBLIC_ROUTES = new Set(['/smartcheck', '/bim-sozlugu', '/hesaplayicilar', '/features', '/about']);
const SOFTWARE_BRANDS = /Allplan|Revit|Archicad|Tekla|Navisworks|Solibri|Primavera|MS Project|Synchro|Dalux|Autodesk|Bentley|Nemetschek|Trimble/;

const allText = (topic: (typeof ACADEMY_TOPICS)[number]) =>
  [topic.title, topic.summary, topic.why, ...topic.sources, topic.tryIn.label,
    ...topic.modules.flatMap(module => [module.title, module.body, ...module.points])].join('\n');

test('ilk sürüm beş ortak konudan oluşur ve her konu aynı kalıbı doldurur', () => {
  assert.deepEqual(ACADEMY_TOPICS.map(topic => topic.slug), ['bim-temelleri', '4d-5d-maliyet', '6d-surdurulebilirlik', 'scan-to-bim', 'guvenlik-ve-saha']);
  for (const topic of ACADEMY_TOPICS) {
    assert.ok(topic.title && topic.summary && topic.why, topic.slug);
    assert.ok(topic.modules.length >= 3 && topic.modules.length <= 6, `${topic.slug}: modül sayısı`);
    assert.ok(topic.modules.every(module => module.points.length >= 2), `${topic.slug}: madde sayısı`);
    assert.ok(topic.sources.length >= 1, `${topic.slug}: kaynak`);
    assert.ok(PUBLIC_ROUTES.has(topic.tryIn.href), `${topic.slug}: "BIMMetraj'da dene" var olan genel bir sayfaya gider`);
  }
});

test('içerik markadan bağımsızdır ve yayına uygun olmayan ifadeler taşımaz', () => {
  for (const topic of ACADEMY_TOPICS) {
    const text = allText(topic);
    assert.doesNotMatch(text, SOFTWARE_BRANDS, `${topic.slug}: yazılım markası`);
    assert.doesNotMatch(text, /\$|\\text|\^/, `${topic.slug}: ham formül`);
    assert.doesNotMatch(text, /kaynak HTML|native react|kaynakta /i, `${topic.slug}: geliştirici notu`);
    assert.doesNotMatch(text, /Teklif ?Pro|BIMPlan/, `${topic.slug}: eski ad`);
    assert.doesNotMatch(text, /—/, `${topic.slug}: uzun tire`);
    assert.doesNotMatch(text, /yüksek lisans|AKTS|ECTS|garanti (?:eder|ediyor)|garantili|%\s*100|sıfırla/i, `${topic.slug}: abartılı iddia`);
    // v1 carries no engineering or cost figures; they return after yuksek-muhendis-mimar review.
    assert.doesNotMatch(text, /\d+(?:[.,]\d+)?\s*(?:mm|m²|m2|kg|%|TL|₺)/, `${topic.slug}: doğrulanmamış sayı`);
  }
});

test('yollar ve konu araması veri dosyasından üretilir', () => {
  assert.deepEqual(ACADEMY_LIBRARY_PATHS, ['/academy', ...ACADEMY_TOPICS.map(topic => `/academy/${topic.slug}`)]);
  assert.equal(findAcademyTopic('bim-temelleri')?.slug, 'bim-temelleri');
  assert.equal(findAcademyTopic('allplan'), undefined);
  assert.equal(findAcademyTopic(undefined), undefined);
});

test('Akademi sayfaları sabit renk yerine tema değişkenleri kullanır ve eski Academy sayfalarını çağırmaz', () => {
  for (const file of ['src/pages/AcademyLibrary.tsx', 'src/pages/AcademyTopic.tsx']) {
    const page = readFileSync(file, 'utf8');
    assert.doesNotMatch(page, /#[0-9a-f]{6}|orange-|text-white|BIMPlan/i, file);
    assert.doesNotMatch(page, /PublicAcademy|sourceData|subGuidesData/, file);
  }
});
