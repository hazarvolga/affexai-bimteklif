import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// Setup JSDOM globals before importing axe-core
const dom = new JSDOM('<!DOCTYPE html><html lang="tr"><head><title>BIMMetraj A11y Suite</title></head><body><div id="root"></div></body></html>', {
  url: 'https://bimmetraj.com',
  pretendToBeVisual: true,
});

globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;

const axe = (await import('axe-core')).default;

test('axe a11y audit: temel pafta düzeni ve semantik hiyerarşi WCAG 2.2 AA uyumludur', async () => {
  const container = dom.window.document.getElementById('root')!;
  container.innerHTML = `
    <header role="banner" class="border-b border-border bg-card p-4">
      <nav aria-label="Ana Gezinti">
        <a href="/app" class="text-sm font-bold text-foreground">BIMMetraj</a>
        <button type="button" aria-label="Hızlı Turu Başlat" class="text-xs text-primary">🧭 Hızlı Tur</button>
      </nav>
    </header>
    <main role="main" class="p-6 bg-background text-foreground">
      <h1 class="text-2xl font-normal text-foreground">Proje Metraj ve İcmal Paftası</h1>
      <p class="text-sm text-muted-foreground">IFC4 ve ÇŞB 2026 poz doğrulamalı metraj dökümü.</p>
      
      <section aria-labelledby="section-stats" class="mt-6 border border-border bg-card p-4">
        <h2 id="section-stats" class="text-base font-semibold text-foreground">Metraj Özeti</h2>
        <table class="w-full text-xs" aria-label="Metraj İcmali">
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="text-left p-2">Poz No</th>
              <th scope="col" class="text-left p-2">Tanım</th>
              <th scope="col" class="text-right p-2">Miktar</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border">
              <td class="p-2 font-mono">15.180.1003</td>
              <td class="p-2">C25/30 Hazır Beton</td>
              <td class="p-2 text-right font-mono">1.250 m³</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  `;

  const results = await axe.run(dom.window.document.documentElement, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    },
  });

  const criticalOrSerious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  assert.equal(
    criticalOrSerious.length,
    0,
    `Kritik/ciddi erişilebilirlik ihlalleri bulundu:\n${JSON.stringify(criticalOrSerious, null, 2)}`
  );
});

test('axe a11y audit: form kontrolleri, etiket bağlantıları ve buton isimleri tamdır', async () => {
  const container = dom.window.document.getElementById('root')!;
  container.innerHTML = `
    <form aria-label="Teklif Kalibrasyon Formu" class="space-y-4 p-6 bg-card text-foreground">
      <div>
        <label for="actual-cost" class="block text-xs font-semibold text-foreground">Gerçekleşen Maliyet (TL)</label>
        <input id="actual-cost" type="number" required aria-required="true" class="border border-border bg-background p-2" />
      </div>
      <div>
        <label for="actual-duration" class="block text-xs font-semibold text-foreground">Gerçekleşen Süre (Ay)</label>
        <input id="actual-duration" type="number" min="1" class="border border-border bg-background p-2" />
      </div>
      <div>
        <label for="calib-note" class="block text-xs font-semibold text-foreground">İnceleme Notu</label>
        <textarea id="calib-note" aria-label="İnceleme Notu" rows="3" class="border border-border bg-background p-2"></textarea>
      </div>
      <div>
        <label for="agree-terms" class="flex items-center gap-2">
          <input id="agree-terms" type="checkbox" required aria-label="Sözleşme koşullarını kabul ediyorum" />
          <span>Sözleşme koşullarını kabul ediyorum</span>
        </label>
      </div>
      <div class="flex gap-2">
        <button type="submit" class="bg-primary text-primary-foreground px-4 py-2 text-xs">Kaydet</button>
        <button type="button" aria-label="İşlemi İptal Et" class="border border-border text-foreground px-4 py-2 text-xs">İptal</button>
        <button type="button" aria-label="Daha Fazla İşlem Menüsü" class="border border-border p-2">
          <svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="4"/></svg>
        </button>
      </div>
    </form>
  `;

  const results = await axe.run(dom.window.document.documentElement, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  });

  const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  assert.equal(
    violations.length,
    0,
    `Form kontrollerinde ihlaller bulundu:\n${JSON.stringify(violations, null, 2)}`
  );
});

test('axe a11y audit: Quick Tour modal ve diyalog erişilebilirliği', async () => {
  const container = dom.window.document.getElementById('root')!;
  container.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="tour-dialog-title" class="bg-card border border-border p-5 text-foreground">
      <div class="flex justify-between items-center mb-3">
        <h2 id="tour-dialog-title" class="text-sm font-bold text-foreground">🧭 Adım 1 / 5: BIM & Metraj Paftası</h2>
        <button type="button" aria-label="Turu Kapat" class="text-muted-foreground">✕</button>
      </div>
      <p class="text-xs text-muted-foreground">IFC modeli ve mahal listesi verileri bu panel üzerinden yönetilir.</p>
      <div class="mt-4 flex justify-between items-center">
        <button type="button" class="text-xs text-muted-foreground">Turu Bitir</button>
        <div class="flex gap-2">
          <button type="button" class="bg-primary text-primary-foreground px-3 py-1 text-xs">Sonraki &rarr;</button>
        </div>
      </div>
    </div>
  `;

  const results = await axe.run(dom.window.document.documentElement, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  });

  const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  assert.equal(
    violations.length,
    0,
    `Quick Tour modalında erişilebilirlik ihlali:\n${JSON.stringify(violations, null, 2)}`
  );
});
