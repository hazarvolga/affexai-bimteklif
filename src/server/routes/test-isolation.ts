import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, after } from "node:test";
import pg from "pg";
import { isDeepStrictEqual } from "node:util";

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

export function isolatedDatabaseUrl(databaseUrl: string, schema: string) {
  const url = new URL(databaseUrl);
  // pg applies query-string connection fields after parsing the URL authority.
  for (const key of url.searchParams.keys()) {
    if (!["options", "sslmode", "ssl", "application_name", "connect_timeout"].includes(key)) {
      throw new Error("Connection parameter overrides are not allowed for test isolation");
    }
  }
  const databases = ["/teklifpro_local", "/teklifpro_bootstrap_test", "/teklifpro_upgrade_test", "/teklifpro_migration_restore_test"];
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !databases.includes(url.pathname)) {
    throw new Error("Integration isolation requires an explicitly named local TeklifPro database");
  }
  if (!/^teklifpro_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe test schema");
  // No public fallback: a missing fixture table must fail, never write shared data.
  url.searchParams.set("options", `-csearch_path=${schema}`);
  return url.toString();
}

export async function readLocalForeignKeys(client: pg.Client, schema: string) {
  const keys = await client.query<{
    name: string; source: string; target: string; columns: string[]; targets: string[];
    update_action: string; delete_action: string; match: string; deferrable: boolean; deferred: boolean;
    target_schema: string; validated: boolean;
  }>(`SELECT c.conname AS name, s.relname AS source, t.relname AS target, tn.nspname AS target_schema,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(id, n)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.id ORDER BY k.n) AS columns,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(id, n)
      JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.id ORDER BY k.n) AS targets,
    c.confupdtype AS update_action, c.confdeltype AS delete_action, c.confmatchtype AS match,
    c.condeferrable AS deferrable, c.condeferred AS deferred, c.convalidated AS validated
    FROM pg_constraint c JOIN pg_class s ON s.oid = c.conrelid JOIN pg_class t ON t.oid = c.confrelid
    JOIN pg_namespace sn ON sn.oid = s.relnamespace JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE c.contype = 'f' AND sn.nspname = $1 ORDER BY s.relname, c.conname`, [schema]);
  if (keys.rows.some((key) => key.target_schema !== schema)) {
    throw new Error("Refusing to clone external-schema foreign keys");
  }
  return keys.rows.map(({ target_schema, ...signature }) => signature);
}

async function cloneTables(client: pg.Client, schema: string) {
  const defaults = await client.query("select 1 from information_schema.columns where table_schema = 'public' and column_default like '%nextval(%'");
  if (defaults.rowCount) throw new Error("Refusing to clone defaults referencing shared sequences");
  const keys = await readLocalForeignKeys(client, "public");
  const tables = await client.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public'");
  for (const { tablename } of tables.rows) {
    await client.query(`CREATE TABLE ${quote(schema)}.${quote(tablename)} (LIKE public.${quote(tablename)} INCLUDING ALL)`);
  }
  // LIKE preserves columns/defaults/indexes, but foreign keys must point into our schema.
  const actions: Record<string, string> = { a: "NO ACTION", r: "RESTRICT", c: "CASCADE", n: "SET NULL", d: "SET DEFAULT" };
  for (const key of keys) {
    if (!["s", "f"].includes(key.match)) throw new Error("Unsupported foreign key match type");
    await client.query(`ALTER TABLE ${quote(schema)}.${quote(key.source)} ADD CONSTRAINT ${quote(key.name)}
      FOREIGN KEY (${key.columns.map(quote).join(",")}) REFERENCES ${quote(schema)}.${quote(key.target)} (${key.targets.map(quote).join(",")})
      MATCH ${key.match === "f" ? "FULL" : "SIMPLE"}
      ON UPDATE ${actions[key.update_action]} ON DELETE ${actions[key.delete_action]}
      ${key.deferrable ? `DEFERRABLE INITIALLY ${key.deferred ? "DEFERRED" : "IMMEDIATE"}` : "NOT DEFERRABLE"}
      ${key.validated ? "" : "NOT VALID"}`);
  }
  if (!isDeepStrictEqual(keys, await readLocalForeignKeys(client, schema))) {
    throw new Error("Cloned foreign key signatures do not match source");
  }
}

export async function createTestIsolation(sourceUrl: string) {
  const schema = `teklifpro_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const workerSchema = `${schema}_worker`;
  const databaseUrl = isolatedDatabaseUrl(sourceUrl, schema);
  const storageDir = await mkdtemp(join(tmpdir(), "teklifpro-test-"));
  const client = new pg.Client({ connectionString: sourceUrl, connectionTimeoutMillis: 2_000 });
  let created = false;
  let workerCreated = false;
  let closed = false;
  const cleanup = async () => {
    if (closed) return;
    try {
      if (created) {
        if (workerCreated) await client.query(`DROP SCHEMA IF EXISTS ${quote(workerSchema)} CASCADE`);
        await client.query(`DROP SCHEMA IF EXISTS ${quote(schema)} CASCADE`);
      }
    } finally {
      closed = true;
      try {
        await client.end();
      } finally {
        await rm(storageDir, { recursive: true, force: true });
      }
    }
  };
  try {
    await client.connect();
    await client.query(`CREATE SCHEMA ${quote(schema)}`);
    created = true;
    await cloneTables(client, schema);
    await client.query(`CREATE SCHEMA ${quote(workerSchema)}`);
    workerCreated = true;
    return { schema, workerSchema, databaseUrl, storageDir, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export function useTestIsolation() {
  let isolation: Awaited<ReturnType<typeof createTestIsolation>> | undefined;
  let saved: Record<string, string | undefined> = {};
  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error("Test isolation unavailable: DATABASE_URL is required");
    try {
      isolation = await createTestIsolation(process.env.DATABASE_URL);
    } catch {
      throw new Error("Test isolation unavailable: refusing to run against the shared database");
    }
    const overrides = {
      DATABASE_URL: isolation.databaseUrl,
      GRAPHILE_WORKER_SCHEMA: isolation.workerSchema,
      SMARTCHECK_LOCAL_STORAGE_DIR: isolation.storageDir,
      AUTH_EMAIL_WEBHOOK_URL: "",
      NODE_ENV: "test",
    };
    saved = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
    Object.assign(process.env, overrides);
  });
  after(async () => {
    if (!isolation) return;
    try {
      const { db } = await import("../../db");
      const { closeControlDatabase } = await import("../../db/control-plane");
      await closeControlDatabase();
      await db.$client.end();
    } finally {
      try {
        await isolation.cleanup();
      } finally {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    }
  });
}
