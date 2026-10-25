import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { BrowserPreviewNotice } from "./BrowserPreviewNotice";

const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BrowserPreviewNotice)));

test("tarayıcı ön analizi uyarısı sonucun yetkili olmadığını metinle söyler", () => {
  assert.match(html, /role="note"/);
  assert.match(html, /yetkili sonuç değildir/);
  assert.match(html, /malzeme katmanlarını okumaz/);
});

test("uyarı kesin sonuç için SmartCheck sunucu analizine yönlendirir", () => {
  assert.match(html, /href="\/app\/smartcheck"[^>]*>SmartCheck(?:'|&#x27;)e yükle/);
});
