import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("PostgreSQL restore drill plan is schema-only and isolated", () => {
  const output = execFileSync("pnpm", ["postgres:restore-drill:plan"], {
    encoding: "utf8",
    timeout: 15_000,
    // --plan must work without connecting to a developer or CI database.
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://plan@127.0.0.1:1/teklifpro_local",
      SOURCE_DATABASE_URL: "postgresql://plan@127.0.0.1:1/teklifpro_local",
      RESTORE_DRILL_DATABASE_URL: "postgresql://plan@127.0.0.1:1/teklifpro_restore_drill_local",
    },
  });
  assert.match(output, /\"source\": \"teklifpro_local\"/);
  assert.match(output, /\"target\": \"teklifpro_restore_drill_local\"/);
  assert.match(output, /\"mode\": \"schema-only\"/);
  assert.match(output, /\"prepare\": false/);
  assert.doesNotMatch(output, /pg_restore|TRUNCATE|DROP DATABASE|migrate|db push/i);
});
