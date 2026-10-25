import assert from "node:assert/strict";
import test from "node:test";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  for (const [key, value] of Object.entries(values)) if (value === undefined) delete process.env[key];
  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const unreachable = "postgresql://postgres@127.0.0.1:1/teklifpro_bootstrap_test";

test("skips DB integration tests locally when the database is unreachable", () => withEnv({ DATABASE_URL: unreachable, REQUIRE_TEST_DATABASE: undefined }, async () => {
  const skipped: string[] = [];
  assert.equal(await skipIfDatabaseUnavailable({ skip: (message) => skipped.push(message ?? "") }), true);
  assert.match(skipped[0], /not reachable/);
}));

test("fails instead of skipping when REQUIRE_TEST_DATABASE=true (CI must not drop mandatory scenarios)", () => withEnv({ DATABASE_URL: unreachable, REQUIRE_TEST_DATABASE: "true" }, async () => {
  await assert.rejects(skipIfDatabaseUnavailable({ skip: () => assert.fail("must not skip") }), /REQUIRE_TEST_DATABASE/);
}));

test("fails when REQUIRE_TEST_DATABASE=true and DATABASE_URL is missing", () => withEnv({ DATABASE_URL: undefined, REQUIRE_TEST_DATABASE: "true" }, async () => {
  await assert.rejects(skipIfDatabaseUnavailable({ skip: () => assert.fail("must not skip") }), /DATABASE_URL is required/);
}));
