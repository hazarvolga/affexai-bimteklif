/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPABILITY_REGISTRY, getLiveCapabilities, getPilotCapabilities, getRoadmapCapabilities } from "../capabilities/registry";

const PUBLIC_PAGES = [
  "src/pages/LandingPage.tsx",
  "src/pages/SmartCheckDemo.tsx",
  "src/pages/PilotApplication.tsx",
  "src/pages/BimGlossaryPage.tsx",
  "src/components/bimplan/LegislationView.tsx",
  "src/components/bimplan/BimGlossary.tsx",
  "src/components/bimplan/BimDashboard.tsx",
  "src/pages/admin/DeveloperRoadmap.tsx",
  "src/pages/admin/CalculationMethods.tsx",
  "src/pages/admin/AdminDashboard.tsx",
  "src/pages/admin/PricingSources.tsx",
  "index.html",
];

test("T46: genel, mevzuat, sözlük ve admin sayfaları doğrulanmamış uygunluk, doğruluk veya tekillik iddiası taşımaz", () => {
  const forbidden = [/%\s*100/, /yüzde yüz/i, /tam uyumlu/i, /birebir uygun/i, /garanti/i, /Türkiye'?de tek/i, /ilk ve tek/i, /hatasız/i, /kuruşuna kadar/i, /Kanıtlı ve Onaylı/i, /kusursuz bir BIM uzmanısınız/i];
  for (const file of PUBLIC_PAGES) {
    const text = readFileSync(file, "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${file}: ${pattern}`);
  }
});

test("T46: kayıtta canlı yetenek yokken landing 'canlı özellikler doğrulanmıştır' demez", () => {
  const landing = readFileSync("src/pages/LandingPage.tsx", "utf8");
  if (getLiveCapabilities().length === 0) assert.doesNotMatch(landing, /Canlı özellikler[^.]*doğrulanmıştır/i);
  assert.match(landing, /bağımsız uzman onayı henüz yoktur/);
});

test("T46: mevzuat ve admin sayfaları yetenek kaydına bağlanır ve eski Rev. 5 / TeklifPro başlıklarını taşımaz", () => {
  const legislation = readFileSync("src/components/bimplan/LegislationView.tsx", "utf8");
  assert.match(legislation, /CAPABILITY_REGISTRY/, "LegislationView yetenek durumunu doğrudan CAPABILITY_REGISTRY'den üretmelidir");
  assert.match(legislation, /18\.848/, "LegislationView 18.848 resmi katalog satır kapsamını küçültmeden göstermelidir");

  const devRoadmap = readFileSync("src/pages/admin/DeveloperRoadmap.tsx", "utf8");
  assert.doesNotMatch(devRoadmap, /Rev\. 0 → Rev\. 5/, "DeveloperRoadmap eski sabit Rev. 5 etiketini taşımamalıdır");
  assert.match(devRoadmap, /CAPABILITY_REGISTRY/, "DeveloperRoadmap tek kaynaklı yetenek kaydı özetini göstermelidir");

  const calcMethods = readFileSync("src/pages/admin/CalculationMethods.tsx", "utf8");
  assert.doesNotMatch(calcMethods, /Rev\. 1 → Rev\. 5/, "CalculationMethods eski sabit Rev. 5 etiketini taşımamalıdır");

  const adminDashboard = readFileSync("src/pages/admin/AdminDashboard.tsx", "utf8");
  assert.doesNotMatch(adminDashboard, /TeklifPro/, "AdminDashboard marka adını BIMMetraj olarak kullanmalıdır");

  assert.equal(
    CAPABILITY_REGISTRY.length,
    getLiveCapabilities().length + getPilotCapabilities().length + getRoadmapCapabilities().length,
  );
});
