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
  assert.equal(html.includes('rel="canonical"'), false, '404 sayfası ana sayfaya canonical vermemeli');
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

test('JS çalıştırmayan tarayıcılar için rota başına <noscript> içeriği eklenir ve bir kez eklenir', () => {
  const once = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar/kik-asiri-dusuk-teklif', origin: 'https://bimmetraj.com' });
  assert.match(once, /<noscript><main><h1>Aşırı Düşük Teklif Sınır Değeri Hesaplama/);
  assert.match(once, /52\.281,00 TL/); // resmî Tebliğ 45.2 örneği
  assert.match(once, /K = \(3,2C − C² − 0,6\) \/ \(C \+ 1\)/);
  assert.match(once, /<a href="https:\/\/bimmetraj\.com\/pricing">Paketler<\/a>/);
  const twice = injectRouteMeta(once, { pathname: '/hesaplayicilar/kik-asiri-dusuk-teklif', origin: 'https://bimmetraj.com' });
  assert.equal((twice.match(/<noscript><main>/g) ?? []).length, 1);
});

test('4735 sayfası B = 0,90 ve ağırlık toplamı 1,00 bilgisini taşır; ana sayfa yetenek durumunu dürüstçe listeler', () => {
  const fiyatFarki = injectRouteMeta(SHELL, { pathname: '/hesaplayicilar/fiyat-farki-4735', origin: 'https://bimmetraj.com' });
  assert.match(fiyatFarki, /B = 0,90/);
  assert.match(fiyatFarki, /toplamı 1,00/);
  const home = injectRouteMeta(SHELL, { pathname: '/', origin: 'https://bimmetraj.com', capabilityLines: ['Örnek yetenek — Pilot (L2; bağımsız uzman onayı yok)'] });
  assert.match(home, /Yetenekler ve doğrulama durumu/);
  assert.match(home, /bağımsız uzman onayı yok/);
});

test('bilinmeyen rota ve noscript: 404 sayfasına içerik eklenmez; kullanıcı girdisi kaçışlanır', () => {
  const notFound = injectRouteMeta(SHELL, { pathname: '/yok', origin: 'https://bimmetraj.com', notFound: true });
  assert.equal(notFound.includes('<noscript><main>'), false);
  const evil = injectRouteMeta(SHELL, { pathname: '/', origin: 'https://bimmetraj.com', capabilityLines: ['<script>alert(1)</script>'] });
  assert.equal(evil.includes('<script>alert(1)</script>'), false);
  assert.match(evil, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
