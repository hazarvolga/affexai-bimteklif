import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";

test("Prisma shadow contract validator passes without touching a database", () => {
  const output = execFileSync("pnpm", ["prisma:shadow-contract"], { encoding: "utf8" });
  assert.match(output, /Prisma shadow contract valid: 13 tenant-aware models/);
});
