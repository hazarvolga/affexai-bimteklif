/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLiveCapabilities } from "../capabilities/registry";

const PUBLIC_PAGES = ["src/pages/LandingPage.tsx", "src/pages/SmartCheckDemo.tsx", "src/pages/PilotApplication.tsx", "src/pages/BimGlossaryPage.tsx", "index.html"];

test("T46: genel sayfalar doğrulanmamış uygunluk, doğruluk veya tekillik iddiası taşımaz", () => {
  const forbidden = [/%\s*100/, /yüzde yüz/i, /tam uyumlu/i, /birebir uygun/i, /garanti/i, /Türkiye'?de tek/i, /ilk ve tek/i, /hatasız/i, /kuruşuna kadar/i, /Kanıtlı ve Onaylı/i];
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
