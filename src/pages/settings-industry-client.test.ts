import assert from "node:assert/strict";
import test from "node:test";
import { persistIndustryEnabled } from "./settings-industry-client";

test("industry setting client reports typed failures and never treats them as success", async () => {
  const requests: unknown[] = [];
  const unavailable = await persistIndustryEnabled(async (url, options) => {
    requests.push([url, options]);
    return { ok: false, status: 503 };
  }, "residential", false);
  assert.deepEqual(unavailable, { ok: false, message: "Sektör kataloğu geçici olarak kullanılamıyor." });
  assert.deepEqual(requests, [["/api/company/industry-settings", { method: "POST", body: JSON.stringify({ industryId: "residential", isEnabled: false }) }]]);

  assert.deepEqual(await persistIndustryEnabled(async () => ({ ok: false, status: 404 }), "missing", true), {
    ok: false, message: "Sektör bulunamadı veya kullanıma kapalı.",
  });
  assert.deepEqual(await persistIndustryEnabled(async () => ({ ok: false, status: 500 }), "residential", true), {
    ok: false, message: "Ayarlar güncellenemedi.",
  });
  assert.deepEqual(await persistIndustryEnabled(async () => ({ ok: true, status: 200 }), "residential", true), { ok: true });
});
