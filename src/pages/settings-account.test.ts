import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountSummary, resolveContactEmail } from "./settings-account";

test("contact email suggests the login email only when the company has none", () => {
  assert.equal(resolveContactEmail("", "owner@example.test"), "owner@example.test");
  assert.equal(resolveContactEmail(null, "owner@example.test"), "owner@example.test");
  assert.equal(resolveContactEmail("info@firma.test", "owner@example.test"), "info@firma.test");
  assert.equal(resolveContactEmail("", undefined), "");
});

test("account summary shows the registered name and login email", () => {
  const html = renderToStaticMarkup(createElement(AccountSummary, { fullName: "Demo Kullanıcı", email: "owner@example.test" }));
  assert.match(html, /Demo Kullanıcı/);
  assert.match(html, /owner@example\.test/);
});
