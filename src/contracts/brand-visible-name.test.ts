import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { siteJsonLd } from '../server/security/site-jsonld';
import { llmsFullTxt, llmsTxt } from '../server/security/web-hardening';

// The product is BIMMetraj (formerly TeklifPro). Internal identifiers such as the production
// database schemas `teklifpro_queue` / `teklifpro_release` stay; only text a person, a search
// engine or an AI crawler can read is checked here (Hazar, 2026-11-06).
// Case-sensitive on purpose: visible text is capitalised, internal keys (`teklifpro.*`) are not.
const OLD_NAME = /Teklif ?Pro|TEKL[İI]F ?PRO/;

const VISIBLE_SOURCES = [
  'index.html',
  'src/pages',
  'src/components',
  'src/features',
  'src/academy',
  'src/server/security',
  'src/server/auth/email-templates.ts',
  'src/services/pdf',
  'src/services/ai/providers',
  'src/server/routes/pricing-file-import.ts',
  'src/server/crawler/safe-fetch.ts',
  'src/hooks/useAuth.tsx',
];

function sourceFiles(entry: string): string[] {
  if (statSync(entry).isFile()) return [entry];
  return readdirSync(entry).flatMap(name => sourceFiles(path.join(entry, name)));
}

const isScannable = (file: string) => /\.(tsx?|html|json)$/.test(file) && !/\.(test|pgtest)\.ts$/.test(file);

test('kullanıcıya, arama motorlarına ve yapay zekâ tarayıcılarına görünen metinlerde eski ürün adı yok', () => {
  const offenders = VISIBLE_SOURCES.flatMap(sourceFiles).filter(isScannable).flatMap(file =>
    readFileSync(file, 'utf8').split('\n').flatMap((line, index) => (OLD_NAME.test(line) ? [`${file}:${index + 1}`] : [])),
  );
  assert.deepEqual(offenders, []);
});

test('llms.txt markayı bitişik ve boşluklu yazımıyla tanıtır, eski adı kullanmaz', () => {
  for (const text of [llmsTxt('https://bimmetraj.com'), llmsFullTxt('https://bimmetraj.com', [])]) {
    assert.doesNotMatch(text, OLD_NAME);
  }
  assert.match(llmsTxt('https://bimmetraj.com'), /^# BIMMetraj \(BIM Metraj\)/);
});

test('JSON-LD site adı için WebSite düğümü ve boşluklu yazım alternatifini taşır', () => {
  const graph = (siteJsonLd('https://bimmetraj.com') as { '@graph': Array<Record<string, unknown>> })['@graph'];
  const byType = (type: string) => graph.find(node => node['@type'] === type);
  const website = byType('WebSite');
  assert.ok(website, 'WebSite düğümü olmalı (Google site adı)');
  assert.equal(website.name, 'BIMMetraj');
  assert.equal(website.url, 'https://bimmetraj.com');
  for (const type of ['WebSite', 'Organization', 'SoftwareApplication']) {
    const node = byType(type);
    assert.ok(Array.isArray(node?.alternateName) && (node.alternateName as string[]).includes('BIM Metraj'), `${type}.alternateName`);
  }
  assert.doesNotMatch(JSON.stringify(graph), OLD_NAME);
});
