import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DATABASE_FUNCTION_EXECUTE_SPECS, DATABASE_SECURITY_DEFINER_WRAPPERS } from "./contract";

test("worker entitlement capability is a narrow security-definer function", async () => {
  const spec = DATABASE_FUNCTION_EXECUTE_SPECS.find((entry) => entry.name === "bimmetraj_worker_get_entitlement");
  assert.ok(spec);
  assert.equal(spec.schema, "public");
  assert.equal(spec.securityDefiner, true);
  assert.deepEqual(spec.roles, ["bimmetraj_worker"]);
  assert.match(spec.result, /company_exists boolean/);
  assert.match(spec.result, /monthly_ifc_limit integer/);
  assert.equal(DATABASE_SECURITY_DEFINER_WRAPPERS.bimmetraj_worker_get_entitlement.includes("session_user"), true);

  const migration = await readFile(new URL("../../drizzle-release/0020_worker_entitlement_capability.sql", import.meta.url), "utf8");
  assert.match(migration, /REVOKE ALL PRIVILEGES ON FUNCTION public\.bimmetraj_worker_get_entitlement/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.bimmetraj_worker_get_entitlement\(uuid\) TO bimmetraj_worker/);
  assert.doesNotMatch(migration, /GRANT .* ON TABLE (companies|subscriptions|plans) .*bimmetraj_worker/i);
});
