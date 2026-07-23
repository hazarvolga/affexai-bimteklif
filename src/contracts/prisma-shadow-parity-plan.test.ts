import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("Prisma shadow parity plan is tenant-safe and side-effect free", () => {
  const output = execFileSync("pnpm", ["prisma:shadow-db:plan"], { encoding: "utf8" });
  assert.match(output, /\"source\": \"teklifpro_local\"/);
  assert.match(output, /\"target\": \"teklifpro_next_local\"/);
  assert.match(output, /\"normalized_quantity_rows\"/);
  assert.doesNotMatch(output, /restore|createdb|migrate|db push/i);
});
