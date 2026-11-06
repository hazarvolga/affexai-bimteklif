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
  guide.bimmetraj?.text ?? '', ...(guide.table ? [guide.table.title, ...guide.table.headers, ...guide.table.rows.flat()] : []),
].join('\n');

test('birinci pakette on iki rehber vardır ve her biri bir konunun bir modülüne bağlıdır', () => {
  assert.equal(ACADEMY_GUIDES.length, 12);
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

test('rehber içeriği yayın kurallarına uyar', () => {
  for (const guide of ACADEMY_GUIDES) {
    const text = guideText(guide);
    for (const [label, pattern] of CONTENT_RULES) assert.doesNotMatch(text, pattern, `${guide.slug}: ${label}`);
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
  assert.doesNotMatch(page, /SubGuideDrawer|subGuidesData|dangerouslySetInnerHTML/);
});
