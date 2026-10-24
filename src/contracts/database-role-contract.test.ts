import assert from "node:assert/strict";
import test from "node:test";

import { DATABASE_PROGRESS_PAYMENT_RLS_TABLES, DATABASE_ROLE_MEMBERSHIPS, DATABASE_ROLE_SPECS, DATABASE_SMARTCHECK_PILOT_RLS_TABLES } from "../../scripts/database-roles/contract";
import {
  assertRoleBoundaries,
  sanitizeRoleReport,
  type DatabaseRoleBoundaryReport,
} from "../../scripts/database-roles/inspect";
import { provisionDatabaseRoles, type DatabaseRoleCredentials } from "../../scripts/database-roles/provision";

const canonicalRoleNames = [
  "bimmetraj_owner",
  "bimmetraj_migrator",
  "bimmetraj_app",
  "bimmetraj_worker",
  "bimmetraj_backup",
] as const;

test("progress-payment RLS contract covers the complete bounded aggregate", () => {
  assert.deepEqual(DATABASE_PROGRESS_PAYMENT_RLS_TABLES, [
    "construction_contracts", "construction_contract_items", "progress_payment_periods", "progress_payment_lines",
    "progress_measurements", "progress_measurement_review_events", "progress_payment_adjustments",
    "progress_payment_events", "contract_variations", "final_accounts",
  ]);
});

test("SmartCheck pilot RLS contract covers case state and append-only measurements", () => {
  assert.deepEqual(DATABASE_SMARTCHECK_PILOT_RLS_TABLES, ["smartcheck_pilot_cases", "smartcheck_pilot_measurements"]);
});

function validReport(): DatabaseRoleBoundaryReport {
  return {
    contract: "bimmetraj.database-roles.v1",
    database: "teklifpro_role_contract_test",
    inspectedAt: "2026-10-24T00:00:00.000Z",
    memberships: [...DATABASE_ROLE_MEMBERSHIPS],
    publicPrivileges: { databaseCreate: false, databaseTemporary: false, schemaCreate: false },
    managedSchemaViolations: [],
    defaultAclViolations: [],
    provenanceViolations: [],
    roles: DATABASE_ROLE_SPECS.map((spec) => ({
      name: spec.name,
      exists: true,
      canLogin: spec.canLogin,
      attributes: { ...spec.attributes },
      ownsDatabase: spec.name === "bimmetraj_owner",
      ownsPublicSchema: spec.name === "bimmetraj_owner",
      privileges: {
        connect: true,
        createSchema: spec.canCreateSchema,
        createTable: spec.canCreateTable,
        temporary: false,
        read: spec.canRead,
        write: spec.canWrite,
        anyWrite: spec.canWrite,
        truncate: false,
        references: false,
        trigger: false,
      },
    })),
  };
}

test("database role contract defines the five canonical roles exactly once", () => {
  assert.deepEqual(
    DATABASE_ROLE_SPECS.map((role) => role.name),
    canonicalRoleNames,
  );
  assert.equal(new Set(DATABASE_ROLE_SPECS.map((role) => role.name)).size, canonicalRoleNames.length);
});

test("app and worker are login roles without PostgreSQL authority escalation or DDL", () => {
  for (const name of ["bimmetraj_app", "bimmetraj_worker"] as const) {
    const role = DATABASE_ROLE_SPECS.find((candidate) => candidate.name === name);
    assert.ok(role, `${name} must exist`);
    assert.equal(role.canLogin, true);
    assert.deepEqual(role.attributes, {
      superuser: false,
      bypassRls: false,
      createDb: false,
      createRole: false,
      inherit: false,
      replication: false,
    });
    assert.equal(role.ownsSchema, false);
    assert.equal(role.canMigrate, false);
    assert.equal(role.canCreateSchema, false);
    assert.equal(role.canCreateTable, false);
    assert.equal(role.canRead, true);
    assert.equal(role.canWrite, true);
  }
});

test("owner owns objects, migrator performs DDL, and neither is a PostgreSQL superuser", () => {
  const owner = DATABASE_ROLE_SPECS.find((role) => role.name === "bimmetraj_owner");
  const migrator = DATABASE_ROLE_SPECS.find((role) => role.name === "bimmetraj_migrator");
  assert.ok(owner);
  assert.ok(migrator);

  assert.equal(owner.canLogin, false);
  assert.equal(owner.ownsSchema, true);
  assert.equal(owner.canMigrate, false);
  assert.equal(migrator.canLogin, true);
  assert.equal(migrator.ownsSchema, false);
  assert.equal(migrator.canMigrate, true);
  assert.equal(migrator.canCreateSchema, false);
  assert.equal(migrator.canCreateTable, false);
  assert.equal(migrator.canRead, false);
  assert.equal(migrator.canWrite, false);

  for (const role of [owner, migrator]) {
    assert.deepEqual(role.attributes, {
      superuser: false,
      bypassRls: false,
      createDb: false,
      createRole: false,
      inherit: false,
      replication: false,
    });
  }
});

test("backup is read-only and cannot own objects or execute DDL", () => {
  const backup = DATABASE_ROLE_SPECS.find((role) => role.name === "bimmetraj_backup");
  assert.ok(backup);
  assert.equal(backup.canLogin, true);
  assert.equal(backup.ownsSchema, false);
  assert.equal(backup.canMigrate, false);
  assert.equal(backup.canRead, true);
  assert.equal(backup.canWrite, false);
  assert.equal(backup.canCreateSchema, false);
  assert.equal(backup.canCreateTable, false);
  assert.deepEqual(backup.attributes, {
    superuser: false,
    bypassRls: false,
    createDb: false,
    createRole: false,
    inherit: false,
    replication: false,
  });
});

test("role boundary assertion rejects authority, owner, write, and DDL drift", () => {
  assert.doesNotThrow(() => assertRoleBoundaries(validReport()));

  const cases: Array<[string, (report: DatabaseRoleBoundaryReport) => void]> = [
    ["app superuser", (report) => { report.roles[2].attributes.superuser = true; }],
    ["worker BYPASSRLS", (report) => { report.roles[3].attributes.bypassRls = true; }],
    ["app CREATEDB", (report) => { report.roles[2].attributes.createDb = true; }],
    ["worker CREATEROLE", (report) => { report.roles[3].attributes.createRole = true; }],
    ["app DDL", (report) => { report.roles[2].privileges.createTable = true; }],
    ["worker schema DDL", (report) => { report.roles[3].privileges.createSchema = true; }],
    ["backup write", (report) => { report.roles[4].privileges.anyWrite = true; }],
    ["backup DDL", (report) => { report.roles[4].privileges.createTable = true; }],
    ["wrong database owner", (report) => { report.roles[0].ownsDatabase = false; }],
    ["runtime schema owner", (report) => { report.roles[2].ownsPublicSchema = true; }],
  ];

  for (const [label, mutate] of cases) {
    const report = structuredClone(validReport());
    mutate(report);
    assert.throws(() => assertRoleBoundaries(report), undefined, label);
  }
});

test("role boundary assertion reports every violation without echoing inspected values", () => {
  const report = structuredClone(validReport());
  report.roles[2].attributes.superuser = true;
  report.roles[4].privileges.anyWrite = true;
  (report.roles[2] as typeof report.roles[number] & { diagnosticSecret?: string }).diagnosticSecret = "do-not-leak";

  assert.throws(
    () => assertRoleBoundaries(report),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /bimmetraj_app/);
      assert.match(error.message, /NOSUPERUSER|superuser=false/);
      assert.match(error.message, /bimmetraj_backup/);
      assert.match(error.message, /read.only|write=false/i);
      assert.doesNotMatch(error.message, /do-not-leak/);
      return true;
    },
  );
});

test("sanitized inspector JSON is deterministic and contains no credentials", () => {
  const unsafe = {
    ...validReport(),
    databaseUrl: "postgresql://bimmetraj_app:top-secret@localhost:5432/teklifpro_role_contract_test",
    password: "top-secret",
    nested: {
      connectionString: "postgres://bimmetraj_backup:another-secret@localhost/db",
      token: "bearer-secret",
      safe: "retained",
    },
  } as DatabaseRoleBoundaryReport & Record<string, unknown>;

  const first = sanitizeRoleReport(unsafe);
  const second = sanitizeRoleReport(unsafe);
  assert.deepEqual(second, first);
  assert.equal(first.contract, "bimmetraj.database-roles.v1");
  assert.equal(first.database, "teklifpro_role_contract_test");
  assert.deepEqual(first.roles.map((role) => role.name), canonicalRoleNames);

  const json = JSON.stringify(first);
  for (const forbidden of [
    "top-secret",
    "another-secret",
    "bearer-secret",
    "postgresql://",
    "postgres://",
    "databaseUrl",
    "connectionString",
    '"password"',
    '"token"',
  ]) {
    assert.equal(json.includes(forbidden), false, `sanitized JSON leaked ${forbidden}`);
  }
});

test("credential validation rejects weak or reused secrets before any database query", async () => {
  const strong = {
    bimmetraj_migrator: "A1_migrator-generated-secret-0123456789",
    bimmetraj_app: "B2_app-generated-secret-012345678901234",
    bimmetraj_worker: "C3_worker-generated-secret-012345678901",
    bimmetraj_backup: "D4_backup-generated-secret-012345678901",
  } satisfies DatabaseRoleCredentials;
  const target = {
    expectedDatabase: "teklifpro_test",
    expectedSystemIdentifier: "1234567890123456789",
    requiredMarkerRegclass: "teklifpro_release.migrations",
  };
  let queryCount = 0;
  const client = { query: async () => { queryCount += 1; throw new Error("database query must not run"); } } as any;
  const administratorCredential = "Bootstrap_generated_secret_0123456789";

  const cases: DatabaseRoleCredentials[] = [
    { ...strong, bimmetraj_app: "too-short" },
    { ...strong, bimmetraj_worker: "a".repeat(32) },
    { ...strong, bimmetraj_backup: strong.bimmetraj_app },
    { ...strong, bimmetraj_migrator: "unsafe:password@host-012345678901234" },
  ];
  for (const credentials of cases) {
    await assert.rejects(() => provisionDatabaseRoles(client, credentials, target, administratorCredential), /credential|entropy|distinct/i);
  }
  await assert.rejects(
    () => provisionDatabaseRoles(client, strong, target, strong.bimmetraj_app),
    /bootstrap|distinct/i,
  );
  assert.equal(queryCount, 0);
});
