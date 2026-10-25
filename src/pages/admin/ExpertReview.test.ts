import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ExpertReview } from "./ExpertReview";

const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ExpertReview)));
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

test("uzman rehberi demo sayfasına veya yetkisiz tarayıcı ön analizine yönlendirmez", () => {
  assert.ok(!hrefs.some((href) => href.includes("demo")), hrefs.join(", "));
  assert.ok(!hrefs.includes("/app/ifc-parser"), hrefs.join(", "));
});

test("model disiplinleri SmartCheck sunucu analizine, maliyet teklif akışına gider", () => {
  assert.ok(hrefs.filter((href) => href === "/app/smartcheck").length >= 3);
  assert.ok(hrefs.includes("/app/quotes/new"));
});
