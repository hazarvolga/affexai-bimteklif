import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./BimIfcParser.tsx", import.meta.url), "utf8");

test("browser IFC preview cannot invoke the legacy quote transfer callback", () => {
  assert.doesNotMatch(source, /onTransferToQuote\s*\(/);
});

test("browser IFC transfer action directs the user to the server SmartCheck flow", () => {
  assert.match(source, /navigate\(['"]\/app\/smartcheck['"]\)/);
  assert.match(source, /sunucu SmartCheck worker/i);
});
