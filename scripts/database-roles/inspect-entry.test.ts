import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { isDirectInspectInvocation } from "./inspect";

test("inspection runs as a script only when inspect itself is the entry file", () => {
  const inspect = "/app/scripts/database-roles/inspect.ts";
  assert.equal(isDirectInspectInvocation(inspect, pathToFileURL(inspect).href), true);
  const bundle = "/app/dist/database-roles-cli.mjs";
  assert.equal(isDirectInspectInvocation(bundle, pathToFileURL(bundle).href), false, "the role CLI bundle must not start a second inspection");
  assert.equal(isDirectInspectInvocation(undefined, pathToFileURL(inspect).href), false);
});
