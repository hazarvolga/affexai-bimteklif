import assert from "node:assert/strict";
import { test } from "node:test";
import type pg from "pg";
import { bootstrapLegacyDatabaseRoles, type DatabaseRoleCredentials } from "./provision";

const credentials = Object.fromEntries(
  ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"]
    .map((name, index) => [name, `${name}_${index}_ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789`]),
) as DatabaseRoleCredentials;

test("legacy bootstrap rejects a non-idx8 release ledger before role mutation", async () => {
  const statements: string[] = [];
  const client = {
    async query(statement: string) {
      statements.push(statement);
      if (statement.includes("pg_try_advisory_xact_lock")) return { rows: [{ acquired: true }] };
      if (statement.includes("pg_control_system")) return { rows: [{
        database: "teklifpro_upgrade_test", system_identifier: "1234567890123456789",
        marker: "teklifpro_release.migrations", version_major: 16, superuser: true, create_role: true,
      }] };
      if (statement.includes("pg_auth_members")) return { rows: [] };
      if (statement.includes("acl_grantees")) return { rows: [], rowCount: 0 };
      if (statement.includes("pg_roles") && statement.includes("obj_description")) return { rows: [] };
      if (statement.includes("teklifpro_release.migrations") && statement.includes("select idx")) {
        return { rows: [{ idx: 7, tag: "0007_plan_feature_limits", hash: "wrong", catalog_hash: "wrong" }] };
      }
      return { rows: [], rowCount: 0 };
    },
  } as unknown as pg.Client;
  await assert.rejects(() => bootstrapLegacyDatabaseRoles(client, credentials, {
    expectedDatabase: "teklifpro_upgrade_test", expectedSystemIdentifier: "1234567890123456789",
    requiredMarkerRegclass: "teklifpro_release.migrations",
  }, "different-administrator-credential"), /idx8|legacy|ledger/i);
  assert.equal(statements.some((statement) => /create role|alter role|alter database|alter schema/i.test(statement)), false);
  assert.equal(statements.at(-1), "rollback");
});

test("legacy bootstrap refuses a partial canonical role set before release changes", async () => {
  const statements: string[] = [];
  const client = {
    async query(statement: string) {
      statements.push(statement);
      if (statement.includes("pg_try_advisory_xact_lock")) return { rows: [{ acquired: true }] };
      if (statement.includes("pg_control_system")) return { rows: [{
        database: "teklifpro_upgrade_test", system_identifier: "1234567890123456789",
        marker: "teklifpro_release.migrations", version_major: 16, superuser: true, create_role: true,
      }] };
      if (statement.includes("pg_auth_members")) return { rows: [] };
      if (statement.includes("acl_grantees")) return { rows: [], rowCount: 0 };
      if (statement.includes("rolcanlogin as login")) return { rows: [{ name: "bimmetraj_owner", login: false }] };
      return { rows: [], rowCount: 0 };
    },
  } as unknown as pg.Client;
  await assert.rejects(() => bootstrapLegacyDatabaseRoles(client, credentials, {
    expectedDatabase: "teklifpro_upgrade_test", expectedSystemIdentifier: "1234567890123456789",
    requiredMarkerRegclass: "teklifpro_release.migrations",
  }, "different-administrator-credential"), /partial canonical role set/);
  assert.equal(statements.some((statement) => /create role|alter role|alter database|alter schema/i.test(statement)), false);
  assert.equal(statements.at(-1), "rollback");
});

test("legacy bootstrap refuses a mismatched cluster fingerprint without mutation", async () => {
  const statements: string[] = [];
  const client = {
    async query(statement: string) {
      statements.push(statement);
      if (statement.includes("pg_try_advisory_xact_lock")) return { rows: [{ acquired: true }] };
      if (statement.includes("pg_control_system")) return { rows: [{
        database: "teklifpro_upgrade_test", system_identifier: "9999999999999999999",
        marker: "teklifpro_release.migrations", version_major: 16, superuser: true, create_role: true,
      }] };
      return { rows: [], rowCount: 0 };
    },
  } as unknown as pg.Client;
  await assert.rejects(() => bootstrapLegacyDatabaseRoles(client, credentials, {
    expectedDatabase: "teklifpro_upgrade_test", expectedSystemIdentifier: "1234567890123456789",
    requiredMarkerRegclass: "teklifpro_release.migrations",
  }, "different-administrator-credential"), /fingerprint/);
  assert.equal(statements.some((statement) => /create role|alter role|alter database|alter schema/i.test(statement)), false);
  assert.equal(statements.at(-1), "rollback");
});

test("legacy bootstrap refuses role provenance drift without mutation", async () => {
  const statements: string[] = [];
  const client = {
    async query(statement: string) {
      statements.push(statement);
      if (statement.includes("pg_try_advisory_xact_lock")) return { rows: [{ acquired: true }] };
      if (statement.includes("pg_control_system")) return { rows: [{
        database: "teklifpro_upgrade_test", system_identifier: "1234567890123456789",
        marker: "teklifpro_release.migrations", version_major: 16, superuser: true, create_role: true,
      }] };
      if (statement.includes("shobj_description")) return { rows: [{ name: "bimmetraj_owner", provenance: "untrusted" }] };
      return { rows: [], rowCount: 0 };
    },
  } as unknown as pg.Client;
  await assert.rejects(() => bootstrapLegacyDatabaseRoles(client, credentials, {
    expectedDatabase: "teklifpro_upgrade_test", expectedSystemIdentifier: "1234567890123456789",
    requiredMarkerRegclass: "teklifpro_release.migrations",
  }, "different-administrator-credential"), /provenance mismatch/);
  assert.equal(statements.some((statement) => /create role|alter role|alter database|alter schema/i.test(statement)), false);
  assert.equal(statements.at(-1), "rollback");
});
