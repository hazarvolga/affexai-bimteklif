import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { browserQuotaDenial } from "@/ifc/browser-quota";
import { IfcQuotaDenialAlert } from "./IfcQuotaDenialAlert";

const render = (code: string) => {
  const denial = browserQuotaDenial(403, code);
  assert.ok(denial);
  const alert = createElement(IfcQuotaDenialAlert, { denial, email: "kisi@example.com", onDismiss: () => undefined });
  return renderToStaticMarkup(createElement(MemoryRouter, null, alert));
};

test("denial alert announces the persistent Turkish problem and billing action", () => {
  const html = render("SUBSCRIPTION_REQUIRED");
  assert.match(html, /role="alert"/);
  assert.match(html, /Uyarı: <\/span>Abonelik gerekli/);
  assert.match(html, /href="\/app\/billing"[^>]*>Abonelik başlat/);
});

test("IFC package denial links to Paketler", () => {
  assert.match(render("IFC_NOT_AVAILABLE"), /href="\/app\/billing"[^>]*>Paketleri incele/);
});

test("email verification denial offers resend instead of billing", () => {
  const html = render("EMAIL_VERIFICATION_REQUIRED");
  assert.match(html, /<button type="button"[^>]*>.*Doğrulama bağlantısı gönder/);
  assert.doesNotMatch(html, /href="\/app\/billing"/);
  assert.match(html, /aria-live="polite"/);
});
