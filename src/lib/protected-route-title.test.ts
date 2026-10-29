import assert from 'node:assert/strict';
import test from 'node:test';
import { protectedRouteTitle } from './protected-route-title';

test('returns Turkish titles for known app and admin paths, including dynamic paths', () => {
  assert.equal(protectedRouteTitle('/app'), 'Genel Bakış — BIMMetraj');
  assert.equal(protectedRouteTitle('/app/quotes/new'), 'Yeni Teklif — BIMMetraj');
  assert.equal(protectedRouteTitle('/app/quotes/example/edit'), 'Teklifi Düzenle — BIMMetraj');
  assert.equal(protectedRouteTitle('/app/quotes/example'), 'Teklif Detayı — BIMMetraj');
  assert.equal(protectedRouteTitle('/admin/tenants/example'), 'Firma Detayı — BIMMetraj');
  assert.equal(protectedRouteTitle('/admin/roadmap/calculations/'), 'Hesaplama Yöntemleri — BIMMetraj');
});

test('never exposes identifiers and leaves public metadata unchanged', () => {
  assert.equal(protectedRouteTitle('/app/quotes/private-id/extra'), 'Sayfa Bulunamadı (404) | BIMMetraj');
  assert.equal(protectedRouteTitle('/admin/unknown'), 'Sayfa Bulunamadı (404) | BIMMetraj');
  for (const path of ['/', '/pricing', '/login', '/bim-sozlugu', '/application', '/administrator']) assert.equal(protectedRouteTitle(path), null);
});
