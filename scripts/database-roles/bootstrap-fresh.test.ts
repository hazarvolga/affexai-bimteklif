import assert from "node:assert/strict";
import { test } from "node:test";
import type pg from "pg";
import { bootstrapFreshDatabaseRoles, type DatabaseRoleCredentials } from "./provision";

const credentials = Object.fromEntries(
  ["bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"]
    .map((name, index) => [name, `${name}_${index}_ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789`]),
) as DatabaseRoleCredentials;
const target = {
  expectedDatabase: "bimmetraj_production", expectedSystemIdentifier: "1234567890123456789",
  requiredMarkerRegclass: "teklifpro_release.migrations",
};

function fakeClient(answers: { marker: boolean; userTables?: number; managedSchemas?: number; database?: string; roles?: { name: string; provenance: string | null }[] }) {
  const statements: string[] = [];
  const client = {
    async query(statement: string) {
      statements.push(statement);
      if (statement.includes("pg_try_advisory_xact_lock")) return { rows: [{ acquired: true }] };
      if (statement.includes("to_regclass($1) is not null as present")) return { rows: [{ present: answers.marker }] };
      if (statement.includes("pg_control_system")) return { rows: [{
        database: answers.database ?? "bimmetraj_production", system_identifier: "1234567890123456789",
        version_major: 16, superuser: true, create_role: true,
        user_tables: answers.userTables ?? 0, managed_schemas: answers.managedSchemas ?? 0,
      }] };
      if (statement.includes("shobj_description")) return { rows: answers.roles ?? [] };
      return { rows: [], rowCount: 0 };
    },
  } as unknown as pg.Client;
  return { client, statements };
}

const mutates = (statements: string[]) => statements.some((statement) => /create role|alter role|alter database/i.test(statement));

test("fresh bootstrap leaves a database with the release ledger untouched", async () => {
  const { client, statements } = fakeClient({ marker: true });
  assert.equal(await bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), "already-initialised");
  assert.equal(mutates(statements), false);
  assert.equal(statements.at(-1), "commit");
});

test("fresh bootstrap refuses a database that already has tables, before any role change", async () => {
  const { client, statements } = fakeClient({ marker: false, userTables: 3 });
  await assert.rejects(() => bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), /already contains tables/);
  assert.equal(mutates(statements), false);
  assert.equal(statements.at(-1), "rollback");
});

test("fresh bootstrap refuses the wrong database fingerprint", async () => {
  const { client, statements } = fakeClient({ marker: false, database: "other_database" });
  await assert.rejects(() => bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), /fingerprint/);
  assert.equal(mutates(statements), false);
});

test("fresh bootstrap on an empty database creates roles and hands the database to the owner", async () => {
  const { client, statements } = fakeClient({ marker: false });
  assert.equal(await bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), "bootstrapped");
  assert.ok(statements.some((statement) => /grant bimmetraj_owner to bimmetraj_migrator/i.test(statement)));
  assert.ok(statements.some((statement) => /alter database "bimmetraj_production" owner to bimmetraj_owner/i.test(statement)));
  assert.equal(statements.at(-1), "commit");
});

test("fresh bootstrap rejects a role password equal to the administrator credential", async () => {
  const { client } = fakeClient({ marker: false });
  await assert.rejects(() => bootstrapFreshDatabaseRoles(client, credentials, target, credentials.bimmetraj_app));
});

const roleNames = ["bimmetraj_owner", "bimmetraj_migrator", "bimmetraj_app", "bimmetraj_control", "bimmetraj_worker", "bimmetraj_backup"];
const provenance = "bimmetraj.database-roles.v1:1234567890123456789";

test("fresh bootstrap re-runs safely after an earlier run created the roles but migrations did not finish", async () => {
  const { client, statements } = fakeClient({ marker: false, roles: roleNames.map((name) => ({ name, provenance })) });
  assert.equal(await bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), "bootstrapped");
  assert.equal(statements.at(-1), "commit");
});

test("fresh bootstrap refuses a partial canonical role set", async () => {
  const { client, statements } = fakeClient({ marker: false, roles: [{ name: "bimmetraj_owner", provenance }] });
  await assert.rejects(() => bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), /partial canonical role set/);
  assert.equal(mutates(statements), false);
});

test("fresh bootstrap refuses canonical roles created for another cluster", async () => {
  const { client, statements } = fakeClient({ marker: false, roles: roleNames.map((name) => ({ name, provenance: "bimmetraj.database-roles.v1:999" })) });
  await assert.rejects(() => bootstrapFreshDatabaseRoles(client, credentials, target, "administrator-credential"), /different provenance/);
  assert.equal(mutates(statements), false);
});
