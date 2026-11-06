import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CAPABILITY_REGISTRY } from '../../capabilities/registry';
import { CONTENT_RULES } from './content-rules';
import { ACADEMY_GUIDES, findAcademyGuide, guidesForModule } from './guides';
import { ACADEMY_LIBRARY_PATHS, ACADEMY_TOPICS } from './topics';

// Academy phase 2, package 1 (Hazar, 2026-11-06): detailed guides on their own pages, no side
// panel. Only guides without unreviewed figures or brands are published in this package.

const guideText = (guide: (typeof ACADEMY_GUIDES)[number]) => [
  guide.title, guide.summary, guide.rule ?? '', guide.example, ...guide.takeaways, ...guide.sources,
  guide.bimmetraj?.text ?? '', guide.review?.note ?? '', ...(guide.table ? [guide.table.title, ...guide.table.headers, ...guide.table.rows.flat()] : []),
  ...(guide.calculation ? [guide.calculation.title, guide.calculation.note, ...guide.calculation.results.map(result => `${result.label} ${result.formula}`)] : []),
].join('\n');

test('üç pakette yirmi iki rehber vardır ve her biri bir konunun bir modülüne bağlıdır', () => {
  assert.equal(ACADEMY_GUIDES.length, 22);
  const keys = new Set<string>();
  for (const guide of ACADEMY_GUIDES) {
    const topic = ACADEMY_TOPICS.find(item => item.slug === guide.topicSlug);
    assert.ok(topic, `${guide.slug}: konu`);
    assert.ok(topic.modules.some(module => module.title === guide.moduleTitle), `${guide.slug}: modül başlığı`);
    assert.match(guide.slug, /^[a-z0-9-]+$/, `${guide.slug}: adres`);
    const key = `${guide.topicSlug}/${guide.slug}`;
    assert.equal(keys.has(key), false, `${key}: tekrar`);
    keys.add(key);
    assert.ok(guide.takeaways.length >= 2 && guide.sources.length >= 1 && guide.example, `${guide.slug}: kalıp`);
  }
});

test('rehber içeriği yayın kurallarına uyar; sayı yalnız inceleme kaydı olan rehberde bulunur', () => {
  for (const guide of ACADEMY_GUIDES) {
    const text = guideText(guide);
    for (const [label, pattern] of CONTENT_RULES) {
      if (label === 'doğrulanmamış sayı' && guide.review) continue;
      assert.doesNotMatch(text, pattern, `${guide.slug}: ${label}`);
    }
  }
});

test('sayı içeren rehberlerin inceleme kaydı tarihli, yöntemli ve kaynaklıdır', () => {
  const reviewed = ACADEMY_GUIDES.filter(guide => guide.review);
  assert.deepEqual(reviewed.map(guide => guide.slug).sort(), ['donati-detaylandirma', 'loa-seviyeleri', 'minha-kurallari']);
  for (const guide of reviewed) {
    assert.match(guide.review!.reviewedOn, /^\d{4}-\d{2}-\d{2}$/, guide.slug);
    assert.match(guide.review!.method, /yuksek-muhendis-mimar/, guide.slug);
    assert.ok(guide.review!.sources.length >= 1, `${guide.slug}: kaynak`);
  }
});

test('BIMMetraj notu yalnız yetenek kaydında canlı veya pilot olan bir özelliğe bağlanır', () => {
  for (const guide of ACADEMY_GUIDES) {
    if (!guide.bimmetraj) continue;
    const capability = CAPABILITY_REGISTRY.find(item => item.id === guide.bimmetraj!.capabilityId);
    assert.ok(capability, `${guide.slug}: yetenek kaydı`);
    assert.notEqual(capability.status, 'roadmap', `${guide.slug}: yol haritasındaki özellik vaat edilmez`);
  }
});

test('rehber yolları kütüphane yollarına eklenir ve konu modülünden bulunur', () => {
  for (const guide of ACADEMY_GUIDES) {
    assert.ok(ACADEMY_LIBRARY_PATHS.includes(`/academy/${guide.topicSlug}/${guide.slug}`), guide.slug);
    assert.equal(findAcademyGuide(guide.topicSlug, guide.slug)?.slug, guide.slug);
    assert.ok(guidesForModule(guide.topicSlug, guide.moduleTitle).includes(guide));
  }
  assert.equal(findAcademyGuide('bim-temelleri', 'yok'), undefined);
  assert.equal(findAcademyGuide('4d-5d-maliyet', 'pim-aim-cobie'), undefined, 'rehber yalnız kendi konusunda açılır');
});

test('rehber sayfası tema değişkenleri kullanır ve eski yan paneli çağırmaz', () => {
  const page = readFileSync('src/pages/AcademyGuide.tsx', 'utf8');
  assert.doesNotMatch(page, /#[0-9a-f]{6}|orange-|text-white|BIMPlan/i);
  assert.match(page, /guide\.calculation/, 'örnek hesap sayfada gösterilir');
  assert.match(page, /guide\.review/, 'inceleme notu sayfada gösterilir');
  assert.doesNotMatch(page, /SubGuideDrawer|subGuidesData|dangerouslySetInnerHTML/);
});

// Package 2: worked examples are unitless and their arithmetic is recomputed here.
function evaluate(formula: string, scope: Readonly<Record<string, number>>): number {
  const expression = formula.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-')
    .replace(/[A-Z]+/g, name => {
      assert.ok(name in scope, `bilinmeyen değişken: ${name}`);
      return `(${scope[name]})`;
    });
  assert.match(expression, /^[\d\s().+\-*/]+$/, `güvenli ifade: ${formula}`);
  return Function(`"use strict"; return (${expression});`)() as number;
}

test('örnek hesaplar birimsizdir ve her sonuç formülünden yeniden hesaplanınca tutar', () => {
  const withCalculation = ACADEMY_GUIDES.filter(guide => guide.calculation);
  assert.ok(withCalculation.length >= 3, 'EVM, minha ve donatı örnek hesapları');
  for (const guide of withCalculation) {
    const scope: Record<string, number> = { ...guide.calculation!.inputs };
    for (const result of guide.calculation!.results) {
      const value = evaluate(result.formula, scope);
      assert.ok(Math.abs(value - result.value) <= 0.005 * Math.max(1, Math.abs(value)), `${guide.slug}: ${result.label} = ${value}, yazılan ${result.value}`);
      scope[result.label] = value;
    }
  }
});
