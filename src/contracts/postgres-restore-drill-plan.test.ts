import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("PostgreSQL restore drill plan is schema-only and isolated", () => {
  const output = execFileSync("pnpm", ["postgres:restore-drill:plan"], { encoding: "utf8" });
  assert.match(output, /\"source\": \"teklifpro_local\"/);
  assert.match(output, /\"target\": \"teklifpro_restore_drill_local\"/);
  assert.match(output, /\"mode\": \"schema-only\"/);
  assert.doesNotMatch(output, /pg_restore|TRUNCATE|DROP DATABASE|migrate|db push/i);
});
