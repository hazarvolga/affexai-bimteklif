import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalmKikPanel } from "./CalmKikPanel";

test("SmartCheck KİK paneli varsayılan N kapsamını ve farklı N için hesaplayıcıyı açıklar", () => {
  const html = renderToStaticMarkup(createElement(CalmKikPanel, {
    allItems: [], unitPrices: {}, pricedGrandTotal: 0, pricingComplete: false, costPendingLabel: "fiyat eksik",
    kikWorkCategory: "ust_yapi", setKikWorkCategory: () => {}, tenderYmInput: "", setTenderYmInput: () => {},
    tenderBidsInput: "", setTenderBidsInput: () => {},
  }));
  assert.match(html, /yalnızca.*1,00.*1,20/i);
  assert.match(html, /ilan|şartname/i);
  assert.match(html, /href="\/hesaplayicilar\/kik-asiri-dusuk-teklif"/);
});
