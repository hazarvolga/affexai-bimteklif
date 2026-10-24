import assert from "node:assert/strict";
import test from "node:test";
import { isolatedDatabaseUrl, createTestIsolation, readLocalForeignKeys } from "./test-isolation";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import dotenv from "dotenv";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pg from "pg";

test("every source and runtime target is checked before connecting", async (t) => {
  const keys = ["TEST_ISOLATION_SOURCE_CONTROL_DATABASE_URL", "TEST_ISOLATION_SOURCE_WORKER_DATABASE_URL",
    "TEST_ISOLATION_RUNTIME_DATABASE_URL", "TEST_ISOLATION_RUNTIME_CONTROL_DATABASE_URL",
    "TEST_ISOLATION_RUNTIME_WORKER_DATABASE_URL", "CONTROL_DATABASE_URL", "WORKER_DATABASE_URL"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let connections = 0;
  t.mock.method(pg.Client.prototype, "connect", async () => {
    connections++;
    throw new Error("UNSAFE_CONNECTION_ATTEMPT");
  });
  try {
    for (const key of keys) delete process.env[key];
    for (const key of keys) {
      for (const target of ["postgres://remote.example/teklifpro_local", "postgres://127.0.0.1:6543/teklifpro_local",
        "postgres://127.0.0.1/teklifpro_upgrade_test", "postgres://127.0.0.1/teklifpro_local?host=remote.example"]) {
        process.env[key] = target;
        await assert.rejects(createTestIsolation("postgres://127.0.0.1/teklifpro_local"), /same.*database|local TeklifPro|parameter overrides/);
        delete process.env[key];
      }
    }
    await assert.rejects(createTestIsolation("postgres://remote.example/teklifpro_local"), /local TeklifPro/);
    assert.equal(connections, 0);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("connection query parameters cannot override the approved target", () => {
  const schema = `teklifpro_test_${"b".repeat(32)}`;
  for (const query of ["host=remote.example", "host=localhost&host=remote.example", "hostaddr=192.0.2.1", "port=6543", "database=postgres", "dbname=postgres", "service=remote", "user=other", "password=other", "%68ost=remote.example"]) {
    assert.throws(() => isolatedDatabaseUrl(`postgres://localhost/teklifpro_local?${query}`, schema), /override|parameter/i);
  }
});

test("failed isolation hook never runs a test even if a later connection would succeed", async () => {
  const source = `
    import pg from 'pg';
    import net from 'node:net';
    import { test, after } from 'node:test';
    import { useTestIsolation } from './src/server/routes/test-isolation.ts';
    let attempts = 0;
    // Reproduce the former no-op skip path without relying on a real port outage.
    net.createConnection = () => {
      const socket = new net.Socket();
      queueMicrotask(() => socket.emit('error', new Error('temporarily unreachable')));
      return socket;
    };
    pg.Client.prototype.connect = async function () {
      if (++attempts === 1) throw new Error('temporarily unreachable');
    };
    useTestIsolation();
    test('must never reach shared database', () => console.log('UNSAFE_TEST_BODY'));
    after(() => console.log('CONNECT_ATTEMPTS=' + attempts));
  `;
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  await assert.rejects(promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
    env: { ...Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("TEST_ISOLATION_") && !["CONTROL_DATABASE_URL", "WORKER_DATABASE_URL"].includes(key))), DATABASE_URL: "postgres://localhost/teklifpro_local" }, timeout: 10_000,
  }), (error: any) => {
    assert.match(error.stdout + error.stderr, /isolation unavailable/i);
    assert.match(error.stdout, /CONNECT_ATTEMPTS=1/);
    assert.doesNotMatch(error.stdout, /UNSAFE_TEST_BODY/);
    return true;
  });
});

test("test isolation refuses unrelated databases and shared schema names", () => {
  const schema = `teklifpro_test_${"a".repeat(32)}`;
  assert.throws(() => isolatedDatabaseUrl("postgres://localhost/postgres", schema));
  assert.throws(() => isolatedDatabaseUrl("postgres://localhost/aluplan_support", schema));
  assert.throws(() => isolatedDatabaseUrl("postgres://remote.example/teklifpro_local", schema));
  for (const unsafe of ["public", "graphile_worker", "teklifpro_test_bad;DROP SCHEMA public"]) {
    assert.throws(() => isolatedDatabaseUrl("postgres://localhost/teklifpro_local", unsafe));
  }
  const url = new URL(isolatedDatabaseUrl("postgres://localhost/teklifpro_local?options=-csearch_path%3Dpublic", schema));
  assert.equal(url.searchParams.get("options"), `-csearch_path=${schema}`);
});

test("CI isolation accepts only the explicitly named disposable TeklifPro databases", () => {
  const schema = `teklifpro_test_${"c".repeat(32)}`;
  for (const name of ["teklifpro_bootstrap_test", "teklifpro_upgrade_test", "teklifpro_migration_restore_test"]) {
    assert.equal(new URL(isolatedDatabaseUrl(`postgres://localhost/${name}`, schema)).pathname, `/${name}`);
  }
  assert.throws(() => isolatedDatabaseUrl("postgres://localhost/teklifpro_random_test", schema));
});

test("isolated schemas and storage are removed after a failed fixture setup", async (t) => {
  dotenv.config({ path: ".env.local", quiet: true });
  if (await skipIfDatabaseUnavailable(t)) return;
  const pg = await import("pg");
  const { access } = await import("node:fs/promises");
  const originalUrl = process.env.DATABASE_URL!;
  const isolation = await createTestIsolation(process.env.TEST_ISOLATION_SOURCE_DATABASE_URL ?? originalUrl);
  const client = new pg.default.Client({ connectionString: isolation.databaseUrl });
  try {
    await client.connect();
    assert.equal((await client.query("select current_schema() as name")).rows[0].name, isolation.schema);
    assert.equal((await client.query("select count(*)::int as count from companies")).rows[0].count, 0);
    const foreignKeys = await client.query(`select distinct target.relnamespace::regnamespace::text as schema
      from pg_constraint c join pg_class source on source.oid = c.conrelid
      join pg_class target on target.oid = c.confrelid
      where c.contype = 'f' and source.relnamespace = $1::regnamespace`, [isolation.schema]);
    assert.deepEqual(foreignKeys.rows, [{ schema: isolation.schema }]);
    const sourceKeys = await readLocalForeignKeys(client, "public");
    assert.ok(sourceKeys.length > 0);
    assert.deepEqual(await readLocalForeignKeys(client, isolation.schema), sourceKeys);
    await assert.rejects(client.query(`insert into memberships (user_id, company_id, role)
      values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'owner')`),
    (error: any) => error.code === "23503");
    // Both ends are test-owned; rejection must not require modifying public.
    await isolation.fixtureClient().query(`create table "${isolation.workerSchema}".external_parent (id int primary key)`);
    await isolation.fixtureClient().query(`create table external_child (id int references "${isolation.workerSchema}".external_parent(id))`);
    await assert.rejects(readLocalForeignKeys(client, isolation.schema), /external-schema foreign keys/);
    await isolation.fixtureClient().query("drop table external_child");
    await isolation.fixtureClient().query(`select "${isolation.workerSchema}".add_job($1, $2::json)`, ["test_cleanup", JSON.stringify({ test: true })]);
    assert.equal((await isolation.fixtureClient().query(`select count(*)::int as count from "${isolation.workerSchema}".jobs`)).rows[0].count, 1);
    await assert.rejects(async () => {
      try {
        await client.query("insert into companies (name) values ('setup failure fixture')");
        throw new Error("fixture setup failed");
      } finally {
        await client.end();
        await isolation.cleanup();
      }
    }, /fixture setup failed/);
    const probe = new pg.default.Client({ connectionString: originalUrl });
    try {
      await probe.connect();
      const result = await probe.query("select nspname from pg_namespace where nspname = any($1::text[])", [[isolation.schema, isolation.workerSchema]]);
      assert.equal(result.rowCount, 0);
    } finally {
      await probe.end();
    }
    await assert.rejects(access(isolation.storageDir));
  } finally {
    await client.end();
    await isolation.cleanup();
  }
});

test("restricted runtime connections resolve isolated tables and cannot mutate the private queue", async (t) => {
  if (!process.env.TEST_ISOLATION_RUNTIME_WORKER_DATABASE_URL) {
    if (process.env.CI) throw new Error("CI must configure all restricted isolation runtime URLs");
    t.skip("Requires the disposable three-role integration environment");
    return;
  }
  const isolation = await createTestIsolation(process.env.TEST_ISOLATION_SOURCE_DATABASE_URL!);
  try {
    for (const [role, url] of [
      ["bimmetraj_app", isolation.databaseUrl], ["bimmetraj_control", isolation.controlDatabaseUrl],
      ["bimmetraj_worker", isolation.workerDatabaseUrl],
    ]) {
      const client = new pg.Client({ connectionString: url });
      try {
        await client.connect();
        const { rows: [identity] } = await client.query("select current_user as role, current_schema() as schema");
        assert.deepEqual(identity, { role, schema: isolation.schema });
        assert.equal((await client.query("select count(*)::int as n from users")).rows[0].n, 0);
        if (role === "bimmetraj_app") {
          await assert.rejects(client.query(`delete from "${isolation.workerSchema}"._private_jobs`),
            (error: any) => error.code === "42501");
          await client.query(`select "${isolation.workerSchema}".bimmetraj_enqueue_smartcheck($1,$2::json,$3,3,0)`,
            ["process_smartcheck_document", "{}", "smartcheck:11111111-1111-4111-8111-111111111111"]);
          await assert.rejects(client.query(`select "${isolation.workerSchema}".bimmetraj_enqueue_smartcheck($1,$2::json,$3,3,0)`,
            ["arbitrary_task", "{}", "smartcheck:11111111-1111-4111-8111-111111111111"]),
          (error: any) => error.code === "22023");
        }
      } finally { await client.end(); }
    }
    assert.equal((await isolation.fixtureClient().query(`select count(*)::int as n from "${isolation.workerSchema}".jobs`)).rows[0].n, 1);
  } finally { await isolation.cleanup(); }
});
