import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { SettingsBillingSection } from "./settings-billing-section";

test("settings routes subscription management to the authoritative billing page without inventing a plan or quota", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SettingsBillingSection)));
  assert.match(html, /href="\/app\/billing"/);
  assert.match(html, /Paket ve kullanım bilgilerini görüntüle/);
  assert.doesNotMatch(html, /AKTİF &amp; ÖDENMİŞ|Sınırsız|3 Kullanıcı|starter/i);
});
