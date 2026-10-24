import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CALC_MODULES } from "../admin/roadmap/calculation-content";
import { navigationConfig } from "../../constants/navigation";
import { EXPERT_MODULES, HIDDEN_MODULE_IDS, feedbackHref, tryRouteFor, withoutCodePaths } from "./how-it-works-data";

const appSource = readFileSync("src/App.tsx", "utf8");
const appRoutes = new Set([...appSource.matchAll(/path="([^"]+)"/g)].map((match) => match[1]));

function routeExists(route: string): boolean {
  const path = route.split("#")[0];
  if (appRoutes.has(path)) return true;
  return path.startsWith("/app/") && appRoutes.has(path.slice("/app/".length));
}

test("uzman sayfası iç ve kapsam dışı modülleri göstermez, diğer tüm hesap modüllerini gösterir", () => {
  const shown = EXPERT_MODULES.map((module) => module.id);
  for (const id of HIDDEN_MODULE_IDS) assert.ok(!shown.includes(id), id);
  assert.equal(shown.length, CALC_MODULES.length - HIDDEN_MODULE_IDS.length);
  for (const id of ["teklif-satir", "ifc-metraj", "minha", "kik-adt", "epys-on-kontrol"]) assert.ok(shown.includes(id), id);
});

test("her 'Dene' bağlantısı uygulamada var olan bir rotaya gider ve demo sayfasına gitmez", () => {
  for (const module of EXPERT_MODULES) {
    const route = tryRouteFor(module.id);
    if (!route) continue;
    assert.ok(routeExists(route), `${module.id}: ${route}`);
    assert.ok(!route.includes("demo") && route !== "/app/ifc-parser", `${module.id}: ${route}`);
  }
  assert.equal(tryRouteFor("minha"), "/app/smartcheck");
  assert.equal(tryRouteFor("kik-adt"), "/hesaplayicilar/kik-asiri-dusuk-teklif");
});

test("geri bildirim bağlantısı modülü konuda belirtir", () => {
  const href = feedbackHref({ id: "minha", title: "Minha motoru" });
  assert.match(href, /^mailto:info@bimmetraj\.com\?subject=/);
  assert.match(decodeURIComponent(href), /\[Nasıl Çalışır\] minha · Minha motoru/);
});

test("sayfa menüde tüm çalışma alanı rollerine açık ve rotası tanımlı", () => {
  const item = navigationConfig.find((entry) => entry.path === "/app/nasil-calisir");
  assert.ok(item);
  assert.deepEqual([...item.roles].sort(), ["admin", "manager", "owner", "viewer"]);
  assert.ok(routeExists("/app/nasil-calisir"));
});

test("okuyucu metninden kod yolları çıkarılır, anlam korunur", () => {
  assert.equal(
    withoutCodePaths("IFC çıkarıcısı (workers/ifc/ifc_extract.py) ve kural koşucusu (src/smartcheck/rules/ifc-rule-run.ts) özellikleri iletir."),
    "IFC çıkarıcısı ve kural koşucusu özellikleri iletir.",
  );
  assert.equal(
    withoutCodePaths("IFC mahal cetveli (IfcSpace / IfcZone) net alanları — src/ifc/types.ts ApartmentUnitScheduleItem"),
    "IFC mahal cetveli (IfcSpace / IfcZone) net alanları",
  );
  assert.equal(withoutCodePaths("TS 500 madde 7.3 (1/1000 hassasiyet)"), "TS 500 madde 7.3 (1/1000 hassasiyet)");
});

test("uzman modüllerinin hiçbir metninde kod yolu kalmaz", () => {
  for (const module of EXPERT_MODULES) {
    const { sourceFiles: _sourceFiles, ...shown } = module;
    assert.doesNotMatch(JSON.stringify(shown), /(?:src|workers|scripts)\/[a-z]/, module.id);
  }
});
