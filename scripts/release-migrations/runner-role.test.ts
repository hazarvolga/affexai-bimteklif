import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { connectDeployment } from "./safety";
import { runMigrationTransaction } from "./runner";

test("deployment release elevates only inside its transaction and drains after identity verification", async (t) => {
  const statements: string[] = [];
  t.mock.method(pg.Client.prototype, "connect", async () => {});
  t.mock.method(pg.Client.prototype, "end", async () => {});
  t.mock.method(pg.Client.prototype, "query", async (statement: string) => {
    const sql = statement.replace(/\s+/g, " ").trim();
    statements.push(sql);
    if (sql.startsWith("select current_database()")) {
      return { rows: [{ database: "bimmetraj_production", username: "bimmetraj_migrator", host: "127.0.0.1", port: 5432 }] };
    }
    if (sql.includes("session_user as session_role")) {
      return { rows: [{ session_role: "bimmetraj_migrator", current_role: "bimmetraj_owner" }] };
    }
    if (sql.includes("to_regclass('public.document_processing_runs')")) return { rows: [{ relation: null }] };
    if (sql.includes("to_regclass($1)")) return { rows: [{ relation: null }] };
    return { rows: [] };
  });

  const previous = { ...process.env };
  Object.assign(process.env, {
    RELEASE_ALLOW_PRODUCTION: "true",
    RELEASE_EXPECTED_HOST: "postgres",
    RELEASE_EXPECTED_DATABASE: "bimmetraj_production",
    RELEASE_EXPECTED_USER: "bimmetraj_migrator",
  });
  try {
    const client = await connectDeployment("postgresql://bimmetraj_migrator:fixture@postgres:5432/bimmetraj_production");
    await assert.rejects(
      runMigrationTransaction(client, async () => {
        statements.push("MIGRATION ACTION");
        throw new Error("fixture rollback");
      }, { requireWorkersDrained: true, workerDrainEnv: { RELEASE_WORKERS_DRAINED: "true" } }),
      /fixture rollback/,
    );
    const ordered = [
      "begin",
      "set local role bimmetraj_owner",
      "select session_user as session_role,current_user as current_role",
      "select pg_advisory_xact_lock(707071)",
      "SELECT to_regclass('public.document_processing_runs')::text AS relation",
      "MIGRATION ACTION",
      "rollback",
    ];
    let cursor = -1;
    for (const expected of ordered) {
      cursor = statements.findIndex((statement, index) => index > cursor && statement === expected);
      assert.notEqual(cursor, -1, `missing or out-of-order statement: ${expected}\n${statements.join("\n")}`);
    }
  } finally {
    for (const key of ["RELEASE_ALLOW_PRODUCTION", "RELEASE_EXPECTED_HOST", "RELEASE_EXPECTED_DATABASE", "RELEASE_EXPECTED_USER"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
test("release transaction aborts before drain and migration if owner elevation fails", async (t) => {
  const statements: string[] = [];
  t.mock.method(pg.Client.prototype, "connect", async () => {});
  t.mock.method(pg.Client.prototype, "end", async () => {});
  t.mock.method(pg.Client.prototype, "query", async (statement: string) => {
    if (statement.startsWith("select current_database()")) {
      return { rows: [{ database: "bimmetraj_production", username: "bimmetraj_migrator" }] };
    }
    statements.push(statement);
    if (statement === "set local role bimmetraj_owner") throw new Error("permission denied to set role");
    return { rows: [] };
  });
  const previous = { ...process.env };
  Object.assign(process.env, {
    RELEASE_ALLOW_PRODUCTION: "true",
    RELEASE_EXPECTED_HOST: "postgres",
    RELEASE_EXPECTED_DATABASE: "bimmetraj_production",
    RELEASE_EXPECTED_USER: "bimmetraj_migrator",
  });
  try {
    const client = await connectDeployment("postgresql://bimmetraj_migrator:fixture@postgres:5432/bimmetraj_production");
    await assert.rejects(
      runMigrationTransaction(client, async () => statements.push("MIGRATION ACTION"), { requireWorkersDrained: true }),
      /permission denied/,
    );
    assert.deepEqual(statements, ["begin", "set local role bimmetraj_owner", "rollback"]);
  } finally {
    for (const key of ["RELEASE_ALLOW_PRODUCTION", "RELEASE_EXPECTED_HOST", "RELEASE_EXPECTED_DATABASE", "RELEASE_EXPECTED_USER"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test("approved deployment cannot bypass the drain gate by omitting caller options", async (t) => {
  const statements: string[] = [];
  t.mock.method(pg.Client.prototype, "connect", async () => {});
  t.mock.method(pg.Client.prototype, "end", async () => {});
  t.mock.method(pg.Client.prototype, "query", async (statement: string) => {
    if (statement.startsWith("select current_database()")) {
      return { rows: [{ database: "bimmetraj_production", username: "bimmetraj_migrator" }] };
    }
    statements.push(statement);
    if (statement.includes("session_user as session_role")) {
      return { rows: [{ session_role: "bimmetraj_migrator", current_role: "bimmetraj_owner" }] };
    }
    return { rows: [] };
  });
  const previous = { ...process.env };
  Object.assign(process.env, {
    RELEASE_ALLOW_PRODUCTION: "true",
    RELEASE_EXPECTED_HOST: "postgres",
    RELEASE_EXPECTED_DATABASE: "bimmetraj_production",
    RELEASE_EXPECTED_USER: "bimmetraj_migrator",
  });
  try {
    const client = await connectDeployment("postgresql://bimmetraj_migrator:fixture@postgres:5432/bimmetraj_production");
    await assert.rejects(
      runMigrationTransaction(client, async () => statements.push("MIGRATION ACTION"), { workerDrainEnv: {} }),
      /RELEASE_WORKERS_DRAINED=true/,
    );
    assert.equal(statements.includes("MIGRATION ACTION"), false);
    assert.equal(statements.at(-1), "rollback");
  } finally {
    for (const key of ["RELEASE_ALLOW_PRODUCTION", "RELEASE_EXPECTED_HOST", "RELEASE_EXPECTED_DATABASE", "RELEASE_EXPECTED_USER"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
