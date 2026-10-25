import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { HowItWorks } from "./HowItWorks";
import { EXPERT_MODULES } from "./how-it-works/how-it-works-data";

const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HowItWorks)));

test("Nasıl Çalışır sayfası her modülü örnek hesabıyla ve geri bildirim bağlantısıyla gösterir", () => {
  assert.equal((html.match(/<details /g) ?? []).length, EXPERT_MODULES.length);
  assert.equal((html.match(/href="mailto:info@bimmetraj\.com\?subject=/g) ?? []).length, EXPERT_MODULES.length);
  assert.match(html, /Örnek hesap/);
});

test("sayfa iç kod yollarını, inceleme kimliklerini veya onay imza tablosunu göstermez", () => {
  assert.doesNotMatch(html, /src\/[a-z]/);
  assert.doesNotMatch(html, /BIM-CALC-/);
  assert.doesNotMatch(html, /Doğrulayan \(ad, disiplin, unvan, sicil no\)/);
});

test("sayfa çıktıların ön hesap olduğunu ve resmî karar yerine geçmediğini söyler", () => {
  assert.match(html, /ön hesaptır/);
  assert.match(html, /resmî uygunluk kararı yerine geçmez/);
});
