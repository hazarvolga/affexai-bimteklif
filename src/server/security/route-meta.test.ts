import assert from 'node:assert/strict';
import test from 'node:test';
import { getRouteMeta, injectRouteMeta } from './route-meta';
import { PUBLIC_GLOSSARY_TERMS } from './public-glossary';
import { llmsFullTxt } from './web-hardening';
import { routeJsonLd } from './route-jsonld';

const SHELL = [
  '<html><head>',
  '<meta name="description" content="eski" />',
  '<meta property="og:title" content="eski" />',
  '<meta property="og:description" content="eski" />',
  '<meta property="og:url" content="https://bimmetraj.com/" />',
  '<meta name="twitter:title" content="eski" />',
  '<meta name="twitter:description" content="eski" />',
  '<link rel="canonical" href="https://bimmetraj.com/" />',
  '<title>eski</title>',
  '</head><body><div id="root"></div></body></html>',
].join('\n');

test('bilinen genel rota için başlık, açıklama ve canonical sunucuda yeniden yazılır', () => {
  const html = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar/kik-asiri-dusuk-teklif', origin: 'https://bimmetraj.com' });
  assert.match(html, /<title>Aşırı Düşük Teklif Sınır Değeri Hesaplama/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bimmetraj\.com\/hesaplayicilar\/kik-asiri-dusuk-teklif" \/>/);
  assert.equal(html.includes('"eski"'), false);
  assert.equal(html.includes('>eski<'), false);
});

test('sondaki eğik çizgi aynı rotadır ve bilinmeyen rota meta almaz', () => {
  assert.deepEqual(getRouteMeta('/pricing/'), getRouteMeta('/pricing'));
  assert.equal(getRouteMeta('/yok-boyle-sayfa'), null);
});

test('bilinmeyen rota noindex alır ve başlığı bozulmaz', () => {
  const html = injectRouteMeta(SHELL, { pathname: '/yok-boyle-sayfa', origin: 'https://bimmetraj.com', notFound: true });
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(html, /<title>eski<\/title>/);
  assert.equal(html.includes('rel="canonical"'), false, '404 sayfası ana sayfaya canonical vermemeli');
});

test('SEO-01: meta kaydı olmayan özel ve token rotaları ana sayfa canonical almaz ve indekslenmez', () => {
  for (const pathname of ['/app', '/app/quotes/new', '/admin/roadmap', '/reset-password/abc', '/verify-email/abc', '/accept-invite/abc']) {
    const html = injectRouteMeta(SHELL, { pathname, origin: 'https://bimmetraj.com' });
    assert.equal(html.includes('rel="canonical"'), false, `${pathname} ana sayfaya canonical vermemeli`);
    assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/, pathname);
  }
  const publicHtml = injectRouteMeta(SHELL, { pathname: '/pricing', origin: 'https://bimmetraj.com' });
  assert.equal(/name="robots"/.test(publicHtml), false, 'genel sayfa indekslenebilir kalır');
});

test('paylaşım görseli yalnız verildiğinde ve bir kez eklenir', () => {
  const once = injectRouteMeta(SHELL, { pathname: '/', origin: 'https://bimmetraj.com', ogImagePath: '/og-image.png' });
  assert.match(once, /property="og:image" content="https:\/\/bimmetraj\.com\/og-image\.png"/);
  const twice = injectRouteMeta(once, { pathname: '/', origin: 'https://bimmetraj.com', ogImagePath: '/og-image.png' });
  assert.equal((twice.match(/property="og:image"/g) ?? []).length, 1);
  assert.equal(injectRouteMeta(SHELL, { pathname: '/', origin: 'https://bimmetraj.com' }).includes('og:image'), false);
});

test('meta değerlerinde tırnak ve köşeli ayraç kaçışlanır', () => {
  const html = injectRouteMeta('<head><title>x</title><meta name="description" content="y" /></head>', { pathname: '/', origin: 'https://bimmetraj.com' });
  assert.equal(/content="[^"]*"[^>]*"[^"]*"\s*\/>\s*<meta name="description"/.test(html), false);
});

test('llms-full.txt yetenekleri kayıttan üretir ve imzasız yeteneği "uzman onayı yok" diye işaretler', () => {
  const text = llmsFullTxt('https://bimmetraj.com');
  assert.match(text, /## Yetenek Ayrıntıları/);
  assert.match(text, /Uzman onayı: Yok/);
  assert.equal(text.includes('L3 CANLI'), false);
  assert.equal(text.includes('Denetim Kurulu'), false);
  assert.equal(text.includes('/hesaplayicilar/yambis-muteahhitlik-grubu'), true);
  assert.equal(text.includes('/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum'), true);
});

test('T48: rota içeriği #root içinde ön-render olarak, noscript dışında ve bir kez eklenir', () => {
  const once = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar/kik-asiri-dusuk-teklif', origin: 'https://bimmetraj.com' });
  assert.match(once, /<div id="root"><main id="prerender" data-prerender="route"><h1>Aşırı Düşük Teklif Sınır Değeri Hesaplama/);
  assert.equal(/<noscript>(?:(?!<\/noscript>)[^])*<h1>/.test(once), false, 'içerik noscript içinde olmamalı (Readability/Trafilatura siler)');
  assert.match(once, /<style id="prerender-style">#prerender\{position:absolute/);
  assert.match(once, /<noscript><style>#prerender\{position:static/);
  assert.match(once, /52\.281,00 TL/); // resmî Tebliğ 45.2 örneği
  assert.match(once, /K = \(3,2C − C² − 0,6\) \/ \(C \+ 1\)/);
  assert.match(once, /<a href="https:\/\/bimmetraj\.com\/pricing">Paketler<\/a>/);
  const twice = injectRouteMeta(once, { pathname: '/hesaplayicilar/kik-asiri-dusuk-teklif', origin: 'https://bimmetraj.com' });
  assert.equal((twice.match(/id="prerender"/g) ?? []).length, 1);
  assert.equal((twice.match(/id="prerender-style"/g) ?? []).length, 1);
});

test('4735 sayfası B = 0,90 ve ağırlık toplamı 1,00 bilgisini taşır; ana sayfa yetenek durumunu dürüstçe listeler', () => {
  const fiyatFarki = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar/fiyat-farki-4735', origin: 'https://bimmetraj.com' });
  assert.match(fiyatFarki, /B = 0,90/);
  assert.match(fiyatFarki, /toplamı 1,00/);
  const home = injectRouteMeta(SHELL, { pathname: '/', origin: 'https://bimmetraj.com', capabilityLines: ['Örnek yetenek — Pilot (L2; bağımsız uzman onayı yok)'] });
  assert.match(home, /Yetenekler ve doğrulama durumu/);
  assert.match(home, /bağımsız uzman onayı yok/);
});

test('bilinmeyen rota ve ön-render: 404 sayfasına içerik eklenmez; kullanıcı girdisi kaçışlanır', () => {
  const notFound = injectRouteMeta(SHELL, { pathname: '/yok', origin: 'https://bimmetraj.com', notFound: true });
  assert.equal(notFound.includes('id="prerender"'), false);
  assert.match(notFound, /<div id="root"><\/div>/);
  const evil = injectRouteMeta(SHELL, { pathname: '/', origin: 'https://bimmetraj.com', capabilityLines: ['<script>alert(1)</script>'] });
  assert.equal(evil.includes('<script>alert(1)</script>'), false);
  assert.match(evil, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('P1-4 ve P2 SEO: /bim-sozlugu ön-render terimleri taşır, ana sayfa başlığı <=60 karakterdir, /login ve /register noindex alır ve FAQPage yalnız ana sayfada kalır', () => {
  const shellWithFaq = SHELL.replace('</head>', '<script id="faq-jsonld" type="application/ld+json">{"@type":"FAQPage"}</script></head>');
  const home = injectRouteMeta(shellWithFaq, { pathname: '/', origin: 'https://bimmetraj.com' });
  const homeMeta = getRouteMeta('/')!;
  assert.ok(homeMeta.title.length <= 60, `Home title length (${homeMeta.title.length}) should be <= 60`);
  assert.equal(home.includes('id="faq-jsonld"'), true, 'FAQPage JSON-LD ana sayfada korunmalı');

  const glossary = injectRouteMeta(shellWithFaq, { pathname: '/bim-sozlugu', origin: 'https://bimmetraj.com' });
  assert.equal(glossary.includes('id="faq-jsonld"'), false, 'FAQPage JSON-LD alt sayfalardan kaldırılmalı');
  assert.match(glossary, /EIR \(Bilgi Gereksinimleri/);
  assert.match(glossary, /IFC ve IFC 4\.3/);
  assert.match(glossary, /RG 33331 e-PYS ve EK-9/);
  assert.match(glossary, /4734 KİK m\.38/);

  const loginHtml = injectRouteMeta(shellWithFaq, { pathname: '/login', origin: 'https://bimmetraj.com' });
  assert.match(loginHtml, /<title>Giriş Yap — Kurumsal İhale ve BIM Masası \| BIMMetraj<\/title>/);
  assert.match(loginHtml, /<link rel="canonical" href="https:\/\/bimmetraj\.com\/login" \/>/);
  assert.match(loginHtml, /<meta name="robots" content="noindex, follow" \/>/);
});


function routeJsonLdOf(html: string): any {
  const match = html.match(/<script id="route-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
}

test('SEO-05: hesaplayıcı sayfası BreadcrumbList ve ücretsiz WebApplication alır; puan veya fiyat uydurulmaz', () => {
  const html = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar/fiyat-farki-4735', origin: 'https://bimmetraj.com' });
  const data = routeJsonLdOf(html);
  const [crumbs, app] = data['@graph'];
  assert.equal(crumbs['@type'], 'BreadcrumbList');
  assert.deepEqual(crumbs.itemListElement.map((item: any) => item.item), [
    'https://bimmetraj.com/', 'https://bimmetraj.com/hesaplayicilar', 'https://bimmetraj.com/hesaplayicilar/fiyat-farki-4735',
  ]);
  assert.equal(app['@type'], 'WebApplication');
  assert.equal(app.isAccessibleForFree, true);
  const json = JSON.stringify(data);
  for (const forbidden of ['aggregateRating', 'review', 'offers', 'price']) assert.equal(json.includes(forbidden), false, forbidden);
});

test('SEO-05: sözlük DefinedTermSet ile ön-render metni aynı terim listesinden üretilir', () => {
  const html = injectRouteMeta(SHELL, { pathname: '/bim-sozlugu', origin: 'https://bimmetraj.com' });
  const set = routeJsonLdOf(html)['@graph'].find((node: any) => node['@type'] === 'DefinedTermSet');
  assert.equal(set.hasDefinedTerm.length, PUBLIC_GLOSSARY_TERMS.length);
  for (const term of PUBLIC_GLOSSARY_TERMS) {
    assert.ok(set.hasDefinedTerm.some((t: any) => t.name === term.name && t.description === term.description), term.name);
    const visible = `${term.name}: ${term.description}`.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    assert.ok(html.includes(`<p>${visible}</p>`), `prerender: ${term.name}`);
  }
});

test('SEO-05: rota JSON-LD yalnız uygun genel sayfalarda, bir kez ve kaçışlanmış olarak eklenir', () => {
  for (const pathname of ['/pricing', '/login']) {
    assert.equal(injectRouteMeta(SHELL, { pathname, origin: 'https://bimmetraj.com' }).includes('route-jsonld'), false, pathname);
  }
  assert.equal(injectRouteMeta(SHELL, { pathname: '/olmayan', origin: 'https://bimmetraj.com', notFound: true }).includes('route-jsonld'), false);
  const once = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar', origin: 'https://bimmetraj.com' });
  const twice = injectRouteMeta(once, { pathname: '/hesaplayicilar', origin: 'https://bimmetraj.com' });
  assert.equal((twice.match(/id="route-jsonld"/g) ?? []).length, 1);
  const script = once.match(/<script id="route-jsonld"[^>]*>([\s\S]*?)<\/script>/)![1];
  assert.equal(/[<>]/.test(script), false);
});

test('T46: /pricing sunucu metni plan kataloğu ve fatura dönemleriyle aynı fiyat ve iskontoları gösterir', async () => {
  const { canonicalPlans } = await import('../../services/billing/plan-catalog');
  const { BILLING_PERIOD_OPTIONS } = await import('../../services/billing/billing-periods');
  const html = injectRouteMeta(SHELL, { pathname: '/pricing', origin: 'https://bimmetraj.com', publicPlans: canonicalPlans });
  for (const plan of canonicalPlans.filter(p => p.isActive && p.isPublished)) {
    assert.ok(html.includes(`(${plan.monthlyPrice.toLocaleString('tr-TR')} TL/ay)`), plan.name);
  }
  for (const option of BILLING_PERIOD_OPTIONS.filter(o => o.discountPercent > 0)) assert.ok(html.includes(`%${option.discountPercent}`), option.id);
});

test('T48: noindex rotaları (/login) ön-render içeriği ve stil almaz', () => {
  const login = injectRouteMeta(SHELL, { pathname: '/login', origin: 'https://bimmetraj.com' });
  assert.equal(login.includes('id="prerender"'), false);
  assert.equal(login.includes('prerender-style'), false);
});

test('T46/GEO-03: site JSON-LD yetenek kaydı ve plan kataloğundan üretilir; roadmap yeteneği, puan veya sameAs yazılmaz', async () => {
  const { canonicalPlans } = await import('../../services/billing/plan-catalog');
  const { getLiveCapabilities, getPilotCapabilities, getRoadmapCapabilities } = await import('../../capabilities/registry');
  const shell = SHELL.replace('</head>', '<script id="site-jsonld" type="application/ld+json">{"stale":true}</script></head>');
  for (const pathname of ['/', '/pricing', '/yok']) {
    const html = injectRouteMeta(shell, { pathname, origin: 'https://bimmetraj.com', notFound: pathname === '/yok', publicPlans: canonicalPlans });
    const match = html.match(/<script id="site-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(match, pathname);
    const graph = JSON.parse(match[1])['@graph'];
    const org = graph.find((node: any) => node['@type'] === 'Organization');
    const app = graph.find((node: any) => node['@type'] === 'SoftwareApplication');
    assert.equal(org.areaServed.identifier, 'TR');
    assert.equal('sameAs' in org, false);
    const prices = canonicalPlans.filter(p => p.isActive && p.isPublished).map(p => p.monthlyPrice);
    assert.deepEqual([app.offers.lowPrice, app.offers.highPrice, app.offers.offerCount], [String(Math.min(...prices)), String(Math.max(...prices)), String(prices.length)]);
    assert.deepEqual(app.featureList, [...getLiveCapabilities(), ...getPilotCapabilities()].map(c => c.title));
    for (const roadmap of getRoadmapCapabilities()) assert.equal(app.featureList.includes(roadmap.title), false, roadmap.id);
    assert.equal(/aggregateRating|"review"/.test(match[1]), false);
    assert.equal(html.includes('"stale"'), false);
  }
});

test('T46: index.html site JSON-LD yedeği geçerli JSON ve sunucunun değiştirebileceği kimliği taşır', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync('index.html', 'utf8');
  const match = html.match(/<script id="site-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.doesNotThrow(() => JSON.parse(match[1]));
});

test('yalın Akademi: kütüphane ve konu sayfaları indekslenebilir, kendi başlığı ve ön-render metni vardır', async () => {
  const { ACADEMY_TOPICS } = await import('../../academy/library/topics');
  const library = injectRouteMeta(SHELL, { pathname: '/academy', origin: 'https://bimmetraj.com' });
  assert.match(library, /<title>Akademi/);
  assert.match(library, /<link rel="canonical" href="https:\/\/bimmetraj\.com\/academy" \/>/);
  assert.equal(/name="robots"/.test(library), false);
  for (const topic of ACADEMY_TOPICS) {
    const html = injectRouteMeta(SHELL, { pathname: `/academy/${topic.slug}`, origin: 'https://bimmetraj.com' });
    assert.ok(html.includes(`<link rel="canonical" href="https://bimmetraj.com/academy/${topic.slug}" />`), topic.slug);
    assert.equal(/name="robots"/.test(html), false, `${topic.slug} indekslenebilir`);
    assert.ok(html.includes(topic.modules[0].title.replace(/&/g, '&amp;')), `${topic.slug} ön-render modül başlığı`);
  }
});

test('Akademi rehberleri: her rehber sayfası indekslenebilir, kendi başlığı ve ön-render metni vardır', async () => {
  const { ACADEMY_GUIDES } = await import('../../academy/library/guides');
  for (const guide of ACADEMY_GUIDES) {
    const path = `/academy/${guide.topicSlug}/${guide.slug}`;
    const html = injectRouteMeta(SHELL, { pathname: path, origin: 'https://bimmetraj.com' });
    assert.ok(html.includes(`<link rel="canonical" href="https://bimmetraj.com${path}" />`), path);
    assert.equal(/name="robots"/.test(html), false, `${path} indekslenebilir`);
    assert.ok(html.includes(guide.takeaways[0].replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')), `${path} ön-render`);
  }
});

test('SEO-05/GEO-02: academyJsonLd tüm rota derinliklerinde doğru şema üretir; geçersiz slug null döner', () => {
  const origin = 'https://bimmetraj.com';

  // /academy — ItemList
  const list = routeJsonLd({ pathname: '/academy', origin, title: 'Akademi', description: 'BIM kütüphanesi' });
  assert.ok(list, '/academy JSON-LD üretilmeli');
  const itemList = (list!['@graph'] as any[])[0];
  assert.equal(itemList['@type'], 'ItemList');
  assert.ok(itemList.numberOfItems > 0);

  // /academy/{topicSlug} — BreadcrumbList + Article
  const topicData = routeJsonLd({ pathname: '/academy/bim-temelleri', origin, title: 'BIM Temelleri', description: 'Temel konu' });
  assert.ok(topicData, '/academy/bim-temelleri JSON-LD üretilmeli');
  const topicGraph = topicData!['@graph'] as any[];
  assert.ok(topicGraph.some((n: any) => n['@type'] === 'BreadcrumbList'), 'BreadcrumbList');
  assert.ok(topicGraph.some((n: any) => n['@type'] === 'Article'), 'Article');

  // /academy/{topicSlug}/{guideSlug} — BreadcrumbList + Article
  const guideData = routeJsonLd({ pathname: '/academy/bim-temelleri/pim-aim-cobie', origin, title: 'PIM/AIM/COBie', description: 'Rehber' });
  assert.ok(guideData, '/academy/bim-temelleri/pim-aim-cobie JSON-LD üretilmeli');
  const guideGraph = guideData!['@graph'] as any[];
  assert.ok(guideGraph.some((n: any) => n['@type'] === 'BreadcrumbList'));
  assert.ok(guideGraph.some((n: any) => n['@type'] === 'Article'));

  // Geçersiz topic slug → null
  assert.equal(routeJsonLd({ pathname: '/academy/olmayan-konu', origin, title: '', description: '' }), null);

  // Geçersiz guide slug (geçerli topic) → null
  assert.equal(routeJsonLd({ pathname: '/academy/bim-temelleri/olmayan-rehber', origin, title: '', description: '' }), null);

  // Derinlik > 3 → null
  assert.equal(routeJsonLd({ pathname: '/academy/bim-temelleri/pim-aim-cobie/extra', origin, title: '', description: '' }), null);
});

test('GEO-04: ana sayfa Organization ve WebSite schema içerir; sameAs veya aggregateRating yazılmaz', () => {
  const origin = 'https://bimmetraj.com';
  const data = routeJsonLd({ pathname: '/', origin, title: 'BIMMetraj', description: 'Ana sayfa' });
  assert.ok(data, 'ana sayfa JSON-LD üretilmeli');
  const graph = data!['@graph'] as any[];
  const org = graph.find((n: any) => n['@type'] === 'Organization');
  const site = graph.find((n: any) => n['@type'] === 'WebSite');
  assert.ok(org, 'Organization bulunmalı');
  assert.ok(site, 'WebSite bulunmalı');
  assert.equal(org['@id'], `${origin}/#organization`);
  assert.equal(site['@id'], `${origin}/#website`);
  assert.ok(site.potentialAction?.['@type'] === 'SearchAction', 'SearchAction bulunmalı');
  assert.ok(site.potentialAction?.target?.urlTemplate?.includes('/bim-sozlugu'), 'SearchAction bim-sozlugu arar');
  const json = JSON.stringify(data);
  for (const forbidden of ['sameAs', 'aggregateRating', 'review', 'offers']) {
    assert.equal(json.includes(forbidden), false, `${forbidden} üretilmemeli`);
  }
});

test('GEO-05: /smartcheck sayfası BreadcrumbList ve SoftwareApplication alır; IFC marka listesi featureList içerir', () => {
  const origin = 'https://bimmetraj.com';
  const data = routeJsonLd({ pathname: '/smartcheck', origin, title: 'SmartCheck', description: 'Kalite kontrol' });
  assert.ok(data, '/smartcheck JSON-LD üretilmeli');
  const graph = data!['@graph'] as any[];
  const crumbs = graph.find((n: any) => n['@type'] === 'BreadcrumbList');
  const app = graph.find((n: any) => n['@type'] === 'SoftwareApplication');
  assert.ok(crumbs, 'BreadcrumbList bulunmalı');
  assert.ok(app, 'SoftwareApplication bulunmalı');
  assert.equal(app.url, `${origin}/smartcheck`);
  assert.equal(app.isAccessibleForFree, true);
  assert.ok(Array.isArray(app.featureList), 'featureList dizi olmalı');
  assert.ok(app.featureList.some((f: string) => f.includes('Allplan')), 'featureList Allplan içermeli');
  assert.ok(app.featureList.some((f: string) => f.includes('Revit')), 'featureList Revit içermeli');
  const json = JSON.stringify(data);
  for (const forbidden of ['aggregateRating', 'review', 'price', 'offers']) {
    assert.equal(json.includes(forbidden), false, `${forbidden} üretilmemeli`);
  }
});

test('GEO-06: /bim-sozlugu FAQPage içerir; Allplan+Revit+ArchiCAD+Tekla IFC export sorularını ve 5D BIM+openBIM+ISO19650 cevaplarını kapsar', () => {
  const origin = 'https://bimmetraj.com';
  const data = routeJsonLd({ pathname: '/bim-sozlugu', origin, title: 'BIM Sözlüğü', description: 'Terimler' });
  assert.ok(data, '/bim-sozlugu JSON-LD üretilmeli');
  const graph = data!['@graph'] as any[];
  const faq = graph.find((n: any) => n['@type'] === 'FAQPage');
  assert.ok(faq, 'FAQPage bulunmalı');
  assert.ok(Array.isArray(faq.mainEntity), 'mainEntity dizi olmalı');
  const questions = faq.mainEntity.map((q: any) => q.name as string);
  const answers = faq.mainEntity.map((q: any) => q.acceptedAnswer?.text as string);
  for (const brand of ['Allplan', 'Revit', 'ArchiCAD', 'Tekla']) {
    assert.ok(questions.some((q: string) => q.includes(brand)), `${brand} sorusu bulunmalı`);
    assert.ok(answers.some((a: string) => a?.includes(brand)), `${brand} cevabı bulunmalı`);
  }
  for (const concept of ['5D BIM', 'openBIM', 'ISO 19650']) {
    assert.ok(questions.some((q: string) => q.includes(concept)), `${concept} sorusu bulunmalı`);
  }
  for (const q of faq.mainEntity) {
    assert.equal(q['@type'], 'Question');
    assert.equal(q.acceptedAnswer['@type'], 'Answer');
    assert.ok(q.acceptedAnswer.text?.length > 20, 'cevap metni yeterince uzun olmalı');
  }
});
