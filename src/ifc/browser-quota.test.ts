import assert from "node:assert/strict";
import test from "node:test";
import { browserQuotaDenial } from "./browser-quota";

const message = (status: number, code?: string) => browserQuotaDenial(status, code)?.message ?? "";

test("browser IFC quota responses map to user-facing Turkish messages", () => {
  assert.equal(browserQuotaDenial(200, undefined), null);
  assert.match(message(403, "IFC_QUOTA_EXCEEDED"), /bu dönemdeki IFC kotanız dolmuştur/i);
  assert.match(message(403, "IFC_NOT_AVAILABLE"), /IFC/);
  assert.match(message(403, "FORBIDDEN"), /yetki/i);
  assert.match(message(503, "IFC_QUOTA_UNAVAILABLE"), /daha sonra/i);
  assert.match(message(0, undefined), /daha sonra/i);
});

test("403 entitlement codes each get Turkish guidance and the correct next step", () => {
  const email = browserQuotaDenial(403, "EMAIL_VERIFICATION_REQUIRED");
  assert.equal(email?.code, "EMAIL_VERIFICATION_REQUIRED");
  assert.match(email?.title ?? "", /e-posta doğrulaması/i);
  assert.match(email?.message ?? "", /e-posta adresinizi doğrula/i);
  assert.deepEqual(email?.action, { kind: "resend-verification", label: "Doğrulama bağlantısı gönder" });

  const ifc = browserQuotaDenial(403, "IFC_NOT_AVAILABLE");
  assert.match(ifc?.title ?? "", /IFC paketi/i);
  assert.deepEqual(ifc?.action, { kind: "link", label: "Paketleri incele", to: "/app/billing" });

  const subscription = browserQuotaDenial(403, "SUBSCRIPTION_REQUIRED");
  assert.match(subscription?.title ?? "", /abonelik/i);
  assert.deepEqual(subscription?.action, { kind: "link", label: "Abonelik başlat", to: "/app/billing" });
});

test("denials never surface the server's raw English error text", () => {
  const codes = ["EMAIL_VERIFICATION_REQUIRED", "IFC_NOT_AVAILABLE", "SUBSCRIPTION_REQUIRED", "SUBSCRIPTION_INACTIVE", "PLAN_UNAVAILABLE", "IFC_QUOTA_EXCEEDED", "SOMETHING_NEW"];
  for (const code of codes) {
    const denial = browserQuotaDenial(403, code);
    const text = `${denial?.title} ${denial?.message}`;
    assert.doesNotMatch(text, /subscription|quota|required|available/i, code);
  }
});
