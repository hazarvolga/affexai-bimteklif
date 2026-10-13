import assert from "node:assert/strict";
import test from "node:test";
import { browserQuotaDenial } from "./browser-quota";

test("browser IFC quota responses map to user-facing Turkish messages", () => {
  assert.equal(browserQuotaDenial(200, undefined), null);
  assert.match(browserQuotaDenial(403, "IFC_QUOTA_EXCEEDED") ?? "", /aylık IFC kotanız dolmuştur/i);
  assert.match(browserQuotaDenial(403, "IFC_NOT_AVAILABLE") ?? "", /IFC/);
  assert.match(browserQuotaDenial(403, "FORBIDDEN") ?? "", /yetki/i);
  assert.match(browserQuotaDenial(503, "IFC_QUOTA_UNAVAILABLE") ?? "", /daha sonra/i);
  assert.match(browserQuotaDenial(0, undefined) ?? "", /daha sonra/i);
});
