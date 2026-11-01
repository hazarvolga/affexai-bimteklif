import assert from "node:assert/strict";
import test from "node:test";
import { isStaleChunkError, STALE_CHUNK_MESSAGE } from "./stale-chunk";

test("a script file that a newer release replaced is recognised in the browsers' wordings", () => {
  for (const message of [
    "Failed to fetch dynamically imported module: https://bimmetraj.com/assets/engine-C9sfeKxz.js",
    "error loading dynamically imported module: https://bimmetraj.com/assets/engine-1.js",
    "Importing a module script failed.",
    "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\".",
  ]) assert.equal(isStaleChunkError(new Error(message)), true, message);
});

test("other errors, and values that are not errors, are not mistaken for it", () => {
  assert.equal(isStaleChunkError(new Error("IFC_VIEWER_HASH_MISMATCH")), false);
  assert.equal(isStaleChunkError(new Error("Yetkili IFC akışı alınamadı.")), false);
  assert.equal(isStaleChunkError("Failed to fetch dynamically imported module"), false);
  assert.equal(isStaleChunkError(null), false);
});

test("the message tells the user what to do", () => {
  assert.match(STALE_CHUNK_MESSAGE, /yenile/i);
});
