import assert from 'node:assert/strict';
import test from 'node:test';
import { getRouteMeta, injectRouteMeta } from './route-meta';
import { llmsFullTxt } from './web-hardening';

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
  assert.equal(text.includes('/hesaplayicilar/yambis-muteahhitlik-grubu'), false);
});
