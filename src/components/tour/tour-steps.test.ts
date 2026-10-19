/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADMIN_TOUR_STEPS } from "./admin-tour-steps";
import { USER_TOUR_STEPS } from "./user-tour-steps";
import { clampStepIndex, isOnStepRoute, stepsForRole, targetSelectorsFor } from "./tour-navigation";
import type { TourStep } from "./tour-types";

const appRoutes = new Set(
  [...readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"]+)"/g)].map((match) => match[1]),
);

function routeExists(route: string, root: "/app" | "/admin"): boolean {
  if (route === root) return appRoutes.has(root);
  return route.startsWith(`${root}/`) && appRoutes.has(route.slice(root.length + 1));
}

test("kullanıcı turu menüdeki tüm ana sayfaları gerçek rotalarla gezer", () => {
  for (const step of USER_TOUR_STEPS) assert.ok(routeExists(step.route, "/app"), `rota yok: ${step.route}`);
  const pages = new Set(USER_TOUR_STEPS.map((step) => step.route));
  for (const route of ["/app", "/app/quotes", "/app/smartcheck", "/app/ifc-parser", "/app/crm", "/app/market-intelligence", "/app/profitability", "/app/billing", "/app/settings", "/app/academy"]) {
    assert.ok(pages.has(route), `turda eksik sayfa: ${route}`);
  }
});

test("süper admin turu Platform Yönetimi menüsündeki sayfaları gerçek rotalarla gezer", () => {
  for (const step of ADMIN_TOUR_STEPS) assert.ok(routeExists(step.route, "/admin"), `rota yok: ${step.route}`);
  const pages = new Set(ADMIN_TOUR_STEPS.map((step) => step.route));
  for (const route of ["/admin", "/admin/leads", "/admin/tenants", "/admin/queue", "/admin/pricing-sources", "/admin/plans", "/admin/reports", "/admin/logs", "/admin/roadmap"]) {
    assert.ok(pages.has(route), `turda eksik sayfa: ${route}`);
  }
});

test("tur metinleri doğrulanmamış iddia ve sabit hesap değeri içermez", () => {
  const forbidden = [/birebir uygun/i, /325\s*kg/i, /%\s*10 fire/i, /uzman onayl[ıi]\b/i, /\bL3\b/, /garanti/i];
  for (const step of [...USER_TOUR_STEPS, ...ADMIN_TOUR_STEPS]) {
    const text = `${step.title} ${step.description} ${step.tip ?? ""}`;
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${step.route}: ${pattern}`);
    assert.ok(step.title.length > 5 && step.description.length > 30 && step.pageLabel.length > 2, step.route);
  }
});

test("rolün göremediği sayfalar turdan çıkarılır", () => {
  const viewerRoutes = stepsForRole(USER_TOUR_STEPS, "viewer").map((step) => step.route);
  for (const hidden of ["/app/quotes/new", "/app/market-intelligence", "/app/profitability", "/app/billing", "/app/settings"]) {
    assert.ok(!viewerRoutes.includes(hidden), `viewer görmemeli: ${hidden}`);
  }
  assert.ok(viewerRoutes.includes("/app/quotes"));
  assert.equal(stepsForRole(USER_TOUR_STEPS, "owner").length, USER_TOUR_STEPS.length);
  assert.ok(!stepsForRole(USER_TOUR_STEPS, null).some((step) => step.roles));
});

test("tur gezinme yardımcıları rota, hedef ve adım sınırlarını doğru çözer", () => {
  const step: TourStep = { route: "/app/quotes", pageLabel: "Teklifler", badge: "X", title: "Teklifler", description: "d" };
  assert.ok(isOnStepRoute("/app/quotes/", step));
  assert.ok(isOnStepRoute("/app/quotes?tour=1", step));
  assert.ok(!isOnStepRoute("/app/quotes/new", step));
  assert.deepEqual(targetSelectorsFor(step), ["#main-content h1", "#main-content h2"]);
  assert.equal(targetSelectorsFor({ ...step, targetSelector: '[data-tour="x"]' })[0], '[data-tour="x"]');
  assert.equal(clampStepIndex(99, 5), 4);
  assert.equal(clampStepIndex(-1, 5), 0);
  assert.equal(clampStepIndex(3, 0), 0);
});
