/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/dashboard/ContractorWorkflowHub.tsx", "utf8");

test("süreç masası kartları doğrulanmamış iddia ve sabit hesap değeri içermez", () => {
  const forbidden = [
    /325\s*kg/i,
    /%\s*10 fire/i,
    /birebir uygun/i,
    /%\s*1 KDV/i,
    /\+?0,40 m²/,
    /2 cm sıva/i,
    /hatasız/i,
    /tam uyumlu/i,
    /garanti/i,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${pattern}`);
});

test("süreç masası hesapları ön hesap olarak anar", () => {
  assert.match(source, /ön hesap/i);
});
